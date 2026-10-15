import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import {
  createCat,
  animateCat,
  setCatMood,
  disposeCat,
  moodNames,
} from "../public/cat-model.js";
import { groomFur } from "../public/chichi-sculpt.js";
import { catAnimations } from "../scripts/cat-animation.mjs";

test("reference kitten has a broad head, compact torso, large round pupils and a raised tail", () => {
  const cat = createCat(),
    face = cat.getObjectByName("Face"),
    body = cat.userData.body,
    size = (o) => {
      o.geometry.computeBoundingBox();
      return o.geometry.boundingBox
        .getSize(new THREE.Vector3())
        .multiply(o.scale);
    },
    head = size(face),
    torso = size(body);
  assert.equal(cat.userData.reference, true);
  assert.ok(head.x > torso.x * 1.2, "kitten head is wider than the torso");
  assert.ok(
    head.x / head.y > 1.2 && head.x / head.y < 1.65,
    "broad, rounded face",
  );
  assert.ok(
    torso.z / head.x < 1.2,
    "compact kitten rather than long adult body",
  );
  for (const side of [-1, 1]) {
    const iris = cat.getObjectByName("Iris" + side),
      pupil = cat.getObjectByName("Pupil" + side);
    assert.ok(pupil.scale.x / pupil.scale.y > 0.85, "round, dilated pupils");
    assert.ok(
      pupil.scale.x / iris.scale.x > 0.65 && pupil.scale.x / iris.scale.x < 0.8,
    );
  }
  cat.updateMatrixWorld(true);
  const tailBox = new THREE.Box3().setFromObject(cat.userData.tail),
    headBox = new THREE.Box3().setFromObject(face);
  assert.ok(
    tailBox.max.y > headBox.max.y,
    "raised plush tail is visible above the head",
  );
  disposeCat(cat);
});

test("convex irises face the viewer instead of being culled behind their sockets", () => {
  const cat = createCat();
  for (const side of [-1, 1]) {
    const g = cat.getObjectByName("Iris" + side).geometry,
      p = g.attributes.position,
      n = g.attributes.normal;
    g.computeBoundingBox();
    assert.ok(g.boundingBox.max.z - g.boundingBox.min.z > 0.03);
    for (let i = 0; i < n.count; i++) assert.ok(n.getZ(i) > 0.95);
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();
    let faces = 0;
    for (let i = 0; i < g.index.count; i += 3) {
      a.fromBufferAttribute(p, g.index.getX(i));
      b.fromBufferAttribute(p, g.index.getX(i + 1));
      c.fromBufferAttribute(p, g.index.getX(i + 2));
      const normal = b.sub(a).cross(c.sub(a));
      if (normal.lengthSq() < 1e-15) continue;
      assert.ok(normal.z > 0);
      faces++;
    }
    assert.ok(faces > 1000);
  }
  disposeCat(cat);
});

test("groomed hair is rooted in the actual skin, tapers and has outward triangle winding", () => {
  const surface = new THREE.PlaneGeometry(2, 2),
    g = groomFur(surface, 200, {
      seed: 912,
      length: 0.03,
      width: 0.001,
      region: "test-plane",
    }),
    p = g.attributes.position,
    n = g.attributes.normal,
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  assert.equal(p.count, 1000);
  assert.equal(g.userData.strands, 200);
  for (let strand = 0; strand < 200; strand++) {
    const v = strand * 5;
    for (const root of [v, v + 1]) {
      assert.ok(
        Math.abs(p.getZ(root) + 0.0006) < 1e-7,
        "root lies on the skin",
      );
      assert.ok(
        Math.abs(p.getX(root)) <= 1.001 && Math.abs(p.getY(root)) <= 1.001,
      );
    }
    assert.ok(p.getZ(v + 4) > p.getZ(v) + 0.005, "tip grows out from the skin");
  }
  for (let i = 0; i < g.index.count; i += 3) {
    const root = g.index.getX(i);
    a.fromBufferAttribute(p, root);
    b.fromBufferAttribute(p, g.index.getX(i + 1));
    c.fromBufferAttribute(p, g.index.getX(i + 2));
    const normal = b.sub(a).cross(c.sub(a));
    assert.ok(normal.dot(a.fromBufferAttribute(n, root)) > 0);
  }
  assert.ok(n.array instanceof Int16Array);
  assert.equal(n.normalized, true);
  assert.ok(g.attributes.color.array instanceof Uint8Array);
  surface.dispose();
  g.dispose();
});

test("model instances and cached hair stay independent across mood changes and disposal", () => {
  const first = createCat(),
    second = createCat();
  for (const name of [
    "Face",
    "Body",
    "CheekFluff",
    "CoatFluff",
    "TailVelvet",
  ]) {
    const a = first.getObjectByName(name),
      b = second.getObjectByName(name);
    assert.notEqual(a.geometry, b.geometry);
    assert.notEqual(
      a.geometry.attributes.position.array,
      b.geometry.attributes.position.array,
    );
  }
  const before = second
    .getObjectByName("CheekFluff")
    .geometry.attributes.position.getX(0);
  first.getObjectByName("CheekFluff").geometry.attributes.position.setX(0, 999);
  setCatMood(first, "sleep", { immediate: true });
  disposeCat(first);
  assert.equal(
    second.getObjectByName("CheekFluff").geometry.attributes.position.getX(0),
    before,
  );
  assert.equal(second.userData.mood, "happy");
  animateCat(second, 0.3, true);
  assert.ok(second.userData.eyes[0].scale.y > 0.9);
  disposeCat(second);
});

