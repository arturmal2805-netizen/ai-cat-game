import {MAGIC_BED_SLOTS,magicBedCrop} from './magic-bed-data.js';
import {pathLength,pathFrame} from './jobcity-navigation.js';
import {spaPath,spaClear} from './spa-navigation.js';
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// One row per worker; all picking happens outside the wooden bed. Tiny kittens
// explicitly hop onto the rim rather than walking through soil or plants.
export function createMagicBedHarvests(field,{getCells,getActors=()=>[],getBlockers=()=>[],onPick=()=>{}}){
 const visits=new Map(),rows=new Map();
 function reserve(catId,radius=.7,now=Date.now(),preferred){
  if(visits.has(catId))return visits.get(catId);if(visits.size>=3)return null;
  const cells=getCells(),actors=getActors(catId),candidates=MAGIC_BED_SLOTS.filter(s=>(preferred===undefined||s.index===preferred)&&!rows.has(s.row)&&cells?.[s.index]?.crop===s.crop&&cells[s.index].readyAt<=now);
  for(const slot of candidates){
   const entry={x:slot.x,y:.16,z:slot.side*(2.4+radius+.3)};
   if(!spaClear(entry,radius,getBlockers()))continue;
   if(actors.some(a=>distance(a,entry)<radius+a.radius+.35)||[...visits.values()].some(v=>distance(v.entry,entry)<radius+v.radius+.35))continue;
   const cell=cells[slot.index],crop=magicBedCrop(cell.crop),tiny=radius<.65,plan={catId,radius,slot,crop,entry,receipt:{field,index:slot.index,cycle:cell.cycle},duration:6.6,reachPoint:[slot.x+.1,crop.height+.06,slot.side*(1.93+(crop.kind==='heart'?.24:.33))],reach:0,clock:0,lastTime:0,picked:false,finished:false};
   plan.frame=(elapsed,reduced=false)=>{
    plan.clock+=Math.max(0,Math.min(.2,elapsed-plan.lastTime));plan.lastTime=elapsed;const t=plan.clock,reach=ease((t-1.6)/1.2)*(1-ease((t-3.6)/.8)),inspect=ease(t/.8)*(1-ease((t-1.6)/.4)),joy=ease((t-4)/.6)*(1-ease((t-5.9)/.7));
    let z=entry.z,y=.16;
    if(tiny){const perch=ease((t-.7)/.9)*(1-ease((t-4)/.9));z=entry.z+(slot.side*(2.4+radius*.25)-entry.z)*perch;y+=.54*perch;if(!reduced&&t>.7&&t<1.6)y+=Math.sin((t-.7)/.9*Math.PI)*.2;}
    plan.reach=reach;z-=slot.side*reach*.22;
    const reaction={ride:true,crouch:reach*Math.max(0,Math.min(.2,(radius-1)*.15)),headPitch:inspect*.18-reach*.14,bodyPitch:-reach*.12,paw:reach*.85,frontLift:reach*(tiny?.45:.28),earRelax:joy*.2,tailSway:(reduced?0:Math.sin(t*4))*(joy*.2+inspect*.08),surprise:joy*.25};
    if(t>=3.55&&!plan.picked){plan.picked=true;onPick(slot.index,true);}
    plan.finished=t>=plan.duration;
    return {position:[entry.x,y,z],yaw:slot.side>0?Math.PI:0,walking:false,carrying:plan.picked&&!plan.finished,reaction,phase:plan.finished?'done':t<2?'sniff':t<3.55?'pick':'celebrate'};
   };
   visits.set(catId,plan);rows.set(slot.row,catId);return plan;
  }return null;
 }
 function release(id){const p=visits.get(id);if(!p)return;onPick(p.slot.index,false);rows.delete(p.slot.row);visits.delete(id);}
 return {visits,reserve,release,available:()=>visits.size<3&&MAGIC_BED_SLOTS.some(s=>!rows.has(s.row)&&getCells()?.[s.index]?.crop===s.crop&&getCells()[s.index].readyAt<=Date.now())};
}
export function magicBedApproach(getBlockers=()=>[]){
 const cache=new Map();
 function plan(a,b){
  const key=a.join(',')+'>'+b.join(',');if(cache.has(key))return cache.get(key);
  const r=Math.max(.2,Math.abs(b[2])-2.7),hx=5+r+.35,hz=2.4+r+.35,width=2*hx,depth=2*hz,perimeter=4*(hx+hz),from={x:a[0],y:a[1],z:a[2]},to={x:b[0],y:b[1],z:b[2]},obs=getBlockers(from,to).filter(o=>!o.radius||distance(o,from)>o.radius+r+.1);
  const point=s=>{s=(s%perimeter+perimeter)%perimeter;return s<width?{x:-hx+s,z:-hz,y:.16}:s<width+depth?{x:hx,z:-hz+s-width,y:.16}:s<width*2+depth?{x:hx-(s-width-depth),z:hz,y:.16}:{x:-hx,z:hz-(s-width*2-depth),y:.16};};
  const along=p=>Math.abs(p.z+hz)<1e-5?p.x+hx:Math.abs(p.x-hx)<1e-5?width+p.z+hz:Math.abs(p.z-hz)<1e-5?width+depth+hx-p.x:width*2+depth+hz-p.z;
  const projection={x:Math.max(-hx,Math.min(hx,from.x)),z:Math.max(-hz,Math.min(hz,from.z)),y:.16};
  if(Math.abs(projection.x)<hx&&Math.abs(projection.z)<hz){const near=[{x:-hx,z:from.z,y:.16},{x:hx,z:from.z,y:.16},{x:from.x,z:-hz,y:.16},{x:from.x,z:hz,y:.16}];near.sort((p,q)=>distance(p,from)-distance(q,from));Object.assign(projection,near[0]);}
  const gate={x:Math.max(-hx,Math.min(hx,to.x)),z:Math.sign(to.z)*hz,y:.16},start=along(projection),finish=along(gate),cw=(finish-start+perimeter)%perimeter,dir=cw<=perimeter/2?1:-1,travel=dir===1?cw:perimeter-cw,corners=[0,width,width+depth,width*2+depth].map(s=>({advance:((s-start)*dir+perimeter)%perimeter,s})).filter(c=>c.advance>1e-7&&c.advance<travel-1e-7).sort((a,b)=>a.advance-b.advance);
  let path=[from,projection,...corners.map(c=>point(c.s)),gate,to];
  if(obs.length){const clear=(p,rad,others)=>!(Math.abs(p.x)<5+rad&&Math.abs(p.z)<2.4+rad)&&spaClear(p,rad,others);const start=clear(from,r,obs)&&Math.abs(from.x)<19&&Math.abs(from.z)<19?from:projection;const found=spaPath(start,to,r,obs,clear,{extent:40,cell:.5});if(found)path=start===from?[from,...found]:[from,projection,...found];}
  const result={path,length:pathLength(path)};if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
 }
 return {frame(a,b,u){const p=plan(a,b),f=pathFrame(p.path,p.length*clamp(u));return [f.x,f.y,f.z];},yaw(a,b,u){const p=plan(a,b);return pathFrame(p.path,p.length*clamp(u)).yaw;},duration(a,b){return Math.max(900,plan(a,b).length/4.5*1000);},clear:()=>cache.clear()};
}
