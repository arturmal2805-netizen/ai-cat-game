import { advanceCare } from "../public/care-system.js";
import worker from "../worker.mjs";
import { verifyCloudSave } from "../scripts/cloud-check.mjs";
import { byItem } from "../public/game-data.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { CloudBackup } from "../public/cloud-save.js";
import { SaveVault, cloudSave, accountAccess } from "../save-vault.mjs";
import { mergeSharedWorld } from "../shared-world.mjs";
import {
  newGame,
  purchase,
  placeItem,
  findSpace,
  moveItem,
  storeItem,
  claimRewards,
  attentionReward,
  HOUR,
  harvestField,
  sellHarvest,
  saveGame,
  loadGame,
} from "../public/economy.js";
import { collectIncome, normalizeBusiness } from "../public/business.js";
import {
  xpForLevel,
  levelForXP,
  adventureXP,
  addXP,
  DAILY_XP_LIMIT,
} from "../public/progression.js";

const memory = () => {
  const data = new Map();
  return {
    data,
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, v),
  };
};
function service() {
  const vaults = new Map();
  const env = {
    SAVE_VAULT: {
      idFromName: (n) => n,
      get: (n) => {
        if (!vaults.has(n)) {
          const map = new Map();
          let queue = Promise.resolve();
          const storage = {
            get: async (k) => structuredClone(map.get(k)),
            transaction: (fn) => {
              const run = queue.then(async () => {
                const draft = new Map(map),
                  result = await fn({
                    get: async (k) => structuredClone(draft.get(k)),
                    put: async (k, v) => draft.set(k, structuredClone(v)),
                  });
                map.clear();
                for (const [k, v] of draft) map.set(k, v);
                return result;
              });
              queue = run.catch(() => {});
              return run;
            },
          };
          vaults.set(n, new SaveVault({ storage }));
        }
        return vaults.get(n);
      },
    },
  };
  return {
    env,
    fetcher: (url, options = {}) =>
      new URL(url).pathname === "/api/account"
        ? accountAccess(new Request(url, options), env)
        : cloudSave(new Request(url, options), env),
  };
}
function player(s, server, token) {
  if (token) s.setItem("chichi-recovery-code", token);
  const p = { game: null, notices: [], storage: s };
  p.cloud = new CloudBackup({
    storage: s,
    base: "https://cat.example",
    fetcher: server.fetcher,
    cooperative: true,
    shared: true,
    sessionStorage: memory(),
    delay: 60000,
    onSnapshot: (g) => {
      p.game = structuredClone(g);
      saveGame(s, g);
      return true;
    },
    onNotice: (m) => p.notices.push(m),
  });
  const enqueue = p.cloud.enqueue.bind(p.cloud);
  p.send = (g) => {
    p.game = g;
    saveGame(s, g);
    enqueue(g);
    clearTimeout(p.cloud.timer);
  };
  return p;
}
const fresh = () => {
  const g = newGame();
  g.progression.xp = xpForLevel(5);
  g.progression.xpDay = "2026-10-15";
  g.progression.dailyXP = 0;
  g.coins = 5000;
  return g;
};
async function pair(server = service(), initial = fresh()) {
  const a = player(memory(), server);
  a.send(initial);
  await a.cloud.flush();
  const b = player(memory(), server, a.cloud.token);
  b.game = await b.cloud.load();
  return { a, b, server };
}
const saveBoth = async (a, b) => {
  await Promise.all([a.cloud.flush(), b.cloud.flush()]);
  await a.cloud.sync((g) => {
    a.game = g;
  });
  await b.cloud.sync((g) => {
    b.game = g;
  });
};

