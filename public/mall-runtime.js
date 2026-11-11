import {MALL,mallFloor,mallStore,mallProduct,mallServiceFrames} from './mall-data.js';
import {mallChoice} from './mall-system.js';
import {MOSA_SEA,MOSA_SHORE_GATE,mosaCoastFactor,mosaDryPoint} from './mosasaur-data.js';

const smooth=t=>t*t*(3-2*t),point=(x,y,z)=>({x,y,z}),copy=p=>point(p.x,p.y,p.z);
export const mallLanding=(floor,slot=0)=>point((floor?0:MALL.lift.x)+(slot%2?2.3:-2.3),floor?mallFloor(floor).y+.18:.35,MALL.lift.z+(floor?-8:12)+Math.floor(slot/2)*(floor?-4:4));
const cabinSeat=slot=>point(MALL.lift.x+(slot%2?2.3:-2.3),0,MALL.lift.z+(slot<2?-2.3:2.3));
export function mallApproach(from){
  const out=[copy(from)],onPier=Math.abs(from.x)<1.2&&from.z>=9.8&&from.z<=MOSA_SHORE_GATE.z+1;
  if(!onPier){
    const a0=Math.atan2(from.x,from.z),da=Math.atan2(Math.sin(-a0),Math.cos(-a0));
    for(let j=0;j<=Math.ceil(Math.abs(da)*30);j++){
      const a=a0+da*j/Math.max(1,Math.ceil(Math.abs(da)*30)),f=mosaCoastFactor(Math.atan2(Math.cos(a)/MOSA_SEA.rz,Math.sin(a)/MOSA_SEA.rx));
      const r=f/Math.hypot(Math.sin(a)/MOSA_SEA.rx,Math.cos(a)/MOSA_SEA.rz)+9,p=mosaDryPoint(Math.sin(a)*r,Math.cos(a)*r,3);out.push(point(p.x,.35,p.z));
    }
    out.push(point(0,.35,MOSA_SHORE_GATE.z));
  }
  out.push(point(0,.35,110));return out;
}
export function mallStorePath(floor,storeId,reverse=false){
  const s=mallStore(storeId);if(!s||s.floor!==floor)throw Error('Немає маршруту до магазину');
  const y=mallFloor(floor).y+.18,path=[point(12,y,75),point(0,y,MALL.z+17)],start=Math.PI/2;
  let da=Math.atan2(Math.sin(s.angle-start),Math.cos(s.angle-start));const lane=reverse?18.8:14.8;
  const steps=Math.ceil(Math.abs(da)*12);
  for(let i=1;i<=steps;i++){const a=start+da*i/steps;path.push(point(Math.cos(a)*lane,y,MALL.z+Math.sin(a)*lane));}
  path.push(point(s.entrance.x,y,s.entrance.z));return reverse?path.reverse():path;
}
export function createMallRuntime({getGame,onPurchase=()=>false,onUse=()=>false,onGoal=()=>{},onComplete=()=>{},route=null,vendorReady=()=>true}={}){
  const visits=new Map(),storeLocks=new Map();
  const lift={floor:0,y:.35,phase:'open',opening:1,elapsed:0,passengers:[],target:0,from:.35,duration:0};
  const queue=[];let serial=0;
  function walk(v,path,next){
    if(route&&v.floor>0&&!['boarded','landed'].includes(next)&&path.length){
      const planned=route(v.floor,v.position,path.at(-1),v.radius);
      if(!planned){v.routeFailed=true;v.walking=false;return false;}path=planned;v.routeFailed=false;
    }
    v.path=[copy(v.position),...path.map(copy)];v.segment=0;v.distance=0;v.next=next;v.phase='walk';v.action=next==='queue'?'EnterElevator':next==='inspect'?'BrowseStore':'ReturnHome';return true;}
  function move(v,dt,others){
    while(v.segment<v.path.length-1){const a=v.path[v.segment],b=v.path[v.segment+1],length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
      if(length<.001){v.segment++;v.distance=0;continue;}
      const travel=Math.min(length-v.distance,dt*3.6),u=(v.distance+travel)/length,candidate=point(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,a.z+(b.z-a.z)*u);
      // First reservation has right of way, preventing symmetric lane deadlocks.
      const occupied=others.some(o=>o!==v&&o.order<v.order&&Math.abs(o.position.y-candidate.y)<2&&Math.hypot(o.position.x-candidate.x,o.position.z-candidate.z)<v.radius+o.radius+.2);
      if(occupied)return false;
      v.yaw=Math.atan2(b.x-a.x,b.z-a.z);v.position=candidate;v.distance+=travel;
      if(v.distance>=length-.0001){v.segment++;v.distance=0;dt-=travel/3.6;if(dt<=0)break;}else break;
    }
    return v.segment>=v.path.length-1;
  }
  function enqueue(v,from,to){v.fromFloor=from;v.toFloor=to;v.phase='queue';v.action='EnterElevator';v.elapsed=0;if(!queue.includes(v.id))queue.push(v.id);}
  function arrived(v){v.phase=v.next;v.elapsed=0;
    if(v.phase==='queue')enqueue(v,v.floor,v.returning?0:mallStore(v.storeId).floor);
    else if(v.phase==='boarded'){v.phase='riding';v.action='SelectFloor';}
    else if(v.phase==='landed'){
      lift.passengers=lift.passengers.filter(id=>id!==v.id);v.slot=null;
      if(v.floor===0){walk(v,[point(12,.35,101),point(0,.35,110)],'done');}
      else if(v.returning){walk(v,[mallLanding(v.floor,v.order%6)],'queue');}
      else walk(v,mallStorePath(v.floor,v.storeId),'inspect');
    }
    else if(v.phase==='done')finish(v);
  }
  function finish(v){if(storeLocks.get(v.storeId)===v.id)storeLocks.delete(v.storeId);visits.delete(v.id);const index=queue.indexOf(v.id);if(index>=0)queue.splice(index,1);lift.passengers=lift.passengers.filter(id=>id!==v.id);onGoal(v.id,null);onComplete(v.id,v);}
  function leave(v){v.returning=true;if(storeLocks.get(v.storeId)===v.id)storeLocks.delete(v.storeId);const s=mallStore(v.storeId),y=mallFloor(v.floor).y+.18,side=point(Math.cos(s.angle)*18-Math.sin(s.angle)*5.5,y,MALL.z+Math.sin(s.angle)*18+Math.cos(s.angle)*5.5);walk(v,[side,...mallStorePath(v.floor,v.storeId,true),mallLanding(v.floor,v.order%6)],'queue');}
  function start(id,storeId,position,{radius=.85,productId=null,ticket=null,resume=null,browseOnly=false,useOwned=false}={}){
    const game=getGame(),s=mallStore(storeId);
    if([...visits.values()].filter(v=>v.storeId===storeId).length>=2)return false;
    if(!s||!game.unlocked.includes('autumn')||!game.jobCity?.profiles[id]||visits.has(id)||visits.size>=6||radius>1.8)return false;
    const profile=game.jobCity.profiles[id],owned=useOwned&&profile.inventory?.[productId]>0;
    const product=productId&&mallProduct(productId)?.storeId===storeId&&(owned||mallProduct(productId).price<=profile.coins)?productId:null;
    const ownedReceipt=owned?Object.entries(profile.mall?.receipts||{}).filter(([,r])=>r.product===productId).sort((a,b)=>a[1].sequence-b[1].sequence)[profile.mall?.used?.[productId]||0]?.[0]:null;
    if(useOwned&&!ownedReceipt)return false;
    if(productId&&!product)return false;
    const v={id,storeId,position:copy(position),yaw:0,radius,order:serial++,elapsed:0,floor:0,productId:resume?.productId||productId||(browseOnly?null:mallChoice(game,id,storeId)?.id)||null,receipt:resume?.receipt||ownedReceipt||null,ticket,returning:false,action:'VisitMall',bought:!!resume?.purchased||!!ownedReceipt,used:!!resume?.used,walking:true};
    if(position.y< -10){
      v.floor=Math.max(1,Math.min(7,Math.round((position.y-.18-MALL.y)/MALL.rise)+1));
      v.position.y=mallFloor(v.floor).y+.18;
      if(v.floor===s.floor)walk(v,mallStorePath(v.floor,storeId),'inspect');
      else walk(v,[mallLanding(v.floor,v.order%6)],'queue');
    }else {const landing=mallLanding(0,v.order%6);walk(v,[...mallApproach(position),point(landing.x,.35,110),landing],'queue');}
    visits.set(id,v);try{onGoal(id,{storeId,at:resume?.at||Date.now(),productId:v.productId,receipt:v.receipt,purchased:v.bought,used:v.used});}catch(error){visits.delete(id);throw error;}return true;
  }
  function stepLift(dt){
    lift.elapsed+=dt;
    if(lift.phase==='moving'){
      const u=Math.min(1,lift.elapsed/lift.duration);lift.y=lift.from+(lift.to-lift.from)*smooth(u);
      if(u===1){lift.floor=lift.target;lift.phase='opening';lift.elapsed=0;}
    }else if(lift.phase==='opening'){
      lift.opening=Math.min(1,lift.elapsed/1.1);
      if(lift.opening===1){lift.phase='open';lift.elapsed=0;for(const id of [...lift.passengers]){const v=visits.get(id);if(v&&v.toFloor===lift.floor){v.floor=lift.floor;walk(v,[point(v.position.x,lift.y,v.position.z+(v.floor?-8:8)),mallLanding(v.floor,v.slot)],'landed');}}}
    }else if(lift.phase==='closing'){
      lift.opening=Math.max(0,1-lift.elapsed/1.1);if(lift.opening===0){lift.phase='moving';lift.elapsed=0;lift.from=lift.y;lift.to=lift.target?mallFloor(lift.target).y+.18:.35;lift.duration=Math.max(2,Math.abs(lift.to-lift.from)/MALL.speed);}
    }else{
      const pending=queue.map(id=>visits.get(id)).filter(Boolean);
      const unloading=lift.passengers.some(id=>visits.get(id)?.phase!=='riding');
      if(!unloading){
        const atFloor=pending.filter(v=>v.fromFloor===lift.floor).sort((a,b)=>a.order-b.order);
        for(const v of atFloor){if(lift.passengers.length>=MALL.capacity)break;
          const slots=new Set(lift.passengers.map(id=>visits.get(id)?.slot));let slot=[0,1,2,3].find(n=>!slots.has(n)&&n%2===v.order%2);if(slot===undefined)continue;
          v.slot=slot;lift.passengers.push(v.id);queue.splice(queue.indexOf(v.id),1);
          const seat=cabinSeat(slot),entry=point(seat.x,lift.y,MALL.lift.z+(lift.floor?-8:8));
          walk(v,[entry,point(seat.x,lift.y,seat.z)],'boarded');
        }
      }
      if(lift.elapsed>4&&!unloading&&lift.passengers.every(id=>visits.get(id)?.phase==='riding')){
        const destination=visits.get(lift.passengers[0])?.toFloor??pending[0]?.fromFloor;
        if(destination!=null&&destination!==lift.floor){lift.target=destination;lift.phase='closing';lift.elapsed=0;}
      }
    }
    for(const id of lift.passengers){const v=visits.get(id);if(v?.phase==='riding'){const seat=cabinSeat(v.slot);v.position=point(seat.x,lift.y,seat.z);v.walking=false;}}
  }
  return {
    visits,lift,start,has:id=>visits.has(id),get:id=>visits.get(id),
    detach(id){const v=visits.get(id);if(v)finish(v);},
    cancel(id){const v=visits.get(id);if(!v)return;if(v.position.y>=-1&&v.phase==='walk'&&v.next==='queue'){finish(v);return;}v.returning=true;if(['inspect','compare','checkout','experience','joy'].includes(v.phase))leave(v);},
    clear(){visits.clear();queue.length=0;storeLocks.clear();lift.passengers.length=0;},
    safePosition(id){const v=visits.get(id);return !v?null:['riding','boarded'].includes(v.phase)||v.next==='boarded'?mallLanding(v.fromFloor,v.slot||0):copy(v.position);},
    step(dt,time,{allow=true,blocked=()=>false}={}){
      if(!allow)return;const all=[...visits.values()];stepLift(dt);
      for(const v of all){if(!visits.has(v.id))continue;if(blocked(v.id)&&!v.returning)this.cancel(v.id);
        v.walking=v.phase==='walk';v.elapsed+=dt;
        if(v.phase==='walk'){if(move(v,dt,all))arrived(v);continue;}
        const s=mallStore(v.storeId),service=mallServiceFrames(s,v.order,v.radius);v.yaw=Math.PI/2-s.angle;
        if(v.phase==='inspect'){v.action='InspectProduct';if(v.elapsed>2.6){v.phase='compare';v.elapsed=0;}}
        else if(v.phase==='compare'){v.action='CompareProducts';if(v.elapsed>1.8&&!storeLocks.has(s.id)){storeLocks.set(s.id,v.id);if(!walk(v,[service.customer],'checkout')){storeLocks.delete(s.id);leave(v);}}}
        else if(v.phase==='checkout'){
          v.action=s.kind==='food'?'OrderFood':s.kind==='cinema'?'BuyCinemaTicket':'PurchaseItem';
          if(v.elapsed>2.4&&vendorReady(v)){
            if(v.productId&&!v.bought){const p=getGame().jobCity?.profiles[v.id];v.receipt=`mall-${v.id}-${(p?.purchaseCount||0)+1}`;
              try{v.bought=!!onPurchase(v.id,v.productId,v.receipt);}catch{v.bought=false;}
            }
            storeLocks.delete(s.id);v.phase='joy';v.elapsed=0;
          }
        }else if(v.phase==='joy'){
          v.action=v.bought?'PurchaseItem':'BrowseStore';
          if(v.elapsed>2){v.service=service;if(!walk(v,[service.approach],service.seated?'seat-mount':'experience'))leave(v);}
        }else if(v.phase==='seat-mount'){
          const u=Math.min(1,v.elapsed/1.1),t=smooth(u),a=v.service.approach,b=v.service.seat;
          v.position=point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t+Math.sin(u*Math.PI)*.78,a.z+(b.z-a.z)*t);v.yaw=v.service.yaw;
          if(u===1){v.phase='experience';v.elapsed=0;}
        }else if(v.phase==='seat-stand'){
          const u=Math.min(1,v.elapsed/1.1),t=smooth(u),a=v.service.seat,b=v.service.approach;
          v.position=point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t+Math.sin(u*Math.PI)*.78,a.z+(b.z-a.z)*t);
          if(u===1)leave(v);
        }else if(v.phase==='experience'){
          v.yaw=service.yaw;
          v.action=!v.bought&&s.price?'BrowseStore':({food:'EatMeal',cinema:'WatchMovie',arcade:'PlayArcade',bowling:'PlayArcade',social:'MeetFriend'})[s.kind]||'RelaxAtMall';
          if(v.bought&&!v.used&&!v.useAttempted){v.useAttempted=true;try{v.used=!!onUse(v.id,v.productId);}catch{v.used=false;}}
          if(v.elapsed>(s.kind==='cinema'?22:s.kind==='food'?11:9)){if(v.service?.seated){v.phase='seat-stand';v.elapsed=0;}else leave(v);}
        }
      }
    },
    frame(id,time=0,reduced=false){const v=visits.get(id);if(!v)return null;
      const e=v.elapsed,experience=v.phase==='experience'&&(!mallStore(v.storeId).price||v.bought),s=mallStore(v.storeId),sit=experience&&['food','cinema','rest','social'].includes(s.kind);
      return {position:v.position,yaw:v.yaw,walking:v.walking,phase:v.phase,action:v.action,floor:v.floor,bought:v.bought,
        carrying:v.bought&&!experience,reaction:{headPitch:experience&&s.kind==='food'?.23+(!reduced?Math.sin(e*4)*.06:0):v.phase==='inspect'?-.12:0,
          paw:!reduced&&(v.phase==='checkout'||experience&&s.kind==='arcade')?Math.max(0,Math.sin(e*3))*.55:0,
          rideSit:sit?.8:0,crouch:sit?.05:0,earTilt:v.phase==='joy'?.2:0}};
    },
  };
}
