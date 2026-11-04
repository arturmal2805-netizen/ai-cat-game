import * as T from 'three';

// Construction-only clearance for the open landing gate. Keep the boat, seats
// and return path where they are; fences must not pass through a moored hull.
export function showcaseMooring(spec,route){
 const unload=route.legs.find(l=>l.phase==='unload');
 if(!unload)return null;
 return {position:new T.Vector3(...unload.fn(1).position),radius:spec.kind==='canyon-rafting'?6.8:spec.kind==='barrel-wave'?3.6:5.6};
}
export function dockFenceBlocked(p,mooring,padding=.25){
 return !!mooring&&Math.abs(p.y-mooring.position.y-1.5)<3.5&&Math.hypot(p.x-mooring.position.x,p.z-mooring.position.z)<mooring.radius+padding;
}
export function dockFenceRuns(points,mooring){
 if(!mooring)return {runs:[points],ends:[]};
 const curve=new T.CatmullRomCurve3(points),samples=Array.from({length:97},(_,i)=>curve.getPoint(i/96));
 if(!samples.some(p=>dockFenceBlocked(p,mooring)))return {runs:[points],ends:[]};
 const runs=[];let run=[];
 for(const p of samples){if(dockFenceBlocked(p,mooring)){if(run.length>1)runs.push(run);run=[];}else run.push(p);}
 if(run.length>1)runs.push(run);
 const ends=runs.flatMap(r=>[r[0],r.at(-1)]).filter(p=>p.distanceTo(points[0])>.001&&p.distanceTo(points.at(-1))>.001);
 return {runs,ends};
}