test("cloud saves on two phones preserve uncapped business XP after the activity allowance is full", async () => {
  const at = Date.now(),
    initial = addXP(fresh(), DAILY_XP_LIMIT, at);
  initial.unlocked.push("homestead");
  for (const [i, item] of ["business-coffee", "business-hotdog"].entries())
    initial.placements.push({
      id: "uncapped-" + i,
      item,
      biome: "homestead",
      x: i ? 15 : -15,
      z: 0,
      rotation: 0,
      readyAt: 0,
    });
  initial.business = normalizeBusiness(initial.business, initial, at - 3600000);
  const { a, b } = await pair(service(), initial);
  a.send(collectIncome(a.game, "uncapped-0", at).game);
  b.send(collectIncome(b.game, "uncapped-1", at).game);
  await saveBoth(a, b);
  for (const p of [a, b]) {
    assert.equal(p.game.progression.xp, initial.progression.xp + 99 + 137);
    assert.equal(p.game.progression.businessXP, 99 + 137);
    assert.equal(p.game.progression.dailyXP, DAILY_XP_LIMIT);
    saveGame(p.storage, p.game);
    const restored = loadGame(p.storage, at, { advance: false });
    assert.equal(restored.progression.xp, p.game.progression.xp);
    assert.equal(restored.progression.businessXP, 236);
    assert.throws(() => collectIncome(restored, "uncapped-0", at));
    assert.throws(() => collectIncome(restored, "uncapped-1", at));
  }
});

