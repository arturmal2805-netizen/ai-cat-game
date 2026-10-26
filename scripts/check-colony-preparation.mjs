// Preparation/allocation comparison only; this is not a rendered FPS test.
// Use approved native cats and the pinned BatchedMesh copier, never a save.
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { build } from "esbuild";
import * as T from "three";
import { ADOPTION_CATS, catAppearance } from "../public/cat-breeds.js";
import { createCat, disposeCat } from "../public/cat-model.js";
import { enableCatRenderBatch } from "../public/cat-render-batch.js";
import { createCatPoseAtlas } from "../public/cat-pose-atlas.js";

const root=process.cwd(), out=process.env.CHICHI_REVIEW_DIR||"/tmp/chichi-colony-preparation";
await fs.mkdir(out,{recursive:true});
await fs.mkdir(path.join(root,".generated"),{recursive:true});
const modules={};
for(const name of ["released","candidate"]){
  const source=name==="released"
    ? execFileSync("git",["show","c62a6c3:public/colony-render-batch.js"],{encoding:"utf8"})
    : await fs.readFile("public/colony-render-batch.js","utf8");
  const file=path.join(root,".generated",`qa-colony-preparation-${name}.mjs`);
  await build({stdin:{contents:source,resolveDir:path.join(root,"public")},bundle:true,packages:"external",format:"esm",outfile:file});
  modules[name]=await import(pathToFileURL(file));
}
function hashGeometries(geometries){
  const hash=createHash("sha256");
  for(const g of geometries)for(const [name,a] of [["index",g.index],...Object.entries(g.attributes)]){
    hash.update(name).update(a.array.constructor.name).update(String(a.itemSize));
    hash.update(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));
  }
  return hash.digest("hex");
}
const scene=new T.Scene(),camera=new T.PerspectiveCamera(),
  renderer={extensions:{has:()=>true},compileAsync:async()=>{},info:{render:{frame:0}}},
  atlas=createCatPoseAtlas(scene),cats=[],geometries=[];
for(const profile of ADOPTION_CATS.slice(0,Number(process.env.CHICHI_PREP_CATS||24))){
  const cat=createCat("happy",{...catAppearance(profile),detail:"npc"});
  cat.scale.setScalar(.63*(profile.size||1));scene.add(cat);enableCatRenderBatch(cat,atlas);cats.push(cat);
  geometries.push(...cat.userData.renderBatches.batches.map(m=>m.geometry));
}
scene.updateMatrixWorld(true);
const originalHash=hashGeometries(geometries);let clones=0,temporaryBytes=0,sourceDisposals=0;
for(const g of geometries){
  const clone=g.clone;
  g.clone=function(...args){
    clones++;temporaryBytes+=g.index.array.byteLength+Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0);
    return clone.apply(this,args);
  };
  g.addEventListener("dispose",()=>sourceDisposals++);
}
const rows=[];
try {
  for(const name of ["released","candidate","candidate","released"]){
    clones=temporaryBytes=0;const colony=modules[name].createColonyRenderBatch(scene,renderer,camera,atlas);
    const start=performance.now();colony.sync();
    while(!colony.stats.ready){
      assert.ok(performance.now()-start<60000,"preparation must finish");
      await new Promise(resolve=>setTimeout(resolve,2));
    }
    const elapsed=performance.now()-start,
      batches=scene.children.filter(o=>o.name.startsWith("Exact colony cats")),
      outputHash=hashGeometries(batches.map(b=>b.geometry)),
      outputBytes=batches.reduce((n,b)=>n+b.geometry.index.array.byteLength+Object.values(b.geometry.attributes).reduce((s,a)=>s+a.array.byteLength,0),0);
    const row={name,cats:cats.length,sourceGeometries:geometries.length,batches:batches.length,ms:elapsed,clones,temporaryBytes,outputBytes,outputHash};
    rows.push(row);console.log("PREPARATION",JSON.stringify(row));
    assert.equal(hashGeometries(geometries),originalHash);assert.equal(sourceDisposals,0);
    colony.dispose();
  }
  assert.equal(new Set(rows.map(r=>r.outputHash)).size,1,"both modes must produce byte-identical final GPU buffers");
  assert.ok(rows.filter(r=>r.name==="released").every(r=>r.clones>0&&r.temporaryBytes>0));
  assert.ok(rows.filter(r=>r.name==="candidate").every(r=>r.clones===0&&r.temporaryBytes===0));
  await fs.writeFile(path.join(out,"preparation.json"),JSON.stringify({rows,originalHash,sourceDisposals,limitation:"Node preparation/allocation component only; not gameplay FPS or physical-device timings."},null,2)+"\n");
} finally {
  atlas.dispose();cats.forEach(disposeCat);
}
