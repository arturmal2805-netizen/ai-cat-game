import { xpForLevel } from "../public/progression.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  saveGame,
  loadGame,
  SAVE_KEY,
  purchase,
  placeItem,
  findSpace,
  moveItem,
  storeItem,
  plantCrop,
  claimRewards,
} from "../public/economy.js";
const now = 1791979200000;
function storage() {
  const map = new Map();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
}
test("every purchase, placement, move, storage and crop deadline survives a separate reload", () => {
  const s = storage();
  let g = newGame(now);
  g.coins = 20000;
  g.progression.xp = xpForLevel(6);
  g.scenery = g.scenery.map((r) => ({ ...r, stored: true }));
  saveGame(s, g);
  g = loadGame(s, now);
  const reload = () => {
    assert.equal(saveGame(s, g), true);
    const restored = loadGame(s, now);
    assert.deepEqual(restored.placements, g.placements);
    assert.deepEqual(restored.scenery, g.scenery);
    assert.equal(restored.coins, g.coins);
    assert.deepEqual(restored.farm, g.farm);
    g = restored;
  };
  reload();
  for (const item of ["mouse", "coaster", "yarn"]) {
    g = purchase(g, item);
    reload();
    const p = findSpace(g, item, "moon");
    assert.ok(p);
    g = placeItem(g, item, "moon", p.x, p.z, 0, now);
    reload();
    const placed = g.placements.at(-1),
      deadline = placed.readyAt;
    const q = findSpace(g, item, "moon", 1, placed.id);
    assert.ok(q);
    g = moveItem(g, placed.id, "moon", q.x, q.z, 1);
    reload();
    assert.equal(g.placements.at(-1).readyAt, deadline);
    g = storeItem(g, placed.id, deadline);
    reload();
    assert.equal(g.inventory[item], 1);
  }
  g = plantCrop(g, "welcome-farm", 2, "wheat", now);
  reload();
  const deadline = g.farm.fields["welcome-farm"][2].readyAt;
  const later = loadGame(s, now + 60000);
  assert.equal(later.farm.fields["welcome-farm"][2].readyAt, deadline);
});
test("corrupt JSON and semantically invalid primary saves recover from two verified generations", () => {
  const s = storage(),
    g = newGame(now);
  saveGame(s, g);
  g.coins = 500;
  saveGame(s, g);
  g.coins = 600;
  saveGame(s, g);
  s.setItem(SAVE_KEY, "{corrupted");
  assert.equal(loadGame(s, now).coins, 500);
  s.setItem(SAVE_KEY, JSON.stringify({ ...g, coins: -1 }));
  assert.equal(loadGame(s, now).coins, 500);
  s.setItem(SAVE_KEY + ":backup", "broken");
  assert.equal(loadGame(s, now).coins, 420);
});
test("write failure and failed read-back cannot acknowledge a purchase or destroy the prior world", () => {
  const s = storage(),
    g = newGame(now);
  saveGame(s, g);
  const next = purchase(g, "mouse");
  const failing = {
    getItem: s.getItem,
    setItem: (k, v) => {
      if (k === SAVE_KEY && JSON.parse(v).coins !== 420) throw Error("Quota");
      s.setItem(k, v);
    },
  };
  assert.equal(saveGame(failing, next), false);
  assert.equal(loadGame(s, now).coins, 420);
  const dropping = {
    getItem: s.getItem,
    setItem: (k, v) => {
      if (k !== SAVE_KEY) s.setItem(k, v);
    },
  };
  assert.equal(saveGame(dropping, next), false);
  assert.equal(loadGame(s, now).coins, 420);
});
test("reload never repeats daily or hourly rewards", () => {
  const s = storage();
  let g = claimRewards(newGame(now), now, true).game;
  saveGame(s, g);
  for (let i = 0; i < 20; i++) {
    g = claimRewards(loadGame(s, now), now, true).game;
    assert.equal(g.coins, 490);
    saveGame(s, g);
  }
  g = claimRewards(loadGame(s, now + 2 * 3600000), now + 2 * 3600000).game;
  saveGame(s, g);
  assert.equal(
    claimRewards(loadGame(s, now + 2 * 3600000), now + 2 * 3600000).game.coins,
    g.coins,
  );
});

test('a successful durable write verifies its old generation once and keeps identical backup bytes without serializing an unused rollback', () => {
  const s=storage(), old=newGame(now);saveGame(s,old);
  const encoded=JSON.stringify(old), next={...old,coins:old.coins+5};
  const parse=JSON.parse,stringify=JSON.stringify;let oldParses=0,oldEncodes=0;
  JSON.parse=(value,...args)=>{if(value===encoded)oldParses++;return parse(value,...args);};
  JSON.stringify=(value,...args)=>{if(value?.version===2&&value.coins===old.coins)oldEncodes++;return stringify(value,...args);};
  try {assert.equal(saveGame(s,next),true);}finally {JSON.parse=parse;JSON.stringify=stringify;}
  assert.equal(oldParses,1);assert.equal(oldEncodes,0);
  assert.equal(s.getItem(SAVE_KEY+':backup'),encoded);
  assert.equal(s.getItem(SAVE_KEY),JSON.stringify(next));
});

test('a primary changed after validation cannot become a trusted rollback or overwrite the verified backup', () => {
  const s=storage(), old=newGame(now);saveGame(s,old);let reads=0;
  const dropping={getItem:k=>{
    if(k===SAVE_KEY&&++reads===2)s.setItem(k,'{invalid concurrent primary');
    return s.getItem(k);
  },setItem:(k,v)=>{
    if(k!==SAVE_KEY||v===JSON.stringify(old))s.setItem(k,v);
  }};
  assert.equal(saveGame(dropping,{...old,coins:old.coins-5}),false);
  assert.equal(s.getItem(SAVE_KEY),JSON.stringify(old));
  assert.equal(loadGame(s,now).coins,old.coins);
});