test("two devices use one account code without overwriting or choosing another world", async () => {
  const { a, server } = await pair();
  const token = await a.cloud.account("create", "1427");
  assert.equal(token, a.cloud.token);
  const b = player(memory(), server);
  b.send(newGame());
  await b.cloud.flush();
  assert.equal(await b.cloud.account("login", "1427"), token);
  b.cloud.archive(b.game);
  await b.cloud.recover(token, (g) => {
    b.game = g;
    saveGame(b.storage, g);
  });
  assert.equal(b.game.coins, a.game.coins);
  assert.equal(b.game.progression.xp, a.game.progression.xp);
  await assert.rejects(b.cloud.account("create", "1427"), /уже связан/);
  assert.ok(JSON.parse(b.storage.getItem("chichi-world-archives"))[0].game);
});
test("simultaneous purchases retain both items, exact money and combined XP on both devices", async () => {
  const { a, b } = await pair();
  const balance = a.game.coins,
    xp = a.game.progression.xp;
  a.send(purchase(a.game, "mouse"));
  b.send(purchase(b.game, "yarn"));
  await saveBoth(a, b);
  for (const p of [a, b]) {
    assert.equal(p.game.inventory.mouse, 1);
    assert.equal(p.game.inventory.yarn, 1);
    assert.equal(
      p.game.coins,
      balance - byItem("mouse").price - byItem("yarn").price,
    );
    assert.equal(p.game.progression.xp, xp + 50);
    assert.equal(p.cloud.conflict, false);
  }
});
test("same-item purchases charge twice but first-discovery XP and each level bonus happen once", async () => {
  const initial = fresh();
  initial.progression.xp = 100;
  const { a, b } = await pair(service(), initial);
  a.send(purchase(a.game, "mouse"));
  b.send(purchase(b.game, "mouse"));
  await saveBoth(a, b);
  assert.equal(a.game.inventory.mouse, 2);
  assert.equal(a.game.coins, 5000 - byItem("mouse").price * 2 + 60);
  assert.equal(a.game.progression.xp, 125);
  assert.equal(levelForXP(a.game.progression.xp), 2);
});
test("concurrent placement preserves both UUIDs and building deadlines through reload", async () => {
  const { a, b } = await pair();
  for (const p of [a, b]) {
    p.game.unlocked.push("summer");
    p.game.inventory.mouse = 2;
  }
  let g = structuredClone(a.game);
  a.send(g);
  await a.cloud.flush();
  b.game = await b.cloud.load();
  const p1 = findSpace(a.game, "mouse", "moon"),
    p2 = findSpace(b.game, "mouse", "summer");
  a.send(placeItem(a.game, "mouse", "moon", p1.x, p1.z));
  b.send(placeItem(b.game, "mouse", "summer", p2.x, p2.z));
  const ids = [a.game.placements.at(-1).id, b.game.placements.at(-1).id];
  assert.notEqual(ids[0], ids[1]);
  await saveBoth(a, b);
  for (const p of [a, b]) {
    assert.ok(ids.every((id) => p.game.placements.some((x) => x.id === id)));
    saveGame(p.storage, p.game);
    const restored = loadGame(p.storage);
    assert.ok(ids.every((id) => restored.placements.some((x) => x.id === id)));
    assert.equal(restored.inventory.mouse, 0);
  }
});
test("a simultaneous placement on the same plot keeps the second purchased object in the bag", () => {
  const base = fresh();
  base.inventory.mouse = 2;
  const spot = findSpace(base, "mouse", "moon");
  const a = placeItem(base, "mouse", "moon", spot.x, spot.z),
    b = placeItem(base, "mouse", "moon", spot.x, spot.z);
  const merged = mergeSharedWorld(base, a, b);
  assert.equal(merged.placements.filter((p) => p.item === "mouse").length, 1);
  assert.equal(merged.inventory.mouse, 1);
  assert.equal(merged.relocatedPurchases.length, 1);
});
test("the same harvest or business register cannot pay two people twice", () => {
  const base = fresh(),
    a = harvestField(base, "welcome-farm").game,
    b = harvestField(base, "welcome-farm").game;
  assert.throws(() => mergeSharedWorld(base, a, b), /другом телефоне/);
  const spot = findSpace(base, "business-coffee", "moon");
  base.placements.push({
    id: "cash-business",
    item: "business-coffee",
    biome: "moon",
    ...spot,
    rotation: 0,
    readyAt: 0,
  });
  const now = Date.now();
  base.business = normalizeBusiness({}, base, now - 3600000);
  const one = collectIncome(base, "cash-business", now).game,
    two = collectIncome(base, "cash-business", now).game;
  assert.throws(() => mergeSharedWorld(base, one, two), /другом телефоне/);
});
test("a disjoint harvest and shop purchase preserve exact balances, crop stock and XP", () => {
  const base = fresh(),
    a = harvestField(base, "welcome-farm").game,
    b = purchase(base, "mouse");
  const merged = mergeSharedWorld(base, a, b);
  assert.equal(merged.inventory.mouse, 1);
  assert.equal(merged.farm.stock.wheat, 2);
  assert.equal(merged.coins, base.coins - byItem("mouse").price);
  assert.equal(merged.progression.xp, base.progression.xp + 61);
});
test("overspending is refused, archived locally and refreshed automatically without a world chooser", async () => {
  const { a, b } = await pair();
  a.game.coins = 60;
  a.send(a.game);
  await a.cloud.flush();
  b.game = await b.cloud.load();
  a.send(purchase(a.game, "mouse"));
  b.send(purchase(b.game, "mouse"));
  await saveBoth(a, b);
  assert.equal(a.game.inventory.mouse, 1);
  assert.equal(b.game.inventory.mouse, 1);
  assert.equal(a.game.coins, 15);
  assert.equal(b.game.coins, 15);
  assert.equal(a.notices.length + b.notices.length, 1);
  assert.ok(
    a.storage.getItem("chichi-world-archives") ||
      b.storage.getItem("chichi-world-archives"),
  );
  assert.equal(b.cloud.conflict, false);
});
test("a lost acknowledgement is idempotent even after another phone saves in between", async () => {
  const server = service(),
    { a, b } = await pair(server),
    real = a.cloud.fetcher;
  let lose = true;
  a.cloud.fetcher = async (u, o) => {
    const r = await real(u, o);
    if (lose && o?.method === "PUT") {
      lose = false;
      throw Error("ACK lost");
    }
    return r;
  };
  a.send(purchase(a.game, "mouse"));
  await a.cloud.flush();
  b.send(purchase(b.game, "yarn"));
  await b.cloud.flush();
  await a.cloud.flush();
  await saveBoth(a, b);
  assert.equal(a.game.inventory.mouse, 1);
  assert.equal(a.game.inventory.yarn, 1);
  assert.equal(a.game.coins, 4920);
});
test("closing and restarting offline retains the durable outbox, original mutation IDs and later local actions", async () => {
  const server = service(),
    { a, b } = await pair(server);
  a.cloud.fetcher = async () => {
    throw Error("offline");
  };
  a.send(purchase(a.game, "mouse"));
  await a.cloud.flush();
  a.send(purchase(a.game, "yarn"));
  const originalId = a.cloud.retryEntry.mutationId,
    restarted = player(a.storage, server);
  assert.equal(restarted.cloud.retryEntry.mutationId, originalId);
  await restarted.cloud.flush();
  await b.cloud.sync((g) => {
    b.game = g;
  });
  assert.equal(b.game.inventory.mouse, 1);
  assert.equal(b.game.inventory.yarn, 1);
  assert.equal(b.game.coins, 4920);
  assert.equal(restarted.cloud.dirty, false);
});
test("250 alternating concurrent save rounds keep every coin, item and revision", async () => {
  const { a, b } = await pair();
  let expected = 5000;
  for (let round = 0; round < 250; round++) {
    const ga = structuredClone(a.game),
      gb = structuredClone(b.game);
    ga.coins += 7;
    ga.totalEarned += 7;
    gb.coins += 11;
    gb.totalEarned += 11;
    a.send(ga);
    b.send(gb);
    await saveBoth(a, b);
    expected += 18;
    assert.equal(a.game.coins, expected, "round " + round);
    assert.equal(b.game.coins, expected, "round " + round);
    assert.equal(a.cloud.revision, b.cloud.revision);
    assert.equal(a.cloud.conflict, false);
    assert.equal(b.cloud.conflict, false);
  }
});
test("account attempts are limited and a missing code never creates a replacement world implicitly", async () => {
  const srv = service();
  for (let i = 0; i < 6; i++) {
    const r = await srv.fetcher("https://cat.example/api/account", {
      method: "POST",
      body: JSON.stringify({ action: "login", code: "1427" }),
    });
    assert.equal(r.status, 404);
  }
  const r = await srv.fetcher("https://cat.example/api/account", {
    method: "POST",
    body: JSON.stringify({ action: "login", code: "1427" }),
  });
  assert.equal(r.status, 429);
});

