import {spaPath,spaClear} from './spa-navigation.js';
import {pathFrame,pathLength} from './jobcity-navigation.js';
// The approved A* and path sampler, cached only at visit start. Ordinary cats
// approach along the plot perimeter instead of cutting through its lagoon.
export function atollApproach(spec,obstacles=[]) {
  const cache=new Map(),hx=spec.footprint[0]/2+2,hz=spec.footprint[1]/2+2,
    perimeter=4*(hx+hz),width=2*hx,depth=2*hz;
  const point=s=>{s=(s%perimeter+perimeter)%perimeter;
    return s<width?{x:-hx+s,z:-hz,y:.16}:s<width+depth?{x:hx,z:-hz+s-width,y:.16}:
      s<width*2+depth?{x:hx-(s-width-depth),z:hz,y:.16}:{x:-hx,z:hz-(s-width*2-depth),y:.16};};
  const along=p=>Math.abs(p.z+hz)<1e-5?p.x+hx:Math.abs(p.x-hx)<1e-5?width+p.z+hz:
    Math.abs(p.z-hz)<1e-5?width+depth+hx-p.x:width*2+depth+hz-p.z;
  const clear=(p,r,obs)=>Math.abs(p.x)<=hx+.2&&Math.abs(p.z)<=hz+.2&&spaClear(p,r,obs)&&
    Math.hypot((p.x-spec.pool[0])/(spec.pool[2]+r),(p.z-spec.pool[1])/(spec.pool[3]+r))>=1;
  function plan(a,b){
    const key=a.join(',')+'>'+b.join(',');if(cache.has(key))return cache.get(key);
    const from={x:a[0],y:a[1],z:a[2]},to={x:b[0],y:b[1],z:b[2]};let path;
    if(Math.abs(from.x)<hx&&Math.abs(from.z)<hz)
      path=spaPath(from,to,2,obstacles,clear,{extent:48,cell:1.25});
    if(path)path.unshift(from);
    else{
      const projection={x:Math.max(-hx,Math.min(hx,from.x)),z:Math.max(-hz,Math.min(hz,from.z)),y:.16};
      if(Math.abs(projection.x)<hx&&Math.abs(projection.z)<hz){const candidates=[{x:-hx,z:from.z,y:.16},{x:hx,z:from.z,y:.16},{x:from.x,z:-hz,y:.16},{x:from.x,z:hz,y:.16}];candidates.sort((p,q)=>Math.hypot(p.x-from.x,p.z-from.z)-Math.hypot(q.x-from.x,q.z-from.z));Object.assign(projection,candidates[0]);}
      const gate={x:-hx,z:Math.max(-hz,Math.min(hz,to.z)),y:.16},start=along(projection),finish=along(gate),cw=(finish-start+perimeter)%perimeter,dir=cw<=perimeter/2?1:-1,travel=dir===1?cw:perimeter-cw;
      const corners=[0,width,width+depth,width*2+depth].map(s=>({advance:((s-start)*dir+perimeter)%perimeter,s})).filter(c=>c.advance>1e-7&&c.advance<travel-1e-7).sort((a,b)=>a.advance-b.advance);
      path=[from,projection,...corners.map(c=>point(c.s)),gate,to];
    }
    const result={path,length:pathLength(path)};if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
  }
  return {frame(a,b,u){const p=plan(a,b),f=pathFrame(p.path,p.length*Math.max(0,Math.min(1,u)));return[f.x,f.y,f.z];},
    yaw(a,b,u){const p=plan(a,b);return pathFrame(p.path,p.length*Math.max(0,Math.min(1,u))).yaw;},
    duration(a,b){return Math.max(900,plan(a,b).length/4.8*1000);},cacheSize:()=>cache.size};
}
