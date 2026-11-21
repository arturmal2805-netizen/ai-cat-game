import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import * as T from "three";
import {
  WATERFRONT as W,
  bridgePoint,
  waterfrontOffers,
} from "../public/waterfront-data.js";
import { waterfrontModelSteps } from "../public/waterfront-model.js";
import {
  waterfrontPath,
  waterfrontWalkable,
  waterfrontDrySupport,
  waterfrontOceanClear,
} from "../public/waterfront-navigation.js";
import {
  ballisticLaunch,
  ballisticFrame,
  diveLane,
  GRAVITY,
} from "../public/waterfront-physics.js";
import { createWaterfrontRuntime } from "../public/waterfront-runtime.js";
import { netDisplacement } from "../public/waterfront-trampoline.js";
import {
  validateLeisureOffers,
  leisureOffers,
} from "../public/leisure-data.js";
import { newGame, loadGame, SAVE_KEY } from "../public/economy.js";
import {
  captureCatLocations,
  normalizeCatLocations,
} from "../public/cat-locations.js";
import { byBiome } from "../public/game-data.js";
let model;
function root() {
  if (!model) {
    const g = waterfrontModelSteps();
    let n;
    do {
      n = g.next();
    } while (!n.done);
    model = n.value;
    model.updateMatrixWorld(true);
  }
  return model;
}
test("V14 preserves every frozen old venue, water, cat and economy source byte", () => {
  const p = JSON.parse(
    fs.readFileSync(
      new URL(
        "../docs/specifications/waterfront-v14-protection.json",
        import.meta.url,
      ),
    ),
  );
  assert.equal(Object.keys(p.frozenFiles).length, 116);
  for (const [f, h] of Object.entries(p.frozenFiles))
    assert.equal(
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(new URL("../" + f, import.meta.url)))
        .digest("hex"),
      h,
      f,
    );
});
test("native meshes have complete position/normal/UV attributes, finite bounds and bounded net/effect topology", () => {
  const m = root();
  let count = 0;
  m.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry,
      p = g.attributes.position;
    if (!p) return;
    for (const key of ["normal", "uv"])
      if (g.attributes[key])
        assert.equal(g.attributes[key].count, p.count, `${o.name} ${key}`);
    g.computeBoundingBox();
    assert.ok(g.boundingBox.min.toArray().every(Number.isFinite));
    count++;
  });
  assert.ok(count < 150);
  assert.equal(
    m.userData.trampoline.userData.net.geometry.attributes.position.count,
    6145,
  );
  assert.equal(m.userData.tableCount, 28);
  const ring = m.userData.trampoline.children.find(
      (o) => o.material === m.userData.materials.violet,
    ),
    bounds = new T.Box3().setFromObject(ring);
  assert.ok(
    bounds.max.x - bounds.min.x > 145,
    "soft ring wraps the entire trampoline",
  );
});
test("all glazed floor panes have actual empty apertures through the restaurant and supporting pier", () => {
  const m = root(),
    roof = m.userData.restaurant.userData.roof;
  roof.visible = false;
  const ray = new T.Raycaster();
  for (const p of m.userData.glassPanels) {
    const x = p.x + p.w * 0.13,
      z = p.z - 8 + p.d * 0.13;
    ray.set(new T.Vector3(x, 3, z), new T.Vector3(0, -1, 0));
    const hits = ray
      .intersectObject(m, true)
      .filter((h) => h.point.y > -3 && h.point.y < 2);
    assert.ok(
      hits.some((h) => h.object.material === m.userData.materials.floorGlass),
      "actual glazing",
    );
    assert.ok(
      hits.every((h) => h.object.material.transparent),
      "no opaque supporting slab behind pane",
    );
    ray.set(new T.Vector3(x, -4, z), new T.Vector3(0, 1, 0));
    const up = ray.intersectObject(m, true).find((h) => h.point.y > -3);
    assert.equal(up.object.material, m.userData.materials.floorGlass);
  }
  roof.visible = true;
});
test("guarded curved bridge is continuously walkable at native cat body radius and connects both decks", () => {
  for (let i = 0; i <= 1000; i++) {
    const p = bridgePoint(i / 1000);
    assert.ok(waterfrontDrySupport(p, 0.65), `bridge ${i}`);
  }
  assert.ok(waterfrontDrySupport({ x: 0, z: 79 }, 0.65));
  assert.ok(
    waterfrontDrySupport({ x: W.trampoline.x, z: W.trampoline.z - 73 }, 0.65),
  );
  assert.equal(
    waterfrontWalkable({ x: 30, z: 46 }, 0.6),
    null,
    "closed window is solid",
  );
  assert.ok(
    waterfrontWalkable({ x: 0, z: 46 }, 0.6),
    "open restaurant entrance",
  );
  const p = waterfrontPath(W.arrival, { x: -10, z: 302 }, 0.6);
  assert.ok(p?.length > 20);
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1],
      b = p[i],
      n = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.2);
    for (let j = 0; j <= n; j++)
      assert.ok(
        waterfrontWalkable(
          { x: a.x + ((b.x - a.x) * j) / n, z: a.z + ((b.z - a.z) * j) / n },
          0.6,
        ),
        `route segment ${i}`,
      );
  }
});
test("high jumps retain 9.81 gravity, exact continuous contacts and safe deep-water lanes", () => {
  const launch = ballisticLaunch(
      { x: 0, y: 1.312, z: 0 },
      { x: 0, y: 1.312, z: 0 },
      { height: 26 },
    ),
    apex = ballisticFrame(launch, launch.vy / GRAVITY);
  assert.ok(Math.abs(apex.y - 27.312) < 1e-9);
  assert.ok(Math.abs(ballisticFrame(launch, launch.duration).y - 1.312) < 1e-8);
  for (let i = 0; i < 4; i++) {
    const lane = diveLane(i),
      l = ballisticLaunch(lane.launch, lane.water, { height: 18 }),
      before = ballisticFrame(l, l.duration - 0.00001),
      end = ballisticFrame(l, l.duration);
    assert.ok(before.y > end.y);
    assert.ok(Math.hypot(end.x - lane.water.x, end.z - lane.water.z) < 1e-8);
    assert.ok(end.done);
    assert.equal(l.gravity, 9.81);
  }
});
test("elastic net responds locally to simultaneous impacts, decays and matches CPU support field", () => {
  const impacts = [new T.Vector4(0, 0, 1, 0.8), new T.Vector4(30, 0, 1, 0.6)];
  assert.ok(netDisplacement(0, 0, 1, impacts) < -0.75);
  assert.ok(netDisplacement(30, 0, 1, impacts) < -0.55);
  assert.equal(netDisplacement(0, 0, 5, impacts), 0);
  for (let t = 1; t < 5; t += 0.05)
    assert.ok(Math.abs(netDisplacement(0, 0, t, impacts)) <= 1.1);
});
test("native cat dive finishes all phases, cancels safely in air, releases capacity and never jumps position", () => {
  for (const cancel of [false, true]) {
    const actor = {
        id: "chichi",
        position: new T.Vector3(W.arrival.x, 1.062, W.arrival.z),
        radius: 0.6,
      },
      done = [],
      splashes = [],
      r = createWaterfrontRuntime({
        origin: { x: 0, z: 0 },
        getActors: () => [actor],
        getTrampoline: () => null,
        effects: { splash: (...a) => splashes.push(a) },
        onComplete: (id, p) => done.push(p),
      });
    assert.ok(r.start("chichi", "waterfront-dive"));
    let previous = null,
      largest = 0,
      cancelled = false,
      phases = new Set();
    for (let i = 0; i < 36000 && r.has("chichi"); i++) {
      r.update(1 / 60, i / 60);
      const f = r.frame("chichi");
      if (f) {
        if (cancel && f.phase === "dive" && !cancelled) {
          assert.equal(r.cancel("chichi"), false);
          cancelled = true;
          assert.ok(r.has("chichi"));
        }
        phases.add(f.phase);
        if (previous)
          largest = Math.max(largest, previous.distanceTo(f.position));
        previous = f.position.clone();
      }
    }
    assert.equal(r.visits.size, 0);
    assert.equal(done.length, 1);
    assert.equal(done[0].completed, !cancel);
    for (const phase of [
      "approach",
      "prepare",
      "bounce",
      "land",
      "launch",
      "dive",
      "splash",
      "swim",
      "climb",
      "shake",
      "return",
      "done",
    ])
      assert.ok(phases.has(phase), phase);
    assert.ok(splashes.length > 0);
    assert.ok(largest < 0.55, "bounded continuous native motion");
  }
});
test("six compact offers enter the existing validated AI catalogue; malformed substitutes are rejected", () => {
  const g = newGame();
  g.unlocked.push("autumn");
  const before = structuredClone(g),
    offers = validateLeisureOffers(leisureOffers(g));
  assert.equal(offers.filter((a) => a.id.startsWith("waterfront-")).length, 6);
  assert.deepEqual(g, before);
  assert.ok(JSON.stringify(waterfrontOffers(g)).length < 800);
  assert.throws(() =>
    validateLeisureOffers([{ ...waterfrontOffers(g)[0], biome: "moon" }]),
  );
  assert.throws(() =>
    validateLeisureOffers([{ ...waterfrontOffers(g)[0], type: "counterfeit" }]),
  );
});
test("bounded additive venue positions survive reload with all balances/owners/old records unchanged", () => {
  const now = Date.now(),
    g = newGame(now),
    b = byBiome("autumn");
  g.unlocked.push("autumn");
  g.catPosition = { biome: "autumn", x: 0, z: 90 };
  g.coins = 4386174;
  g.diamonds = 240;
  const old = loadGame(
      { getItem: (k) => (k === SAVE_KEY ? JSON.stringify(g) : null) },
      now,
      { advance: false },
    ),
    p = { x: b.center[0] + W.x, y: W.y + 0.012, z: b.center[1] + W.z + 12 },
    saved = captureCatLocations(
      g,
      g,
      [{ id: "chichi", position: p, yaw: 0.4 }],
      now,
    );
  assert.ok(saved.catLocations.chichi);
  const restored = loadGame(
    { getItem: (k) => (k === SAVE_KEY ? JSON.stringify(saved) : null) },
    now,
    { advance: false },
  );
  assert.deepEqual(restored.catLocations, saved.catLocations);
  for (const key of [
    "coins",
    "diamonds",
    "inventory",
    "placements",
    "adoption",
    "jobCity",
  ])
    assert.deepEqual(restored[key], old[key], key);
  const bad = {
    ...saved.catLocations,
    chichi: { ...saved.catLocations.chichi, y: 80 },
  };
  assert.equal(normalizeCatLocations(bad, saved, now).chichi, undefined);
});
test("optional ocean collisions protect only the new glazed deck, piles and living reef", () => {
  assert.equal(waterfrontOceanClear({ x: 0, y: -50, z: 0 }), true);
  assert.equal(waterfrontOceanClear({ x: W.x, y: -1, z: W.z + 5 }), false);
  assert.equal(waterfrontOceanClear({ x: W.x, y: -30, z: W.z + 5 }), true);
  assert.equal(
    waterfrontOceanClear({ x: W.x - 220, y: -100, z: W.z + 42 }),
    false,
  );
});