test("new actions during an in-flight shared save keep their own base and survive another device purchase", async () => {
  const { a, b } = await pair();
  let resume;
  const gate = new Promise((r) => (resume = r)),
    real = a.cloud.fetcher;
  let block = true;
  a.cloud.fetcher = async (u, o) => {
    if (o?.method === "PUT" && block) {
      block = false;
      await gate;
    }
    return real(u, o);
  };
  a.send(purchase(a.game, "mouse"));
  const flight = a.cloud.flush();
  a.send(purchase(a.game, "yarn"));
  b.send(purchase(b.game, "business-farmstand"));
  await b.cloud.flush();
  resume();
  await flight;
  await saveBoth(a, b);
  assert.equal(a.game.inventory.mouse, 1);
  assert.equal(a.game.inventory.yarn, 1);
  assert.equal(a.game.inventory["business-farmstand"], 1);
  assert.equal(a.game.coins, 4740);
});
test("a full local outbox never sends unjournaled mutations, and restart reconstructs the primary local action", async () => {
  const { a, server } = await pair();
  const original = a.storage.setItem;
  let fail = true;
  a.storage.setItem = (k, v) => {
    if (fail && k === "chichi-cloud-outbox") throw Error("quota");
    original(k, v);
  };
  const revision = a.cloud.revision;
  a.send(purchase(a.game, "mouse"));
  await a.cloud.flush();
  assert.equal(a.cloud.revision, revision);
  fail = false;
  const reboot = player(a.storage, server);
  await reboot.cloud.flush();
  assert.equal(reboot.game.inventory.mouse, 1);
  assert.equal(reboot.game.coins, 4955);
  assert.equal(reboot.cloud.dirty, false);
});
test("a full world is compressed under the browser keepalive budget and remains durably queued", async () => {
  const { a } = await pair();
  const real = a.cloud.fetcher;
  let seen;
  a.cloud.fetcher = (u, o) => {
    if (o?.method === "PUT") seen = o;
    return real(u, o);
  };
  const g = structuredClone(a.game);
  // Exercise keepalive without crossing the independent server save cap as
  // new real care/social records are added to the base world.
  g.padding = "x".repeat(
    Math.max(0, 66000 - new TextEncoder().encode(JSON.stringify(g)).length),
  );
  a.send(g);
  await a.cloud.flush();
  assert.equal(seen.keepalive, true);
  assert.equal(seen.headers["Content-Encoding"], "gzip");
  assert.ok(seen.body.byteLength < 60000);
  assert.equal(a.cloud.dirty, false);
});
test("daily shared XP caps and distinct simultaneous level gains cannot duplicate level rewards", () => {
  const base = fresh();
  base.progression.xp = 100;
  base.progression.dailyXP = 1790;
  const a = structuredClone(base),
    b = structuredClone(base);
  for (const g of [a, b]) {
    g.progression.xp += 10;
    g.progression.dailyXP += 10;
    g.coins += 3;
    g.totalEarned += 3;
  }
  const merged = mergeSharedWorld(base, a, b);
  assert.equal(merged.progression.xp, 110);
  assert.equal(merged.progression.dailyXP, 1800);
  assert.equal(merged.coins, 5006);
});

