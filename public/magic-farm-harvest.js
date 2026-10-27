import {magicFarm,magicFarmLayout,MAGIC_FRUITS} from './magic-farms-data.js';
import {spaPath,spaClear} from './spa-navigation.js';
import {pathLength,pathFrame} from './jobcity-navigation.js';
const clamp=x=>Math.max(0,Math.min(1,x)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function farmWalkable(id,p,radius=.6,extra=[]){
 const f=magicFarm(id),l=magicFarmLayout(id);if(!f||Math.hypot(p.x,p.z)>l.bounds-radius)return false;
 const [x,z,rx,rz]=l.pond;if(Math.hypot((p.x-x)/(rx+radius+.5),(p.z-z)/(rz+radius+.5))<1)return false;
 return spaClear(p,radius,[...l.plants.map(p=>({x:p.x,z:p.z,radius:p.kind==='pumpkin'?3.7:5.7})),...extra]);
}
export function createFarmHarvests(id,{getState=()=>null,onPick=()=>{},getActors=()=>[]}={}){
 const farm=magicFarm(id),layout=magicFarmLayout(id),visits=new Map(),locks=new Map(),obstacles=layout.plants.map(p=>({x:p.x,z:p.z,radius:p.kind==='pumpkin'?3.7:5.7}));
 const clear=(p,r,extra=[])=>{
  const [x,z,rx,rz]=layout.pond;return Math.hypot(p.x,p.z)<layout.bounds-r&&Math.hypot((p.x-x)/(rx+r+.5),(p.z-z)/(rz+r+.5))>=1&&spaClear(p,r,[...obstacles,...extra]);
 };
 function reserve(catId,radius=.7,now=Date.now()){
  if(visits.has(catId))return visits.get(catId);if(visits.size>=4)return null;
  const state=getState(),used=new Set([...visits.values()].map(v=>v.slot));let slot=0;while(used.has(slot))slot++;
  const entry={x:(slot-1.5)*15,z:layout.storage.z+4,y:.16},extra=[...visits.values()].map(v=>({...v.stand,radius:v.radius+.8}));
  const candidates=layout.plants.filter(p=>!locks.has(p.id)&&state?.plants?.[p.id]?.readyAt<=now).sort((a,b)=>distance(a,entry)-distance(b,entry));
  for(const plant of candidates){
   let stand,path;const gap=(plant.kind==='pumpkin'?3.7:5.7)+radius+1.2;
   for(let i=0;i<8;i++){
    const a=Math.atan2(plant.x,plant.z)+i*Math.PI/4,p={x:plant.x+Math.sin(a)*gap,z:plant.z+Math.cos(a)*gap,y:.16};
    if(!clear(p,radius,extra))continue;
    const points=spaPath(entry,p,radius,extra,(p,r,obs)=>clear(p,r,obs),{extent:Math.ceil(farm.radius/2),cell:2});
    if(points){stand=p;path=points;break;}
   }
   if(!path)continue;
   const length=pathLength(path),back=[...path].reverse(),seconds=length/4.2,pickDuration=7,
     fruit=MAGIC_FRUITS.find(f=>f.id===plant.fruit),receipt={farm:id,plant:plant.id,cycle:state.plants[plant.id].cycle},
     plan={catId,slot,radius,plant,fruit,entry,stand,path,receipt,duration:seconds*2+pickDuration+2,finished:false,last:entry,picked:false,clock:0,lastTime:0};
   plan.frame=(elapsed,reduced=false)=>{
    const delta=Math.max(0,Math.min(.2,elapsed-plan.lastTime));plan.lastTime=elapsed;
    let next=plan.clock+delta,p,walking=false,carrying=false,reaction={},yaw=Math.atan2(plant.x-stand.x,plant.z-stand.z);
    const sample=t=>t<seconds?pathFrame(path,t*4.2):t<seconds+pickDuration?{...stand,yaw}:pathFrame(back,Math.min(length,(t-seconds-pickDuration)*4.2));
    p=sample(next);walking=next<seconds||next>=seconds+pickDuration&&next<seconds*2+pickDuration;
    // Shared rest-anatomy radii, short steps and a waiting clock prevent
    // walking guests from overlapping each other or skipping ahead after a wait.
    if(walking&&getActors(catId).some(a=>distance(p,a)<radius+a.radius+.25&&distance(p,a)<distance(plan.last,a))){next=plan.clock;p=sample(next);walking=false;}
    plan.clock=next;plan.last={x:p.x,z:p.z,y:.16};
    if(next>=seconds&&next<seconds+pickDuration){
     const t=next-seconds,reach=Math.sin(clamp(t/3.5)*Math.PI),joy=clamp((t-3.4)/.8)*(1-clamp((t-5.7)/1.3));
     reaction={paw:reach*.75,frontLift:plant.kind==='pumpkin'?0:reach*.55,headPitch:plant.kind==='pumpkin'?reach*.2:-reach*.18,bodyPitch:-reach*.09,earRelax:joy*.18,tailSway:joy*Math.sin(t*5)*.22,surprise:joy*(fruit.rarity==='Легендарний'?.75:.3)};
     if(!reduced&&plant.kind!=='pumpkin'&&t>1.3&&t<2.2)p={...p,y:.16+Math.sin((t-1.3)/.9*Math.PI)*.8};
     carrying=t>=3.6;
    }else carrying=next>=seconds+pickDuration;
    if(carrying&&!plan.picked){plan.picked=true;onPick(plant.id,true);}
    plan.finished=next>=plan.duration;
    return {position:[p.x,p.y??.16,p.z],yaw:p.yaw??yaw,walking,carrying:carrying&&!plan.finished,reaction,phase:plan.finished?'done':next<seconds?'approach':next<seconds+pickDuration?'pick':next<seconds*2+pickDuration?'carry':'deposit'};
   };
   visits.set(catId,plan);locks.set(plant.id,catId);return plan;
  }return null;
 }
 function release(catId){const p=visits.get(catId);if(!p)return;onPick(p.plant.id,false);locks.delete(p.plant.id);visits.delete(catId);}
 return {visits,reserve,release,available:()=>visits.size<4};
}
