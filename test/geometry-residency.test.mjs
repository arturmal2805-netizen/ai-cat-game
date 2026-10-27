import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGeometryResidency, retainGeometryForGrace } from "../public/geometry-residency.js";

function fixture(options = {}) {
  let now = 0;
  const calls = [],
    renderer = {
      renderBufferDirect(...args) {
        calls.push(args);
      },
    };
  const original = renderer.renderBufferDirect;
  const residency = createGeometryResidency(renderer, {
    budget: 0,
    grace: 10,
    clock: () => now,
    ...options,
  });
  return {
    renderer,
    residency,
    original,
    calls,
    time(value) {
      now = value;
    },
    draw(geometry) {
      renderer.renderBufferDirect(null, null, geometry);
    },
  };
}

test("old GPU geometry is retired without altering CPU vertices and can be drawn again", () => {
  const f = fixture(),
    geometry = new THREE.BoxGeometry(),
    copy = geometry.clone();
  let retired = 0;
  geometry.addEventListener("dispose", () => retired++);
  f.draw(geometry);
  const bytes = f.residency.stats.bytes;
  assert.ok(bytes > 0);
  f.time(11);
  f.residency.sweep();
  assert.equal(retired, 1);
  assert.equal(f.residency.stats.bytes, 0);
  assert.deepEqual(
    geometry.attributes.position.array,
    copy.attributes.position.array,
  );
  assert.deepEqual(geometry.index.array, copy.index.array);
  f.draw(geometry);
  assert.equal(f.residency.stats.bytes, bytes);
  assert.equal(f.calls.length, 2);
  f.residency.dispose();
  assert.equal(f.renderer.renderBufferDirect, f.original);
  assert.equal(
    retired,
    1,
    "uninstalling a cache does not retire live draw buffers",
  );
});

test("recent shadow/colour owners protect every shared-attribute geometry", () => {
  const f = fixture(),
    a = new THREE.BoxGeometry(),
    b = a.clone();
  b.setAttribute("position", a.attributes.position);
  let retired = 0;
  a.addEventListener("dispose", () => retired++);
  b.addEventListener("dispose", () => retired++);
  f.draw(a);
  f.draw(b);
  const expected =
    Object.values(a.attributes).reduce(
      (n, x) => n + x.array.byteLength,
      a.index.array.byteLength,
    ) +
    Object.entries(b.attributes)
      .filter(([k]) => k !== "position")
      .reduce((n, [, x]) => n + x.array.byteLength, b.index.array.byteLength);
  assert.equal(f.residency.stats.bytes, expected);
  f.time(9);
  f.draw(b);
  f.time(15);
  f.residency.sweep();
  assert.equal(
    retired,
    0,
    "retiring a must not delete a buffer still used by b",
  );
  f.time(1016);
  f.residency.sweep();
  assert.equal(retired, 2);
  assert.equal(f.residency.stats.bytes, 0);
});

test("budget retains the most recently used geometry and external disposal is accounted once", () => {
  const geometry = new THREE.BoxGeometry(),
    size = Object.values(geometry.attributes).reduce(
      (n, x) => n + x.array.byteLength,
      geometry.index.array.byteLength,
    );
  const f = fixture({ budget: size }),
    recent = geometry.clone();
  f.draw(geometry);
  f.time(5);
  f.draw(recent);
  f.time(20);
  f.residency.sweep();
  assert.equal(f.residency.stats.evicted, 1);
  assert.equal(f.residency.stats.bytes, size);
  recent.dispose();
  recent.dispose();
  assert.equal(f.residency.stats.bytes, 0);
  assert.equal(f.residency.stats.geometries, 0);
});