test("a deferred authoritative snapshot is installed on restart instead of deleting another phone purchase", async () => {
  const { a, b, server } = await pair();
  a.cloud.onSnapshot = () => false;
  b.send(purchase(b.game, "yarn"));
  await b.cloud.flush();
  a.send(purchase(a.game, "mouse"));
  await a.cloud.flush();
  assert.ok(a.cloud.remoteGame);
  const restarted = player(a.storage, server);
  const raw = await restarted.cloud.load();
  assert.ok(raw);
  assert.equal(raw.inventory.mouse, 1);
  assert.equal(raw.inventory.yarn, 1);
});
test("a delayed lost ACK stays idempotent after the bounded receipt window has rolled over", async () => {
  const { a, b } = await pair();
  const real = a.cloud.fetcher;
  let lose = true;
  a.cloud.fetcher = async (u, o) => {
    const r = await real(u, o);
    if (lose && o?.method === "PUT") {
      lose = false;
      throw Error("lost");
    }
    return r;
  };
  a.send(purchase(a.game, "mouse"));
  await a.cloud.flush();
  for (let i = 0; i < 260; i++) {
    const g = structuredClone(b.game);
    g.coins++;
    b.send(g);
    await b.cloud.flush();
  }
  const restarted = player(a.storage, { fetcher: real });
  await restarted.cloud.flush();
  assert.equal(restarted.game.inventory.mouse, 1);
  assert.equal(restarted.game.coins, 5000 - 45 + 260);
});

test("publication verifies concurrent writes through the real Worker route and CORS on an isolated world", async () => {
  const srv = service(),
    revision = "a".repeat(40),
    env = { ...srv.env, GAME_RELEASE: revision };
  await verifyCloudSave(
    "https://cat.example",
    revision,
    (url, opts) => worker.fetch(new Request(url, opts), env),
    { cooperativeCheck: true },
  );
});

test("a local action arriving during a remote GET stays queued for merge instead of freezing in a conflict", async () => {
  const { a, b } = await pair();
  b.send(purchase(b.game, "yarn"));
  await b.cloud.flush();
  const real = a.cloud.fetcher;
  let resume;
  const gate = new Promise((r) => (resume = r));
  a.cloud.fetcher = async (u, o) => {
    const r = await real(u, o);
    if (!o?.method) await gate;
    return r;
  };
  const read = a.cloud.load();
  a.send(purchase(a.game, "mouse"));
  resume();
  assert.equal(await read, null);
  assert.equal(a.cloud.conflict, false);
  await a.cloud.flush();
  assert.equal(a.game.inventory.mouse, 1);
  assert.equal(a.game.inventory.yarn, 1);
});
test("concurrent bowl filling cannot overflow capacity or discard another adopted cat needs", () => {
  const base = fresh(),
    a = structuredClone(base),
    b = structuredClone(base);
  a.care.bowl = [{ crop: "wheat", portions: 100 }];
  b.care.bowl = [{ crop: "wheat", portions: 100 }];
  assert.throws(() => mergeSharedWorld(base, a, b), /Миска уже наполнена/);
  a.care.bowl = [];
  b.care.bowl = [];
  a.care.residents["new-a"] = { hunger: 20, happiness: 90 };
  b.care.residents["new-b"] = { hunger: 30, happiness: 70 };
  const g = mergeSharedWorld(base, a, b);
  assert.ok(g.care.residents["new-a"]);
  assert.ok(g.care.residents["new-b"]);
});

