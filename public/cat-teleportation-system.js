const copy=p=>({x:p.x,y:p.y,z:p.z});
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
// The world owns ONE coordinator. Destinations provide their existing physical
// navigation and activity callbacks; no geometry, wallet or cat rig is created.
export function createCatTeleportationSystem({getActors,effects=null,canTravel=()=>true,canSimulate=()=>true,onBegin=()=>true,onError=()=>{},reducedMotion=false,maxConcurrent=48}={}){
  const destinations=new Map(),operations=new Map();let serial=0,disposed=false;
  const actor=id=>getActors().find(a=>a.id===id);
  const current=op=>!disposed&&operations.get(op.id)===op;
  function release(op){effects?.release(op.effect);if(op.hidden&&op.actor?.carrier)op.actor.carrier.visible=op.originalVisible;op.hidden=false;}
  function cancel(id,reason='cancelled'){
    const op=operations.get(id);if(!op)return false;
    operations.delete(id);release(op);
    if(op.started&&finite(op.safe)&&op.actor)Object.assign(op.actor.position,op.safe);
    op.phase='TravelFailed';op.cancelReason=reason;try{op.onCancel?.(reason);}catch{}op.resolve(false);return true;
  }
  function fail(op,reason){if(!current(op))return;cancel(op.id,reason);onError(reason,op.id);}
  function choose(op){
    const entry=op.destination,others=getActors().filter(a=>a.id!==op.id),reserved=[...operations.values()].filter(o=>o!==op&&o.arrival).map(o=>({id:o.id,position:o.arrival,radius:o.radius}));
    const candidates=entry.arrivalPoints?.(op.actor,{reserved,actors:others})||[typeof entry.arrivalPoint==='function'?entry.arrivalPoint(op.actor):entry.arrivalPoint];
    for(const p of candidates){
      if(!finite(p)||entry.checkArrival?.(p,op.actor)===false)continue;
      if([...others,...reserved].some(a=>Math.abs(a.position.y-p.y)<1.8&&Math.hypot(a.position.x-p.x,a.position.z-p.z)<(a.radius||.6)+op.radius+.2))continue;
      return copy(p);
    }return null;
  }
  function request(id,destinationId,{onArrival=()=>true,onCancel=()=>{},metadata=null}={}){
    const destination=destinations.get(destinationId),a=actor(id);
    if(disposed||!destination||!a||!finite(a.position)||!canSimulate()||destination.requiredConditions?.(a)===false||!operations.has(id)&&operations.size>=maxConcurrent)return null;
    // Cancel first, then read the restored valid origin. No stale asynchronous
    // prepare callback can take ownership from this new operation token.
    cancel(id,'superseded');
    let resolve;const result=new Promise(r=>resolve=r),from=copy(a.position);
    const op={id,token:++serial,destinationId,destination,actor:a,radius:a.radius||.6,phase:'ValidatingDestination',age:0,from,safe:from,arrival:null,started:false,prepared:false,hidden:false,originalVisible:a.carrier?.visible??true,onArrival,onCancel,resolve,result,metadata,frame:{position:copy(from),yaw:a.carrier?.rotation.y||0,walking:false,reaction:null,phase:'ValidatingDestination',locomotion:{mode:'walk',speed:0,phase:0}}};
    operations.set(id,op);
    Promise.resolve().then(()=>destination.prepare?.(a)).then(ok=>{
      if(!current(op))return;
      if(ok===false||destination.requiredConditions?.(a)===false){fail(op,'Місце призначення зараз недоступне.');return;}
      op.prepared=true;
    }).catch(()=>fail(op,'Не вдалося підготувати місце призначення.'));
    return op;
  }
  return {
    destinations,operations,register(entry){if(!entry?.destinationId)throw Error('Teleport destination needs a real game ID');destinations.set(entry.destinationId,entry);return entry;},
    request,cancel,has:id=>operations.has(id),frame:id=>operations.get(id)?.started?operations.get(id).frame:null,
    safePosition:id=>{const op=operations.get(id);return op?.started?copy(op.safe):null;},
    update(dt){
      if(disposed||!canSimulate())return;const h=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));
      for(const op of [...operations.values()]){
        if(!current(op))continue;
        const a=actor(op.id);if(!a){fail(op,'Котик більше недоступний.');continue;}op.actor=a;
        if(!op.started){
          if(!op.prepared||!canTravel(op.id,op))continue;
          if(op.destination.requiredConditions?.(a)===false){fail(op,'Місце призначення зараз недоступне.');continue;}
          op.arrival=choose(op);if(!op.arrival){op.slotWait=(op.slotWait||0)+h;op.phase='WaitingForArrivalSlot';if(op.slotWait>15)fail(op,'Немає вільної безпечної точки прибуття.');continue;}
          op.effect=effects?.acquire(op.destination.portalTheme||'default',op.radius);
          if(effects&&!op.effect)continue; // Queue behind the bounded visual pool.
          if(onBegin(op.id,op)===false){fail(op,'Дочекайся безпечного завершення переходу.');continue;}
          if(!current(op)){release(op);continue;}
          op.from=copy(a.position);op.safe=copy(a.position);op.started=true;op.age=0;op.phase='OpeningPortal';
        }
        op.age+=h;const t=op.age;
        if(t<.25){op.phase='OpeningPortal';op.frame.position=copy(op.from);op.frame.reaction={ride:true,crouch:.12*t/.25,headPitch:-.06,eyeClose:Math.sin(t/.25*Math.PI)*.35};}
        else if(t<.4){op.phase='Teleporting';op.frame.position=copy(op.from);op.frame.reaction={ride:true,crouch:.16,eyeClose:.8};}
        else {
          if(!op.relocated){
            // Re-query the ACTUAL floor/net/soft surface at the commit boundary.
            if(op.destination.requiredConditions?.(a)===false){fail(op,'Місце призначення більше недоступне.');continue;}
            const p=choose(op);if(!p){op.age=.39;continue;}op.arrival=p;op.safe=copy(p);op.relocated=true;
            Object.assign(a.position,p);
          }
          op.phase='ArrivalAnimation';const u=Math.min(1,(t-.4)/.3);
          op.frame.position={...op.arrival,y:op.arrival.y+(reducedMotion?0:.44145*(1-u*u))};
          op.frame.yaw=typeof op.destination.arrivalRotation==='function'?op.destination.arrivalRotation(a):op.destination.arrivalRotation??op.frame.yaw;
          op.frame.reaction={ride:true,paw:u<.85?.14:0,crouch:u>.85?.12*(u-.85)/.15:0,eyeClose:u>.9?.2:0};
        }
        op.frame.phase=op.phase;
        Object.assign(a.position,op.frame.position);if(a.carrier)a.carrier.rotation.y=op.frame.yaw;
        effects?.update(op.effect,{age:t,from:op.from,to:op.arrival,relocated:!!op.relocated,reducedMotion});
        if(t>=.7){
          Object.assign(a.position,op.arrival);op.phase='StartingActivity';operations.delete(op.id);release(op);
          try{const result=op.onArrival(a,op);if(result===false)onError('Активність зараз недоступна. Котик залишився на безпечному місці.',op.id);op.resolve(result);}catch(error){onError(error.message,op.id);op.resolve(false);}
        }
      }
    },
    dispose(){if(disposed)return;for(const id of [...operations.keys()])cancel(id,'disposed');disposed=true;effects?.dispose();destinations.clear();},
    get diagnostics(){return{active:operations.size,destinations:destinations.size,latestToken:serial,maxConcurrent};},
  };
}
