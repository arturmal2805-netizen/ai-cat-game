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
test("trampoline triangles face upward so above-net lighting and shadow normals agree", () => {
  const net = root().userData.trampoline.userData.net;
  const { position, normal } = net.geometry.attributes;
  const indices = net.geometry.index;
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  for (let i = 0; i < indices.count; i += 3) {
    a.fromBufferAttribute(position, indices.getX(i));
    b.fromBufferAttribute(position, indices.getX(i + 1));
    c.fromBufferAttribute(position, indices.getX(i + 2));
    assert.ok(b.sub(a).cross(c.sub(a)).y > 0, "front face faces the jumping cat");
  }
  for (let i = 0; i < normal.count; i++) assert.ok(normal.getY(i) > 0.999);
  const ray = new T.Raycaster(net.localToWorld(new T.Vector3(5, 10, 9)), new T.Vector3(0, -1, 0));
  const hit = ray.intersectObject(net)[0];
  assert.ok(hit && hit.face.normal.y > 0.999, "actual above-net ray sees a front face");
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
test("elastic field superposes local spring positions without discontinuous impulse displacement", () => {
  const springs = [new T.Vector4(0, 0, -0.8, 0), new T.Vector4(30, 0, -0.6, 0)];
  assert.ok(netDisplacement(0, 0, 1, springs) < -0.79);
  assert.ok(netDisplacement(30, 0, 1, springs) < -0.59);
  assert.ok(Math.abs(netDisplacement(100, 100, 1, springs)) < 1e-6);
  springs[0].z = springs[1].z = 0;
  assert.equal(netDisplacement(0, 0, 1, springs), 0);
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

test("simultaneous airborne saves reserve distinct dry positions and normalize deformed-net standing height", () => {
  const actors = Array.from({ length: 3 }, (_, i) => ({
      id: i ? "safe-" + i : "chichi",
      position: new T.Vector3(
        W.trampoline.x + (i - 1) * 6,
        1.312,
        W.trampoline.z - 48,
      ),
      radius: 0.6,
    })),
    r = createWaterfrontRuntime({
      origin: { x: 0, z: 0 },
      getActors: () => actors,
      getTrampoline: () => ({ userData: { height: () => 0.4, impact() {} } }),
    });
  for (const a of actors) assert.ok(r.start(a.id, "waterfront-bounce"));
  for (let i = 0; i < 40; i++) r.update(0.1, i * 0.1);
  const points = actors.map((a) => r.safePosition(a.id));
  assert.equal(new Set(points.map((p) => p.toArray().join(","))).size, 3);
  for (const p of points) assert.ok(waterfrontDrySupport(p, 0.6));
  const g = newGame(),
    b = byBiome("autumn");
  g.unlocked.push("autumn");
  const p = points[0],
    next = captureCatLocations(g, g, [
      {
        id: "chichi",
        position: {
          x: p.x + b.center[0] + W.x,
          y: p.y,
          z: p.z + b.center[1] + W.z,
        },
        yaw: 0,
      },
    ]);
  assert.ok(next.catLocations.chichi);
});

test("real shared net keeps every grounded native carrier in contact after simultaneous spring loads", async () => {
  const { trampolineSteps } = await import(
      "../public/waterfront-trampoline.js"
    ),
    { waterfrontMaterials } = await import(
      "../public/waterfront-primitives.js"
    ),
    net = new T.Group();
  for (const _ of trampolineSteps(net, waterfrontMaterials())) {
  }
  const actors = [-2, 2].map((x, i) => ({
      id: i ? "contact-cat" : "chichi",
      position: new T.Vector3(W.trampoline.x + x, 1.312, W.trampoline.z - 48),
      radius: 0.6,
    })),
    r = createWaterfrontRuntime({
      origin: { x: 0, z: 0 },
      getActors: () => actors,
      getTrampoline: () => net,
    });
  for (const a of actors) assert.ok(r.start(a.id, "waterfront-bounce"));
  let previous = new Map(),
    largest = 0,
    compress = false;
  for (let i = 0; i < 800; i++) {
    const time = i / 120;
    r.update(1 / 120, time);
    for (const v of r.visits.values()) {
      if (["compress", "land", "player", "player-land"].includes(v.phase)) {
        assert.ok(
          Math.abs(
            v.frame.position.y -
              (net.userData.height(
                v.local.x - W.trampoline.x,
                v.local.z - W.trampoline.z,
                time,
              ) +
                0.012),
          ) < 1e-6,
        );
        compress ||= v.phase === "compress";
      }
      if (previous.has(v.id))
        largest = Math.max(
          largest,
          v.frame.position.distanceTo(previous.get(v.id)),
        );
      previous.set(v.id, v.frame.position.clone());
    }
  }
  assert.ok(compress);
  assert.ok(largest < 0.35, "no instant displacement on impact at120Hz");
});

test("first-person ownership and input stay on the same native actor through an explicit water jump and return", () => {
  const actor = {
      id: "chichi",
      position: new T.Vector3(W.trampoline.x, 1.312, W.trampoline.z - 48),
      radius: 0.6,
    },
    r = createWaterfrontRuntime({
      origin: { x: 0, z: 0 },
      getActors: () => [actor],
      getTrampoline: () => null,
    });
  assert.ok(r.start("chichi", "waterfront-bounce"));
  r.requestPlayer();
  for (let i = 0; i < 300 && r.frame("chichi")?.phase !== "player"; i++)
    r.update(0.05, i * 0.05);
  assert.equal(r.frame("chichi").phase, "player");
  assert.ok(r.divePlayer());
  assert.equal(r.divePlayer(), false, "touch release followed by a compatibility click cannot launch twice");
  let entered = false,
    minimum = 0,
    returned = false;
  for (let i = 0; i < 10000; i++) {
    r.playerInput({
      firstPerson: true,
      heading: 0.7,
      jump: false,
      forward: 0,
      side: 0,
    });
    r.update(0.05, 20 + i * 0.05);
    assert.ok(r.ownsPlayer);
    const v = r.get("chichi");
    if (v.phase === "splash") {
      entered = true;
      minimum = Math.min(minimum, v.local.y);
    }
    if (entered && v.phase === "player") {
      returned = true;
      break;
    }
  }
  assert.ok(entered && returned);
  assert.ok(
    minimum < -1,
    "physical water entry submerges the body before buoyancy",
  );
  assert.ok(Math.abs(r.frame("chichi").yaw - 0.7) < 1e-8);
});
