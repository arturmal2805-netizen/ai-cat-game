import { test } from "node:test";
import assert from "node:assert/strict";
import { createCat, moodNames, animateCat } from "../public/cat-model.js";
test("all moods use one Chichi model with distinct expressions and animation", () => {
  const cats = moodNames.map(createCat);
  for (const cat of cats) {
    assert.ok(cat.getObjectByName("Head"));
    assert.ok(cat.getObjectByName("Tail"));
    assert.equal(
      cat.children.filter((x) => x.name.startsWith("Leg")).length,
      4,
    );
    const tail = cat.getObjectByName("Tail");
    const before = tail.rotation.z;
    animateCat(cat, 0.5);
    assert.notEqual(tail.rotation.z, before);
  }
  assert.ok(cats[0].scale.y < cats[2].scale.y);
  assert.ok(
    cats[1].getObjectByName("Eye-1").scale.y >
      cats[2].getObjectByName("Eye-1").scale.y,
  );
});
test("reduced-motion setting preserves static pose", () => {
  const cat = createCat("sleep");
  const tail = cat.getObjectByName("Tail").rotation.z;
  animateCat(cat, 1, true, true);
  assert.equal(cat.getObjectByName("Tail").rotation.z, tail);
});

test("photo model has a taupe coat, green-gold irises and no orange tabby stripes", async () => {
  const { CHICHI_FUR, disposeCat } = await import("../public/cat-model.js");
  const cat = createCat();
  assert.equal(cat.getObjectByName("Face").material.color.getHex(), CHICHI_FUR);
  assert.ok(cat.getObjectByName("Iris-1").geometry.attributes.color);
  assert.ok(cat.getObjectByName("IrisFibres1"));
  assert.ok(cat.getObjectByName("Whisker-1_3"));
  assert.ok(cat.getObjectByName("CheekFluff"));
  assert.equal(cat.getObjectByName("ForeheadStripe0"), undefined);
  disposeCat(cat);
});

test("AI mood transitions preserve the rig and settle smoothly into their target pose", async () => {
  const { setCatMood } = await import("../public/cat-model.js");
  const cat = createCat("happy"),
    head = cat.getObjectByName("Head"),
    start = cat.scale.y;
  animateCat(cat, 0);
  setCatMood(cat, "sleep");
  assert.equal(cat.scale.y, start);
  animateCat(cat, 1 / 60);
  assert.ok(cat.scale.y < start && cat.scale.y > 0.7);
  assert.equal(cat.getObjectByName("Head"), head);
  for (let i = 2; i < 100; i++) animateCat(cat, i / 60);
  assert.ok(Math.abs(cat.scale.y - 0.7) < 0.001);
  assert.equal(cat.getObjectByName("Tongue").visible, false);
  assert.throws(() => setCatMood(cat, "sad"), RangeError);
});

test("blink closes both eyes briefly and restores them, while breathing and ears move", () => {
  const cat = createCat("happy"),
    eye = cat.getObjectByName("Eye-1"),
    body = cat.getObjectByName("Body");
  animateCat(cat, 1);
  const breath = body.scale.y,
    ear = cat.getObjectByName("LeftEar").rotation.x;
  animateCat(cat, 3.6);
  assert.ok(eye.scale.y < 0.05);
  assert.equal(cat.getObjectByName("ClosedEye-1").scale.x, 1);
  animateCat(cat, 3.8);
  assert.equal(eye.scale.y, 1);
  assert.ok(cat.getObjectByName("ClosedEye-1").scale.x < 0.01);
  assert.notEqual(body.scale.y, breath);
  assert.notEqual(cat.getObjectByName("LeftEar").rotation.x, ear);
});

test("walking legs use diagonal pairs and neighbours keep their size and coat", () => {
  const cat = createCat("happy", { detail: "npc", color: 0xd1a078 });
  cat.scale.setScalar(0.63);
  animateCat(cat, 0.15, true);
  const legs = cat.userData.legs;
  assert.ok(legs[0].rotation.x * legs[1].rotation.x < 0);
  assert.equal(legs[0].rotation.x, legs[3].rotation.x);
  assert.equal(cat.scale.y, 0.63);
  assert.equal(cat.getObjectByName("Face").material.color.getHex(), 0xd1a078);
  assert.equal(cat.getObjectByName("CoatFluff"), undefined);
});

test("reduced motion applies a new mood without starting a gait or blink", async () => {
  const { setCatMood } = await import("../public/cat-model.js");
  const cat = createCat("happy");
  setCatMood(cat, "sleep");
  animateCat(cat, 3.6, true, true);
  assert.equal(cat.scale.y, 0.7);
  const leg = cat.getObjectByName("Leg-1_1");
  assert.equal(leg.rotation.x, -0.95);
  const legPose = leg.quaternion.toArray();
  animateCat(cat, 4, true, true);
  assert.deepEqual(leg.quaternion.toArray(), legPose);
  const pose = cat.getObjectByName("Head").quaternion.toArray();
  animateCat(cat, 4, true, true);
  assert.deepEqual(cat.getObjectByName("Head").quaternion.toArray(), pose);
});

test("geometry stays finite through all moods, and lightweight neighbours cost less", () => {
  let heroVertices = 0,
    npcVertices = 0;
  for (const [detail, setCount] of [
    ["hero", (n) => (heroVertices = n)],
    ["npc", (n) => (npcVertices = n)],
  ]) {
    const cat = createCat("happy", { detail });
    let vertices = 0;
    cat.traverse((node) => {
      if (!node.isMesh) return;
      const p = node.geometry.attributes.position;
      vertices += p.count;
      for (const value of p.array) assert.ok(Number.isFinite(value));
    });
    setCount(vertices);
    for (const mood of moodNames) {
      cat.userData.mood = mood;
      for (let i = 0; i < 20; i++) animateCat(cat, i / 30, true);
      cat.traverse((n) =>
        assert.ok(
          [...n.position, ...n.scale, ...n.quaternion].every(Number.isFinite),
        ),
      );
    }
  }
  assert.ok(npcVertices < heroVertices * 0.35);
});

test("downloadable clips animate the live facial rig and close their loops", async () => {
  const { catAnimations } = await import("../scripts/cat-animation.mjs");
  const cat = createCat("happy"),
    clips = catAnimations(cat);
  assert.deepEqual(
    clips.map((c) => c.name),
    ["MoodLoop", "Walk"],
  );
  assert.ok(clips[0].tracks.some((t) => t.name === "Eye-1.scale"));
  assert.ok(clips[0].tracks.some((t) => t.name === "LeftEar.quaternion"));
  for (const track of clips.flatMap((c) => c.tracks)) {
    const size = track.getValueSize();
    assert.deepEqual(
      Array.from(track.values.slice(0, size)),
      Array.from(track.values.slice(-size)),
    );
  }
  const eye = clips[0].tracks.find((t) => t.name === "Eye-1.scale");
  assert.ok(Array.from(eye.values).some((v) => v < 0.05));
});
