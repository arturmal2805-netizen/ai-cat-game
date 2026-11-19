import {smoothPalaceNormals} from './resort-spa-palace-normals.js';
import * as T from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {SPA_PALACE as P,SPA_V7_ROOMS,SPA_PALACE_STAIRS,SPA_PALACE_APPROACH,spaPalaceOutline,spaPalaceRoofY,spaPalacePools,spaRoomMeasurement} from './resort-spa-layout-v7.js';
import {corridorOutline,clipPressureWall} from './resort-spa-corridors.js';

// One connected pressure envelope and three real continuous slabs. This is
// architecture, not a collection of pavilion floors under a decorative roof.
export function* resortPalaceStructureSteps({solid,shell,decor,surfaces,mats,geometry,mesh,box,pool,setLevel}){
 const outline=spaPalaceOutline(),pools=spaPalacePools(),zones=new Map(),floors=[];
 const path=points=>{const s=new T.Shape();points.forEach((p,i)=>i?s.lineTo(p.x,-p.z):s.moveTo(p.x,-p.z));s.closePath();return s;};
 const roomOutline=z=>{const r=z.corner,points=[];for(let c=0;c<4;c++){const a=c*Math.PI/2,cx=z.x+(c===0||c===3?1:-1)*(z.rx-r),cz=z.z+(c<2?1:-1)*(z.rz-r);for(let i=0;i<=16;i++){const t=a+i*Math.PI/32;points.push({x:cx+Math.cos(t)*r,z:cz+Math.sin(t)*r});}}return points;};
 const holeCircle=(s,x,z,rx,rz)=>{const p=new T.Path();p.absellipse(x,-z,rx,rz,0,Math.PI*2,true);s.holes.push(p);};
 const nightFloors=new Map();
 for(const z of SPA_V7_ROOMS){const g=new T.Group();g.name=z.name;g.userData.resortZone=z.id;g.userData.roomBounds={x:z.x,z:z.z,width:z.rx*2,depth:z.rz*2,minimumCeiling:z.ceilingMinimum};zones.set(z.id,g);}
 for(let level=0;level<P.levels;level++){
  setLevel(level);const shape=path(outline),y=level*P.rise;
  if(level===1){holeCircle(shape,0,203,20,20);holeCircle(shape,0,266,49,22);}
  for(const p of pools.filter(p=>p.level===level&&(level!==2||p.sky)))holeCircle(shape,p.x,p.z,p.rx+1,p.rz+1);
  if(level===2)for(const z of SPA_V7_ROOMS.filter(z=>['midnight','vip'].includes(z.key)))shape.holes.push(path(roomOutline(z)));
  if(level){const stair=SPA_PALACE_STAIRS[level-1],s=new T.Path();s.moveTo(stair.x-3.5,-185);s.lineTo(stair.x+3.5,-185);s.lineTo(stair.x+3.5,-231.5);s.lineTo(stair.x-3.5,-231.5);s.closePath();shape.holes.push(s);}
  const slab=geometry('palace-slab-'+level,()=>{const g=new T.ExtrudeGeometry(shape,{depth:.4,bevelEnabled:false,curveSegments:96});g.rotateX(-Math.PI/2);g.translate(0,-.4,0);return g;});
  const floor=mesh(surfaces,slab,mats.ivory,0,y,0);floor.name='SPA continuous sealed floor '+level;floors.push(floor);
  // The approved night finishes cover the actual enlarged hall; the common
  // slab remains beneath them, including their real circulation space.
  if(level===2)for(const key of ['midnight','vip']){
   const z=SPA_V7_ROOMS.find(z=>z.key===key),s=path(roomOutline(z));for(const p of pools.filter(p=>p.room===z.id))holeCircle(s,p.x,p.z,p.rx+1,p.rz+1);
   const g=geometry('palace-protected-night-floor-'+key,()=>{const g=new T.ExtrudeGeometry(s,{depth:.4,bevelEnabled:false,curveSegments:96});g.rotateX(-Math.PI/2);g.translate(0,-.4,0);return g;});
   const m=mats.ivory.clone();m.color.setHex(key==='midnight'?0x293e57:0x504455);m.roughness=.24;m.metalness=.035;nightFloors.set(key,m);
   mesh(surfaces,g,m,0,y,0).name='SPA preserved '+key+' polished stone';
  }
  yield;
 }
 // A single exterior skin; only the real lower access tunnel cuts its door.
 const access=corridorOutline(SPA_PALACE_APPROACH).outline;
 for(let level=0;level<3;level++){
  setLevel(level);const low=level*P.rise,high=level===2?2*P.rise+P.roofClearance:(level+1)*P.rise;
  for(let i=0;i<outline.length;i++){
   const a=outline[i],b=outline[(i+1)%outline.length];
   const parts=level===0?clipPressureWall(a,b,[access]):[[a,b]];
   const bottomHigh=level===0?4:high;
   for(const [p,q] of parts){const length=Math.hypot(q.x-p.x,q.z-p.z);if(length<1e-5)continue;const wall=box(solid,mats.glass,(p.x+q.x)/2,(low+bottomHigh)/2,(p.z+q.z)/2,length+.01,bottomHigh-low,.09);wall.rotation.y=Math.atan2(-(q.z-p.z),q.x-p.x);wall.name='SPA continuous pressure façade';}
   // The narrow door cut is floor-height only: retain the sealed glass above.
   if(level===0){const wall=box(solid,mats.glass,(a.x+b.x)/2,(4+high)/2,(a.z+b.z)/2,Math.hypot(b.x-a.x,b.z-a.z)+.01,high-4,.09);wall.rotation.y=Math.atan2(-(b.z-a.z),b.x-a.x);}
   if(i%4===0){const post=box(solid,mats.gold,a.x,(low+high)/2,a.z,.17,high-low,.17);post.name='SPA shared façade mullion';}
   const band=box(decor,mats.gold,(a.x+b.x)/2,low-.18,(a.z+b.z)/2,Math.hypot(b.x-a.x,b.z-a.z)+.02,.35,.4);band.rotation.y=Math.atan2(-(b.z-a.z),b.x-a.x);
   if(i%24===0)yield;
  }
 }
 setLevel(1);
 const serviceShape=path(outline);holeCircle(serviceShape,0,203,19,19);const stair=SPA_PALACE_STAIRS[1],opening=new T.Path();opening.moveTo(stair.x-3.5,-185);opening.lineTo(stair.x+3.5,-185);opening.lineTo(stair.x+3.5,-231.5);opening.lineTo(stair.x-3.5,-231.5);opening.closePath();serviceShape.holes.push(opening);
 const serviceGeometry=geometry('palace-upper-service-ceiling',()=>new T.ShapeGeometry(serviceShape,96).rotateX(-Math.PI/2));
 const serviceMaterial=mats.ivory.clone();serviceMaterial.side=T.DoubleSide;nightFloors.set('service-ceiling',serviceMaterial);mesh(shell,serviceGeometry,serviceMaterial,0,2*P.rise-2,0).name='SPA continuous middle service ceiling';
 setLevel(2);
 const roofGeometry=geometry('palace-connected-pressure-roof',()=>{
  let g=new T.ShapeGeometry(path(outline),72);g.rotateX(-Math.PI/2);const source=g;g=new TessellateModifier(6,9).modify(g);source.dispose();
  const a=g.attributes.position;for(let i=0;i<a.count;i++)a.setY(i,spaPalaceRoofY(a.getX(i),a.getZ(i)));a.needsUpdate=true;smoothPalaceNormals(g,spaPalaceRoofY);return g;
 });
 const roof=mesh(shell,roofGeometry,mats.glass,0,0,0);roof.name='SPA one continuous fused glass roof';
 // The same structural stair dimensions drive geometry and the later runtime.
 for(const stair of SPA_PALACE_STAIRS){setLevel(stair.level);const base=stair.level*P.rise;for(let i=0;i<stair.count;i++){const h=(i+1)*stair.rise;box(solid,mats.ivory,stair.x,base+h/2,stair.z+i*stair.run,stair.width,h,stair.run+.02);}box(solid,mats.ivory,stair.x,base+P.rise-.2,232.2,stair.width,.4,3.4);yield;}
 // Real supports leave the existing wet café contacts and stair lanes free.
 for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*31,z=203+Math.sin(a)*31;setLevel(0);box(solid,mats.gold,x,P.rise,z,.44,2*P.rise,.44);setLevel(2);const spoke=box(shell,mats.gold,x*.8,2*P.rise-.3,203+(z-203)*.8,.2,.3,12);spoke.rotation.y=Math.atan2(x,z-203);}
 for(const p of pools){setLevel(p.level);const b=pool(p.x,p.y-P.baseY,p.z,p.rx,p.rz,p.sky?SPA_V7_ROOMS.length:Math.max(0,SPA_V7_ROOMS.findIndex(z=>z.id===p.room)),{sky:!!p.sky});b.name='SPA '+p.id+' basin';b.userData.palacePool=p;b.traverse(o=>{if(o.isMesh)o.userData.resortFloor=p.level;});yield;}
 return{version:7,zones,outline,floors,roof,nightFloors,report:{floorCount:3,connectedEnvelope:true,independentRoomPlatforms:0,rooms:SPA_V7_ROOMS,minimumCeiling:P.ceilingMinimum,midnight:spaRoomMeasurement('midnight'),vip:spaRoomMeasurement('vip'),pools:pools.length},dispose(){for(const m of nightFloors.values())m.dispose();}};
}
