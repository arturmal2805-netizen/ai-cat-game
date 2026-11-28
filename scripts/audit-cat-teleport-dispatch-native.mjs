import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { byBiome } from '../public/game-data.js';
import { gatherCats } from '../public/adoption.js';
import { moveResidentToBiome } from '../public/resident-actions.js';
import { worldSnapshot, loadGame, SAVE_KEY } from '../public/economy.js';
import { manualInteraction } from '../public/interactions.js';

// Optional extension after auditCatTeleport():
// await auditCatTeleportDispatch({page,review,errors,httpErrors,privateFixture:true});
// The caller supplies the existing local Worker/SQLite fixture and native rigs.
// This module does not bootstrap identities, place objects, call AI or reload a
// player world. Commands use the same domain reducers + commit as actual UI.
export async function auditCatTeleportDispatch({page,review,errors=[],httpErrors=[],privateFixture=false,groupSize=5,maxFrames=2400}) {
  assert(privateFixture,'dispatch audit requires the explicitly selected private fixture');
  assert(['127.0.0.1','localhost','[::1]'].includes(new URL(page.url()).hostname),'dispatch audit runs only on the existing local QA server');
  assert(Number.isInteger(groupSize)&&groupSize>=2&&groupSize<=12);
  const report={status:'RUNNING',sections:{},errors,httpErrors},home=byBiome('homestead');
  const write=()=>writeFile(join(review,'dispatch-native.json'),JSON.stringify(report,null,2));
  const step=async(count=1)=>page.evaluate(count=>{
    const q=__lagoonQA;
    for(let i=0;i<count;i++){
      q.testNow=Math.max(q.testNow||0,performance.now())+100;
      q.gpuFrames.clear();q.manualStepping=true;
      try{q.step(q.testNow);}finally{q.manualStepping=false;}
    }
  },count);
  const read=async(ids,snapshot=false)=>page.evaluate(({ids,snapshot})=>{
    const q=__lagoonQA,w=__lagoonSaveQA.getWorld(),t=w.teleportation(),g=__lagoonSaveQA.getGame();
    const actors=ids.map(id=>{
      const a=q.lifeActors().find(a=>a.id===id),op=t.operations.get(id),p=a.position,
        support=q.manualSurface({x:p.x,y:p.y,z:p.z},a.radius,null,id);
      return{id,model:a.model.uuid,carrier:a.carrier.uuid,radius:a.radius,position:p.toArray(),visible:a.carrier.visible,
        support:support?{biome:support.biome,y:support.y}:null,
        owner:{mall:!!w.mall().has(id),spa:!!w.resortSpa().has(id),waterfront:!!w.waterfront().has(id),warehouse:!!w.warehouse().has(id)},
        operation:op?{token:op.token,destinationId:op.destinationId,phase:op.phase,started:op.started,prepared:op.prepared,relocated:!!op.relocated,age:op.age,from:op.from,arrival:op.arrival}:null,
        saveProjection:t.saveProjection(id),gatherTrip:!!q.npcs.get(id)?.gatherTrip,
        resident:q.residentPlay.get(id)?{phase:q.residentPlay.get(id).phase,activityId:q.residentPlay.get(id).decision.activityId}:null};
    });
    const copy=snapshot?structuredClone(g):null,saved=copy?w.snapshotCatLocations(copy,copy):null;
    return{actors,core:t.diagnostics,camera:{position:q.camera.position.toArray(),look:q.look.toArray(),following:q.faceCamera.enabled},
      results:q.dispatchAudit?.results,callbacks:q.dispatchAudit?.callbacks,
      snapshot:saved?{catLocations:Object.fromEntries(ids.map(id=>[id,saved.catLocations?.[id]||null])),catDestinations:saved.catDestinations,catPosition:saved.catPosition}:null};
  },{ids,snapshot});
  async function until(label,ids,predicate,{frames=maxFrames,chunk=4}={}){
    let state=await read(ids);
    for(let used=0;used<=frames;used+=chunk){
      if(predicate(state))return state;
      if(used===frames)break;
      await step(Math.min(chunk,frames-used));
      // Yield to native preparation/operation promise continuations between
      // bounded chunks. Never await op.result inside an unstepped page task.
      await page.waitForTimeout(0);state=await read(ids);
    }
    report.blocked={label,state};await write();throw Error('Dispatch native audit timed out: '+label);
  }
  const watch=async(id,key)=>page.evaluate(({id,key})=>{
    const q=__lagoonQA,op=__lagoonSaveQA.getWorld().teleportation().operations.get(id);
    if(!op)return null;
    const token=op.token;
    op.result.then(result=>{q.dispatchAudit.results[key]={token,result};},error=>{q.dispatchAudit.results[key]={token,error:error.message};});
    return{token,destinationId:op.destinationId};
  },{id,key});
  const command=async(kind,ids,biome)=>{
    const current=await page.evaluate(()=>__lagoonSaveQA.getGame());
    const next=kind==='gather'?gatherCats(current,biome,{ids}):moveResidentToBiome(current,ids[0],biome);
    await page.evaluate(next=>__lagoonSaveQA.commit(next),next);
  };
  const physical=(actor,biome)=>{
    assert(actor.support,actor.id+' retains actual native support');
    assert.equal(actor.support.biome,biome);
    assert(Math.abs(actor.position[1]-actor.support.y)<.12,actor.id+' actual carrier rests on its support');
    assert.equal(actor.operation,null);assert.equal(actor.gatherTrip,false);
    assert(Object.values(actor.owner).every(v=>!v),actor.id+' has no competing old venue owner');
  };
  const arrivalSupported=actor=>{
    assert(actor.operation?.relocated&&actor.support,'the actual carrier reaches a real supporting surface');
    assert(Math.abs(actor.operation.arrival.y-actor.support.y)<.1,'the committed destination matches the native support height');
    assert(Object.values(actor.owner).every(v=>!v),'old venue ownership cannot overwrite the generic portal position');
  };
  let ids=[];
  try{
    const initial=await page.evaluate(groupSize=>{
      const q=__lagoonQA,w=__lagoonSaveQA.getWorld(),g=__lagoonSaveQA.getGame();
      if(!g.unlocked.includes('homestead'))throw Error('Existing private fixture must already unlock homestead');
      const previous={drawPaused:q.drawPaused,manualFrames:q.manualFrames,freeze:q.freeze,oceanReviewCamera:q.oceanReviewCamera};
      q.drawPaused=true;q.manualFrames=true;q.freeze=false;delete q.oceanReviewCamera;
      for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
      const waterfrontIds=new Set([...w.waterfront().runtime.visits.keys()]);
      const candidates=w.gatherCandidates().filter(id=>id!=='chichi'&&q.npcs.has(id)&&!q.housingLife.get(id)&&!w.warehouse().has(id))
        .sort((a,b)=>Number(waterfrontIds.has(b))-Number(waterfrontIds.has(a))).slice(0,groupSize);
      if(candidates.length<2)throw Error('Existing fixture has fewer than two available native residents');
      const fixture=[];
      for(const id of candidates){
        const n=q.npcs.get(id),p=g.jobCity.profiles[id];
        fixture.push({id,schedule:structuredClone(p.schedule),profileManual:p.manualUntil,npcManual:n.manualUntil,gathered:n.gatheredUntil});
        p.schedule={...p.schedule,job:'rest'};p.manualUntil=0;n.manualUntil=0;n.gatheredUntil=0;
        // Use normal cancellation: airborne swimmers finish their native return.
        if(w.waterfront().has(id))w.waterfront().cancel(id);
      }
      const original=q.callbacks.onResidentAction;
      const observer=(...args)=>{const [id,decision,result]=args;if(candidates.includes(id))q.dispatchAudit.callbacks.push({id,activityId:decision.activityId,result});return original?.(...args);};
      q.dispatchAudit={previous,fixture,results:{},callbacks:[],original,observer};q.callbacks.onResidentAction=observer;
      return{ids:candidates,fromPriorWaterfront:candidates.filter(id=>waterfrontIds.has(id)),identities:q.lifeActors().filter(a=>candidates.includes(a.id)||a.id==='chichi').map(a=>({id:a.id,model:a.model.uuid,carrier:a.carrier.uuid}))};
    },groupSize);
    ids=initial.ids;report.initial=initial;await write();
    await until('safe native waterfront cancellation',ids,s=>s.actors.every(a=>!a.owner.waterfront));

    await command('gather',ids,'homestead');
    assert(await page.evaluate(ids=>__lagoonSaveQA.getWorld().gather('homestead',ids),ids),'native gather API accepts the actual resident group');
    for(const id of ids)assert(await watch(id,'gather:'+id),id+' owns a shared portal operation');
    const opening=await until('recall portal opening',ids,s=>s.actors.some(a=>a.operation?.started),{frames:180,chunk:1});
    report.sections.gather={opening:await read(ids,true)};
    assert(opening.actors.every(a=>a.operation.destinationId==='gather:homestead'&&!a.gatherTrip),'recall uses shared portals rather than old elevated recall flights');
    for(const actor of opening.actors.filter(a=>a.operation.started&&!a.operation.relocated))assert.equal(actor.saveProjection?.transient,true,'before relocation, save capture retains the confirmed command rather than a temporary pose');
    const projected=await until('recall supported-floor save projection',ids,s=>s.actors.some(a=>a.operation?.relocated),{frames:180,chunk:1});
    const projectedActors=projected.actors.filter(a=>a.operation?.relocated);
    report.sections.gather.arrivalHop=await read(ids,true);
    for(const actor of projectedActors){
      arrivalSupported(actor);
      assert.equal(actor.saveProjection?.transient,false);
      assert(Math.abs(actor.saveProjection.position.y-actor.operation.arrival.y)<1e-7);
    }
    const midSave=await page.evaluate(()=>{const g=structuredClone(__lagoonSaveQA.getGame());return __lagoonSaveQA.getWorld().snapshotCatLocations(g,g);});
    const reloaded=loadGame({getItem:key=>key===SAVE_KEY?JSON.stringify(midSave):null},Date.now(),{advance:false});
    for(const actor of projectedActors){
      const saved=reloaded.catLocations[actor.id];assert(saved,'projected position survives ordinary save normalization');
      assert.equal(saved.biome,'homestead');assert(Math.abs(saved.y-actor.saveProjection.position.y)<1e-6);
    }
    report.sections.gather.projectedLoad={mode:'pure save-format load; no browser/SQLite reload',locations:Object.fromEntries(ids.map(id=>[id,reloaded.catLocations[id]]))};
    const gathered=await until('recall completion',ids,s=>s.actors.every(a=>!a.operation)&&ids.every(id=>s.results['gather:'+id]?.result===true),{frames:180,chunk:1});
    for(const actor of gathered.actors){physical(actor,'homestead');assert(Math.hypot(actor.position[0]-home.center[0],actor.position[2]-home.center[1])<=50);}
    for(let i=0;i<gathered.actors.length;i++)for(let j=0;j<i;j++){
      const a=gathered.actors[i],b=gathered.actors[j];assert(Math.hypot(a.position[0]-b.position[0],a.position[2]-b.position[2])>=a.radius+b.radius+.19,'recall arrival slots do not overlap native rest radii');
    }
    report.sections.gather.finished=gathered;await write();

    const followed=ids[0],oldTarget={x:home.center[0]+150,z:home.center[1]-30},latestTarget={x:home.center[0]+120,z:home.center[1]+20};
    assert(await page.evaluate(id=>__lagoonSaveQA.getWorld().followCat(id),followed));await step(10);
    const cameraBefore=await read([followed]);
    const moveAccepted=await page.evaluate(({id,target})=>{const q=__lagoonQA;q.dispatchAudit.moveCallbacks={old:0,current:0};return __lagoonSaveQA.getWorld().moveResident(id,'homestead',target,{onArrival:()=>{q.dispatchAudit.moveCallbacks.old++;return true;}});},{id:followed,target:oldTarget});
    assert(moveAccepted);const oldOp=await watch(followed,'move-old');assert(oldOp);
    await until('first move opening',[followed],s=>s.actors[0].operation?.started,{frames:180,chunk:1});
    assert(await page.evaluate(({id,target})=>{const q=__lagoonQA;return __lagoonSaveQA.getWorld().moveResident(id,'homestead',target,{onArrival:()=>{q.dispatchAudit.moveCallbacks.current++;return true;}});},{id:followed,target:latestTarget}));
    const currentOp=await watch(followed,'move-current');assert(currentOp.token>oldOp.token);
    const cameraFrames=[];
    for(let i=0;i<180;i++){
      const frame=await read([followed]);cameraFrames.push(frame);
      if(frame.results['move-current'])break;
      await step(1);await page.waitForTimeout(0);
    }
    const moved=await read([followed],true),moveCallbacks=await page.evaluate(()=>__lagoonQA.dispatchAudit.moveCallbacks);
    assert.equal(moved.results['move-old'].result,false);assert.equal(moved.results['move-current'].result,true);
    assert.deepEqual(moveCallbacks,{old:0,current:1});physical(moved.actors[0],'homestead');
    assert(Math.hypot(moved.actors[0].position[0]-latestTarget.x,moved.actors[0].position[2]-latestTarget.z)<=14.1);
    const cameraDistance=s=>Math.hypot(...s.camera.position.map((v,i)=>v-s.actors[0].position[i]));
    const initialDistance=cameraDistance(cameraBefore),maxDistance=Math.max(...cameraFrames.map(cameraDistance));
    assert(cameraBefore.camera.following&&moved.camera.following);
    assert(Math.hypot(...moved.actors[0].position.map((v,i)=>v-cameraBefore.actors[0].position[i]))>80,'camera audit includes an actual distant coordinate jump');
    assert(maxDistance<Math.max(25,initialDistance+8),'followed camera remains near its actual cat instead of flying across the map');
    report.sections.moveAndCancel={oldOp,currentOp,moveCallbacks,cameraBefore,cameraFrames,finished:moved,initialDistance,maxDistance};await write();

    // An existing free HOME_OBJECT exercises generic native dispatch/activity.
    const resident=ids[1],decision=manualInteraction(worldSnapshot(await page.evaluate(()=>__lagoonSaveQA.getGame())),{activityId:'chichi-bed'},'happy');
    await command('move',[resident],'moon');
    assert(await page.evaluate(({id,decision})=>__lagoonSaveQA.getWorld().performResident(id,decision),{id:resident,decision}));
    const genericOp=await watch(resident,'generic-resident');assert(genericOp);
    const genericArrival=await until('generic resident actual support',[resident],s=>s.actors[0].operation?.relocated,{frames:240,chunk:1});
    arrivalSupported(genericArrival.actors[0]);
    await until('generic resident native activity',[resident],s=>!s.actors[0].operation&&s.actors[0].resident?.activityId===decision.activityId,{frames:240,chunk:1});
    const generic=await until('generic resident completion callback',[resident],s=>s.callbacks.filter(c=>c.id===resident&&c.activityId===decision.activityId).length===1,{frames:240,chunk:4});
    assert.equal(generic.results['generic-resident'].result,true);assert.equal(generic.actors[0].operation,null);
    report.sections.genericResident={decision,operation:genericOp,arrival:genericArrival,finished:generic};await write();

    // The hero may still belong to the four-owner Warehouse visit. Ask that
    // actual owner to return her normally and step it to safety before perform.
    await page.evaluate(()=>{const w=__lagoonSaveQA.getWorld();w.warehouse().cancel('chichi');w.waterfront().cancel('chichi');});
    const heroReleased=await until('original hero normal physical return',['chichi'],s=>s.actors.every(a=>!a.owner.warehouse&&!a.owner.waterfront));
    await page.evaluate(decision=>{
      const q=__lagoonQA,promise=__lagoonSaveQA.getWorld().perform(decision);
      promise.then(result=>q.dispatchAudit.results.hero={result},error=>q.dispatchAudit.results.hero={error:error.message});
    },decision);
    const heroOp=await watch('chichi','generic-hero');assert(heroOp);
    const heroArrival=await until('generic hero actual support',['chichi'],s=>s.actors[0].operation?.relocated,{frames:240,chunk:1});
    arrivalSupported(heroArrival.actors[0]);
    const heroFinished=await until('original hero generic perform promise',['chichi'],s=>!!s.results.hero,{frames:300,chunk:4});
    assert.equal(heroFinished.results.hero.result?.completed,true);assert.equal(heroFinished.actors[0].operation,null);
    report.sections.genericHero={safeRelease:heroReleased,operation:heroOp,arrival:heroArrival,finished:heroFinished};
    const final=await read([...ids,'chichi'],true);
    for(const original of initial.identities){const actual=final.actors.find(a=>a.id===original.id);assert.equal(actual.model,original.model);assert.equal(actual.carrier,original.carrier);assert.equal(actual.operation,null);}
    report.final=final;assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
    report.status='PASS';await write();
    console.log('PASS original native recall group, resident move/latest token, camera rebase, supported save projection and generic activities');
    return report;
  }catch(error){report.status='FAIL';report.failure=error.stack||error.message;if(ids.length)report.failureState=await read([...ids,'chichi']).catch(()=>null);await write();throw error;}
  finally{
    await page.evaluate(()=>{
      const q=__lagoonQA,a=q.dispatchAudit;if(!a)return;
      if(q.callbacks.onResidentAction===a.observer)q.callbacks.onResidentAction=a.original;
      const g=__lagoonSaveQA.getGame();
      for(const previous of a.fixture){const p=g.jobCity.profiles[previous.id];if(p){p.schedule=previous.schedule;p.manualUntil=previous.profileManual;}}
      q.drawPaused=a.previous.drawPaused;q.manualFrames=a.previous.manualFrames;q.freeze=a.previous.freeze;
      if(a.previous.oceanReviewCamera===undefined)delete q.oceanReviewCamera;else q.oceanReviewCamera=a.previous.oceanReviewCamera;
    }).catch(()=>{});
  }
}
