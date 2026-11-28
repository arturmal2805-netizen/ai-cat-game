import test from "node:test";
import assert from "node:assert/strict";
import { SquishSoftBody } from "../public/squish-soft-body.js";
import { createSquishPhysicsLOD } from "../public/squish-physics-lod.js";
import { createSquishToy } from "../public/squish-model.js";
import { measureSquish } from "../public/squish-diagnostics.js";
import {
  dynamicSquishProfile,
  materialLoadDepth,
  DYNAMIC_MATERIAL_PROFILES_V2,
} from "../public/squish-dynamic-material.js";
const point = [0, 3.3, 0];
const make = (material, force = 42) => {
  const s = new SquishSoftBody({
    material,
    size: [5, 4, 4],
    resolution: [7, 7, 7],
  });
  s.setContact("paw", {
    point,
    physicalLoad: true,
    force,
    radius: 0.8,
    catId: "native",
    limbId: "paw",
  });
  return s;
};
const depth = (s) => point[1] - s.sample(...point)[1];
const advance = (s, seconds) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) s.step(1 / 60);
};

test("all five materials have measured ten-second local load and release laws", () => {
  const curves = {};
  for (const material of ["jelly", "foam", "cloud", "butter", "slime"]) {
    const s = make(material),
      frames = [];
    for (let i = 0; i < 600; i++) {
      s.step(1 / 60);
      if ([0, 11, 29, 59, 119, 239, 359, 599].includes(i))
        frames.push({ t: (i + 1) / 60, depth: depth(s) });
    }
    curves[material] = frames;
    const before = depth(s),
      d = s.diagnostics();
    assert.equal(d.faults, 0);
    assert(d.minTetRatio >= 0.08);
    assert(s.position.every(Number.isFinite));
    assert(s.position.filter((_, i) => i % 3 === 1).every((y) => y >= 0));
    assert.equal(d.staticLoad, 42);
    assert(Math.abs(d.dynamicContacts[0].contactDuration - 10) < 1e-8);
    assert(
      Math.abs(s.sample(2.4, 3.3, 1.8)[1] - 3.3) < before * 0.1,
      "remote redistribution stays below one tenth of local compression " +
        material,
    );
    s.release("paw");
    advance(s, 0.5);
    const earlyRelease = depth(s);
    advance(s, 9.5);
    assert(depth(s) < before * 0.85, "release recovery " + material);
    if (material === "foam")
      assert(earlyRelease > 0.1, "memory persists after removal");
    if (material === "butter")
      assert(depth(s) > 0.05, "yield deformation remains");
  }
  assert(
    Math.abs(curves.jelly.at(-1).depth - curves.jelly[4].depth) < 0.005,
    "jelly reaches static equilibrium",
  );
  for (const material of ["foam", "cloud", "butter", "slime"])
    assert(
      curves[material].at(-1).depth - curves[material][4].depth > 0.15,
      "continuous sustained creep " + material,
    );
  assert(curves.cloud.at(-1).depth > curves.foam.at(-1).depth + 0.15);
});

test("load magnitude and area drive material response, three slime variants stay distinct and bounded", () => {
  const depths = [];
  for (const material of ["slime-soft", "slime-gooey", "slime-ultra"]) {
    const s = make(material);
    advance(s, 10);
    depths.push(depth(s));
    assert(s.diagnostics().minTetRatio >= 0.08);
    const d = s.dynamicProfile;
    assert(
      depth(s) < point[1] * Math.min(d.maximumCompression, d.maximumImmersion),
    );
  }
  assert(depths[1] > depths[0] + 0.2);
  assert(depths[2] > depths[1] + 0.1);
  const light = make("foam", 15),
    heavy = make("foam", 60);
  advance(light, 6);
  advance(heavy, 6);
  assert(depth(heavy) > depth(light) * 1.5);
  const b = dynamicSquishProfile("butter");
  assert(materialLoadDepth(b, 10, 3, 0.035).creep === 0, "under yield");
  assert(materialLoadDepth(b, 30, 3, 0.035).creep > 0, "above yield");
  assert.equal(dynamicSquishProfile("jelly").materialClass, "elastic-solid");
  for (const p of Object.values(DYNAMIC_MATERIAL_PROFILES_V2))
    for (const key of [
      "compliance",
      "creepRate",
      "creepTimeConstant",
      "maximumImmersion",
      "collisionMode",
      "restShape",
    ])
      assert(key in p);
});

