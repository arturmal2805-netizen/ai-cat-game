import {BIOMES} from '../public/game-data.js';
import {worldRoads} from '../public/world-roads.js';
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  constructionSites,
  createConstructionCrew,
  attachBuilderHammer,
} from "../public/construction-crew.js";
import {
  createCat,
  animateCat,
  reactCat,
  disposeCat,
} from "../public/cat-model.js";
import { newGame } from "../public/economy.js";
const now = Date.UTC(2026, 9, 16);
test("construction helpers use existing future deadlines for purchases and permanent park projects", () => {
  const groups = new Map([
    [
      "a",
      {
        userData: {
          built: false,
          placement: {
            id: "a",
            item: "yarn",
            biome: "moon",
            x: 2,
            z: 2,
            rotation: 0,
            readyAt: now + 1000,
          },
        },
      },
    ],
    [
      "b",
      {
        userData: {
          built: false,
          permanent: true,
          placement: {
            id: "b",
            item: "bed",
            biome: "moon",
            x: 4,
            z: 3,
            rotation: 1,
            readyAt: now + 2000,
            footprint: [3, 5],
          },
        },
      },
    ],
    ["c", { userData: { built: true, placement: { readyAt: now + 1000 } } }],
  ]);
  assert.equal(constructionSites(groups, now).length, 2);
  assert.deepEqual(constructionSites(groups, now)[1], {
    id: "b",
    biome: "moon",
    x: 4,
    z: 3,
    w: 5,
    d: 3,
    readyAt: now + 2000,
  });
  assert.deepEqual(constructionSites(groups, now + 3000), []);
});
test("all available workers reach distinct build stations, swing hammers and stop at the saved deadline without changing the game", () => {
  const g = newGame(now),
    before = structuredClone(g),
    sites = [
      {
        id: "test",
        biome: "moon",
        x: 0,
        z: 0,
        w: 3,
        d: 3,
        readyAt: now + 3600000,
      },
    ],
    crew = createConstructionCrew({
      getSites: () => sites,
      getObstacles: () => [{ x: 0, z: 0, w: 3, d: 3 }],
    }),
    positions = Array.from({ length: 6 }, (_, i) => ({
      x: -7 + i * 2.4,
      z: 6,
      y: 0.16,
    })),
    reached = new Set();
  for (let f = 0; f < 1800; f++)
    for (let i = 0; i < 6; i++) {
      const v = crew.frame(
        "cat-" + i,
        positions[i],
        "moon",
        i,
        0.5,
        1 / 30,
        f / 30,
        now,
      );
      if (v) {
        positions[i] = { ...v.position };
        if (v.phase === "hammer") {
          reached.add(i);
          assert.ok(v.reaction.paw > 0);
        }
      }
    }
  assert.equal(reached.size, 6);
  const workers = [...crew.workers.values()];
  for (const a of workers)
    for (const b of workers)
      if (a !== b)
        assert.ok(Math.hypot(a.slot.x - b.slot.x, a.slot.z - b.slot.z) > 1.3);
  for (let i = 0; i < 6; i++)
    assert.equal(
      crew.frame(
        "cat-" + i,
        positions[i],
        "moon",
        i,
        0.5,
        0.03,
        61,
        now + 3600000,
      ),
      null,
    );
  assert.equal(crew.workers.size, 0);
  assert.deepEqual(g, before);
});
test("hammer is a temporary shared prop attached to the existing front paw; the approved cat shape stays unchanged", () => {
  const cat = createCat("happy", {
      detail: "npc",
      breed: "british",
      color: 0x999999,
    }),
    meshes = [];
  cat.traverse((o) => {
    if (o.isMesh) meshes.push(o.geometry);
  });
  const hammer = attachBuilderHammer(cat);
  assert.ok(hammer.parent.isBone);
  assert.equal(hammer.visible, false);
  const start = new THREE.Vector3();
  hammer.updateWorldMatrix(true, false);
  hammer.getWorldPosition(start);
  animateCat(cat, 2, false, false);
  reactCat(cat, { paw: 0.8 });
  hammer.visible = true;
  cat.updateMatrixWorld(true);
  assert.ok(
    hammer.getWorldPosition(new THREE.Vector3()).distanceTo(start) > 0.05,
  );
  hammer.removeFromParent();
  const after = [];
  cat.traverse((o) => {
    if (o.isMesh) after.push(o.geometry);
  });
  assert.deepEqual(after, meshes);
  disposeCat(cat);
});
test("a manual action can cancel any helper immediately without a saved side effect", () => {
  const crew = createConstructionCrew({
    getSites: () => [
      { id: "a", biome: "moon", x: 0, z: 0, w: 2, d: 2, readyAt: now + 1000 },
    ],
  });
  assert.ok(
    crew.frame("chichi", { x: 5, z: 5, y: 0.16 }, "moon", 0, 0.5, 0.03, 0, now),
  );
  crew.cancel("chichi");
  assert.equal(crew.workers.size, 0);
  crew.clear();
  assert.equal(crew.workers.size, 0);
});

test("helpers travelling to a different island follow its actual rebuilt road instead of running through the sky", () => {
 const roads=worldRoads(BIOMES),road=roads.find(r=>r.from==='moon'&&r.to==='stars'),
  site={id:'away',biome:'stars',x:0,z:0,w:2,d:2,readyAt:now+100000},
  crew=createConstructionCrew({getSites:()=>[site],bridges:roads}),seen=[];
 let p={x:4,z:0,y:.16};
 for(let i=0;i<1800;i++){
  const v=crew.frame('traveller',p,'moon',0,.5,1/30,i/30,now);assert.ok(v);p={...v.position};
  if(!BIOMES.some(b=>Math.hypot(p.x-b.center[0],p.z-b.center[1])<(b.radius||11.65)))seen.push(p);
 }
 assert.ok(seen.length>0);
 for(const p of seen){
  const dx=road.end.x-road.start.x,dz=road.end.z-road.start.z,
    t=((p.x-road.start.x)*dx+(p.z-road.start.z)*dz)/(dx*dx+dz*dz);
  assert.ok(t>=0&&t<=1);assert.ok(Math.hypot(p.x-road.start.x-dx*t,p.z-road.start.z-dz*t)<.05);
 }
 assert.equal(crew.workers.get('traveller').phase,'hammer');
});