test("GPU-only eviction preserves a living cat and its pose slots across repeated returns", async () => {
  const { createCat, disposeCat } = await import("../public/cat-model.js");
  const { enableCatRenderBatch } = await import(
    "../public/cat-render-batch.js"
  );
  const { createCatPoseAtlas } = await import("../public/cat-pose-atlas.js");
  const scene = new THREE.Scene(),
    atlas = createCatPoseAtlas(scene);
  const cat = createCat("happy", { breed: "british", detail: "npc" });
  scene.add(cat);
  enableCatRenderBatch(cat, atlas);
  const initial = { cats: atlas.stats.cats, entries: atlas.stats.entries };
  assert.equal(initial.cats, 1);
  assert.ok(initial.entries > 0);
  const buffers = cat.userData.renderBatches.batches,
    f = fixture();
  const slots = cat.userData.renderBatches.palettes.map(
    (p) => p.slot.offset.value,
  );
  for (let round = 0; round < 3; round++) {
    f.time(round * 2000);
    for (const mesh of buffers) {
      mesh.userData.nativeBuffersResident = true;
      f.draw(mesh.geometry);
    }
    f.time(round * 2000 + 11);
    f.residency.sweep();
    assert.equal(f.residency.stats.bytes, 0);
    assert.equal(
      atlas.stats.cats,
      initial.cats,
      "cache eviction must never unregister a living cat",
    );
    assert.equal(
      atlas.stats.entries,
      initial.entries,
      "joint slots must not be reused by another cat",
    );
    assert.deepEqual(
      cat.userData.renderBatches.palettes.map((p) => p.slot.offset.value),
      slots,
    );
    assert.ok(buffers.every((m) => m.geometry.attributes.position.count > 0));
  }
  disposeCat(cat);
  assert.equal(atlas.stats.cats, 0);
  assert.equal(atlas.stats.entries, 0);
  f.residency.dispose();
  atlas.dispose();
});

test("memory pressure retires only buffers absent from three actual colour/shadow frames, without waiting ten seconds", () => {
  const f = fixture({ budget: 0, grace: 10000 }), a = new THREE.BoxGeometry(), b = a.clone();
  f.renderer.info = { render: { frame: 1 } };
  f.time(1); f.draw(a); f.draw(b);
  f.renderer.info.render.frame = 2;
  f.time(20); f.draw(b); f.residency.sweep();
  assert.equal(f.residency.stats.evicted, 0, "the previous camera's current buffers stay protected");
  f.renderer.info.render.frame = 4;
  f.time(150); f.draw(b); f.residency.sweep();
  assert.equal(f.residency.stats.evicted, 1);
  assert.ok(f.residency.stats.bytes > 0, "current shadow/colour geometry stays resident even above the soft budget");
  const before = a.attributes.position.array.slice();
  f.renderer.info.render.frame = 5;
  f.time(200); f.draw(a);
  assert.deepEqual(a.attributes.position.array, before, "return uploads the exact retained source");
  f.residency.dispose();
});

test("repeated colour/shadow draws read the use clock once per native render frame", () => {
  const f = fixture(), a = new THREE.BoxGeometry();
  f.renderer.info = { render: { frame: 1 } };
  for(let i=0;i<1000;i++) f.draw(a);
  assert.equal(f.residency.stats.clockReads, 1);
  f.renderer.info.render.frame++;
  for(let i=0;i<1000;i++) f.draw(a);
  assert.equal(f.residency.stats.clockReads, 2);
  assert.equal(f.calls.length, 2000, "every native draw remains intact");
  f.residency.dispose();
});

test("alternating render caches survive brief native/colony switches under pressure, while abandoned island buffers still retire", () => {
  const f = fixture({budget:0,grace:1000}),
    fallback = retainGeometryForGrace(new THREE.BoxGeometry()),
    colony = retainGeometryForGrace(new THREE.BoxGeometry()),
    remote = new THREE.BoxGeometry();
  f.renderer.info={render:{frame:1}};
  f.draw(fallback); f.draw(colony); f.draw(remote);
  let deleted=0;
  fallback.addEventListener("dispose",()=>deleted++);
  colony.addEventListener("dispose",()=>deleted++);
  for(let i=2;i<=30;i++){
    f.renderer.info.render.frame=i; f.time(i*25);
    f.draw(i%8<4?colony:fallback); f.residency.sweep();
  }
  assert.equal(deleted,0,"working render caches must not oscillate between deletion and upload");
  assert.equal(f.residency.stats.evicted,1,"the remote island retains the fast memory-pressure policy");
  f.renderer.info.render.frame=100; f.time(2000); f.residency.sweep();
  assert.equal(deleted,2,"unused fallback buffers still obey the bounded time grace");
  assert.equal(f.residency.stats.bytes,0);
  f.residency.dispose();
});

