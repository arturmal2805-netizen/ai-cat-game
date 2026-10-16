import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { createCat, animateCat, disposeCat } from "../public/cat-model.js";
import { kittenSurface, kittenLeg, groomFur } from "../public/chichi-sculpt.js";
import { ADOPTION_CATS, catAppearance } from "../public/cat-breeds.js";
import { newGame, saveGame, loadGame } from "../public/economy.js";
import { adoptCat } from "../public/adoption.js";
import { activeCats } from "../public/cat-roster.js";
import { xpForLevel } from "../public/progression.js";

function fingerprint(cat, { ignoreEyeBacking = false } = {}) {
  const hash = createHash("sha256"),
    record = (v) => hash.update(JSON.stringify(v));
  cat.traverse((o) => {
    if (ignoreEyeBacking)
      for (let parent = o; parent; parent = parent.parent)
        if (parent.name.startsWith("EyeGlobe")) return;
    record([
      o.name,
      o.type,
      o.visible,
      o.position.toArray(),
      o.quaternion.toArray(),
      o.scale.toArray(),
    ]);
    if (!o.isMesh) return;
    for (const [name, a] of Object.entries(o.geometry.attributes).sort(
      ([a], [b]) => a.localeCompare(b),
    )) {
      record([name, a.itemSize, a.normalized, a.array.constructor.name]);
      hash.update(
        new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength),
      );
    }
    if (o.geometry.index)
      hash.update(new Uint8Array(o.geometry.index.array.buffer));
    for (const m of [].concat(o.material)) {
      record([
        m.type,
        m.color?.getHex(),
        m.roughness,
        m.metalness,
        m.sheen,
        m.sheenColor?.getHex(),
        m.side,
        m.vertexColors,
        m.customProgramCacheKey(),
      ]);
    }
  });
  return hash.digest("hex");
}

// Frozen before this update: includes every vertex, hair, colour, material and
// rig transform. Restore only the deliberately corrected tongue anchor before
// comparing: the approved sculpt, eyes, coat and every other transform stay exact.
test("Chichi's approved model stays byte-identical apart from the corrected tongue anchor", () => {
  const expected = {
    sleep: "b00d4b1d701495eb26bd05a333c9a63531cb2711859f7aa3f8edab6824c1ac39",
    "crazy hungry":
      "40d995c2c86960fb291beb45853857432321d20701eee3aa6923d9d284f16757",
    happy: "9829b97737b441c0bf3881f75939d5b6137cd051db985db08471faf0767bad5a",
  };
  for (const [mood, hash] of Object.entries(expected)) {
    const cat = createCat(mood);
    cat.userData.tongue.position.set(0, 0.018, 0.112);
    assert.equal(fingerprint(cat), hash, mood);
    disposeCat(cat);
  }
});

test("approved Cloudberry and Nimbus keep their model outside the repaired eye backing and tongue anchor", () => {
  const expected = {
    "adopt-cloudberry":
      "6047e3940c9700096b173aa406beb40f25e66fee984e5f21bb4e6a1bb75dcf99",
    "adopt-nimbus":
      "0eba4ec4cc10b093f4d2a3f93a29cf322388ce2f534a447f35f253aeddcf13ff",
  };
  for (const [id, hash] of Object.entries(expected)) {
    const c = createCat(
      "happy",
      catAppearance(ADOPTION_CATS.find((p) => p.id === id)),
    );
    c.userData.tongue.position.set(0, 0.018, 0.112);
    assert.equal(fingerprint(c, { ignoreEyeBacking: true }), hash, id);
    disposeCat(c);
  }
});

