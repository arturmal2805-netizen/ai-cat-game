import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createRideOutings } from "../public/ride-outings.js";
import { makeAttraction } from "../public/world-assets.js";
import { funnelFloor } from "../public/mega-ride-motion.js";
import { disposeScenery } from "../public/scenery-models.js";

test("healthy idle residents actually reserve different built water rides autonomously; manual, eating, building and occupied targets take priority", () => {
  const cats = new Map(
    ["a", "b", "c", "d"].map((id) => [
      id,
      { profile: { id, biome: "homestead" }, carrier: new THREE.Group() },
    ]),
  );
  const objects = new Map(
    ["first", "second", "locked", "unbuilt"].map((id) => {
      const g = new THREE.Group();
      g.userData = {
        placementId: id,
        placement: { biome: id === "locked" ? "moon" : "homestead" },
        built: id !== "unbuilt",
        rideFrame: () => {},
        slideWater: {},
      };
      return [id, g];
    }),
  );
  const visits = new Map(),
    locks = new Set(),
    blocked = new Set(["a"]),
    s = createRideOutings(),
    starts = [];
  const args = {
    cats,
    objects,
    visits,
    reserved: (id) => locks.has(id),
    blocked: (n) => blocked.has(n.profile.id),
    start: (id, d) => {
      starts.push([id, d.activityId]);
      visits.set(id, { decision: d });
      locks.add(d.activityId);
      return true;
    },
  };
  assert.deepEqual(s.step(2000, args), { catId: "b", activityId: "first" });
  assert.equal(s.step(2001, args), null);
  assert.deepEqual(s.step(4000, args), { catId: "c", activityId: "second" });
  assert.equal(s.step(6000, args), null);
  assert.equal(starts.length, 2);
  locks.delete("first");
  visits.delete("b");
  blocked.delete("a");
  assert.deepEqual(s.step(8000, args), { catId: "a", activityId: "first" });
  assert.equal(
    starts.some(([id, target]) => target === "locked" || target === "unbuilt"),
    false,
  );
});
test("the Titan raft is hidden when empty, tilts with its cat and its actual solid vertices remain above the concave bowl", () => {
  const g = makeAttraction("slide-titan-funnel"),
    route = g.userData.route,
    leg = route.legs.find((l) => l.phase === "vortex");
  g.userData.update(15);
  assert.equal(g.userData.moving.visible, false);
  const p = new THREE.Vector3();
  let clearance = Infinity;
  for (let i = 0; i <= 80; i++) {
    g.userData.rideElapsed = leg.start + (leg.duration * i) / 80;
    g.userData.update(100 + i);
    g.updateMatrixWorld(true);
    assert.equal(g.userData.moving.visible, true);
    const f = g.userData.rideFrame(g.userData.rideElapsed),
      q = new THREE.Quaternion().fromArray(f.quaternion);
    assert.ok(q.angleTo(g.userData.moving.quaternion) < 1e-6);
    g.userData.moving.traverse((m) => {
      if (!m.isMesh) return;
      const a = m.geometry.attributes.position;
      for (let j = 0; j < a.count; j++) {
        p.fromBufferAttribute(a, j).applyMatrix4(m.matrixWorld);
        const r = Math.hypot(p.x, p.z);
        if (r >= 1.85 && r <= 7.1)
          clearance = Math.min(clearance, p.y - funnelFloor(r));
      }
    });
  }
  assert.ok(
    clearance > 0.045,
    "raft embeds in the bowl/water film: " + clearance,
  );
  assert.ok(g.userData.bowlPostTops.length >= 2);
  for (const [x, y, z] of g.userData.bowlPostTops)
    assert.ok(
      y < funnelFloor(Math.max(1.85, Math.hypot(x, z) - 0.12)) - 0.05,
      "a support pierces the wet bowl and rider",
    );
  const legs = route.legs;
  for (let i = 1; i < legs.length; i++)
    if (legs[i].phase === "vortex" || legs[i].phase === "drain") {
      const a = route.frame(legs[i].start - 1e-5),
        b = route.frame(legs[i].start + 1e-5);
      assert.ok(
        new THREE.Vector3(...a.position).distanceTo(
          new THREE.Vector3(...b.position),
        ) < 0.001,
      );
      assert.ok(
        new THREE.Quaternion()
          .fromArray(a.quaternion)
          .angleTo(new THREE.Quaternion().fromArray(b.quaternion)) < 0.002,
        "sudden rotation at bowl mouth",
      );
    }
  delete g.userData.rideElapsed;
  g.userData.update(300);
  assert.equal(g.userData.moving.visible, false);
  disposeScenery(g);
});