test("all free cats can reserve a real queue without breaching trampoline capacity or duplicating actors", () => {
  const actors = Array.from({ length: 30 }, (_, i) => ({
      id: i ? "cat-" + i : "chichi",
      position: new T.Vector3(W.arrival.x, 1.062, W.arrival.z),
      radius: 0.6,
    })),
    done = [];
  const r = createWaterfrontRuntime({
    origin: { x: 0, z: 0 },
    getActors: () => actors,
    getTrampoline: () => null,
    onComplete: (id) => done.push(id),
  });
  for (const a of actors)
    assert.equal(
      r.start(a.id, "waterfront-bounce", { invite: true, enqueue: true }),
      true,
    );
  assert.equal(r.visits.size, 30);
  assert.equal(
    r.start("chichi", "waterfront-bounce", { enqueue: true }),
    false,
  );
  for (let i = 0; i < 120000 && r.visits.size; i++) {
    r.update(1 / 60, i / 60);
    assert.ok(
      [...r.visits.values()].filter(
        (v) => v.active && v.activity.kind === "bounce",
      ).length <= 6,
    );
  }
  assert.equal(r.visits.size, 0);
  assert.equal(new Set(done).size, 30);
  assert.equal(done.length, 30);
});
test("player keeps the native actor, builds increasingly high physical hops and releases safely midair", () => {
  const actor = {
    id: "chichi",
    position: new T.Vector3(W.trampoline.x, 1.312, W.trampoline.z - 48),
    radius: 0.6,
  };
  let allowed = true;
  const r = createWaterfrontRuntime({
    origin: { x: 0, z: 0 },
    getActors: () => [actor],
    getTrampoline: () => null,
    canSimulate: () => allowed,
  });
  assert.ok(r.start("chichi", "waterfront-bounce"));
  assert.ok(r.requestPlayer());
  const heights = [];
  let previous = "";
  for (let i = 0; i < 12000 && heights.length < 7; i++) {
    r.playerInput({ jump: true, forward: 0, side: 0, heading: 0 });
    r.update(1 / 60, i / 60);
    const v = r.get("chichi");
    if (v.phase === "bounce" && previous !== "bounce")
      heights.push(v.flight.vy ** 2 / (2 * 9.81));
    previous = v.phase;
  }
  assert.equal(heights.length, 7);
  for (let i = 1; i < heights.length; i++)
    assert.ok(heights[i] > heights[i - 1]);
  assert.ok(heights.at(-1) > 40);
  const before = r.frame("chichi").position.clone(),
    clock = r.clock;
  allowed = false;
  r.update(0.1, 900);
  assert.equal(r.clock, clock);
  assert.deepEqual(r.frame("chichi").position, before);
  allowed = true;
  r.releasePlayer();
  assert.ok(r.has("chichi"));
  for (let i = 0; i < 30000 && r.has("chichi"); i++)
    r.update(1 / 60, 1000 + i / 60);
  assert.equal(r.has("chichi"), false);
});