test("new colossal cats are about twice Cloudberry's world width with a slow stable gait", () => {
  const cloudProfile = ADOPTION_CATS.find((p) => p.id === "adopt-cloudberry"),
    cloud = createCat("happy", catAppearance(cloudProfile)),
    width = (cat) => {
      const body = cat.userData.body;
      body.geometry.computeBoundingBox();
      return (
        body.geometry.boundingBox.getSize(new THREE.Vector3()).x * body.scale.x
      );
    },
    reference = width(cloud) * cloudProfile.size;
  for (const id of ["adopt-plushkin", "adopt-doughnut", "adopt-marshmallow"]) {
    const profile = ADOPTION_CATS.find((p) => p.id === id),
      cat = createCat("happy", catAppearance(profile)),
      ratio = (width(cat) * profile.size) / reference;
    assert.ok(ratio > 1.8 && ratio < 2.2, id + ": " + ratio);
    assert.ok(cat.userData.build.gait < cloud.userData.build.gait);
    for (const mood of ["sleep", "happy", "crazy hungry"]) {
      cat.userData.mood = mood;
      animateCat(cat, 0.15, true);
      cat.updateMatrixWorld(true);
      cat.traverse((o) =>
        assert.ok(o.matrixWorld.elements.every(Number.isFinite)),
      );
    }
    disposeCat(cat);
  }
  disposeCat(cloud);
});

test("crowd sculpt has closed cheeks, body and paws instead of clipped marching-grid borders", () => {
  for (const geometry of [
    kittenSurface("face", 19),
    kittenSurface("body", 19),
    kittenLeg(-1, 16),
    kittenLeg(1, 16),
  ]) {
    const edges = new Map();
    for (let i = 0; i < geometry.index.count; i += 3) {
      const ids = [0, 1, 2].map((k) => geometry.index.getX(i + k));
      for (let k = 0; k < 3; k++) {
        const a = ids[k],
          b = ids[(k + 1) % 3],
          key = [Math.min(a, b), Math.max(a, b)].join(":"),
          edge = edges.get(key) || { count: 0, direction: 0 };
        edge.count++;
        edge.direction += a < b ? 1 : -1;
        edges.set(key, edge);
      }
    }
    assert.ok(edges.size > 1000);
    for (const edge of edges.values())
      assert.deepEqual(edge, { count: 2, direction: 0 });
    geometry.dispose();
  }
});

test("both cheeks block front-facing rays for every adoption cat, with original round eyes", () => {
  const ray = new THREE.Raycaster(),
    point = new THREE.Vector3();
  for (const profile of ADOPTION_CATS) {
    const cat = createCat("happy", catAppearance(profile)),
      face = cat.getObjectByName("Face");
    cat.updateMatrixWorld(true);
    assert.equal(
      face.material.side,
      THREE.FrontSide,
      "No double-sided mask for holes",
    );
    for (const x of [-0.21, -0.14, -0.07, 0.07, 0.14, 0.21])
      for (const y of [-0.22, -0.18, -0.14]) {
        ray.ray.origin.copy(face.localToWorld(point.set(x, y, 2)));
        ray.ray.direction.set(0, 0, -1).transformDirection(face.matrixWorld);
        const hits = ray.intersectObject(face, false);
        assert.ok(hits.length, profile.id + ": missing cheek");
        assert.ok(
          face.worldToLocal(hits[0].point.clone()).z > 0.34,
          profile.id + ": open muzzle",
        );
      }
    for (const pupil of cat.userData.pupils)
      assert.ok(pupil.scale.x / pupil.scale.y > 0.85);
    disposeCat(cat);
  }
});

test("breed-specific hair templates follow their own surface instead of reusing another breed's roots", () => {
  const first = new THREE.PlaneGeometry(1, 1),
    second = first.clone().translate(0, 0, 2),
    options = {
      seed: 23421,
      length: 0.03,
      width: 0.002,
      region: "breed-cache-test",
    },
    a = groomFur(first, 30, { ...options, surfaceKey: "straight" }),
    b = groomFur(second, 30, { ...options, surfaceKey: "curled" }),
    again = groomFur(first, 30, { ...options, surfaceKey: "straight" });
  assert.deepEqual(
    a.attributes.position.array,
    again.attributes.position.array,
  );
  for (let i = 0; i < a.attributes.position.count; i++)
    assert.ok(
      Math.abs(
        b.attributes.position.getZ(i) - a.attributes.position.getZ(i) - 2,
      ) < 1e-6,
    );
  for (const g of [first, second, a, b, again]) g.dispose();
});

