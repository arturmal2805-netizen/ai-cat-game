import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CATALOG, BIOMES } from "../public/game-data.js";
import {
  WATER_RIDES,
  WATER_RIDE_RULE_VERSION,
} from "../public/water-ride-data.js";
import { makeAttraction } from "../public/world-assets.js";
import { permanentObjects } from "../public/world-objects.js";
import { disposeScenery } from "../public/scenery-models.js";
import { waterFieldTexture } from "../public/water-shading.js";
import { createResidentPlay } from "../public/resident-play.js";
import { newGame, saveGame, loadGame } from "../public/economy.js";

const waterID = (id) =>
  /^(slide-|water-)/.test(id) ||
  ["waterslide", "ride-crystal-slide", "dive-triple-sky"].includes(id);
test("every shop and permanent island water ride declares and implements the shared water contract, including all three/six lanes", () => {
  assert.equal(WATER_RIDES.length, 40);
  assert.deepEqual(
    CATALOG.filter((i) => waterID(i.id))
      .map((i) => i.id)
      .sort(),
    WATER_RIDES.map((r) => r.id).sort(),
  );
  for (const o of permanentObjects(BIOMES.map((b) => b.id)).filter((o) =>
    waterID(o.type),
  ))
    assert.ok(
      WATER_RIDES.some((r) => r.id === o.type),
      o.id,
    );
  for (const spec of WATER_RIDES) {
    const product = CATALOG.find((i) => i.id === spec.id),
      g = makeAttraction(spec.id),
      w = g.userData.slideWater;
    assert.equal(product.waterRide.version, WATER_RIDE_RULE_VERSION, spec.id);
    assert.equal(w.version, WATER_RIDE_RULE_VERSION);
    assert.equal(
      w.channels.length +
        w.materials.filter((m) => m.uniforms.uFlowing.value === 2).length,
      spec.channels,
      spec.id,
    );
    assert.ok(w.pool.userData.water.isShaderMaterial);
    assert.ok(w.pool.userData.rx > 0 && w.pool.userData.rz > 0);
    assert.equal(
      w.materials.length,
      spec.kind === "dive" ? 0 : spec.id === "slide-titan-funnel" ? 2 : 1 + (g.userData.route?.bowls?.length || 0),
    );
    disposeScenery(g);
  }
});
test("water spans the real three-dimensional route, with smooth finite normals and monotonic metre-based flow instead of a flat plane", () => {
  for (const spec of WATER_RIDES) {
    const g = makeAttraction(spec.id),
      w = g.userData.slideWater;
    for (const c of w.channels) {
      const frames = c.geometry.userData.flowFrames,
        uv = c.geometry.attributes.uv,
        pos = c.geometry.attributes.position,
        norm = c.geometry.attributes.normal;
      assert.ok([...pos.array, ...norm.array].every(Number.isFinite));
      assert.ok(uv.getY(uv.count - 1) > 0.5);
      for (let i = 1; i < frames.length; i++)
        assert.ok(frames[i].distance >= frames[i - 1].distance);
      const middle = Math.floor(frames.length / 2),
        p = new THREE.Vector3().fromBufferAttribute(pos, middle * 9 + 4);
      assert.ok(p.distanceTo(frames[middle].p) < 1e-5, spec.id);
      if (spec.kind !== "channel" && spec.id !== "water-whirlpool") {
        const y = frames.map((f) => f.p.y);
        assert.ok(
          Math.max(...y) - Math.min(...y) > 1,
          spec.id + " has flat/detached water",
        );
      }
    }
    disposeScenery(g);
  }
});
test("every outlet starts at its wet channel and lands inside the actual catch basin under real downward gravity", () => {
  for (const spec of WATER_RIDES) {
    const g = makeAttraction(spec.id),
      w = g.userData.slideWater,
      pool = w.pool;
    const terminating = w.channels.filter((c) => c.outlet !== false);
    assert.equal(w.outlets.length, terminating.length);
    w.outlets.forEach((o, index) => {
      assert.ok(
        o.from.distanceTo(
          terminating[index].geometry.userData.flowFrames.at(-1).p,
        ) < 0.025,
        spec.id + " detached jet",
      );
      const actual = o.from
        .clone()
        .addScaledVector(o.velocity, o.duration)
        .add(new THREE.Vector3(0, -4.905 * o.duration * o.duration, 0));
      assert.ok(actual.distanceTo(o.to) < 1e-8);
      if (o.surface === "pool") {
        assert.ok(Math.abs(o.to.y - pool.position.y - 0.161) < 1e-8);
        assert.ok(
          ((o.to.x - pool.position.x) / pool.userData.rx) ** 2 +
            ((o.to.z - pool.position.z) / pool.userData.rz) ** 2 <
            1,
          spec.id + " missing pool",
        );
      } else
        assert.ok(
          o.normal[1] > 0.1,
          "transfer foam follows the receiving bowl slope",
        );
      assert.ok(
        o.geometry.userData.flowFrames.at(-1).p.distanceTo(o.to) < 1e-6,
      );
    });
    disposeScenery(g);
  }
});
test("idle running water splashes at its outlets; an empty diving tower never emits a phantom rider splash", () => {
  for (const spec of WATER_RIDES) {
    const g = makeAttraction(spec.id),
      w = g.userData.slideWater;
    g.userData.update(23);
    assert.equal(w.effects.spray.visible, spec.kind !== "dive");
    assert.equal(w.effects.foam.visible, spec.kind !== "dive");
    let basinOrder = 0;
    w.pool.traverse((n) => {
      if (n.material?.uniforms?.uWaterField)
        basinOrder = Math.max(basinOrder, n.renderOrder);
    });
    assert.ok(
      w.effects.foam.renderOrder > basinOrder,
      "transparent basin must not paint over contact foam",
    );
    assert.ok(w.effects.spray.renderOrder > w.effects.foam.renderOrder);
    assert.equal(w.effects.spray.material.depthTest, true);
    assert.ok(w.effects.power.every((n) => n === 0));
    for (const m of w.materials) {
      assert.equal(m.uniforms.uTime.value, 23);
      assert.equal(m.uniforms.uWaterField.value, waterFieldTexture());
      assert.equal(m.forceSinglePass, true);
    }
    g.userData.update(60, true);
    assert.equal(w.effects.spray.visible, false);
    for (const m of w.materials) assert.equal(m.uniforms.uTime.value, 0);
    disposeScenery(g);
  }
});
test("a real rider impact creates one strong burst and basin waves, remains idempotent in the same frame, and cancellation rearms safely", () => {
  for (const spec of WATER_RIDES) {
    const g = makeAttraction(spec.id),
      w = g.userData.slideWater,
      event = w.events[0];
    assert.ok(event, spec.id);
    g.userData.rideElapsed = event.time + 0.01;
    g.userData.update(100);
    assert.equal(w.effects.power.filter((n) => n > 0).length, 1, spec.id);
    assert.ok(w.pool.userData.water.uniforms.uRippleCount.value > 0);
    const points = w.effects.points.map((p) => p.toArray());
    g.userData.update(100);
    g.userData.update(100.1);
    assert.deepEqual(
      w.effects.points.map((p) => p.toArray()),
      points,
    );
    delete g.userData.rideElapsed;
    g.userData.update(102);
    g.userData.rideElapsed = event.time + 0.01;
    g.userData.update(103);
    assert.equal(w.effects.power.filter((n) => n > 0).length, 2);
    assert.equal(w.effects.points.filter((p) => p.w === 103).length, 1);
    disposeScenery(g);
  }
});
test("continuous droplets and foam use fixed GPU instance buffers, bounded burst slots and no new textures or per-frame geometry work", () => {
  for (const spec of WATER_RIDES) {
    const g = makeAttraction(spec.id),
      w = g.userData.slideWater;
    const attrs = [
        ...Object.values(w.effects.spray.geometry.attributes),
        ...Object.values(w.effects.foam.geometry.attributes),
      ],
      versions = attrs.map((a) => a.version),
      arrays = attrs.map((a) => a.array);
    assert.equal(w.effects.points.length, 4);
    assert.ok(w.effects.spray.geometry.instanceCount <= 272);
    assert.ok(w.effects.foam.geometry.instanceCount <= 20);
    for (let i = 0; i < 80; i++) g.userData.update(10 + i / 30);
    assert.deepEqual(
      attrs.map((a) => a.version),
      versions,
    );
    attrs.forEach((a, i) => assert.equal(a.array, arrays[i]));
    assert.ok(w.group.children.filter((o) => o.isMesh).length <= 4);
    disposeScenery(g);
  }
});
test("resident riders use the same physical water route and trigger the same basin impact as the main cat", () => {
  for (const spec of WATER_RIDES) {
    const g = makeAttraction(spec.id),
      w = g.userData.slideWater;
    g.position.set(18, 0.16, -8);
    g.rotation.y = 0.7;
    g.userData.placement = { biome: "homestead" };
    const actor = {
        index: 0,
        profile: { biome: "homestead" },
        carrier: new THREE.Group(),
      },
      play = createResidentPlay({
        getCat: () => actor,
        getObject: () => g,
        onComplete: () => {},
      });
    assert.ok(play.start("tiny", { action: "ride", activityId: "test" }, 0));
    play.frame("tiny", 10000, 10);
    const elapsed = w.events[0].time + 0.01,
      frame = play.frame("tiny", 10000 + elapsed * 1000, 10 + elapsed),
      expected = g.localToWorld(
        new THREE.Vector3(...g.userData.rideFrame(elapsed).position),
      );
    assert.ok(frame.position.distanceTo(expected) < 1e-6, spec.id);
    assert.ok(
      w.effects.power.some((n) => n > 0),
      spec.id,
    );
    play.cancel("tiny");
    assert.equal(g.userData.rideElapsed, undefined);
    disposeScenery(g);
  }
});
test("water rendering leaves existing purchases, balances, XP and shared-save payloads unchanged through reload", () => {
  const now = Date.UTC(2026, 9, 18, 12),
    game = newGame(now),
    storage = new Map(),
    memory = {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v),
    };
  saveGame(memory, game);
  const original = JSON.stringify(game);
  for (const spec of WATER_RIDES) {
    const g = makeAttraction(spec.id);
    g.userData.rideElapsed = g.userData.slideWater.events[0].time + 0.01;
    g.userData.update(100);
    disposeScenery(g);
  }
  assert.equal(JSON.stringify(game), original);
  const loaded = loadGame(memory, now, { advance: false });
  assert.deepEqual(loaded.placements, game.placements);
  assert.ok(Object.values(loaded.inventory).every((n) => n === 0));
  assert.equal(loaded.coins, game.coins);
  assert.equal(loaded.progression.xp, game.progression.xp);
});
