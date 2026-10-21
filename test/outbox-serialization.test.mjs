import test from "node:test";
import assert from "node:assert/strict";
import { serializeOutbox } from "../public/outbox-serialization.js";
import { CloudBackup } from "../public/cloud-save.js";
import { newGame } from "../public/economy.js";

test("large journal remains byte-for-byte readable by released clients, with pending/retry/base snapshots intact", () => {
  const game = newGame(1_700_000_000_000);
  game.notes = Array.from({ length: 1500 }, (_, i) => ({
    name: 'Котик 🐈 "' + i,
    items: [i, null, { x: i, z: -(i + 1) }],
  }));
  const base = structuredClone(game);
  base.coins -= 5;
  for (const retry of [
    null,
    {
      game: base,
      baseGame: base,
      mutationId: "lost-response",
      sequence: 7,
      clientId: "old-phone",
    },
  ]) {
    const box = {
      token: "f".repeat(64),
      pending: {
        game,
        mutationId: "next-purchase",
        sequence: 8,
        clientId: "phone",
        baseGame: base,
      },
      retryEntry: retry,
      localGame: game,
      remoteGame: base,
      sequence: 8,
    };
    assert.equal(serializeOutbox(box), JSON.stringify(box));
    const legacy = JSON.parse(serializeOutbox(box));
    assert.deepEqual(legacy.pending.game, game);
    assert.deepEqual(legacy.pending.baseGame, base);
    assert.deepEqual(legacy.retryEntry, retry);
    game.coins += 1;
    assert.equal(
      serializeOutbox(box),
      JSON.stringify(box),
      "a later write must encode current values, never stale cached JSON",
    );
  }
});

test("enqueue owns an isolated snapshot, keeps earlier bases and survives restart in the unchanged journal format", () => {
  const map = new Map(),
    storage = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => map.set(k, v),
    };
  const options = {
    storage,
    base: "https://private.invalid",
    fetcher: async () => {
      throw Error("offline");
    },
    cooperative: true,
    delay: 60000,
    sessionStorage: undefined,
  };
  const client = new CloudBackup(options),
    game = newGame(1_700_000_000_000);
  client.localGame = structuredClone(game);
  const original = structuredClone(game);
  game.coins -= 7;
  client.enqueue(game);
  clearTimeout(client.timer);
  game.coins = 1;
  game.placements.length = 0;
  assert.equal(client.pending.game.coins, original.coins - 7);
  assert.equal(client.localGame.coins, original.coins - 7);
  assert.deepEqual(client.pending.baseGame, original);
  const second = structuredClone(client.localGame);
  second.coins -= 3;
  client.enqueue(second);
  clearTimeout(client.timer);
  const legacy = JSON.parse(storage.getItem("chichi-cloud-outbox"));
  assert.equal(legacy.pending.game.coins, original.coins - 10);
  assert.deepEqual(legacy.pending.baseGame, original);
  const restored = new CloudBackup(options);
  assert.deepEqual(restored.pending, legacy.pending);
  assert.deepEqual(restored.localGame, legacy.localGame);
  storage.setItem = () => {};
  restored.sequence++;
  assert.equal(
    restored.saveOutbox(),
    false,
    "synchronous write/read-back failure is still detected",
  );
});

test('owned merge bases survive successive income checkpoints and caller mutations with one new isolated snapshot per enqueue', () => {
  const map=new Map(), options={storage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},base:'https://private.invalid',cooperative:true,delay:60000,sessionStorage:undefined};
  const c=new CloudBackup(options), original=newGame(1700000000000);
  c.localGame=structuredClone(original);
  c.enqueue({...original,coins:original.coins+1});clearTimeout(c.timer);
  const base=c.pending.baseGame;
  const clone=globalThis.structuredClone;let copies=0;
  globalThis.structuredClone=(...args)=>{copies++;return clone(...args);};
  try {
    for(let i=2;i<=20;i++) {
      const live={...original,coins:original.coins+i,cat:{...original.cat}};
      c.enqueue(live);clearTimeout(c.timer);
      live.cat.happiness=0;live.coins=0;
      assert.equal(c.pending.baseGame,base,'the original merge base is stable');
      assert.equal(c.pending.game.coins,original.coins+i);
      assert.equal(c.pending.game.cat.happiness,original.cat.happiness);
    }
  } finally {globalThis.structuredClone=clone;}
  assert.equal(copies,19,'no second whole-world clone for an already-owned base');
  assert.deepEqual(base,original);
  const box=JSON.parse(map.get('chichi-cloud-outbox'));
  assert.deepEqual(box.pending.baseGame,original);
  const restarted=new CloudBackup(options);
  assert.deepEqual(restarted.pending,box.pending);
});