function cameraCycle(protection, count=4) {
  const geometries=Array.from({length:count},()=>new THREE.BoxGeometry()),
    bytes=[geometries[0].index,...Object.values(geometries[0].attributes)]
      .reduce((s,a)=>s+a.array.byteLength,0),
    f=fixture({budget:bytes*3,refaultBudget:bytes,grace:10000,refaultGrace:2000});
  f.renderer.info={render:{frame:0}};
  f.residency.setRefaultProtectionEnabled(protection);
  const sizes=[],sweptSizes=[];
  for(let frame=1;frame<=120;frame++) {
    f.renderer.info.render.frame=frame;f.time(frame*40);
    f.draw(geometries[(frame-1)%count]);const before=f.residency.stats.evicted;f.residency.sweep();
    if(f.residency.stats.evicted!==before)sweptSizes.push(f.residency.stats.bytes);
    sizes.push(f.residency.stats.bytes);
  }
  return {f,geometries,bytes,sizes,sweptSizes};
}

test("returning camera geometry learns a bounded working set instead of repeatedly deleting and uploading it",()=>{
  const before=cameraCycle(false),after=cameraCycle(true);
  assert.ok(before.f.residency.stats.rapidRefaults>=30);
  assert.ok(after.f.residency.stats.rapidRefaults<=4);
  assert.ok(after.f.residency.stats.evicted<before.f.residency.stats.evicted/5);
  assert.ok(after.sizes.every(size=>size<=after.bytes*4));
  assert.equal(after.f.residency.stats.bytes,after.bytes*4);
  after.f.renderer.info.render.frame=1000;after.f.time(30000);after.f.residency.sweep();
  assert.ok(after.f.residency.stats.bytes<=after.bytes*3,"abandoned learned buffers return to the original soft budget");
  before.f.residency.dispose();after.f.residency.dispose();
});

test("refault protection yields to its memory cap when the working set cannot fit",()=>{
  const {f,bytes,sizes,sweptSizes}=cameraCycle(true,5);
  assert.ok(f.residency.stats.rapidRefaults>4);
  assert.ok(sweptSizes.every(size=>size<=bytes*4),"pressure passes reclaim idle caches beyond their capped allowance");
  assert.ok(sizes.every(size=>size<=bytes*5),"new/current-frame uploads retain the original soft-budget semantics");
  f.residency.dispose();
});

test("refault telemetry counts restored shared streams only once and ordinary disposal stays final",()=>{
  const f=fixture(),a=new THREE.BoxGeometry(),b=a.clone();
  b.setAttribute("position",a.attributes.position);
  f.draw(a);f.draw(b);const bytes=f.residency.stats.bytes;
  f.time(20);f.residency.sweep();
  f.time(21);f.draw(a);f.draw(b);
  assert.equal(f.residency.stats.refaults,2);
  assert.equal(f.residency.stats.refaultBytes,bytes);
  assert.equal(f.residency.stats.rapidRefaults,2);
  assert.equal(f.residency.stats.rapidRefaultBytes,bytes);
  a.dispose();b.dispose();
  f.time(22);f.draw(a);
  assert.equal(f.residency.stats.refaults,2,"explicit disposal is not a cache-eviction return");
  f.residency.dispose();
});

test("temporary memory overflow reclaims cold scenery before the oldest protected returning camera buffers",()=>{
 const a=new THREE.BoxGeometry(),bytes=[a.index,...Object.values(a.attributes)].reduce((n,x)=>n+x.array.byteLength,0),
   f=fixture({budget:bytes*3,refaultBudget:bytes,grace:10000}),others=Array.from({length:4},()=>a.clone());
 f.renderer.info={render:{frame:1}};f.time(0);f.draw(a);others.slice(0,3).forEach(g=>f.draw(g));
 f.renderer.info.render.frame=4;f.time(200);others.slice(0,3).forEach(g=>f.draw(g));f.residency.sweep();
 assert.equal(f.residency.stats.evicted,1);
 // Return a, then cross the allowance with a cold upload. a is oldest by
 // timestamp, but deleting a newer cold buffer can satisfy the entire budget.
 f.renderer.info.render.frame=5;f.time(240);f.draw(a);assert.equal(f.residency.stats.rapidRefaults,1);
 f.renderer.info.render.frame=6;f.time(280);others.forEach(g=>f.draw(g));
 f.renderer.info.render.frame=9;f.time(400);f.residency.sweep();
 assert.ok(f.residency.stats.bytes<=bytes*3);
 const refaults=f.residency.stats.refaults;f.draw(a);
 assert.equal(f.residency.stats.refaults,refaults,'the learned hot buffer must survive temporary overflow');
 f.residency.dispose();
});