test("a temporarily older server never rolls a confirmed revision back or consumes the local outbox", async () => {
  const { a, server } = await pair();
  a.cloud.revision = 9;
  a.cloud.metadata(false);
  a.send(purchase(a.game, "mouse"));
  await a.cloud.flush();
  assert.equal(a.cloud.revision, 9);
  assert.ok(a.cloud.retryEntry);
  assert.equal(a.game.inventory.mouse, 1);
  assert.equal(a.cloud.conflict, false);
  const fresh = player(memory(), server, a.cloud.token);
  const actual = await fresh.cloud.load();
  assert.equal(actual.inventory.mouse, undefined);
});
test("revision metadata from another account cannot hide that accounts newer saved world", async () => {
  const { a, server } = await pair();
  const s = memory();
  s.setItem("chichi-recovery-code", a.cloud.token);
  s.setItem(
    "chichi-cloud-save",
    JSON.stringify({ token: "f".repeat(64), revision: 999, dirty: true }),
  );
  const b = player(s, server);
  assert.equal(b.cloud.revision, 0);
  assert.ok(await b.cloud.load());
  assert.equal(b.cloud.conflict, false);
});

test("one automatic simulator is elected while both phones can still make manual purchases", async () => {
  const { a, b } = await pair();
  assert.equal(await a.cloud.claimEditor(), true);
  assert.equal(await b.cloud.claimEditor(), false);
  assert.equal(a.cloud.editable, true);
  assert.equal(b.cloud.editable, true);
  a.send(purchase(a.game, "mouse"));
  b.send(purchase(b.game, "yarn"));
  await saveBoth(a, b);
  assert.equal(a.game.inventory.mouse, 1);
  assert.equal(a.game.inventory.yarn, 1);
  await a.cloud.releaseEditor();
  assert.equal(await b.cloud.claimEditor(), true);
  assert.equal(b.cloud.simulationOwner, true);
  assert.equal(a.cloud.editable, true);
});
test("shared level-up coins remain spendable even when an intermediate rebase balance is negative", () => {
  const base = fresh();
  base.coins = 0;
  base.progression.xp = 100;
  const a = structuredClone(base);
  a.coins = 1;
  const b = purchase(harvestField(base, "welcome-farm").game, "mouse");
  const merged = mergeSharedWorld(base, a, b);
  assert.equal(merged.coins, 16);
  assert.equal(merged.inventory.mouse, 1);
  assert.equal(merged.progression.xp, 161);
});

test("two existing objects moved onto the same new plot never produce an unloadable save that drops a purchase", () => {
  let base = fresh();
  base.unlocked.push("summer", "clouds");
  base.inventory.mouse = 2;
  for (const biome of ["moon", "clouds"]) {
    const p = findSpace(base, "mouse", biome);
    base = placeItem(base, "mouse", biome, p.x, p.z);
  }
  const ids = base.placements
      .filter((p) => p.item === "mouse")
      .map((p) => p.id),
    slot = findSpace(base, "mouse", "summer");
  const a = moveItem(base, ids[0], "summer", slot.x, slot.z),
    b = moveItem(base, ids[1], "summer", slot.x, slot.z);
  assert.throws(() => mergeSharedWorld(base, a, b), /Предмет сохранился/);
  const s = memory();
  saveGame(s, a);
  const restored = loadGame(s);
  assert.ok(ids.every((id) => restored.placements.some((p) => p.id === id)));
});

