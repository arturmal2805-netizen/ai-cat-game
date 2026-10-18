import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  sampleRideActing,
  rideActingFrame,
  installRideActing,
} from "../public/ride-acting.js";
import { WATER_RIDES } from "../public/water-ride-data.js";
import { MEGA_RIDES } from "../public/mega-ride-data.js";
import { makeAttraction } from "../public/world-assets.js";
import {
  createCat,
  animateCat,
  reactCat,
  disposeCat,
} from "../public/cat-model.js";
import { catAppearance, ADOPTION_CATS } from "../public/cat-breeds.js";
import { disposeScenery } from "../public/scenery-models.js";
import { createResidentPlay } from "../public/resident-play.js";

const straight =
  (speed, height = 0, descent = 0, phase = "ride") =>
  (t) => ({ position: [0, height - descent * t, speed * t], yaw: 0, phase });
const acting = (frame, t = 0.8) =>
  rideActingFrame(sampleRideActing(frame, 3), t);

test("real speed, drop height and slope produce different grips, wind, eyes and flight reactions", () => {
  const slow = acting(straight(1, 1)),
    fast = acting(straight(24, 1)),
    drop = acting(straight(12, 30, 15)),
    lowAir = acting(straight(8, 2, 0, "flight")),
    highAir = acting(straight(8, 30, 0, "flight"));
  assert.ok(fast.grip > slow.grip + 0.3);
  assert.ok(fast.crouch > slow.crouch);
  assert.ok(fast.tailTrail < slow.tailTrail - 0.3);
  assert.ok(drop.grip > fast.grip, "steep descent braces paws more strongly");
  assert.ok(highAir.surprise > lowAir.surprise + 0.3);
  assert.ok(highAir.frontLift > lowAir.frontLift + 0.1);
  assert.ok(highAir.paw > fast.paw + 0.6, "paws spread in real airtime");
  assert.equal(highAir.grip, 0);
  assert.ok(
    acting(straight(1, 30, 0, "lift")).headPitch >
      acting(straight(1, 2, 0, "lift")).headPitch,
  );
});

test("left and right real turns cause opposite leaning and gaze without inventing a seat offset", () => {
  const circle = (sign) => (t) => ({
    position: [Math.sin(t) * sign * 9, 3, Math.cos(t) * 9],
    yaw: sign * -t,
    phase: "vortex",
  });
  const left = acting(circle(-1)),
    right = acting(circle(1));
  assert.ok(left.bodyLean * right.bodyLean < 0);
  assert.ok(left.headYaw * right.headYaw < 0);
  assert.ok(Math.abs(left.bodyLean + right.bodyLean) < 1e-5);
  assert.equal(
    left.position,
    undefined,
    "acting never moves the carrier off the raft",
  );
});

test("landing is a brief blink, compression and damped shake followed by recovery", () => {
  const p = sampleRideActing(straight(5, 2), 3, [{ time: 1 }]),
    before = rideActingFrame(p, 0.99),
    hit = rideActingFrame(p, 1.08),
    recovery = rideActingFrame(p, 2.7);
  assert.ok(hit.eyeClose > before.eyeClose + 0.7);
  assert.equal(rideActingFrame(p, 1.11).eyeClose, 0.98);
  assert.ok(hit.crouch > before.crouch + 0.08);
  assert.ok(Math.abs(hit.headRoll) > 0.03);
  assert.ok(Math.abs(recovery.headRoll) < 0.001);
  assert.ok(recovery.eyeClose < 0.04);
  // No instantaneous jump at the exact contact frame.
  assert.ok(
    Math.abs(
      rideActingFrame(p, 1.0001).headRoll - rideActingFrame(p, 0.9999).headRoll,
    ) < 0.001,
  );
});

test("all water slides and mega coasters have finite, continuous, bounded choreography with shared fixed tables", () => {
  for (const spec of [
    ...WATER_RIDES,
    ...MEGA_RIDES.filter((s) => s.id.startsWith("coaster")),
  ]) {
    const g = makeAttraction(spec.id),
      d = g.userData,
      same = makeAttraction(spec.id),
      rows = d.rideActing.rows.slice();
    assert.equal(d.rideActing, same.userData.rideActing, spec.id);
    assert.ok(d.rideActing.count <= 512);
    let changed = false,
      previous;
    for (let i = 0; i <= 600; i++) {
      const t = (d.duration * i) / 600,
        r = { ...d.rideReaction(t) };
      for (const v of Object.values(r))
        if (typeof v === "number") assert.ok(Number.isFinite(v), spec.id);
      assert.ok(r.crouch >= 0 && r.crouch < 0.3);
      assert.ok(r.paw >= 0 && r.paw <= 1);
      if (previous && Math.abs(r.headRoll - previous.headRoll) > 0.002)
        changed = true;
      const next = d.rideReaction(Math.min(d.duration, t + 0.0001));
      assert.ok(
        Math.abs(next.headRoll - r.headRoll) < 0.005,
        spec.id + " smooth pose",
      );
      previous = r;
    }
    assert.deepEqual(
      d.rideActing.rows,
      rows,
      "no per-frame motion table edits",
    );
    assert.ok(
      changed || d.rideActing.maxSpeed < 6,
      spec.id + " animated reaction",
    );
    const reduced = d.rideReaction(d.duration * 0.5, true);
    for (const [k, v] of Object.entries(reduced))
      if (!["ride", "speed", "height", "turnForce"].includes(k))
        assert.ok(v === 0, spec.id + " reduced " + k);
    disposeScenery(g);
    disposeScenery(same);
  }
});

