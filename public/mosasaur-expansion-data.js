import {BIOMES} from './game-data.js';
// V12: geography only. Released centres, building coordinates and save IDs stay put.
export const MOSA_EXPANSION=Object.freeze({version:12,x:1250,z:450,rx:1850,rz:750,shoreWidth:30,bedY:-199.845});
export const WAREHOUSE=Object.freeze({id:'chichi-warehouse',x:2200,z:450,y:-177,width:1200,depth:240,wallHeight:30,roofHeight:108,platformWidth:1320,platformDepth:296,heightScale:2.5,exteriorOnly:true});
const TAU=Math.PI*2;
export function expansionRayRadius(dx,dz){
 const {x,z,rx,rz}=MOSA_EXPANSION,a=(dx/rx)**2+(dz/rz)**2,b=-2*(dx*x/rx**2+dz*z/rz**2),c=(x/rx)**2+(z/rz)**2-1;
 return(-b+Math.sqrt(Math.max(0,b*b-4*a*c)))/(2*a);
}
// One enclosing outline removes the old small basin's neck. Nearby original
// islands remain protected; the north bank bends gently around their clearance.
let outlineCache;
function unifiedOutline(sea,coastFactor){
 const key=sea.rx+':'+sea.rz;if(outlineCache?.key===key)return outlineCache.radii;
 const points=[];
 for(let i=0;i<1024;i++){const a=i*TAU/1024,f=coastFactor(a),x=Math.cos(a)*sea.rx*f,z=Math.sin(a)*sea.rz*f,r=Math.hypot(x,z),dx=x/r,dz=z/r,candidate=expansionRayRadius(dx,dz)*(1+.009*Math.sin(a*9)+.006*Math.cos(a*17)),radius=Math.max(r,candidate);points.push({x:dx*radius,z:dz*radius});}
 points.sort((a,b)=>a.x-b.x||a.z-b.z);const cross=(o,a,b)=>(a.x-o.x)*(b.z-o.z)-(a.z-o.z)*(b.x-o.x),hull=[];
 for(const p of points){while(hull.length>1&&cross(hull.at(-2),hull.at(-1),p)<=0)hull.pop();hull.push(p);}const lower=hull.length;
 for(let i=points.length-2;i>=0;i--){const p=points[i];while(hull.length>lower&&cross(hull.at(-2),hull.at(-1),p)<=0)hull.pop();hull.push(p);}hull.pop();
 const center=BIOMES.find(b=>b.id==='autumn').center,others=BIOMES.filter(b=>b.id!=='autumn'),contour=[];
 for(let i=0;i<hull.length;i++){
  const a=hull[i],b=hull[(i+1)%hull.length],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/8));
  for(let j=0;j<steps;j++){const t=j/steps,x=a.x+(b.x-a.x)*t;let z=a.z+(b.z-a.z)*t;
   for(const neighbour of others){const radius=(neighbour.radius||11.65)+38,dx=x+center[0]-neighbour.center[0];if(Math.abs(dx)>=radius)continue;const limit=neighbour.center[1]+Math.sqrt(radius*radius-dx*dx)-center[1];if(z<limit)z=limit;}
   contour.push({x,z});
  }
 }
 const count=4096,radii=new Float64Array(count).fill(Infinity),normal=a=>(a+TAU)%TAU;
 for(let i=0;i<contour.length;i++){
  const a=contour[i],b=contour[(i+1)%contour.length];let from=normal(Math.atan2(a.z/sea.rz,a.x/sea.rx)),to=normal(Math.atan2(b.z/sea.rz,b.x/sea.rx));let delta=(to-from+TAU)%TAU;if(delta>Math.PI){const swap=from;from=to;to=swap;delta=TAU-delta;}
  for(let k=Math.ceil(from*count/TAU);k<=Math.floor((from+delta)*count/TAU);k++){const theta=k*TAU/count,dx=Math.cos(theta)*sea.rx,dz=Math.sin(theta)*sea.rz,ex=b.x-a.x,ez=b.z-a.z,det=dx*ez-dz*ex;if(Math.abs(det)<1e-9)continue;const t=(a.x*ez-a.z*ex)/det;if(t>0)radii[k%count]=Math.min(radii[k%count],t*Math.hypot(dx,dz));}
 }
 for(let i=0;i<count;i++)if(!Number.isFinite(radii[i]))throw Error('Unified lagoon outline has an open ray at '+i);
 outlineCache={key,radii};return radii;
}
export function expandedCoastPoint(a,sea,coastFactor,margin=0){
 const radii=unifiedOutline(sea,coastFactor),v=((a%TAU)+TAU)%TAU/TAU*radii.length,i=Math.floor(v),t=v-i,dx=Math.cos(a)*sea.rx,dz=Math.sin(a)*sea.rz,r=Math.hypot(dx,dz),old=r*coastFactor(a),radius=Math.max(old,radii[i]*(1-t)+radii[(i+1)%radii.length]*t)+margin;return{x:dx/r*radius,z:dz/r*radius};
}
export function expandedWaterContains(x,z,sea,coastFactor,margin=0){
 const a=Math.atan2(z/sea.rz,x/sea.rx),p=expandedCoastPoint(a,sea,coastFactor,-margin);return Math.hypot(x,z)<=Math.hypot(p.x,p.z);
}
export function expandedCoastSamples(sea,coastFactor,margin=0,count=384){return Array.from({length:count+1},(_,i)=>expandedCoastPoint(i*TAU/count,sea,coastFactor,margin));}
export function expandedOverview(){return{center:[1250,-55,400],radius:1980};}
export function warehousePlanBounds(){return{min:[WAREHOUSE.x-WAREHOUSE.platformWidth/2-.8*WAREHOUSE.width/480,WAREHOUSE.y+.86-2.36*(WAREHOUSE.heightScale||1)-.1,WAREHOUSE.z-WAREHOUSE.platformDepth/2-.8],max:[WAREHOUSE.x+WAREHOUSE.platformWidth/2+.8*WAREHOUSE.width/480,WAREHOUSE.y+WAREHOUSE.wallHeight+WAREHOUSE.roofHeight+1,WAREHOUSE.z+WAREHOUSE.platformDepth/2+.8]};}

export const WAREHOUSE_REEFS=Object.freeze([[680,620],[850,90],[1110,100],[1420,260],[1400,550],[1150,640],[580,400],[1540,430]].map(([x,z],i)=>{
 const px=WAREHOUSE.x+(x-1150)*1.5,radius=64+i%3*8;let pz=WAREHOUSE.z+(z-350)*1.5;
 // Keep the existing eight garden IDs/counts, clearing only pockets covered by
 // the explicitly enlarged footprint, including their peripheral coral roots.
 const dx=Math.max(0,Math.abs(px-WAREHOUSE.x)-WAREHOUSE.platformWidth/2),dz=Math.max(0,Math.abs(pz-WAREHOUSE.z)-WAREHOUSE.platformDepth/2),clearance=radius+70;
 if(Math.hypot(dx,dz)<clearance)pz=WAREHOUSE.z+Math.sign(pz-WAREHOUSE.z||1)*(WAREHOUSE.platformDepth/2+clearance+12);
 return Object.freeze({x:px,z:pz,radius,top:-72-i%4*11});
}));
