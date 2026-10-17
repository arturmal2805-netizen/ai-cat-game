import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  chooseSocialRide,
  SOCIAL_RIDE_CHANCE,
  socialContext,
  socialFrame,
  socialDuration,
} from "../public/social-animation.js";
import { createResidentPlay } from "../public/resident-play.js";
const model = (s, width = 1) => ({
  scale: { x: s },
  userData: {
    anatomy: { bodyY: 0.79, bodyHeight: 0.43, bodyX: 0.405, bodyLength: 0.585 },
    build: { width, length: 1 },
  },
});
test("a manual friendship draws exactly once with a 37 percent piggyback probability, not every third encounter", () => {
  assert.equal(SOCIAL_RIDE_CHANCE, 0.37);
  assert.equal(
    chooseSocialRide(() => 0.36999),
    true,
  );
  assert.equal(
    chooseSocialRide(() => 0.37),
    false,
  );
  let selected = 0;
  for (let i = 0; i < 1000; i++)
    selected += chooseSocialRide(() => (i + 0.5) / 1000);
  assert.equal(selected, 370);
});
test("greeting, play and cuddling keep two distinct silhouettes for kittens, normal cats and colossal cats", () => {
  for (const [h, f] of [
    [model(0.63), model(0.63)],
    [model(0.28), model(1.4, 2.8)],
    [model(1.4, 2.8), model(0.28)],
  ]) {
    const c = socialContext(h, f);
    for (const kind of ["greet", "play", "cuddle"])
      for (let t = 0; t < socialDuration(kind); t += 0.025) {
        const { hero: a, friend: b } = socialFrame(t, kind, false, c),
          d = Math.hypot(a.x - b.x, a.z - b.z);
        assert.ok(d >= c.sideGap - 0.001, kind + " " + t + " " + d);
      }
  }
});
test("the smaller cat mounts, follows the exact moving back seat, and returns to the ground without frame jumps", () => {
  for (const [h, f] of [
    [model(0.63), model(0.63)],
    [model(0.3), model(1.2, 2.8)],
    [model(1.2, 2.8), model(0.3)],
  ]) {
    const c = socialContext(h, f, { ride: true }),
      rider = c.carrier === "hero" ? "friend" : "hero";
    let previous = null,
      travel = 0;
    for (let t = 0; t <= 18; t += 0.01) {
      const frame = socialFrame(t, "piggyback", false, c),
        r = frame[rider],
        b = frame[c.carrier];
      assert.ok(r.jump >= -0.001);
      if (t >= 4 && t < 14.6) {
        assert.ok(Math.abs(r.jump - b.jump - c.seat) < 1e-8);
        assert.ok(
          Math.abs(Math.hypot(r.x - b.x, r.z - b.z) - Math.abs(c.riderZ)) <
            1e-8,
        );
        assert.equal(r.yaw, b.yaw);
      }
      if (previous) {
        for (const k of ["hero", "friend"])
          assert.ok(
            Math.hypot(
              frame[k].x - previous[k].x,
              frame[k].jump - previous[k].jump,
              frame[k].z - previous[k].z,
            ) < 0.08,
          );
        travel += Math.hypot(
          b.x - previous[c.carrier].x,
          b.z - previous[c.carrier].z,
        );
      }
      previous = frame;
    }
    assert.ok(travel > 4);
    assert.ok(previous[rider].jump < 0.001);
    assert.deepEqual(
      socialFrame(4, "piggyback", true, c),
      socialFrame(14, "piggyback", true, c),
    );
  }
});
test("resident-to-resident drops use the same ride, release both cats safely, and never re-roll during animation", () => {
  const a = {
      profile: { biome: "moon" },
      carrier: new THREE.Group(),
      model: model(0.3),
    },
    b = {
      profile: { biome: "moon" },
      carrier: new THREE.Group(),
      model: model(1.2, 2),
    };
  a.carrier.position.set(4, 0.16, 0);
  b.carrier.position.set(0, 0.16, 0);
  let rolls = 0,
    complete = 0;
  const r = createResidentPlay({
    getCat: (id) => (id === "a" ? a : b),
    getObject: () => null,
    random: () => {
      rolls++;
      return 0.2;
    },
    groundY: () => 0.16,
    onComplete: () => complete++,
  });
  assert.ok(r.start("a", { action: "meet", friendId: "b" }, 0));
  assert.equal(r.get("a").socialKind, "piggyback");
  r.frame("a", 10000, 10);
  for (let t = 0; t <= 19; t += 0.02) {
    const f = r.frame("a", 10000 + t * 1000, 10 + t);
    if (f) a.carrier.position.copy(f.position);
  }
  assert.equal(rolls, 1);
  assert.equal(complete, 1);
  assert.equal(r.visits.size, 0);
  assert.equal(a.carrier.position.y, 0.16);
  assert.equal(b.carrier.position.y, 0.16);
  assert.ok(r.start("a", { action: "meet", friendId: "b" }, 40000));
  r.frame("a", 50000, 50);
  a.carrier.position.copy(r.frame("a", 58000, 58).position);
  assert.ok(a.carrier.position.y > 0.5);
  r.cancel("a");
  assert.equal(a.carrier.position.y, 0.16);
  assert.equal(b.carrier.position.y, 0.16);
});

test("headings turn smoothly into each social clip rather than snapping at the approach, chase or mount transition", () => {
  const c = {
    ...socialContext(model(0.63), model(0.63)),
    heroYaw: 1.2,
    friendYaw: -2.1,
  };
  for (const kind of ["greet", "play", "cuddle", "piggyback"]) {
    let previous = socialFrame(0, kind, false, c);
    for (let t = 0.01; t < socialDuration(kind); t += 0.01) {
      const f = socialFrame(t, kind, false, c);
      for (const k of ["hero", "friend"]) {
        const d = f[k].yaw - previous[k].yaw;
        assert.ok(
          Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < 0.12,
          kind + " " + t,
        );
      }
      previous = f;
    }
  }
});
