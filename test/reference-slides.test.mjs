import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { REFERENCE_SLIDES } from "../public/reference-slide-data.js";
import { CATALOG, BIOMES } from "../public/game-data.js";
import {
  createReferenceRoute,
  DREAM_WATER,
  DREAM_SEAT,
} from "../public/reference-slide-motion.js";
import { makeAttraction } from "../public/world-assets.js";
import { disposeScenery } from "../public/scenery-models.js";
import {
  newGame,
  purchase,
  placeItem,
  storeItem,
  saveGame,
  loadGame,
} from "../public/economy.js";
import {
  businessXP,
  revenueRate,
  incomeFor,
  collectIncome,
} from "../public/business.js";
import { xpForLevel, addXP, DAILY_XP_LIMIT } from "../public/progression.js";
import { mergeSharedWorld } from "../shared-world.mjs";
const now = Date.UTC(2026, 9, 18, 12);
const hash = (x) =>
  createHash("sha256").update(JSON.stringify(x)).digest("hex");
function seed(spec) {
  const g = addXP(newGame(now), DAILY_XP_LIMIT, now);
  g.unlocked.push("homestead");
  g.coins = 1000000;
  g.progression.xp = xpForLevel(20);
  return placeItem(
    purchase(g, spec.id, now),
    spec.id,
    "homestead",
    0,
    0,
    0,
    now,
  );
}
function reload(g, at = now) {
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
    };
  saveGame(storage, g);
  return loadGame(storage, at, { advance: false });
}