test("a GET deferred during a drag cannot replace the diff base before that snapshot is actually installed", async () => {
  const { a, b } = await pair();
  b.send(purchase(b.game, "mouse"));
  await b.cloud.flush();
  const before = structuredClone(a.game);
  await a.cloud.sync(() => false);
  assert.equal(a.cloud.localGame.inventory.mouse, before.inventory.mouse);
  assert.ok(a.cloud.remoteGame);
  a.send(purchase(a.game, "yarn"));
  await a.cloud.flush();
  assert.equal(a.game.inventory.mouse, 1);
  assert.equal(a.game.inventory.yarn, 1);
  assert.equal(a.game.coins, 4920);
});
test("a drag starting during remote GET postpones installation until the visible game can change safely", async () => {
  const { a, b } = await pair();
  b.send(purchase(b.game, "mouse"));
  await b.cloud.flush();
  let dragging = false,
    resume,
    started;
  const began = new Promise((r) => (started = r));
  const gate = new Promise((r) => (resume = r)),
    real = a.cloud.fetcher;
  a.cloud.fetcher = async (u, o) => {
    const r = await real(u, o);
    if (!o?.method) {
      started();
      await gate;
    }
    return r;
  };
  const syncing = a.cloud.sync(
    (g) => {
      a.game = g;
    },
    { canInstall: () => !dragging },
  );
  await began;
  dragging = true;
  resume();
  await syncing;
  assert.equal(a.game.inventory.mouse, undefined);
  assert.ok(a.cloud.remoteGame);
  dragging = false;
  a.cloud.acceptSnapshot((g) => {
    a.game = g;
  });
  assert.equal(a.game.inventory.mouse, 1);
});

test("offline hunger ticks and online hunger ticks never discard a purchase bundled with care", () => {
  const base = fresh(),
    time = base.care.lastTick;
  const a = advanceCare(base, time + 120000),
    b = purchase(advanceCare(base, time + 60000), "mouse");
  const g = mergeSharedWorld(base, a, b);
  assert.equal(g.inventory.mouse, 1);
  assert.equal(g.coins, 4955);
  assert.equal(g.care.lastTick, time + 120000);
  assert.equal(g.cat.hunger, a.cat.hunger);
  assert.equal(g.cat.energy, a.cat.energy);
});
test("hourly reward overlap is deducted once while purchases on both phones survive", () => {
  const base = fresh(),
    at = base.lastHourly + HOUR;
  const a = purchase(claimRewards(base, at).game, "mouse", at),
    b = purchase(claimRewards(base, at).game, "yarn", at);
  const g = mergeSharedWorld(base, a, b);
  assert.equal(g.inventory.mouse, 1);
  assert.equal(g.inventory.yarn, 1);
  assert.equal(g.coins, 5000 + 60 - 80);
});
test("same-day login overlap preserves both purchases, one login and one visit XP award", () => {
  const base = fresh(),
    at = Date.now();
  base.lastVisit = null;
  base.progression.lastVisitDay = null;
  const a = purchase(claimRewards(base, at, true).game, "mouse", at),
    b = purchase(claimRewards(base, at, true).game, "yarn", at);
  const g = mergeSharedWorld(base, a, b);
  assert.equal(g.inventory.mouse, 1);
  assert.equal(g.inventory.yarn, 1);
  assert.equal(g.coins, 5000 + 70 - 80);
  assert.equal(g.progression.xp, base.progression.xp + 90);
  assert.equal(g.progression.visits, base.progression.visits + 1);
});
test("attention reward overlap does not discard the other phones toy or double the reward", () => {
  const base = fresh(),
    at = Date.now();
  const a = purchase(attentionReward(base, at).game, "mouse", at),
    b = purchase(attentionReward(base, at + 1000).game, "yarn", at);
  const g = mergeSharedWorld(base, a, b);
  assert.equal(g.inventory.mouse, 1);
  assert.equal(g.inventory.yarn, 1);
  assert.equal(g.coins, 5000 + 10 - 80);
});

test("two adventure cooldown rewards never reject unrelated purchases or award their XP twice", () => {
  const base = fresh(),
    at = Date.now();
  const a = purchase(adventureXP(base, at), "mouse", at),
    b = purchase(adventureXP(base, at + 1000), "yarn", at);
  const g = mergeSharedWorld(base, a, b);
  assert.equal(g.inventory.mouse, 1);
  assert.equal(g.inventory.yarn, 1);
  assert.equal(g.progression.xp, base.progression.xp + 66);
});

