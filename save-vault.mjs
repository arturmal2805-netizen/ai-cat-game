import {cryptoSnapshotValid} from "./public/crypto-trading.js";
import {preserveReferenceOwnership} from './public/purchase-preservation.js';
import {orchardSnapshotValid} from './public/magic-farm-state.js';
import {PLACEMENT_LIMIT} from './public/economy.js';
import {CryptoAIRequestLedger,validateCryptoRequest} from "./crypto-ai.mjs";
import { housingSnapshotValid } from "./public/housing-system.js";
import { familySnapshotValid } from "./public/family-system.js";
import { chunkedSaveStorage } from "./chunked-save-store.mjs";
import { mergeSharedWorld, SharedConflict } from "./shared-world.mjs";
import { BIOMES,byItem } from "./public/game-data.js";
import {RETIRED_BIOME_IDS} from './public/world-layout.js';
import {migrateRetiredIsland} from './public/world-migration.js';
import { CityAIRequestLedger } from "./city-ai-vault.mjs";
import { JOB_AI_LIMIT, validateCityAIState } from "./jobcity-ai.mjs";
import { aiProviderRouter } from "./ai-provider-router.mjs";
export const SAVE_LIMIT = 8 * 1024 * 1024;
export const EDITOR_LEASE_MS = 25000;
const sessionValid = (value) => /^[a-zA-Z0-9-]{8,64}$/.test(value || "");
const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function readJSON(request, limit) {
  if (Number(request.headers.get("content-length")) > limit)
    throw Error("SAVE_TOO_LARGE");
  const stream =
    request.headers.get("Content-Encoding") === "gzip" && request.body
      ? request.body.pipeThrough(new DecompressionStream("gzip"))
      : request.body;
  const reader = stream?.getReader();
  if (!reader) throw Error("SAVE_INVALID");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
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
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function readSaveBody(request) {
  const value = await readJSON(request, SAVE_LIMIT * 2 + 2048);
  if (
    new TextEncoder().encode(JSON.stringify(value.game || {})).length >
      SAVE_LIMIT ||
    (value.baseGame &&
      new TextEncoder().encode(JSON.stringify(value.baseGame)).length >
        SAVE_LIMIT)
  )
    throw Error("SAVE_TOO_LARGE");
  if (
    !/^[a-zA-Z0-9-]{8,64}$/.test(value.mutationId || "") ||
    !Number.isSafeInteger(value.expectedRevision) ||
    value.expectedRevision < 0 ||
    (value.cooperative &&
      value.clientId !== undefined &&
      (!sessionValid(value.clientId) ||
        !Number.isSafeInteger(value.sequence) ||
        value.sequence < 1)) ||
    (value.sessionId !== undefined && !sessionValid(value.sessionId)) ||
    !value.game ||
    !housingSnapshotValid(value.game.housing) ||
    !familySnapshotValid(value.game.family) ||
    !cryptoSnapshotValid(value.game.jobCity) ||
    !orchardSnapshotValid(value.game.farm?.orchards) ||
    value.game.version !== 2 ||
    !Number.isSafeInteger(value.game.coins) ||
    value.game.coins < 0 ||
    value.game.coins > 10000000 ||
    (value.game.diamonds !== undefined &&
      (!Number.isSafeInteger(value.game.diamonds) ||
        value.game.diamonds < 0 ||
        value.game.diamonds > 1000000)) ||
    !Array.isArray(value.game.placements) ||
    value.game.placements.length > PLACEMENT_LIMIT ||
    value.game.placements.filter(p=>!byItem(p?.item)?.premiumWater).length>60 ||
    !Array.isArray(value.game.unlocked) ||
    new Set(value.game.unlocked).size !== value.game.unlocked.length ||
    value.game.unlocked.length > BIOMES.length + RETIRED_BIOME_IDS.length
  )
    throw Error("SAVE_INVALID");
  return value;
}
// Each private recovery code maps to its own SQLite-backed Durable Object.
// Transactions refuse an older device overwriting a newer saved revision.
export class SaveVault {
  constructor(state, env = {}) {
    this.storage = chunkedSaveStorage(state.storage);
    this.cryptoAI=new CryptoAIRequestLedger(this.storage,(input,validate)=>aiProviderRouter(env).run(input,validate));
    this.cityAI = new CityAIRequestLedger(this.storage, {
      reserveConfigured: !!env.BACKUP_AI_API_KEY,
      run: (_model, input, validate) => aiProviderRouter(env).run(input, validate),
    });
  }
  async fetch(request) {
    if(new URL(request.url).pathname==='/internal-crypto-ai'&&request.method==='POST'){
      let input;try{input=validateCryptoRequest(await readJSON(request,2048));}catch{return json({error:'Invalid trading attempt'},400);}
      const result=await this.cryptoAI.forecast(input);return json(result.body,result.status);
    }
    if (new URL(request.url).pathname === "/internal-city-ai-status" && request.method === "GET")
      return json(await this.cityAI.status());
    if (
      new URL(request.url).pathname === "/internal-city-ai" &&
      request.method === "POST"
    ) {
      let state;
      try {
        state = validateCityAIState(await readJSON(request, JOB_AI_LIMIT));
        if (!state.phase) throw Error();
      } catch {
        return json({ code: "INVALID_AI_EVENT" }, 400);
      }
      const r = await this.cityAI.plan(state);
      return json(r.body, r.status);
    }
    if (
      new URL(request.url).pathname === "/internal-account" &&
      request.method === "POST"
    ) {
      let input;
      try {
        input = await readJSON(request, 1024);
      } catch {
        return json({ error: "INVALID_ACCOUNT" }, 400);
      }
      if (!["limit", "create", "login"].includes(input.action))
        return json({ error: "INVALID_ACCOUNT" }, 400);
      return json(await new AccountVault(this.storage).handle(input));
    }
    if (request.method === "GET") {
      const save = await this.storage.get("current");
      const editor = await this.storage.get("editor");
      const { submittedGame, ...visible } = save || {};
      return json({
        ...(save ? visible : { revision: 0, game: null, savedAt: null }),
        editor: editor?.expiresAt > Date.now() ? editor : null,
      });
    }
    if (request.method === "POST") {
      let input;
      try {
        input = await readJSON(request, 1024);
      } catch {
        return json({ error: "INVALID_SESSION" }, 400);
      }
      if (
        !sessionValid(input.sessionId) ||
        !["claim", "release"].includes(input.action)
      )
        return json({ error: "INVALID_SESSION" }, 400);
      const result = await this.storage.transaction(async (t) => {
        const now = Date.now(),
          old = await t.get("editor");
        if (input.action === "release") {
          if (old?.sessionId === input.sessionId)
            await t.put("editor", { ...old, expiresAt: 0 });
          return { granted: false };
        }
        if (old?.expiresAt > now && old.sessionId !== input.sessionId)
          return { granted: false, editor: old };
        const editor = {
          sessionId: input.sessionId,
          expiresAt: now + EDITOR_LEASE_MS,
        };
        await t.put("editor", editor);
        return { granted: true, editor };
      });
      return json(result);
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
    const requestDigest = input.cooperative
      ? await hashText(JSON.stringify(input.game))
      : null;
    const result = await this.storage.transaction(async (transaction) => {
      const current = await transaction.get("current"),
        revision = current?.revision || 0;
      if (input.expectedRevision > revision)
        return {
          unavailable: true,
          error:
            "Серверная версия пока старее подтверждённой. Локальная очередь сохранена; повторите позже.",
        };
      const editor = await transaction.get("editor");
      const receipts = input.cooperative
        ? (await transaction.get("receipts")) || []
        : [];
      const previousWrite =
        input.cooperative && input.clientId
          ? await transaction.get("writer:" + input.clientId)
          : null;
      if (previousWrite && input.sequence <= previousWrite.sequence) {
        if (
          input.sequence === previousWrite.sequence &&
          previousWrite.digest !== requestDigest
        )
          return {
            conflict: true,
            revision,
            savedAt: current.savedAt,
            game: current.game,
            error: "Повтор действия отличается от сохранённого.",
          };
        return { revision, savedAt: current.savedAt, game: current.game };
      }
      const receipt = receipts.find((r) => r.id === input.mutationId);
      if (receipt)
        return receipt.digest === requestDigest
          ? { revision, savedAt: current.savedAt, game: current.game }
          : {
              conflict: true,
              revision,
              savedAt: current.savedAt,
              game: current.game,
              error: "Повтор действия отличается от сохранённого.",
            };

      if (
        !input.cooperative &&
        editor?.expiresAt > Date.now() &&
        editor.sessionId !== input.sessionId
      )
        return { locked: true, revision, savedAt: current?.savedAt };
      if (
        !input.cooperative &&
        input.sessionId &&
        (!editor || editor.expiresAt <= Date.now())
      )
        return { locked: true, revision, savedAt: current?.savedAt };
      if (current?.lastMutationId === input.mutationId) {
        if (
          JSON.stringify(current.submittedGame || current.game) ===
          JSON.stringify(input.game)
        )
          return {
            revision,
            savedAt: current.savedAt,
            ...(input.cooperative ? { game: current.game } : {}),
          };
        return {
          conflict: true,
          revision,
          savedAt: current.savedAt,
          ...(input.cooperative
            ? {
                game: current.game,
                error:
                  "Повтор содержит другую версию действия. Последняя копия загружена, локальная сохранена отдельно.",
              }
            : {}),
        };
      }
      if (!input.cooperative && input.expectedRevision !== revision)
        return { conflict: true, revision, savedAt: current?.savedAt };
      let game = migrateRetiredIsland(input.game),
        notice = null;
      if (input.cooperative && current) {
        if (
          !input.baseGame ||
          input.baseGame.version !== 2 ||
          !Array.isArray(input.baseGame.placements) ||
          !input.baseGame.progression
        )
          return {
            conflict: true,
            revision,
            savedAt: current.savedAt,
            game: current.game,
            error: "Нужно обновить общий мир.",
          };
        try {
          game = mergeSharedWorld(input.baseGame, current.game, input.game);
          if (
            input.game.placements.some(
              (p) =>
                !input.baseGame.placements.some((b) => b.id === p.id) &&
                !game.placements.some((g) => g.id === p.id),
            )
          )
            notice =
              "На это место уже поставили предмет с другого телефона. Ваша покупка в сумке, срок строительства сохранён.";
        } catch (e) {
          if (!(e instanceof SharedConflict)) throw e;
          return {
            conflict: true,
            revision,
            savedAt: current.savedAt,
            game: current.game,
            error: e.message,
          };
        }
      }
      game=preserveReferenceOwnership(game);
      const save = {
        revision: revision + 1,
        savedAt: Date.now(),
        game,
        lastMutationId: input.mutationId,
        ...(input.cooperative ? { submittedGame: input.game } : {}),
      };
      if (current) {
        const previous = await transaction.get("previous");
        if (previous) await transaction.put("older", previous);
        await transaction.put("previous", current);
      }
      await transaction.put("current", save);
      if (input.cooperative && input.clientId)
        await transaction.put("writer:" + input.clientId, {
          sequence: input.sequence,
          digest: requestDigest,
        });
      if (input.cooperative)
        await transaction.put(
          "receipts",
          [...receipts, { id: input.mutationId, digest: requestDigest }].slice(
            -256,
          ),
        );
      return {
        revision: save.revision,
        savedAt: save.savedAt,
        ...(input.cooperative ? { game, ...(notice ? { notice } : {}) } : {}),
      };
    });
    return json(
      result,
      result.unavailable
        ? 503
        : result.locked
          ? 423
          : result.conflict
            ? 409
            : 200,
    );
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

export class AccountVault {
  constructor(storage) {
    this.storage = storage;
  }
  async handle(input) {
    return this.storage.transaction(async (t) => {
      if (input.action === "limit") {
        const now = Date.now(),
          saved = await t.get("attempts");
        const attempts =
          saved?.until > now ? saved : { count: 0, until: now + 60000 };
        if (attempts.count >= 6) return { limited: true };
        await t.put("attempts", { ...attempts, count: attempts.count + 1 });
        return { ok: true };
      }
      const account = await t.get("account");
      if (input.action === "create") {
        if (account) return { exists: true };
        await t.put("account", { token: input.token, createdAt: Date.now() });
        return { token: input.token };
      }
      return account ? { token: account.token } : { missing: true };
    });
  }
}
const hashText = async (text) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
export async function accountAccess(request, env) {
  if (!env.SAVE_VAULT) return json({ error: "Облако пока недоступно." }, 503);
  let input;
  try {
    input = await readJSON(request, 1024);
  } catch {
    return json({ error: "Некорректный запрос." }, 400);
  }
  if (
    !/^\d{4,12}$/.test(input.code || "") ||
    !["create", "login"].includes(input.action)
  )
    return json({ error: "Введите код аккаунта: от 4 до 12 цифр." }, 400);
  if (input.action === "create" && !/^[a-f0-9]{64}$/.test(input.token || ""))
    return json({ error: "Нет кода текущего мира." }, 400);
  const stub = async (name, body) =>
    env.SAVE_VAULT.get(env.SAVE_VAULT.idFromName(name)).fetch(
      new Request("https://vault/internal-account", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const limit = await (
    await stub("account-limit:" + (await hashText(ip)), { action: "limit" })
  ).json();
  if (limit.limited)
    return json({ error: "Слишком много попыток. Подождите минуту." }, 429);
  if (input.action === "create") {
    const world = await cloudSave(
      new Request(request.url, {
        headers: { "X-Chichi-Save-Token": input.token },
      }),
      env,
    );
    if (!(await world.json()).game)
      return json(
        { error: "Сначала дождитесь сохранения текущего мира в облаке." },
        409,
      );
  }
  const result = await (
    await stub(
      "account:" + (await hashText("chichi-account-v1:" + input.code)),
      { action: input.action, token: input.token },
    )
  ).json();
  if (result.exists)
    return json(
      {
        error:
          "Этот код уже связан с миром. Нажмите «Войти», чтобы открыть его; привязка не изменена.",
      },
      409,
    );
  if (result.missing)
    return json({ error: "Аккаунт с таким кодом пока не создан." }, 404);
  return json({ token: result.token });
}