test("exactly 25 independent reference cards map the 5 by 5 grid and preserve every old biome and catalogue record", () => {
  assert.equal(REFERENCE_SLIDES.length, 25);
  assert.equal(new Set(REFERENCE_SLIDES.map((s) => s.id)).size, 25);
  assert.equal(
    hash({
      CATALOG: CATALOG.filter(
        (s) => !s.referenceSlide && !s.id.startsWith("job-"),
      ),
      BIOMES: BIOMES.filter((b) => b.id !== "jobcity"),
    }),
    "b1d6afc10f501d355cf44fab856d0de84d03e73a9ad520f2098ba2cf11848869",
  );
  for (const [i, s] of REFERENCE_SLIDES.entries()) {
    assert.deepEqual(s.referenceCell, {
      index: i + 1,
      row: Math.floor(i / 5) + 1,
      column: (i % 5) + 1,
    });
    assert.ok(CATALOG.includes(s));
    assert.deepEqual(s.actions, ["ride"]);
    assert.equal(s.category, "rides");
  }
});
test("30k wallet offers one entry goal while distinct legendary prices keep meaningful later goals and matching income", () => {
  assert.equal(REFERENCE_SLIDES.filter((s) => s.price <= 30000).length, 1);
  assert.equal(Math.max(...REFERENCE_SLIDES.map((s) => s.price)), 240000);
  for (const s of REFERENCE_SLIDES) {
    assert.equal(revenueRate(s.id), s.incomePerHour);
    assert.ok(
      s.price / s.incomePerHour >= 25 && s.price / s.incomePerHour <= 32,
    );
    assert.equal(businessXP(s.id), Math.round(s.incomePerHour * 0.38));
  }
});
test("all 25 routes are unique, connected at every stage, bounded to their purchased plot and return to the same dry entrance", () => {
  const signatures = new Set();
  for (const s of REFERENCE_SLIDES) {
    const r = createReferenceRoute(s);
    signatures.add(
      hash(
        Array.from(
          { length: 31 },
          (_, i) => r.frame((r.duration * i) / 30).position,
        ),
      ),
    );
    for (const lane of r.lanes) {
      assert.deepEqual(lane.frame(0).position, lane.entry);
      assert.deepEqual(lane.frame(lane.duration).position, lane.entry);
      for (const leg of lane.legs) {
        if (!leg.start) continue;
        const a = lane.frame(leg.start - 1e-7),
          b = lane.frame(leg.start + 1e-7);
        assert.ok(
          new THREE.Vector3(...a.position).distanceTo(
            new THREE.Vector3(...b.position),
          ) < 0.002,
          s.kind + " " + leg.phase + " seam",
        );
      }
      for (let i = 0; i <= 800; i++) {
        const f = lane.frame((lane.duration * i) / 800);
        assert.ok(f.position.every(Number.isFinite));
        assert.ok(
          Math.abs(f.position[0]) < s.footprint[0] / 2 &&
            Math.abs(f.position[2]) < s.footprint[1] / 2,
          s.kind,
        );
        assert.ok(f.position[1] >= 0.15);
        if (f.quaternion)
          assert.ok(
            Math.abs(new THREE.Quaternion(...f.quaternion).length() - 1) < 1e-6,
          );
      }
    }
  }
  assert.equal(signatures.size, 25);
});
test("three-loop and cave routes actually invert; launches have constant gravity and land in their own complex", () => {
  for (const kind of ["crystal-loops", "cave-loop"]) {
    const r = createReferenceRoute(
      REFERENCE_SLIDES.find((s) => s.kind === kind),
    );
    let inverted = false;
    for (let i = 0; i < 1000; i++) {
      const f = r.frame((r.duration * i) / 1000);
      if (
        f.quaternion &&
        new THREE.Vector3(0, 1, 0).applyQuaternion(
          new THREE.Quaternion(...f.quaternion),
        ).y < -0.8
      )
        inverted = true;
    }
    assert.ok(inverted, kind);
  }
  for (const s of REFERENCE_SLIDES) {
    const r = createReferenceRoute(s);
    for (const l of r.lanes)
      for (const f of l.flights) {
        const dt = 0.02,
          t = f.start + f.duration * 0.5,
          a = l.frame(t - dt).position,
          b = l.frame(t).position,
          c = l.frame(t + dt).position;
        assert.ok(Math.abs((c[1] - 2 * b[1] + a[1]) / (dt * dt) + 9.81) < 1e-4);
        assert.ok(Math.abs(c[0] - 2 * b[0] + a[0]) < 1e-6);
      }
  }
});
test("underwater tunnel stays visibly above the island floor and below its real raised gallery water", () => {
  const r = createReferenceRoute(
    REFERENCE_SLIDES.find((s) => s.kind === "ocean-tunnel"),
  );
  let frames = 0;
  for (let i = 0; i < 1000; i++) {
    const f = r.frame((r.duration * i) / 1000);
    if (f.phase === "underwater") {
      frames++;
      assert.ok(f.position[1] > 0.5);
      assert.ok(f.position[1] + 3.1 < 11.7);
    }
  }
  assert.ok(frames > 25);
});
test("every complete model has all wet channels, bounded batches, real pool depth and full-height flumes inside its plot", () => {
  for (const s of REFERENCE_SLIDES) {
    const g = makeAttraction(s.id),
      d = g.userData,
      w = d.slideWater;
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    assert.equal(w.channels.length + d.route.bowls.length, s.channels, s.kind);
    assert.ok(w.pool.userData.depth >= 1.19);
    assert.ok(d.stats.staticMeshes <= 16, s.kind);
    assert.ok(
      box.min.x >= -s.footprint[0] / 2 && box.max.x <= s.footprint[0] / 2,
      s.kind + " width",
    );
    assert.ok(
      box.min.z >= -s.footprint[1] / 2 && box.max.z <= s.footprint[1] / 2,
      s.kind + " depth",
    );
    for (const channel of w.channels) {
      assert.equal(channel.offset, DREAM_WATER);
      assert.ok(channel.width >= 1.4);
      const frames = channel.geometry.userData.flowFrames;
      for (const idx of [0, 45, 90, 135, 180]) {
        const f = frames[idx],
          samp = channel.samples[Math.round((idx / 180) * 600)];
        assert.ok(
          f.p.distanceTo(samp.p.clone().addScaledVector(samp.up, DREAM_WATER)) <
            1e-6,
        );
        assert.ok(DREAM_SEAT > DREAM_WATER);
      }
    }
    disposeScenery(g);
  }
});
test("all new purchases pay once, retain construction, give XP after the daily limit, and store/reload without loss", () => {
  for (const s of REFERENCE_SLIDES) {
    let g = seed(s);
    const p = g.placements.at(-1),
      ready = p.readyAt;
    assert.equal(incomeFor(g, p.id, ready - 1), 0);
    const saved = reload(g);
    assert.equal(saved.placements.at(-1).readyAt, ready);
    const paid = collectIncome(g, p.id, ready + 3600000);
    assert.equal(paid.amount, revenueRate(s.id));
    assert.equal(paid.xp, businessXP(s.id));
    assert.throws(() => collectIncome(paid.game, p.id, ready + 3600000));
    g = storeItem(paid.game, p.id, ready + 3600000);
    assert.equal(g.inventory[s.id], 1);
    const restored = reload(g, ready + 3600000);
    assert.equal(restored.inventory[s.id], 1);
    assert.equal(restored.coins, g.coins);
    assert.equal(restored.progression.xp, g.progression.xp);
  }
});
test("cached phones cannot drop unfamiliar placed slides, bag purchases or attached paid business tiers", () => {
  const s = REFERENCE_SLIDES[0],
    base = seed(s),
    p = base.placements.at(-1);
  base.business.levels[p.id] = 3;
  base.inventory[s.id] = 2;
  base.builtInventory[s.id] = 1;
  const old = structuredClone(base);
  old.placements = old.placements.filter((x) => x.id !== p.id);
  delete old.inventory[s.id];
  delete old.builtInventory[s.id];
  delete old.business.accounts[p.id];
  delete old.business.levels[p.id];
  old.inventory.mouse++;
  const merged = mergeSharedWorld(base, base, old);
  assert.deepEqual(
    merged.placements.find((x) => x.id === p.id),
    p,
  );
  assert.equal(merged.inventory[s.id], 2);
  assert.equal(merged.builtInventory[s.id], 1);
  assert.equal(merged.business.levels[p.id], 3);
  assert.deepEqual(
    merged.business.accounts[p.id],
    base.business.accounts[p.id],
  );
  const built = structuredClone(base);
  built.placements.at(-1).readyAt = 0;
  const stored = storeItem(built, p.id, now);
  const valid = mergeSharedWorld(built, built, stored);
  assert.ok(!valid.placements.some((x) => x.id === p.id));
  assert.equal(valid.inventory[s.id], 3);
});