test("all emotions, walking and reduced motion retain a finite genuine 3D rig", () => {
  const cat = createCat();
  for (const mood of moodNames)
    for (const reduced of [false, true]) {
      setCatMood(cat, mood, { immediate: true });
      for (const time of [0, 0.15, 0.3, 1.2, 3.6, 3.8, 4.8]) {
        animateCat(cat, time, true, reduced);
        cat.updateMatrixWorld(true);
        cat.traverse((o) => {
          assert.ok(!o.isSprite);
          assert.ok([...o.matrixWorld.elements].every(Number.isFinite));
        });
      }
      if (mood === "sleep")
        assert.ok(cat.userData.eyes.every((o) => o.scale.y < 0.05));
      if (mood === "crazy hungry") assert.ok(cat.userData.jaw.rotation.x > 0.1);
    }
  disposeCat(cat);
});

test("Chichi bends continuous weighted legs and their fur together, and exports those joints", () => {
  const cat = createCat(),
    rig = cat.userData.legJoints;
  assert.equal(rig.length, 4);
  const leg = cat.userData.legs[1],
    skin = leg.getObjectByName("Shin"),
    hair = leg.children.find((o) => o.name.startsWith("LegVelvet"));
  assert.ok(skin.isSkinnedMesh && hair.isSkinnedMesh);
  assert.equal(skin.skeleton, hair.skeleton);
  for (const mesh of [skin, hair]) {
    const weights = mesh.geometry.attributes.skinWeight;
    for (let i = 0; i < weights.count; i++)
      assert.ok(
        Math.abs(
          weights.getX(i) +
            weights.getY(i) +
            weights.getZ(i) +
            weights.getW(i) -
            1,
        ) < 1e-6,
      );
  }
  animateCat(cat, 0, false);
  cat.updateMatrixWorld(true);
  const p = skin.geometry.attributes.position;
  let lowest = 0;
  for (let i = 1; i < p.count; i++) if (p.getY(i) < p.getY(lowest)) lowest = i;
  const before = skin.getVertexPosition(lowest, new THREE.Vector3());
  animateCat(cat, 0.15, true);
  cat.updateMatrixWorld(true);
  assert.ok(Math.abs(rig[1].knee.rotation.x) > 0.1);
  assert.ok(
    skin.getVertexPosition(lowest, new THREE.Vector3()).distanceTo(before) >
      0.02,
    "paw bends within the leg mesh",
  );
  const walk = catAnimations(cat)[1];
  assert.ok(
    walk.tracks.some((t) => t.name === rig[1].knee.name + ".quaternion"),
  );
  assert.ok(
    walk.tracks.some((t) => t.name === rig[1].ankle.name + ".quaternion"),
  );
  disposeCat(cat);
});

test("the complete animated kitten exports below the static asset limit, including physical fur", async () => {
  globalThis.FileReader = class {
    async readAsArrayBuffer(blob) {
      this.result = await blob.arrayBuffer();
      this.onloadend?.();
    }
    async readAsDataURL(blob) {
      this.result =
        "data:application/octet-stream;base64," +
        Buffer.from(await blob.arrayBuffer()).toString("base64");
      this.onloadend?.();
    }
  };
  const cat = createCat(),
    animations = catAnimations(cat);
  cat.traverse((o) => {
    o.userData = {};
  });
  const bytes = await new GLTFExporter().parseAsync(cat, {
      binary: true,
      animations,
    }),
    buffer = Buffer.from(bytes);
  assert.equal(buffer.readUInt32LE(0), 0x46546c67);
  assert.ok(
    buffer.length < 25 * 1024 * 1024,
    "GLB must fit the production asset limit",
  );
  const json = JSON.parse(
    buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString(),
  );
  assert.ok(json.extensionsUsed.includes("KHR_mesh_quantization"));
  for (const material of json.materials)
    for (const value of material.pbrMetallicRoughness?.baseColorFactor || [])
      assert.ok(value >= 0 && value <= 1, "glTF base colours must be in range");
  assert.equal(new Set(json.skins.map((s) => s.joints.join(","))).size, 4);
  assert.ok(json.skins.every((s) => s.joints.length === 3));
  assert.deepEqual(
    json.animations.map((a) => a.name),
    ["MoodLoop", "Walk"],
  );
  for (const name of [
    "Face",
    "CheekFluff",
    "CoatFluff",
    "TailVelvet",
    "Head",
    "LeftEar",
    "Jaw",
    "Eye-1",
  ])
    assert.ok(
      json.nodes.some((n) => n.name === name),
      name,
    );
  assert.ok(
    json.accessors.some((a) => a.componentType === 5122 && a.normalized),
  );
  disposeCat(cat);
});
