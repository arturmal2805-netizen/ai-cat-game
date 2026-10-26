// Private world/SQLite only. Compare the released full scene refresh with an
// actor-only destination refresh, without writing a player save or using AI.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {ADOPTION_CATS} from "../public/cat-breeds.js";

export async function captureActorScopeImage(page) {
  return await page.evaluate(()=>{
    const q=__lagoonQA,world=__lagoonSaveQA.getWorld(), original=structuredClone(__lagoonSaveQA.getGame()),
      id=original.adoption.cats[0].id, next=structuredClone(original),
      nativeSync=q.staticDraws.sync,gl=q.renderer.getContext(),
      a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),b=new Uint8Array(a.length),
      actors=[...q.npcs].map(([id,n])=>[id,n.carrier,n.carrier.position.clone()]),previous=globalThis.__legacyActorStaticSync;
    next.catDestinations[id]=next.catDestinations[id]==="moon"?"homestead":"moon";
    let count=0,oldCalls,newCalls,oldDraw,newDraw;
    q.freeze=true;q.shadowDepth.setEnabled(false);
    q.staticDraws.sync=function(...args){count++;return nativeSync.apply(this,args);};
    try {
      globalThis.__legacyActorStaticSync=true;world.sync(original);count=0;world.sync(next);oldCalls=count;
      q.drawFrame();oldDraw={...q.renderer.info.render};
      gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,a);
      world.sync(original);
      globalThis.__legacyActorStaticSync=false;count=0;world.sync(next);newCalls=count;
      q.drawFrame();newDraw={...q.renderer.info.render};
      gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);
      let changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changed++;
      return {changed,oldCalls,newCalls,oldDraw,newDraw,npcs:q.npcs.size,
        stableActors:actors.every(([id,carrier,position])=>q.npcs.get(id)?.carrier===carrier&&carrier.position.equals(position)),
        dpr:q.renderer.getPixelRatio(),contextLost:gl.isContextLost(),error:gl.getError()};
    } finally {
      globalThis.__legacyActorStaticSync=previous;world.sync(original);q.staticDraws.sync=nativeSync;
      q.shadowDepth.setEnabled(true);q.gpuFrames.clear();
    }
  });
}

