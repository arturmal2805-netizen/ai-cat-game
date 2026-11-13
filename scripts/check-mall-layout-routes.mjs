// Private CPU geometry/navigation proof. It checks actual fitted mesh bounds;
// it does not stand in for native touch, purchases, saves or device FPS.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createMallRebuildModel} from '../public/mall-rebuild-model.js';
import {mallRoomContacts,MALL_LAYOUT as L,mallPlanArea} from '../public/mall-layout.js';
import {mallNavigationV2Steps,mallWalkableV2,mallPathV2} from '../public/mall-navigation-v2.js';
let physicalFloorSamples=0;const floorMeshes=new Map(),ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0),0,.4);
function floorSupport(x,z,floor){ray.ray.origin.set(x,L.y+(floor-1)*L.rise+.12,z);physicalFloorSamples++;assert.ok(ray.intersectObjects(floorMeshes.get(floor),false).length,'A real floor/bridge mesh supports the path at '+JSON.stringify({x,z,floor}));}
function verify(path,radius,boxes){
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.1));
  for(let j=0;j<=steps;j++){const t=j/steps;assert.ok(mallWalkableV2({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t-L.z},radius,boxes),'segment clears measured furniture and floor edges');}
  const supports=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2));
  for(let j=0;j<=supports;j++){const t=j/supports,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;floorSupport(x,z,boxes.floor);}
 }
}
const root=createMallRebuildModel(),out=[];
const floorMaterial=new T.MeshBasicMaterial({side:T.DoubleSide}),physicalSurfaces=root.userData.walkSurfaces.map(s=>{const m=new T.Mesh(s.geometry,floorMaterial);m.matrixAutoUpdate=false;m.matrix.copy(s.matrix);m.updateMatrixWorld(true);return m;});
for(let floor=1;floor<=7;floor++){const y=L.y+(floor-1)*L.rise;floorMeshes.set(floor,physicalSurfaces.filter(m=>{if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const box=m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);return box.min.y<=y+.12&&box.max.y>=y-.28;}));}
if(process.env.CHICHI_ROUTE_FIXTURE)fs.writeFileSync(process.env.CHICHI_ROUTE_FIXTURE,JSON.stringify({stores:[...root.userData.stores.values()],floors:[...root.userData.obstacles].map(([floor,boxes])=>({floor,boxes}))}));
for(const floor of [1,2,3,4,5,6,7])for(const radius of [.45,.85,1.8]){
 const boxes=root.userData.obstacles.get(floor);for(const _ of mallNavigationV2Steps(boxes,radius)){}
 const from={x:L.lift.x-4.5,y:L.y+(floor-1)*L.rise+.18,z:L.lift.z-L.lift.landing};
 for(const s of [...root.userData.stores.values()].filter(s=>s.floor===floor)){
  const contacts=mallRoomContacts(s.kind,0,radius),map=p=>({x:s.x+Math.cos(s.placement.yaw)*p.x+Math.sin(s.placement.yaw)*p.z,y:s.y+p.y,z:s.z-Math.sin(s.placement.yaw)*p.x+Math.cos(s.placement.yaw)*p.z});
  const customer=map(contacts.customer),path=mallPathV2(floor,from,customer,radius,boxes);
  if(path)verify(path,radius,boxes);
  out.push({floor,radius,id:s.id,start:mallWalkableV2({x:from.x,z:from.z-L.z},radius,boxes),end:mallWalkableV2({x:customer.x,z:customer.z-L.z},radius,boxes),path:path?.length||0});
 }
 for(const p of L.pavilions.filter(p=>p.floor===floor)){
  const target={x:p.x,y:from.y,z:p.z},path=mallPathV2(floor,from,target,radius,boxes);
  if(path)verify(path,radius,boxes);
  out.push({floor,radius,id:p.id,start:mallWalkableV2({x:from.x,z:from.z-L.z},radius,boxes),end:mallWalkableV2({x:target.x,z:target.z-L.z},radius,boxes),path:path?.length||0});
 }
}
const result={area:mallPlanArea(),cases:out.length,blocked:out.filter(x=>!x.path),passed:out.filter(x=>x.path).length,physicalFloorSamples};
console.log(JSON.stringify(result,null,2));if(process.env.CHICHI_ROUTE_EVIDENCE)fs.writeFileSync(process.env.CHICHI_ROUTE_EVIDENCE,JSON.stringify(result,null,2));

assert.deepEqual(result.blocked,[],'All authored shop and pavilion routes must be usable at all three cat radii');
