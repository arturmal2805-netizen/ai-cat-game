import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { makeAttraction } from "../public/world-assets.js";
import { createResidentPlay } from "../public/resident-play.js";
import {
  reserveSlide,
  releaseSlide,
  SLIDE_HEADWAY_MS,
} from "../public/slide-riders.js";
import { disposeScenery } from "../public/scenery-models.js";
import { createSlideAudio } from "../public/slide-audio.js";
import { rideGuests } from "../public/ride-guests.js";

test("four guests reserve one slide, walk to separate waiting spots, depart with headway and keep independent moving rafts", () => {
  for (const id of ["slide-titan-funnel", "slide-dream-canyon-twins"]) {
    const g = makeAttraction(id);
    g.position.set(31, 0.16, -20);
    g.rotation.y = 0.7;
    g.userData.placement = { biome: "homestead" };
    g.updateMatrixWorld(true);
    const cats = new Map(
      Array.from({ length: 5 }, (_, i) => [
        "cat" + i,
        { carrier: new THREE.Group(), profile: { biome: "homestead" } },
      ]),
    );
    const play = createResidentPlay({
      getCat: (id) => cats.get(id),
      getObject: () => g,
      concurrentSlides: true,
    });
    for (let i = 0; i < 4; i++)
      assert.equal(
        play.start("cat" + i, { action: "ride", activityId: "slide" }, 0),
        true,
      );
    assert.equal(
      play.start("cat4", { action: "ride", activityId: "slide" }, 0),
      false,
    );
    assert.equal(play.reserved("slide"), true);
    for (let i = 0; i < 4; i++) play.frame("cat" + i, 10000, 10);
    const riders = [...g.userData.slideRiders.values()];
    for (let i = 1; i < 4; i++) {
      assert.ok(
        riders[i].launchAt - riders[i - 1].launchAt >= SLIDE_HEADWAY_MS,
      );
      assert.ok(
        new THREE.Vector3(...riders[i].queue).distanceTo(
          new THREE.Vector3(...riders[i - 1].queue),
        ) >= 3.5,
      );
    }
    for (let time = 10100; time <= 29000; time += 100)
      for (const [id, n] of cats) {
        const f = play.frame(id, time, time / 1000);
        if (f) {
          n.carrier.position.copy(f.position);
          if (f.quaternion) n.carrier.quaternion.copy(f.quaternion);
        }
      }
    const active = [...play.visits.values()].filter(
      (v) => v.phase === "activity",
    );
    assert.ok(active.length >= 2);
    for (const v of active) {
      const frame = g.userData.rideFrame(v.elapsed, false, v.rider.lane),
        expected = g.localToWorld(new THREE.Vector3(...frame.position));
      assert.ok(cats.get(v.id).carrier.position.distanceTo(expected) < 1e-6);
    }
    assert.ok(g.userData.slideVehicles.length >= 2);
    assert.ok(g.userData.slideVehicles.length <= 4);
    assert.ok(
      new Set(g.userData.slideVehicles.map((v) => v.children[0]?.geometry))
        .size <= 1,
      "raft buffers are shared",
    );
    const before = play.visits.size;
    play.cancel(active[0].id);
    assert.equal(play.visits.size, before - 1);
    assert.equal(play.reserved("slide"), false);
    play.clear();
    assert.equal(g.userData.slideRiders.size, 0);
    assert.ok(g.userData.slideVehicles.every((v) => !v.visible));
    disposeScenery(g);
  }
});
test("each simultaneous rider splashes exactly once; another visitor cannot rewind or replay their water event", () => {
  const g = makeAttraction("slide-dream-canyon-twins"),
    a = reserveSlide(g, "a"),
    b = reserveSlide(g, "b"),
    c = reserveSlide(g, "c");
  let sounds = 0;
  g.userData.onWaterImpact = () => sounds++;
  for (const r of [a, b, c])
    r.elapsed = g.userData.route.lanes[r.lane].impacts.at(-1).time - 0.1;
  g.userData.update(99);
  assert.equal(sounds, 0);
  for (const r of [a, b]) r.elapsed += 0.2;
  g.userData.update(100);
  assert.equal(sounds, 2);
  g.userData.update(100);
  g.userData.update(100.1);
  assert.equal(sounds, 2);
  c.elapsed += 0.2;
  g.userData.update(100.2);
  assert.equal(sounds, 3);
  releaseSlide(g, "a");
  g.userData.update(100.3);
  assert.equal(sounds, 3);
  releaseSlide(g, "b");
  releaseSlide(g, "c");
  assert.equal(g.userData.slideRiders.size, 0);
  disposeScenery(g);
});
test("guest list omits the waiting queue and exposes each active rider on its own attraction", () => {
  const visits = new Map([
    [
      "waiting",
      { phase: "queue", decision: { action: "ride", activityId: "s" } },
    ],
    [
      "riding",
      { phase: "activity", decision: { action: "ride", activityId: "s" } },
    ],
  ]);
  assert.deepEqual(rideGuests("s", null, visits), ["riding"]);
});
test("splash audio stays silent before a gesture, reuses one noise buffer, bounds voices and disposes its listener", () => {
  let allocated = 0,
    contexts = 0,
    closed = 0,
    listener,
    sourceCount = 0;
  const sources = [];
  const node = () => ({
    connect() {},
    disconnect() {},
    gain: {
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
    },
    frequency: { value: 0 },
    start() {},
    stop() {},
  });
  class Audio {
    constructor() {
      contexts++;
      this.state = "suspended";
      this.sampleRate = 24000;
      this.currentTime = 1;
      this.destination = {};
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
    createBuffer(n, length) {
      allocated++;
      return { getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      sourceCount++;
      const n = node();
      sources.push(n);
      return n;
    }
    createBiquadFilter() {
      return node();
    }
    createGain() {
      return node();
    }
    close() {
      closed++;
      return Promise.resolve();
    }
  }
  const target = {
      addEventListener(event, fn) {
        listener = fn;
      },
      removeEventListener(event, fn) {
        assert.equal(fn, listener);
        listener = null;
      },
    },
    audio = createSlideAudio(target, { AudioContext: Audio });
  assert.equal(audio.splash(), false);
  assert.equal(contexts, 0);
  listener();
  listener();
  assert.equal(contexts, 1);
  assert.equal(audio.splash(2), true);
  assert.equal(audio.splash(2), false);
  assert.equal(allocated, 1);
  sources[0].onended();
  audio.dispose();
  assert.equal(closed, 1);
  assert.equal(listener, null);
  assert.equal(audio.splash(), false);
  assert.equal(sourceCount, 1);
});