export async function checkActorSyncScope(page,review) {
  await page.evaluate(()=>{
    const q=__lagoonQA;q.drawPaused=true;q.cpuOnly=true;
    __lagoonSaveQA.getWorld().focus("homestead");
    const b=q.islands.get("homestead");q.reviewView(b.position.x,b.position.z,85);
  });
  await page.waitForFunction(()=>{
    const q=__lagoonQA;
    return !q.islands.get("homestead").userData.lowOnly && q.shaderWarmup.idle() &&
      [...q.itemGroups.values()].filter(g=>g.userData.placement?.biome==="homestead").every(g=>g.userData.built);
  },null,{timeout:600000});
  await page.evaluate(()=>{__lagoonQA.drawPaused=false;__lagoonQA.cpuOnly=false;});
  const frames=await page.evaluate(()=>__lagoonQA.frames);
  await page.waitForFunction(n=>__lagoonQA.frames>=n+3&&__lagoonQA.shaderWarmup.idle(),frames,{timeout:240000});
  const proof=await captureActorScopeImage(page);
  fs.writeFileSync(path.join(review,"actor-scope-image.json"),JSON.stringify(proof,null,2));
  console.log("ACTOR_SCOPE_IMAGE",JSON.stringify(proof));
  assert.equal(proof.changed,0);assert.equal(proof.newCalls,0);assert.ok(proof.oldCalls>0);
  assert.equal(proof.stableActors,true);assert.equal(proof.oldDraw.triangles,proof.newDraw.triangles);
  assert.equal(proof.error,0);assert.equal(proof.dpr,2);assert.equal(proof.contextLost,false);
  const samples=await page.evaluate(()=>{
    const q=__lagoonQA,world=__lagoonSaveQA.getWorld(),g=structuredClone(__lagoonSaveQA.getGame()),id=g.adoption.cats[0].id,
      nativeSync=q.staticDraws.sync,results=[];
    const home=g.catDestinations[id]||"homestead",away=home==="moon"?"homestead":"moon";
    let calls=0;q.staticDraws.sync=function(...args){calls++;return nativeSync.apply(this,args);};
    try {
      for(const legacy of [true,false,false,true]) {
        globalThis.__legacyActorStaticSync=legacy;const times=[];calls=0;
        for(let i=0;i<16;i++) {
          const next=structuredClone(g);next.catDestinations[id]=i%2?home:away;
          const at=performance.now();world.sync(next);times.push(performance.now()-at);
        }
        results.push({legacy,times,staticRefreshes:calls});
      }
      return results;
    } finally { globalThis.__legacyActorStaticSync=false;world.sync(g);q.staticDraws.sync=nativeSync; }
  });
  fs.writeFileSync(path.join(review,"actor-scope-sync-times.json"),JSON.stringify(samples,null,2));
  console.log("ACTOR_SCOPE_SYNCS",JSON.stringify(samples));
  for(const row of samples)assert.equal(row.staticRefreshes,row.legacy?16:0);
  const owned=await page.evaluate(()=>__lagoonSaveQA.getGame().adoption.cats.map(c=>c.id)),
    extra=ADOPTION_CATS.find(c=>!owned.includes(c.id));
  assert.ok(extra);
  const adoption=await page.evaluate(id=>{
    const q=__lagoonQA,world=__lagoonSaveQA.getWorld(),g=structuredClone(__lagoonSaveQA.getGame()),
      next=structuredClone(g),before=q.npcs.size,nativeSync=q.staticDraws.sync;
    let calls=0;q.staticDraws.sync=function(...args){calls++;return nativeSync.apply(this,args);};
    next.adoption.cats.push({id,adoptedAt:Date.now(),homeBiome:"homestead",centerId:""});
    next.catDestinations[id]="homestead";
    try {
      world.sync(next);const added=q.npcs.has(id)&&q.npcs.size===before+1;
      const carrier=q.npcs.get(id)?.carrier;world.sync(structuredClone(next));
      const repeated=q.npcs.get(id)?.carrier===carrier&&q.npcs.size===before+1;
      world.sync(g);
      return {added,repeated,removed:!q.npcs.has(id)&&q.npcs.size===before,staticRefreshes:calls};
    } finally {world.sync(g);q.staticDraws.sync=nativeSync;}
  },extra.id);
  assert.deepEqual(adoption,{added:true,repeated:true,removed:true,staticRefreshes:0});
  fs.writeFileSync(path.join(review,"actor-scope-roster.json"),JSON.stringify(adoption,null,2));
  const navigation=await page.evaluate(()=>{
    const q=__lagoonQA,world=__lagoonSaveQA.getWorld(),g=structuredClone(__lagoonSaveQA.getGame()),next=structuredClone(g),id=g.adoption.cats[0].id,
      get=globalThis.__actorScopeNav,start={x:0,z:33},goal={x:-20,z:22},radius=.53123,
      keys=["builderObstacles","courtBlockers","bikiniBlockers","aquariumBlockers","spaObstacles","chillObstacles"];
    next.catDestinations[id]=g.catDestinations[id]==="moon"?"homestead":"moon";
    const route=n=>n.path(start,goal,radius,n.aquariumBlockers,"aquarium"),valid=(n,r)=>{
      let from=start;return !!r?.length&&r.every(p=>{const ok=n.segment(from,p,radius,n.aquariumBlockers,"aquarium");from=p;return ok;});
    };
    try {
      globalThis.__legacyActorStaticSync=true;world.sync(g);const a=get(),r=route(a),before=a.stats(a.aquariumBlockers);
      world.sync(next);const b=get(),cold=b.stats(b.aquariumBlockers),again=route(b);
      const old={replaced:keys.every(k=>a[k]!==b[k]),before,cold,valid:valid(b,again),sameRoute:JSON.stringify(r)===JSON.stringify(again)};
      world.sync(g);const c=get(),warmRoute=route(c),warm=c.stats(c.aquariumBlockers);
      globalThis.__legacyActorStaticSync=false;world.sync(next);const d=get(),retained=d.stats(d.aquariumBlockers),last=route(d);
      return {old,fast:{reused:keys.every(k=>c[k]===d[k]),warm,retained,valid:valid(d,last),sameRoute:JSON.stringify(warmRoute)===JSON.stringify(last)}};
    } finally {globalThis.__legacyActorStaticSync=false;world.sync(g);}
  });
  assert.equal(navigation.old.replaced,true);assert.ok(navigation.old.before.masks>0);assert.equal(navigation.old.cold.masks,0);
  assert.equal(navigation.old.valid,true);assert.equal(navigation.old.sameRoute,true);
  assert.equal(navigation.fast.reused,true);assert.ok(navigation.fast.warm.masks>0);
  assert.deepEqual(navigation.fast.retained,navigation.fast.warm);assert.equal(navigation.fast.valid,true);assert.equal(navigation.fast.sameRoute,true);
  fs.writeFileSync(path.join(review,"actor-scope-navigation.json"),JSON.stringify(navigation,null,2));
  const construction=await page.evaluate(()=>{
    const q=__lagoonQA,world=__lagoonSaveQA.getWorld(),g=structuredClone(__lagoonSaveQA.getGame()),next=structuredClone(g),
      p=next.placements.find(p=>p.item==="coaster-lagoon"),nativeSync=q.staticDraws.sync;
    let calls=0;q.staticDraws.sync=function(...args){calls++;return nativeSync.apply(this,args);};
    try {
      p.rotation=(p.rotation+1)%4;world.sync(next);
      const rotation=q.itemGroups.get(p.id).rotation.y;
      const building=structuredClone(next);building.placements.find(v=>v.id===p.id).readyAt=Date.now()+100000;
      world.sync(building);const underConstruction=!q.itemGroups.get(p.id).userData.built;
      world.sync(g);
      return {rotation,expected:p.rotation*Math.PI/2,underConstruction,restored:!!q.itemGroups.get(p.id).userData.built,staticRefreshes:calls};
    } finally {world.sync(g);q.staticDraws.sync=nativeSync;}
  });
  assert.equal(construction.rotation,construction.expected);assert.equal(construction.underConstruction,true);
  assert.equal(construction.restored,true);assert.ok(construction.staticRefreshes>=3);
  fs.writeFileSync(path.join(review,"actor-scope-construction.json"),JSON.stringify(construction,null,2));
  await page.evaluate(()=>{__lagoonQA.freeze=false;});
  await page.screenshot({path:path.join(review,"actor-scope-homestead.png")});
}
