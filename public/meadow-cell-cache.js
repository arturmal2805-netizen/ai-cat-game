// A bounded working set for decorative cells. The caller supplies the native
// cooperative builder, shader/texture warmup and actual model disposal.
export function createMeadowCellCache({prepare,warm=async()=>{},release,onReady=()=>{},maxResident=192,maxPending=2}={}){
 const resident=new Map(),pending=new Map(),empty=new Map(),failed=new Set();
 let wanted=new Map(),disposed=false,serial=0;
 const stats={created:0,released:0,peakResident:0,peakPending:0,failures:0};
 function destroy(model){if(!model)return;model.removeFromParent?.();release(model);stats.released++;}
 function trim(){
  while(resident.size>maxResident){const stale=[...resident].find(([key])=>!wanted.has(key));if(!stale)break;resident.delete(stale[0]);destroy(stale[1].model);}
  while(empty.size>maxResident*2)empty.delete(empty.keys().next().value);
 }
 function pump(){
  if(disposed)return;
  while(pending.size<maxPending){
   const entry=[...wanted].find(([key])=>!resident.has(key)&&!pending.has(key)&&!empty.has(key)&&!failed.has(key));
   if(!entry)break;
   const [key,cell]=entry,abort=new AbortController(),job={key,cell,abort,model:null};pending.set(key,job);stats.peakPending=Math.max(stats.peakPending,pending.size);
   const needed=()=>!disposed&&!abort.signal.aborted&&wanted.has(key)&&pending.get(key)===job;
   void (async()=>{
    try{
     job.model=await prepare(cell,{signal:abort.signal});
     if(!needed())return;
     if(!job.model){empty.set(key,true);return;}
     await warm(job.model,{needed});
     if(!needed())return;
     // Reclaim stale cells before attaching a replacement; even rapid travel
     // cannot temporarily grow the resident set beyond the advertised cap.
     if(resident.size>=maxResident){const stale=[...resident].find(([id])=>!wanted.has(id));if(stale){resident.delete(stale[0]);destroy(stale[1].model);}}
     if(resident.size>=maxResident)return;
     const model=job.model;onReady(model,cell);resident.set(key,{model,used:++serial});job.model=null;stats.created++;stats.peakResident=Math.max(stats.peakResident,resident.size);
    }catch(error){if(!abort.signal.aborted&&!disposed){failed.add(key);stats.failures++;}}
    finally{destroy(job.model);if(pending.get(key)===job)pending.delete(key);trim();pump();}
   })();
  }
 }
 return {
  update(cells){
   if(disposed)return;
   wanted=new Map(cells.slice(0,maxResident).map(cell=>[cell.key,cell]));
   for(const [key,job]of pending)if(!wanted.has(key))job.abort.abort();
   for(const [key,record]of [...resident]){record.model.visible=wanted.has(key);if(wanted.has(key)){record.used=++serial;resident.delete(key);resident.set(key,record);}}
   // Failures retry only after leaving and revisiting a cell, never in a
   // microtask loop while a decode or compilation remains unavailable.
   for(const key of failed)if(!wanted.has(key))failed.delete(key);
   trim();pump();
  },
  clearIdle(){for(const [key,record]of resident)if(!wanted.has(key)){resident.delete(key);destroy(record.model);}trim();},
  snapshot(){return {...stats,resident:resident.size,pending:pending.size,empty:empty.size,failed:failed.size,wanted:wanted.size,ready:[...wanted.keys()].filter(key=>resident.has(key)||empty.has(key)).length,disposed};},
  dispose(){if(disposed)return;disposed=true;wanted.clear();for(const job of pending.values())job.abort.abort();for(const record of resident.values())destroy(record.model);resident.clear();empty.clear();failed.clear();},
 };
}
