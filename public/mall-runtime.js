import {MALL,mallFloor,mallStore,mallProduct,mallServiceFrames} from './mall-data.js';
import {mallChoice} from './mall-system.js';
import {mallIceEating} from './mall-ice-data.js';
import {MOSA_SEA,MOSA_SHORE_GATE,mosaCoastFactor,mosaDryPoint} from './mosasaur-data.js';

const smooth=t=>t*t*(3-2*t),point=(x,y,z)=>({x,y,z}),copy=p=>point(p.x,p.y,p.z);
export const mallLanding=(floor,slot=0)=>point(MALL.lift.x+(slot%2?(floor?4.5:2.3):-(floor?4.5:2.3)),floor?mallFloor(floor).y+.18:.35,MALL.lift.z+(floor?-MALL.lift.landing:MALL.lift.landing)+Math.floor(slot/2)*(floor?-4:4));
// Separate doors keep arriving shoppers out of the boarding queue. The first
// row to leave walks to the far landing, so later passengers never pass through
// someone already standing at the near landing.
export const mallArrival=(floor,slot=0,side=slot%2?1:-1)=>floor?point(MALL.lift.x+side*((side>0?slot%2===1:slot%2===0)?17.65:13.8),mallFloor(floor).y+.18,MALL.lift.z+(slot<2?-4.5:4.5)):point(MALL.lift.x+(slot%2?2.3:-2.3),.35,MALL.lift.z-MALL.lift.landing-(1-Math.floor(slot/2))*4);
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
  const y=mallFloor(floor).y+.18,lane=reverse?97:92.5,r=reverse?34.5:30.5;
  const path=[mallLanding(floor,0),point(-53.3,y,73),point(-53.3,y,lane)];
  if(s.placement.zone==='west')path.push(point(s.x,y,lane));
  else{
    path.push(point(-43,y,lane),point(-38,y,78),point(-r,y,MALL.z));
    const target=s.placement.zone==='east'?0:Math.atan2(s.z-MALL.z,s.x),steps=Math.max(1,Math.ceil((target+Math.PI)*12));
    for(let i=1;i<=steps;i++){const a=-Math.PI+(target+Math.PI)*i/steps;path.push(point(Math.cos(a)*r,y,MALL.z+Math.sin(a)*r));}
    if(s.placement.zone==='east')path.push(point(38,y,78),point(43,y,lane),point(s.x,y,lane));
  }
  path.push(point(s.entrance.x,y,s.entrance.z));return reverse?path.reverse():path;
}
export function createMallRuntime({getGame,onPurchase=()=>false,onUse=()=>false,onGoal=()=>{},onComplete=()=>{},onArrive=()=>{},route=null,canWalkSegment=()=>false,vendorReady=()=>true,serviceFrames=mallServiceFrames,onRouteBlocked=()=>{}}={}){
  const visits=new Map(),storeLocks=new Map();
  const lift={floor:0,y:.35,phase:'open',opening:1,elapsed:0,passengers:[],target:0,from:.35,duration:0};
  const queue=[];let serial=0,avoidanceBudget=0;
  function walk(v,path,next){
    if(route&&v.floor>0&&!['boarded','landed'].includes(next)&&path.length){
      const planned=route(v.floor,v.position,path.at(-1),v.radius);
      if(!planned){if(!v.routeFailed)onRouteBlocked(v);v.routeFailed=true;v.walking=false;v.phase='route-blocked';return false;}path=planned;v.routeFailed=false;
    }
    v.path=[copy(v.position),...path.map(copy)];v.segment=0;v.distance=0;v.next=next;v.phase='walk';v.action=next==='queue'?'EnterElevator':next==='inspect'?'BrowseStore':'ReturnHome';return true;}
  function move(v,dt,others){
    while(v.segment<v.path.length-1){const a=v.path[v.segment],b=v.path[v.segment+1],length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
      if(length<.001){v.segment++;v.distance=0;continue;}
      if(v.floor&&length-v.distance<1.2&&v.segment<v.path.length-2&&!['landed','boarded'].includes(v.next)&&canWalkSegment(v.floor,v.position,v.path[v.segment+2],v.radius)){
        v.path[v.segment+1]=copy(v.position);v.segment++;v.distance=0;continue;
      }
      const travel=Math.min(length-v.distance,dt*3.6),u=(v.distance+travel)/length,candidate=point(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,a.z+(b.z-a.z)*u);
      const occupied=others.find(o=>o!==v&&Math.abs(o.position.y-candidate.y)<2&&Math.hypot(o.position.x-candidate.x,o.position.z-candidate.z)<v.radius+o.radius+.2);
      if(occupied){
        v.blockedTime=(v.blockedTime||0)+dt;
        if(avoidanceBudget&&route&&v.floor&&v.blockedTime>.8&&(v.order>occupied.order||occupied.phase!=='walk')&&!['landed','boarded'].includes(v.next)){
          avoidanceBudget=0;v.blockedTime=0;let attempts=0;const nearby=others.filter(o=>o!==v&&Math.abs(o.position.y-v.position.y)<2).map(o=>({...o.position,radius:o.radius}));
          for(let end=v.segment+1;end<v.path.length;end++){
            const target=v.path[end],d=Math.hypot(target.x-v.position.x,target.z-v.position.z);if(d>30)break;if(d<8&&end<v.path.length-1)continue;if(attempts++>=2)break;
            const detour=route(v.floor,v.position,target,v.radius,nearby);if(!detour)continue;v.path=[copy(v.position),...detour,...v.path.slice(end+1)];v.segment=0;v.distance=0;break;
          }
        }
        return false;
      }
      v.blockedTime=0;
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
      lift.passengers=lift.passengers.filter(id=>id!==v.id);v.slot=null;v.phase='landing-wait';
      if(lift.passengers.every(id=>visits.get(id)?.phase==='riding'))for(const guest of visits.values())if(guest.phase==='landing-wait'){
        if(guest.floor===0)walk(guest,[point(0,.35,114)],'done');
        else if(guest.returning)walk(guest,[mallLanding(guest.floor,guest.order%6)],'queue');
        else walk(guest,mallStorePath(guest.floor,guest.storeId),'inspect');
      }
    }
    else if(v.phase==='done')finish(v);
  }
  function finish(v){if(v.phase==='done')onArrive(v.id,copy(v.position));if(storeLocks.get(v.storeId)===v.id)storeLocks.delete(v.storeId);visits.delete(v.id);const index=queue.indexOf(v.id);if(index>=0)queue.splice(index,1);lift.passengers=lift.passengers.filter(id=>id!==v.id);onGoal(v.id,null);onComplete(v.id,v);}
  function leave(v){v.returning=true;if(storeLocks.get(v.storeId)===v.id)storeLocks.delete(v.storeId);walk(v,[...mallStorePath(v.floor,v.storeId,true),mallLanding(v.floor,v.order%6)],'queue');}
  function start(id,storeId,position,{radius=.85,productId=null,ticket=null,resume=null,browseOnly=false,useOwned=false}={}){
    const game=getGame(),s=mallStore(storeId);
    if([...visits.values()].filter(v=>v.storeId===storeId).length>=2)return false;
    if(!s||!game.unlocked.includes('autumn')||!game.jobCity?.profiles[id]||visits.has(id)||visits.size>=6||radius>1.8)return false;
    const profile=game.jobCity.profiles[id],owned=useOwned&&profile.inventory?.[productId]>0;
    const product=productId&&mallProduct(productId)?.storeId===storeId&&(owned||mallProduct(productId).price<=profile.coins)?productId:null;
    const ownedReceipt=owned?Object.entries(profile.mall?.receipts||{}).filter(([,r])=>r.product===productId).sort((a,b)=>a[1].sequence-b[1].sequence)[profile.mall?.used?.[productId]||0]?.[0]:null;
    if(useOwned&&!ownedReceipt)return false;
    if(productId&&!product)return false;
    const v={id,storeId,position:copy(position),yaw:0,radius,order:serial++,elapsed:0,floor:0,productId:resume?.productId||productId||(browseOnly?null:mallChoice(game,id,storeId)?.id)||null,receipt:resume?.receipt||ownedReceipt||null,ticket,returning:false,action:'VisitMall',bought:!!resume?.purchased||!!ownedReceipt,used:!!resume?.used,resumedUsed:!!resume?.used,walking:true};
    if(position.y< -10){
      if(resume&&resume.layoutVersion!==MALL.version){v.position=mallLanding(s.floor,v.order%6);position=v.position;}
      v.floor=Math.max(1,Math.min(7,Math.round((position.y-.18-MALL.y)/MALL.rise)+1));
      v.position.y=mallFloor(v.floor).y+.18;
      if(v.floor===s.floor){
        // A saved diner is inside a real chair collider. Resume its mounted
        // activity/stand-up transition instead of asking floor A* to escape
        // through that chair. Recover the nearest actual seat, not a new slot.
        const seat=resume?.purchased&&Array.from({length:6},(_,i)=>serviceFrames(s,i,radius)).filter(f=>f.seated).sort((a,b)=>Math.hypot(a.seat.x-position.x,a.seat.z-position.z)-Math.hypot(b.seat.x-position.x,b.seat.z-position.z))[0];
        if(seat&&Math.hypot(seat.seat.x-position.x,seat.seat.z-position.z)<.8){
          v.position=point(position.x,seat.seat.y,position.z);v.service={...seat,seat:copy(v.position)};v.yaw=seat.yaw;v.walking=false;v.phase=v.used?'seat-stand':'experience';v.action=v.used?'ReturnHome':'EatMeal';v.returning=v.used;
        }else walk(v,mallStorePath(v.floor,storeId),'inspect');
      }
      else walk(v,[mallLanding(v.floor,v.order%6)],'queue');
    }else {const landing=mallLanding(0,v.order%6);walk(v,[...mallApproach(position),point(MALL.gate.x,.35,MALL.gate.z),point(landing.x,.35,MALL.lift.z+26),landing],'queue');}
    visits.set(id,v);try{onGoal(id,{layoutVersion:MALL.version,storeId,at:resume?.at||Date.now(),productId:v.productId,receipt:v.receipt,purchased:v.bought,used:v.used});}catch(error){visits.delete(id);throw error;}return true;
  }
  function stepLift(dt){
    lift.elapsed+=dt;
    if(lift.phase==='moving'){
      const u=Math.min(1,lift.elapsed/lift.duration);lift.y=lift.from+(lift.to-lift.from)*smooth(u);
      if(u===1){lift.floor=lift.target;lift.phase='opening';lift.elapsed=0;}
    }else if(lift.phase==='opening'){
      lift.opening=Math.min(1,lift.elapsed/1.1);
      if(lift.opening===1){lift.phase='open';lift.elapsed=0;for(const id of [...lift.passengers]){const v=visits.get(id);if(v&&v.toFloor===lift.floor){
        v.floor=lift.floor;
        if(v.floor){const side=mallStore(v.storeId).x<0?-1:1,end=mallArrival(v.floor,v.slot,side),zsign=v.slot<2?-1:1,x=MALL.lift.x+side*6.2,gate=MALL.lift.x+side*13.9;
          walk(v,[point(v.position.x,lift.y,MALL.lift.z+zsign*6.2),point(x,lift.y,MALL.lift.z+zsign*6.2),point(x,lift.y,MALL.lift.z+zsign*2.3),point(gate,lift.y,MALL.lift.z+zsign*2.3),point(gate,lift.y,end.z),end],'landed');
        }else{const end=mallArrival(0,v.slot),side=v.slot%2?1:-1,x=MALL.lift.x+side*6.2;walk(v,[point(x,lift.y,v.position.z),point(x,lift.y,MALL.lift.z-5.8),point(v.position.x,lift.y,MALL.lift.z-6.2),point(v.position.x,lift.y,end.z),end],'landed');}
      }}}
    }else if(lift.phase==='closing'){
      lift.opening=Math.max(0,1-lift.elapsed/1.1);if(lift.opening===0){lift.phase='moving';lift.elapsed=0;lift.from=lift.y;lift.to=lift.target?mallFloor(lift.target).y+.18:.35;lift.duration=Math.max(2,Math.abs(lift.to-lift.from)/MALL.speed);}
    }else{
      const pending=queue.map(id=>visits.get(id)).filter(Boolean);
      const unloading=lift.passengers.some(id=>visits.get(id)?.phase!=='riding');
      if(!unloading){
        const atFloor=pending.filter(v=>v.fromFloor===lift.floor).sort((a,b)=>Math.abs(a.position.z-MALL.lift.z)-Math.abs(b.position.z-MALL.lift.z)||a.order-b.order);
        for(const v of atFloor){if(lift.passengers.length>=MALL.capacity)break;
          const column=v.order%2;
          if(lift.passengers.some(id=>{const p=visits.get(id);return p?.slot%2===column&&p.phase!=='riding';}))continue;
          const slots=new Set(lift.passengers.map(id=>visits.get(id)?.slot));let slot=(lift.floor?[2,3,0,1]:[0,1,2,3]).find(n=>!slots.has(n)&&n%2===column);if(slot===undefined)continue;
          v.slot=slot;lift.passengers.push(v.id);queue.splice(queue.indexOf(v.id),1);
          const seat=cabinSeat(slot),sign=lift.floor?-1:1,x=MALL.lift.x+(slot%2?1:-1)*6.2,entry=point(seat.x,lift.y,MALL.lift.z+sign*MALL.lift.landing);
          walk(v,[entry,point(seat.x,lift.y,MALL.lift.z+sign*6.2),point(x,lift.y,MALL.lift.z+sign*5.8),point(x,lift.y,seat.z),point(seat.x,lift.y,seat.z)],'boarded');
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
    cancel(id){const v=visits.get(id);if(!v)return;if(v.position.y>=-1&&v.phase==='walk'&&v.next==='queue'){finish(v);return;}v.returning=true;if(['inspect','compare','checkout','experience','joy','route-blocked'].includes(v.phase))leave(v);},
    clear(){visits.clear();queue.length=0;storeLocks.clear();lift.passengers.length=0;},
    safePosition(id){const v=visits.get(id);return !v?null:['riding','boarded'].includes(v.phase)||v.next==='boarded'?mallLanding(v.fromFloor,v.slot||0):copy(v.position);},
    step(dt,time,{allow=true,blocked=()=>false}={}){
      if(!allow)return;avoidanceBudget=1;const all=[...visits.values()];stepLift(dt);
      for(const v of all){if(!visits.has(v.id))continue;if(blocked(v.id)&&!v.returning)this.cancel(v.id);
        v.walking=v.phase==='walk';v.elapsed+=dt;
        if(v.phase==='walk'){if(move(v,dt,all))arrived(v);continue;}
        const s=mallStore(v.storeId),service=serviceFrames(s,v.order,v.radius);v.yaw=Math.PI/2-s.angle;
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
      const flavor=mallProduct(v.productId)?.iceFlavor,iceCream=flavor&&v.bought&&!v.returning&&!v.resumedUsed&&(experience||!v.used)?mallIceEating(experience?e:0,flavor,reduced):null;
      return {position:v.position,yaw:v.yaw,walking:v.walking,phase:v.phase,action:v.action,floor:v.floor,bought:v.bought,
        iceCream,carrying:v.bought&&!experience&&!flavor,reaction:{headPitch:experience&&s.kind==='food'?.23+(!reduced?Math.sin(e*4)*.06:0):v.phase==='inspect'?-.12:0,
          paw:!reduced&&(v.phase==='checkout'||experience&&s.kind==='arcade')?Math.max(0,Math.sin(e*3))*.55:0,
          rideSit:sit?.8:0,crouch:sit?.05:0,iceHolding:!!iceCream,earTilt:v.phase==='joy'?.2:0,...(experience&&iceCream?{...iceCream.reaction,iceLick:iceCream.lick}: {})}};
    },
  };
}
