import {activeCats} from './cat-roster.js';
import {catAppearance} from './cat-breeds.js';
import {createCat,disposeCat} from './cat-model.js';
import {enableCatRenderBatch} from './cat-render-batch.js';
import {yieldSceneTask} from './scene-tasks.js';

// Prepare the exact original rigs in separate browser turns before opening
// the world. No placeholder, changed mesh/cache version, or delayed live NPC.
export async function prepareResidentModels(game,{
  yieldTask=yieldSceneTask,create=createCat,dispose=disposeCat,
  clock=()=>performance.now(),onProgress=()=>{},signal,
  canRun=()=>typeof document==='undefined'||!document.hidden,
}={}){
 const models=new Map(),profiles=activeCats(game).filter(p=>!p.homeVenueId),start=clock();
 const stats={models:0,workMs:0,maxTaskMs:0,elapsedMs:0};
 const pool={stats,take(profile){
  const record=models.get(profile.id);if(!record)return null;
  models.delete(profile.id);
  if(record.key!==JSON.stringify([catAppearance(profile),profile.size||1])){dispose(record.model);return null;}
  return record.model;
 },dispose(){for(const r of models.values())dispose(r.model);models.clear();}};
 try{
  onProgress(0,profiles.length);
  for(const profile of profiles){
   await yieldTask();
   while(!canRun()){
    if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
    await new Promise(resolve=>setTimeout(resolve,50));
   }
   if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
   const at=clock(),appearance=catAppearance(profile),model=create('happy',{detail:'npc',...appearance});
   model.scale?.setScalar(.63*(profile.size||1));
   if(model.userData?.referenceFamily)enableCatRenderBatch(model);
   const ms=clock()-at;
   models.set(profile.id,{model,key:JSON.stringify([appearance,profile.size||1])});stats.models++;stats.workMs+=ms;stats.maxTaskMs=Math.max(stats.maxTaskMs,ms);
   onProgress(stats.models,profiles.length);
  }
  stats.elapsedMs=clock()-start;return pool;
 }catch(error){pool.dispose();throw error;}
}
