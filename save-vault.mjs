export const SAVE_LIMIT = 120000;
const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function readSaveBody(request) {
  if (Number(request.headers.get("content-length")) > SAVE_LIMIT)
    throw Error("SAVE_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw Error("SAVE_INVALID");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > SAVE_LIMIT) {
      await reader.cancel();
      throw Error("SAVE_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (
    !/^[a-zA-Z0-9-]{8,64}$/.test(value.mutationId || "") ||
    !Number.isSafeInteger(value.expectedRevision) ||
    value.expectedRevision < 0 ||
    !value.game ||
    value.game.version !== 2 ||
    !Number.isSafeInteger(value.game.coins) ||
    value.game.coins < 0 ||
    value.game.coins > 10000000 ||
    !Array.isArray(value.game.placements) ||
    value.game.placements.length > 60 ||
    !Array.isArray(value.game.unlocked) ||
    value.game.unlocked.length > 25
  )
    throw Error("SAVE_INVALID");
  return value;
}
// Each private recovery code maps to its own SQLite-backed Durable Object.
// Transactions refuse an older device overwriting a newer saved revision.
export class SaveVault {
  constructor(state) {
    this.storage = state.storage;
  }
  async fetch(request) {
    if (request.method === "GET") {
      const save = await this.storage.get("current");
      return json(save || { revision: 0, game: null, savedAt: null });
    }
    if (request.method !== "PUT")
      return json({ error: "Method not allowed" }, 405);
    let input;
    try {
      input = await readSaveBody(request);
    } catch (e) {
      return json(
        { error: e.message },
        e.message === "SAVE_TOO_LARGE" ? 413 : 400,
      );
    }
    const result = await this.storage.transaction(async (transaction) => {
      const current = await transaction.get("current"),
        revision = current?.revision || 0;
      if (current?.lastMutationId === input.mutationId) {
        if (JSON.stringify(current.game) === JSON.stringify(input.game))
          return { revision, savedAt: current.savedAt };
        return { conflict: true, revision, savedAt: current.savedAt };
      }
      if (input.expectedRevision !== revision)
        return { conflict: true, revision, savedAt: current?.savedAt };
      const save = {
        revision: revision + 1,
        savedAt: Date.now(),
        game: input.game,
        lastMutationId: input.mutationId,
      };
      if (current) {
        const previous = await transaction.get("previous");
        if (previous) await transaction.put("older", previous);
        await transaction.put("previous", current);
      }
      await transaction.put("current", save);
      return { revision: save.revision, savedAt: save.savedAt };
    });
    return json(result, result.conflict ? 409 : 200);
  }
}
export async function cloudSave(request, env) {
  if (!env.SAVE_VAULT) return json({ error: "CLOUD_SAVE_UNAVAILABLE" }, 503);
  const token = request.headers.get("X-Chichi-Save-Token");
  if (!/^[a-f0-9]{64}$/.test(token || ""))
    return json({ error: "INVALID_RECOVERY_CODE" }, 401);
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  return env.SAVE_VAULT.get(env.SAVE_VAULT.idFromName(hash)).fetch(request);
}
