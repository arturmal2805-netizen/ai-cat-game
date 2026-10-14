import { newGame } from "../public/economy.js";
import { checkReleaseResponse } from "./release-check.mjs";
// This isolated test world never reads or writes a player's recovery code.
export async function verifyCloudSave(base, revision, fetcher = fetch) {
  const code = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  const url = new URL("/api/save", base);
  const headers = {
    "Content-Type": "application/json",
    "X-Chichi-Save-Token": code,
  };
  const game = newGame();
  const mutationId = crypto.randomUUID();
  const send = async (options) => {
    const r = await fetcher(url, {
      ...options,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    checkReleaseResponse(r, revision);
    if (!r.ok) throw Error(`Cloud save verification HTTP ${r.status}`);
    return r.json();
  };
  const body = JSON.stringify({ expectedRevision: 0, mutationId, game });
  const first = await send({ method: "PUT", headers, body });
  const retry = await send({ method: "PUT", headers, body });
  const read = await send({ headers });
  if (
    first.revision !== 1 ||
    retry.revision !== 1 ||
    read.revision !== 1 ||
    JSON.stringify(read.game) !== JSON.stringify(game)
  )
    throw Error(
      "Cloud save verification failed: snapshot read-back or retry differs",
    );
}