test("one velocity impulse survives zero-fixed-step render frames, never enters static load, and scales with impact speed", () => {
  const run = (fps, speed) => {
    const s = make("jelly", 42);
    let max = 0;
    for (let i = 0; i < fps * 2; i++) {
      s.setContact("paw", {
        point,
        physicalLoad: true,
        force: 42,
        radius: 0.8,
        effectiveMass: 4.25,
        impactVelocity: i === 0 ? speed : 0,
        impactId: "landing-1",
      });
      s.step(1 / fps);
      max = Math.max(max, depth(s));
    }
    assert.equal(s.impactEvents, 1);
    assert.equal(s.contacts.get("paw").force, 42);
    assert.equal(s.totalImpactImpulse, 4.25 * speed * (1 + 0.68));
    // Repeating the same event cannot inject another impulse.
    s.setContact("paw", {
      point,
      physicalLoad: true,
      force: 42,
      effectiveMass: 4.25,
      impactVelocity: speed,
      impactId: "landing-1",
    });
    s.step(1 / 60);
    assert.equal(s.impactEvents, 1);
    return { s, max };
  };
  const runs = [30, 60, 120].map((fps) => run(fps, 3));
  for (const { s } of runs) assert.deepEqual(s.position, runs[0].s.position);
  const low = run(60, 0.5),
    medium = run(60, 2),
    high = run(60, 5);
  assert(low.max < medium.max);
  assert(medium.max < high.max);
  const s = make("jelly");
  s.setContact("paw", {
    point,
    physicalLoad: true,
    impactVelocity: 3,
    impactId: 1,
  });
  s.step(1 / 120);
  assert.equal(s.steps, 0);
  assert(s.contacts.get("paw").dynamic.pendingImpactImpulse > 0);
  s.setContact("paw", {
    point,
    physicalLoad: true,
    impactVelocity: 0,
    impactId: 1,
  });
  s.step(1 / 120);
  assert.equal(s.impactEvents, 1);
});

test("material-space history stays at old paws, supports simultaneous cats, and survives LOD promotion", () => {
  const s = make("foam");
  advance(s, 4);
  const prior = s.sampleScalar(s.creep, point);
  assert(prior > 0.1);
  s.release("paw");
  s.setContact("new", { point: [1.4, 3.3, 0], force: 42, physicalLoad: true });
  advance(s, 0.2);
  assert(
    s.sampleScalar(s.creep, point) > prior * 0.9,
    "old imprint stays at old material coordinates",
  );
  for (let i = 0; i < 7; i++)
    s.setContact("cat" + i, {
      point: [((i % 3) - 1) * 0.7, 3.3, Math.floor(i / 3) * 0.5],
      force: 21,
      physicalLoad: true,
    });
  advance(s, 0.5);
  assert.equal(s.contacts.size, 8);
  assert(s.diagnostics().minTetRatio >= 0.08);
  const idle = make("slime-gooey");
  idle.release("paw");
  const lod = createSquishPhysicsLOD(idle);
  idle.sleeping = true;
  lod.prepare({ distance: 300, visible: false });
  for (let i = 0; i < idle.count; i++)
    idle.creep[i] = (0.1 * idle.original[i * 3 + 1]) / 4;
  idle.impactEvents = 3;
  idle.totalImpactImpulse = 12;
  const expected = idle.sampleScalar(idle.creep, [0.2, 2.1, 0.3]);
  idle.setContact("promote", { point, physicalLoad: true });
  assert.equal(idle.dynamicProfile.materialId, "slime-gooey");
  assert(
    Math.abs(idle.sampleScalar(idle.creep, [0.2, 2.1, 0.3]) - expected) < 1e-8,
  );
  assert.equal(idle.impactEvents, 3);
  assert.equal(idle.totalImpactImpulse, 12);
});

test("time-dependent cage motion updates actual visible body and shared support triangles, including slime variants", () => {
  for (const material of ["foam", "slime-gooey"]) {
    const toy = createSquishToy({ material }),
      u = toy.userData,
      s = u.solver;
    const y = u.restSurfaceHeight(0, 0);
    s.setContact("weight", {
      point: [0, y, 0],
      force: 42,
      physicalLoad: true,
      radius: 0.8,
    });
    advance(s, 0.5);
    u.update(0.5);
    const initial = measureSquish(toy);
    advance(s, 5.5);
    u.update(5.5);
    const held = measureSquish(toy);
    assert(held.maxContactDepth > initial.maxContactDepth + 0.1);
    assert(held.maxVertexDisplacement > initial.maxVertexDisplacement + 0.1);
    assert.equal(held.colliderGeometry, u.meshes[0].geometry.uuid);
    assert(held.meshUpdated);
    assert(held.solver.minTetRatio >= 0.08);
    if (material.startsWith("slime"))
      assert(u.strands || u.solver.profile.materialType === "slime");
    u.dispose();
  }
});

test('existing Slime rheology selector preserves loaded history and rejects changes beneath active paws',()=>{
 const s=new SquishSoftBody({material:'slime',size:[5,4.4,4.5]});
 s.setContact('paw',{point:[0,3.3,0],force:42,physicalLoad:true});
 for(let i=0;i<120;i++)s.step(1/60);
 assert.equal(s.setSlimeMode('slime-ultra'),false);
 s.release('paw');const creep=s.creep.slice(),positions=s.position.slice(),time=s.time;
 assert(s.setSlimeMode('slime-gooey'));assert.equal(s.dynamicProfile.materialId,'slime-gooey');
 assert.deepEqual(s.creep,creep);assert.deepEqual(s.position,positions);assert.equal(s.time,time);
 assert(s.setSlimeMode('slime-ultra'));assert(s.dynamicProfile.maximumImmersion>.6);
 assert.equal(s.setSlimeMode('jelly'),false);
 assert.equal(new SquishSoftBody({material:'jelly'}).setSlimeMode('slime-soft'),false);
});