test("an income conflict cannot discard an independently queued Adoption Center placement", async () => {
  const initial = fresh(),
    now = Date.now();
  initial.unlocked.push("homestead");
  initial.inventory["adoption-center"] = 1;
  initial.placements.push({
    id: "existing-register",
    item: "business-coffee",
    biome: "homestead",
    x: -20,
    z: -20,
    rotation: 0,
    readyAt: 0,
  });
  initial.business = normalizeBusiness({}, initial, now - 3600000);
  const { a, b } = await pair(service(), initial);
  let resume;
  const gate = new Promise((resolve) => (resume = resolve)),
    real = a.cloud.fetcher;
  let block = true;
  a.cloud.fetcher = async (u, o) => {
    if (o?.method === "PUT" && block) {
      block = false;
      await gate;
    }
    return real(u, o);
  };
  a.send(collectIncome(a.game, "existing-register", now).game);
  const flight = a.cloud.flush();
  a.send(placeItem(a.game, "adoption-center", "homestead", 20, 20, 0, now));
  const placed = structuredClone(a.game.placements.at(-1));
  b.send(collectIncome(b.game, "existing-register", now).game);
  await b.cloud.flush();
  resume();
  await flight;
  await saveBoth(a, b);
  for (const p of [a, b]) {
    assert.ok(
      p.game.placements.some((x) => x.id === placed.id),
      "later building must survive the earlier register conflict",
    );
    assert.equal(p.game.inventory["adoption-center"], 0);
    saveGame(p.storage, p.game);
    assert.equal(
      loadGame(p.storage, now, { advance: false }).placements.find(
        (x) => x.id === placed.id,
      ).readyAt,
      placed.readyAt,
    );
  }
  assert.equal(a.game.coins, b.game.coins);
  assert.equal(a.notices.length, 1);
});

test("30 mobile restarts with offline placement preserve Adoption Centers, glass slides and the other phone's changes", async () => {
  const initial = fresh();
  initial.unlocked.push("homestead");
  initial.inventory["adoption-center"] = 1;
  initial.inventory["slide-glass-corkscrew"] = 1;
  const server = service();
  let { a, b } = await pair(server, initial);
  const real = server.fetcher;
  for (let round = 0; round < 30; round++) {
    const now = Date.now() + round * 86400000;
    a.cloud.fetcher = async () => {
      throw Error("phone connection interrupted");
    };
    a.send(placeItem(a.game, "adoption-center", "homestead", -25, -25, 0, now));
    const center = structuredClone(a.game.placements.at(-1));
    await a.cloud.flush();
    a.send(
      placeItem(
        a.game,
        "slide-glass-corkscrew",
        "homestead",
        15,
        15,
        round % 4,
        now,
      ),
    );
    const slide = structuredClone(a.game.placements.at(-1));
    const next = structuredClone(b.game);
    next.coins += 7;
    next.totalEarned += 7;
    b.send(next);
    await b.cloud.flush();
    const restart = player(a.storage, server);
    assert.ok(restart.cloud.retryEntry);
    assert.ok(restart.cloud.pending);
    await restart.cloud.flush();
    await saveBoth(restart, b);
    for (const p of [restart, b]) {
      assert.deepEqual(
        p.game.placements.find((x) => x.id === center.id),
        center,
        "center round " + round,
      );
      assert.deepEqual(
        p.game.placements.find((x) => x.id === slide.id),
        slide,
        "slide round " + round,
      );
      saveGame(p.storage, p.game);
      assert.deepEqual(
        loadGame(p.storage, now, { advance: false }).placements,
        p.game.placements,
      );
    }
    // Free the same plots after finishing their actual construction deadlines.
    restart.send(
      storeItem(
        storeItem(restart.game, center.id, slide.readyAt + 1),
        slide.id,
        slide.readyAt + 1,
      ),
    );
    await saveBoth(restart, b);
    a = restart;
  }
});