test("runtime sampling happens only once, never while an active rider animates", () => {
  let calls = 0;
  const root = {
    userData: {
      id: "qa-acting-only",
      duration: 12,
      rideFrame: (t) => {
        calls++;
        return straight(12, 20, 1)(t);
      },
    },
  };
  installRideActing(root);
  const initial = calls,
    first = root.userData.rideReaction(1);
  for (let i = 0; i < 10000; i++)
    assert.equal(root.userData.rideReaction(i % 12), first);
  assert.ok(initial <= 513);
  assert.equal(calls, initial);
});

function pose(c) {
  const d = c.userData;
  return [
    d.body,
    d.head,
    d.tail,
    ...d.legs,
    ...d.eyes,
    ...d.closedEyes,
    ...d.legJoints.flatMap((j) => [j.knee, j.ankle]),
  ].map((n) => [...n.position, ...n.quaternion, ...n.scale]);
}
function frontPaws(c) {
  c.updateMatrixWorld(true);
  return c.userData.legs
    .filter((l) => l.position.z > 0)
    .map((leg) => {
      let skin;
      leg.traverse((n) => {
        if (n.isSkinnedMesh && n.name === "Shin") skin = n;
      });
      const p = skin.geometry.attributes.position;
      let lowest = 0;
      for (let i = 1; i < p.count; i++)
        if (p.getY(i) < p.getY(lowest)) lowest = i;
      skin.skeleton.update();
      return skin
        .getVertexPosition(lowest, new THREE.Vector3())
        .applyMatrix4(skin.matrixWorld);
    });
}
test("Chichi, tiny and giant cats animate through their approved rigs and return exactly to their ordinary pose", () => {
  const g = makeAttraction("slide-sky-cannon"),
    d = g.userData;
  for (const id of [null, "adopt-crumb", "adopt-doughnut"]) {
    const options = id
        ? catAppearance(ADOPTION_CATS.find((c) => c.id === id))
        : {},
      c = createCat("happy", options),
      clean = createCat("happy", options),
      meshes = [];
    c.traverse((n) => {
      if (n.isMesh)
        meshes.push([
          n,
          n.geometry,
          n.material,
          n.geometry.attributes.position.array,
        ]);
    });
    const carrier = new THREE.Group();
    carrier.position.set(2, 7, 3);
    carrier.add(c);
    const position = carrier.position.clone();
    const flight = d.route.legs.find((l) => l.phase === "flight"),
      r = d.rideReaction(flight.start + flight.duration * 0.5);
    animateCat(c, 1);
    const pawsBefore = frontPaws(c);
    reactCat(c, r);
    carrier.updateMatrixWorld(true);
    frontPaws(c).forEach((point, i) =>
      assert.ok(
        point.distanceTo(pawsBefore[i]) > 0.25,
        "the real skinned paw surface must visibly rise/spread in flight",
      ),
    );
    assert.ok(c.userData.legs.some((l) => Math.abs(l.rotation.z) > 0.1));
    assert.ok(c.userData.eyes[0].scale.y > 1.02);
    assert.deepEqual(carrier.position, position);
    assert.equal(c.userData.mood, "happy");
    assert.ok(pose(c).flat().every(Number.isFinite));
    for (const [n, geometry, material, points] of meshes) {
      assert.equal(n.geometry, geometry);
      assert.equal(n.material, material);
      assert.equal(n.geometry.attributes.position.array, points);
    }
    animateCat(c, 1.1);
    animateCat(clean, 1.1);
    assert.deepEqual(
      pose(c),
      pose(clean),
      "cancellation restores normal face, limbs and fur pose",
    );
    animateCat(c, 1.2);
    reactCat(c, r);
    animateCat(c, 0, false, true);
    animateCat(clean, 0, false, true);
    assert.deepEqual(
      pose(c),
      pose(clean),
      "reduced motion restores the ordinary rig",
    );
    disposeCat(c);
    disposeCat(clean);
  }
  disposeScenery(g);
});

test("resident runtime receives the same complete speed/height/turn reaction as Chichi", () => {
  const g = makeAttraction("slide-titan-funnel"),
    actor = {
      index: 0,
      carrier: new THREE.Group(),
      profile: { id: "qa", biome: "moon" },
    },
    runtime = createResidentPlay({ getCat: () => actor, getObject: () => g });
  runtime.start("qa", { action: "ride", activityId: "qa-slide" }, 0);
  runtime.frame("qa", 10000, 10, false);
  const leg = g.userData.route.legs.find((l) => l.phase === "vortex"),
    t = leg.start + leg.duration * 0.5,
    f = runtime.frame("qa", 10000 + t * 1000, 10 + t, false);
  assert.deepEqual(f.reaction, g.userData.rideReaction(t));
  assert.ok(Math.abs(f.reaction.bodyLean) > 0.02);
  runtime.clear();
  disposeScenery(g);
});
