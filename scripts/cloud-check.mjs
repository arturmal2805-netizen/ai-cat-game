import { cloudSaveRequest } from "../public/save-transport.js";
import { newGame, purchase } from "../public/economy.js";
import { checkReleaseResponse, ReleaseMismatch } from "./release-check.mjs";
// This isolated test world never reads or writes a player's recovery code.
export async function verifyCloudSave(
  base,
  revision,
  fetcher = fetch,
  {
    wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    attempts = 6,
    onWait = () => {},
    cooperativeCheck = false,
  } = {},
) {
  const code = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  const url = new URL("/api/save", base);
  url.searchParams.set("revision", revision);
  const headers = {
    "Content-Type": "application/json",
    "X-Chichi-Save-Token": code,
    Origin: "https://arturmal2805-netizen.github.io",
    "Cache-Control": "no-cache",
  };
  const game = newGame();
  const mutationId = crypto.randomUUID();
  let probe = 0;
  const deadline = Date.now() + 60000;
  const send = async (options) => {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0)
        throw Error("Cloud save release verification timed out");
      const requestUrl = new URL(url);
      requestUrl.searchParams.set("probe", String(probe++));
      const r = await fetcher(requestUrl, {
        ...options,
        cache: "no-store",
        signal: AbortSignal.timeout(Math.min(8000, remaining)),
      });
      try {
        checkReleaseResponse(r, revision);
      } catch (error) {
        await r.body?.cancel();
        if (!(error instanceof ReleaseMismatch) || attempt + 1 === attempts)
          throw error;
        onWait(error.message);
        // Reuse the same private code, mutation ID and snapshot. A previous
        // edge may have committed the PUT before its stale reply was rejected.
        await wait(Math.min(5000, Math.max(0, deadline - Date.now())));
        continue;
      }
      if (!r.ok) throw Error(`Cloud save verification HTTP ${r.status}`);
      if (r.headers.get("Access-Control-Allow-Origin") !== headers.Origin)
        throw Error("Cloud save GitHub Pages CORS is missing");
      return r.json();
    }
    throw Error("Cloud save release was not verified");
  };
  // Verify the same compact transport phones use, on a fresh isolated vault.
  const transport = await cloudSaveRequest({
    expectedRevision: 0,
    mutationId,
    game,
  });
  Object.assign(headers, transport.headers);
  const body = transport.body;
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
  if (cooperativeCheck) {
    delete headers["Content-Encoding"];
    const a = purchase(game, "mouse"),
      b = purchase(game, "yarn");
    const bodyA = JSON.stringify({
      cooperative: true,
      expectedRevision: 1,
      mutationId: crypto.randomUUID(),
      clientId: crypto.randomUUID(),
      sequence: 1,
      baseGame: game,
      game: a,
    });
    const bodyB = JSON.stringify({
      cooperative: true,
      expectedRevision: 1,
      mutationId: crypto.randomUUID(),
      clientId: crypto.randomUUID(),
      sequence: 1,
      baseGame: game,
      game: b,
    });
    await Promise.all([
      send({ method: "PUT", headers, body: bodyA }),
      send({ method: "PUT", headers, body: bodyB }),
    ]);
    // Retry the first request after the other writer. It must not apply twice.
    await send({ method: "PUT", headers, body: bodyA });
    const shared = await send({ headers });
    if (
      shared.revision !== 3 ||
      shared.game.inventory.mouse !== 1 ||
      shared.game.inventory.yarn !== 1 ||
      shared.game.coins !== game.coins - 80 ||
      shared.game.progression.xp !== 50
    )
      throw Error(
        "Shared world verification failed: concurrent purchases or idempotent retry differ",
      );
  }
}