test("Maine Coon, Sphynx, Curl, Van and giants have distinctive traits without replacing the eye rig", () => {
  const make = (id) =>
      createCat(
        "happy",
        catAppearance(ADOPTION_CATS.find((c) => c.id === "adopt-" + id)),
      ),
    maine = make("juniper"),
    sphynx = make("fig"),
    curl = make("pretzel"),
    van = make("marzipan"),
    giant = make("cloudberry"),
    normal = make("mist");
  assert.ok(
    maine.getObjectByName("LynxTuft-1") && maine.getObjectByName("LynxTuft1"),
  );
  assert.ok(maine.getObjectByName("NeckRuff"));
  assert.ok(maine.userData.tailTip.scale.x > 1.5);
  for (const name of ["CoatFibres", "CheekFibres", "TailVelvet", "EarVelvet1"])
    assert.equal(sphynx.getObjectByName(name), undefined);
  assert.equal(
    sphynx.getObjectByName("Face").material.userData.skinRegion,
    "face",
  );
  assert.equal(
    sphynx.getObjectByName("EarShell1").material.userData.skinRegion,
    "ear",
  );
  assert.equal(sphynx.getObjectByName("Body").material.sheen, 0);
  const cg = curl.getObjectByName("EarShell1").geometry;
  cg.computeBoundingBox();
  assert.ok(cg.boundingBox.min.z < -0.17, "Curl ear tips fold backwards");
  assert.notEqual(
    van.userData.appearance.eyeColor,
    van.userData.appearance.otherEye,
  );
  const color = van.getObjectByName("TailCoat").geometry.attributes.color;
  assert.ok(color.getX(0) > color.getZ(0) * 1.5, "Van has a ginger tail");
  assert.ok(giant.userData.body.scale.x > normal.userData.body.scale.x * 1.8);
  assert.ok(giant.userData.body.scale.y > normal.userData.body.scale.y * 1.15);
  animateCat(giant, 0.15, true);
  animateCat(normal, 0.15, true);
  assert.ok(Math.abs(giant.userData.body.rotation.z) > 0.01, "gentle waddling");
  assert.notEqual(
    giant.userData.legs[0].rotation.x,
    normal.userData.legs[0].rotation.x,
  );
  for (const c of [maine, sphynx, curl, van, giant, normal]) disposeCat(c);
});

test("new breeds are paid adoptions and reload alongside existing cats without losing coins or care", () => {
  const now = Date.UTC(2026, 9, 15, 12),
    initial = newGame(now);
  initial.coins = 20000;
  initial.progression.xp = xpForLevel(20);
  initial.placements.push({
    id: "breed-center",
    item: "adoption-center",
    biome: "moon",
    x: 0,
    z: -5,
    rotation: 0,
    readyAt: 0,
  });
  let game = adoptCat(initial, "adopt-biscuit", "breed-center", now);
  const before = game.coins,
    ids = [
      "adopt-pretzel",
      "adopt-marzipan",
      "adopt-plushkin",
      "adopt-doughnut",
      "adopt-marshmallow",
    ];
  for (const id of ids) game = adoptCat(game, id, "breed-center", now);
  const cost = ADOPTION_CATS.filter((c) => ids.includes(c.id)).reduce(
    (n, c) => n + c.price,
    0,
  );
  assert.equal(game.coins, before - cost);
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
    };
  saveGame(storage, game);
  const restored = loadGame(storage, now);
  assert.deepEqual(restored.adoption, game.adoption);
  assert.equal(restored.coins, game.coins);
  assert.equal(restored.progression.xp, game.progression.xp);
  assert.deepEqual(restored.care.residents, game.care.residents);
  for (const id of ["adopt-biscuit", ...ids])
    assert.ok(activeCats(restored).some((c) => c.id === id));
  assert.throws(
    () => adoptCat(restored, ids[0], "breed-center", now),
    /уже дома/,
  );
});
