import { test } from "node:test";
import assert from "node:assert/strict";
import { SaveVault, cloudSave, SAVE_LIMIT } from "../save-vault.mjs";
import { CloudBackup } from "../public/cloud-save.js";
import { newGame } from "../public/economy.js";
import { verifyCloudSave } from "../scripts/cloud-check.mjs";
import worker from "../worker.mjs";
function local() {
  const map = new Map();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
}
function vault() {
  const map = new Map();
  let queue = Promise.resolve(),
    fail = false;
  const storage = {
    get: async (k) => structuredClone(map.get(k)),
    transaction: (fn) => {
      const run = queue.then(async () => {
        const draft = new Map(map);
        const result = await fn({
          get: async (k) => structuredClone(draft.get(k)),
          put: async (k, v) => {
            if (fail) throw Error("disk");
            draft.set(k, structuredClone(v));
          },
        });
        map.clear();
        for (const [k, v] of draft) map.set(k, v);
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
  return {
    map,
    instance: new SaveVault({ storage }),
    fail: () => (fail = true),
  };
}
const put = (instance, revision, game, id = crypto.randomUUID()) =>
  instance.fetch(
    new Request("https://cat/api/save", {
      method: "PUT",
      body: JSON.stringify({
        expectedRevision: revision,
        mutationId: id,
        game,
      }),
    }),
  );
function service() {
  const vaults = new Map();
  const env = {
    SAVE_VAULT: {
      idFromName: (n) => n,
      get: (n) => {
        if (!vaults.has(n)) vaults.set(n, vault());
        return vaults.get(n).instance;
      },
    },
  };
  return {
    vaults,
    fetcher: (url, options = {}) => cloudSave(new Request(url, options), env),
  };
}
function client(s, fetcher) {
  const c = new CloudBackup({
    storage: s,
    base: "https://cat.example",
    fetcher,
    delay: 60000,
  });
  const enqueue = c.enqueue.bind(c);
  c.enqueue = (g) => {
    enqueue(g);
    clearTimeout(c.timer);
  };
  return c;
}
test("cloud saves need a private recovery code and isolate worlds by hashed code", async () => {
  const srv = service();
  assert.equal((await srv.fetcher("https://cat/api/save")).status, 401);
  assert.equal(
    (await cloudSave(new Request("https://cat/api/save"), {})).status,
    503,
  );
  const a = client(local(), srv.fetcher),
    b = client(local(), srv.fetcher);
  const g = newGame();
  g.coins = 777;
  a.enqueue(g);
  await a.flush();
  assert.equal(a.revision, 1);
  assert.equal(await b.load(), null);
  assert.equal((await b.recover(a.token)).coins, 777);
  assert.equal(srv.vaults.size, 2);
  assert.ok(!srv.vaults.has(a.token));
});
test("parallel stale writers cannot replace a newer world; retries are idempotent", async () => {
  const v = vault(),
    g = newGame(),
    id = crypto.randomUUID();
  const first = await put(v.instance, 0, g, id);
  assert.equal(first.status, 200);
  const retry = await put(v.instance, 0, g, id);
  assert.equal((await retry.json()).revision, 1);
  assert.equal(
    (await put(v.instance, 1, { ...g, coins: 999 }, id)).status,
    409,
  );
  const writes = await Promise.all([
    put(v.instance, 1, { ...g, coins: 600 }),
    put(v.instance, 1, { ...g, coins: 700 }),
  ]);
  assert.deepEqual(writes.map((r) => r.status).sort(), [200, 409]);
  assert.equal(v.map.get("current").revision, 2);
});
test("cloud keeps three generations and a failed storage transaction changes none", async () => {
  const v = vault(),
    g = newGame();
  for (let i = 0; i < 3; i++)
    assert.equal(
      (await put(v.instance, i, { ...g, coins: 500 + i })).status,
      200,
    );
  assert.equal(v.map.get("current").game.coins, 502);
  assert.equal(v.map.get("previous").game.coins, 501);
  assert.equal(v.map.get("older").game.coins, 500);
  v.fail();
  await assert.rejects(put(v.instance, 3, { ...g, coins: 900 }));
  assert.equal(v.map.get("current").revision, 3);
  assert.equal(v.map.get("older").revision, 1);
});
test("invalid and oversized snapshots are refused before cloud storage mutation", async () => {
  const v = vault(),
    g = newGame();
  for (const bad of [
    { ...g, coins: -1 },
    { ...g, placements: Array(61).fill({}) },
    { ...g, unlocked: Array(26).fill("moon") },
  ])
    assert.equal((await put(v.instance, 0, bad)).status, 400);
  assert.equal(
    (await put(v.instance, 0, { ...g, padding: "x".repeat(SAVE_LIMIT) }))
      .status,
    413,
  );
  assert.equal(v.map.size, 0);
});
test("lost acknowledgement retries the original snapshot before saving newer pending actions", async () => {
  const srv = service(),
    s = local();
  let lose = true;
  const seen = [];
  const c = client(s, async (url, options = {}) => {
    if (options.method === "PUT") seen.push(JSON.parse(options.body));
    const r = await srv.fetcher(url, options);
    if (options.method === "PUT" && lose) {
      lose = false;
      throw Error("Disconnected after server write");
    }
    return r;
  });
  const g = newGame();
  g.coins = 500;
  c.enqueue(g);
  await c.flush();
  assert.equal(c.revision, 0);
  assert.equal(c.retryEntry.game.coins, 500);
  g.coins = 600;
  c.enqueue(g);
  await c.flush();
  assert.equal(c.revision, 2);
  assert.equal(c.dirty, false);
  assert.equal(seen[0].mutationId, seen[1].mutationId);
  assert.equal(seen[1].game.coins, 500);
  assert.equal(seen[2].game.coins, 600);
  assert.equal([...srv.vaults.values()][0].map.get("current").game.coins, 600);
});
test("new actions arriving during an in-flight save are queued as a later revision", async () => {
  const srv = service();
  let resume;
  const gate = new Promise((r) => (resume = r));
  let blocked = true;
  const c = client(local(), async (u, o) => {
    if (blocked) {
      blocked = false;
      await gate;
    }
    return srv.fetcher(u, o);
  });
  const g = newGame();
  g.coins = 500;
  c.enqueue(g);
  const flight = c.flush();
  g.coins = 700;
  c.enqueue(g);
  resume();
  await flight;
  assert.equal(c.revision, 2);
  assert.equal([...srv.vaults.values()][0].map.get("current").game.coins, 700);
});
test("restart reconciles an acknowledged server write without discarding later local progress", async () => {
  const srv = service(),
    s = local();
  const c = client(s, async (u, o) => {
    await srv.fetcher(u, o);
    throw Error("ACK lost");
  });
  const g = newGame();
  g.coins = 500;
  c.enqueue(g);
  await c.flush();
  const restarted = client(s, srv.fetcher);
  assert.equal(await restarted.load(), null);
  assert.equal(restarted.revision, 1);
  assert.equal(restarted.conflict, false);
  g.coins = 600;
  restarted.enqueue(g);
  await restarted.flush();
  assert.equal(restarted.revision, 2);
});
test("a newer remote device causes a conflict, never silent last-write-wins loss", async () => {
  const srv = service(),
    a = client(local(), srv.fetcher);
  const g = newGame();
  a.enqueue(g);
  await a.flush();
  const bs = local();
  bs.setItem("chichi-recovery-code", a.token);
  const b = client(bs, srv.fetcher);
  await b.load();
  b.enqueue({ ...g, coins: 900 });
  await b.flush();
  a.enqueue({ ...g, coins: 600 });
  await a.flush();
  assert.equal(a.conflict, true);
  assert.equal(a.retryEntry.game.coins, 600);
  assert.equal([...srv.vaults.values()][0].map.get("current").game.coins, 900);
});
test("invalid recovery or failed local installation retains the existing world code and pending changes", async () => {
  const srv = service(),
    a = client(local(), srv.fetcher),
    bs = local(),
    b = client(bs, srv.fetcher);
  const g = newGame();
  a.enqueue(g);
  await a.flush();
  const old = b.token;
  b.enqueue({ ...g, coins: 600 });
  clearTimeout(b.timer);
  await assert.rejects(b.recover("invalid"));
  assert.equal(b.token, old);
  await assert.rejects(
    b.recover(a.token, () => {
      throw Error("Quota");
    }),
    /Quota/,
  );
  assert.equal(b.token, old);
  assert.equal(bs.getItem("chichi-recovery-code"), old);
  assert.equal(b.pending.game.coins, 600);
  assert.equal((await b.recover(a.token)).coins, g.coins);
  assert.equal(b.pending, null);
  assert.equal(b.token, a.token);
});
test("publication smoke check exercises actual Worker routing, CORS and durable writes", async () => {
  const srv = service(),
    revision = "a".repeat(40);
  const env = {
    GAME_RELEASE: revision,
    SAVE_VAULT: {
      idFromName: (n) => n,
      get: (n) => {
        if (!srv.vaults.has(n)) srv.vaults.set(n, vault());
        return srv.vaults.get(n).instance;
      },
    },
  };
  await verifyCloudSave("https://cat.example", revision, (url, options) =>
    worker.fetch(new Request(url, options), env),
  );
  const preflight = await worker.fetch(
    new Request("https://cat/api/save", {
      method: "OPTIONS",
      headers: { Origin: "https://arturmal2805-netizen.github.io" },
    }),
    env,
  );
  assert.equal(preflight.status, 204);
  assert.ok(
    preflight.headers.get("Access-Control-Allow-Methods").includes("PUT"),
  );
  assert.ok(
    preflight.headers
      .get("Access-Control-Allow-Headers")
      .includes("X-Chichi-Save-Token"),
  );
});
test("default browser fetch keeps the global receiver needed by native APIs", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async function () {
    assert.equal(this, globalThis);
    return Response.json({ revision: 1, savedAt: 123 });
  };
  try {
    const c = new CloudBackup({
      storage: local(),
      base: "https://cat.example",
    });
    c.enqueue(newGame());
    await c.flush();
    assert.equal(c.revision, 1);
    assert.equal(c.dirty, false);
  } finally {
    globalThis.fetch = previous;
  }
});
test("publication retries stale save replies without duplicating a committed PUT or accepting an old GET", async () => {
  const instance = vault(),
    revision = "a".repeat(40),
    requests = [],
    waits = [];
  let staleRead = true;
  const env = {
    GAME_RELEASE: revision,
    SAVE_VAULT: { idFromName: (n) => n, get: () => instance.instance },
  };
  await verifyCloudSave(
    "https://cat.example",
    revision,
    async (url, options) => {
      requests.push({
        url: String(url),
        token: options.headers["X-Chichi-Save-Token"],
        body: options.body,
      });
      const reply = await worker.fetch(new Request(url, options), env);
      if (requests.length === 1 || (!options.body && staleRead)) {
        staleRead = !!options.body;
        reply.headers.set("X-Chichi-Release", "development");
      }
      return reply;
    },
    { wait: async (ms) => waits.push(ms), attempts: 3 },
  );
  assert.equal(requests.length, 5);
  assert.equal(waits.length, 2);
  assert.equal(new Set(requests.map((r) => r.url)).size, 5);
  assert.equal(new Set(requests.map((r) => r.token)).size, 1);
  assert.equal(
    new Set(requests.filter((r) => r.body).map((r) => r.body)).size,
    1,
  );
  assert.equal(instance.map.get("current").revision, 1);
  assert.equal(instance.map.get("previous"), undefined);
});
test("publication refuses persistent development labels and does not retry genuine storage failures", async () => {
  const revision = "a".repeat(40);
  let staleCalls = 0,
    failedCalls = 0;
  await assert.rejects(
    verifyCloudSave(
      "https://cat.example",
      revision,
      async () => {
        staleCalls++;
        return Response.json(
          {},
          {
            headers: { "X-Chichi-Release": "development" },
          },
        );
      },
      { wait: async () => {}, attempts: 3 },
    ),
    /received development/,
  );
  assert.equal(staleCalls, 3);
  await assert.rejects(
    verifyCloudSave("https://cat.example", revision, async (url, options) => {
      failedCalls++;
      return worker.fetch(new Request(url, options), {
        GAME_RELEASE: revision,
      });
    }),
    /HTTP 503/,
  );
  assert.equal(failedCalls, 1);
});
test("a replaced code resets revision metadata, while corrupt metadata preserves the recovery code", async () => {
  const srv = service(),
    s = local();
  s.setItem("chichi-recovery-code", "invalid");
  s.setItem("chichi-cloud-save", JSON.stringify({ revision: 99, dirty: true }));
  const c = client(s, srv.fetcher);
  assert.equal(c.revision, 0);
  c.enqueue(newGame());
  await c.flush();
  assert.equal(c.revision, 1);
  const code = c.token;
  s.setItem("chichi-cloud-save", "broken json");
  const restored = client(s, srv.fetcher);
  assert.equal(restored.token, code);
  await restored.load();
  assert.equal(restored.conflict, true);
  assert.equal((await restored.recover(code)).version, 2);
});
