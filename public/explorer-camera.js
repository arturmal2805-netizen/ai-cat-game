import * as T from 'three';
import {MALL_AIRLOCK} from './mall-airlock-data.js';
import {MALL_LAYOUT as L,mallFloorOutline,mallUpperFloorOutline,mallBuildingFootprintDistance} from './mall-layout.js';
import {mallCameraRayClear} from './mall-guest-camera.js';
import {expansionBedY as mosaBedY} from './mosasaur-expansion.js';
import {oceanWaterContains} from './ocean-water-domain.js';
import {mosaTerrainObstacles} from './mosasaur-collision.js';
import {mosaActiveReefClearance as mosaReefClearance} from './mosasaur-reef-data.js';
import {mallPressureContact} from './mall-pressure.js';
import {pushCapsule} from './submarine-physics.js';

export const EXPLORER_VIEW=Object.freeze({distance:6,pitch:.18,radius:.22,targetHeight:1.1});
const terrain=mosaTerrainObstacles();let outlines;
function floorContains(p,floor,radius){
 outlines??=[mallFloorOutline(),mallUpperFloorOutline()];const polygon=outlines[floor===1?0:1];let inside=false,min=Infinity;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j],dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
  min=Math.min(min,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz));
  if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }
 return (inside||min<radius)&&Math.hypot(p.x-L.lift.x,p.z-L.lift.z)>L.lift.radius-radius;
}
function inShell(p,radius){
 if(mallBuildingFootprintDistance(p.x,p.z)<-radius)return true;
 for(const v of L.pavilions){const y=L.y+(v.floor-1)*L.rise;if(p.y<y||p.y>y+7.5)continue;if(Math.hypot(p.x-v.x,p.z-v.z)<v.radius-radius)return true;const a=v.connection,dx=v.x-a.x,dz=v.z-a.z,n=Math.hypot(dx,dz),mx=(v.x+a.x)/2,mz=(v.z+a.z)/2;if(Math.abs(((p.x-mx)*dx+(p.z-mz)*dz)/n)<n/2&&Math.abs((-(p.x-mx)*dz+(p.z-mz)*dx)/n)<4-radius)return true;}
 return false;
}
// Coordinates are ocean-local. Camera radius is independent of the untouched
// character capsule. Furniture uses original measured per-object OBBs; floor
// apertures use the real slab polygons, never a merged floor bounding box.
export function mallExplorerCameraClear(a,b,obstacles,radius=EXPLORER_VIEW.radius,surfaces=null,highBoxes=null){
 for(const [floor,boxes]of obstacles){const y=L.y+(floor-1)*L.rise;
  const localA={x:a.x,y:a.y-y,z:a.z-L.z},localB={x:b.x,y:b.y-y,z:b.z-L.z};
  if(!mallCameraRayClear(localA,localB,boxes,radius)||highBoxes?.get(floor)&&!mallCameraRayClear(localA,localB,highBoxes.get(floor),radius))return false;
 }
 const dy=b.y-a.y;
 if(surfaces&&!mallCameraSurfacesClear(a,b,surfaces,radius))return false;
 if(!surfaces)for(let floor=1;floor<=7;floor++){
  const y=L.y+(floor-1)*L.rise,lo=y-.48-radius,hi=y+radius;
  if(Math.max(a.y,b.y)<lo||Math.min(a.y,b.y)>hi)continue;
  let t0=0,t1=1;if(Math.abs(dy)>1e-9){t0=Math.max(0,Math.min((lo-a.y)/dy,(hi-a.y)/dy));t1=Math.min(1,Math.max((lo-a.y)/dy,(hi-a.y)/dy));}
  for(let t=t0;t<=t1+1e-7;t+=Math.max(.01,(t1-t0)/6))if(floorContains({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},floor,radius))return false;
 }
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.15));
 for(let i=0;i<=steps;i++){const t=i/steps,p={x:a.x+(b.x-a.x)*t,y:a.y+dy*t,z:a.z+(b.z-a.z)*t};if(Math.abs(Math.abs(p.x)-18.4)<1.65+radius&&p.z>=L.z-13.5-radius&&p.z<=L.z+13.5+radius){for(let f=1;f<7;f++){const y=L.y+(f-1)*L.rise+.18+T.MathUtils.clamp((p.z-L.z+13.5)/27,0,1)*L.rise;if(p.y>y-.15-radius&&p.y<y+radius)return false;}}
  const lock=MALL_AIRLOCK;
  if(Math.abs(p.x-lock.x)<lock.w/2+radius&&p.z>lock.z-lock.d/2-radius&&p.z<lock.z+lock.d/2+radius&&p.y>lock.y-radius&&p.y<lock.y+lock.h+radius)return false;
  if(Math.abs(Math.hypot(p.x-L.lift.x,p.z-L.lift.z)-L.lift.radius)<radius+.12&&p.y>L.y-.3&&p.y<.5)return false;
  if(!inShell(p,radius)||p.y<L.y+radius||p.y>L.y+6*L.rise+7.5-radius)return false;}
 return true;
}

const surfaceCache=new WeakMap(),surfaceMaterial=new T.MeshBasicMaterial({side:T.DoubleSide}),surfaceRay=new T.Raycaster(),surfaceDirection=new T.Vector3(),surfaceOrigin=new T.Vector3();
function mallCameraSurfacesClear(a,b,records,radius){
 let entries=surfaceCache.get(records);
 if(!entries){entries=records.map(record=>{const mesh=new T.Mesh(record.geometry,surfaceMaterial);mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(record.matrix);if(!record.geometry.boundingBox)record.geometry.computeBoundingBox();return {mesh,box:record.geometry.boundingBox.clone().applyMatrix4(record.matrix).expandByScalar(radius)};});surfaceCache.set(records,entries);}
 surfaceDirection.subVectors(b,a);const length=surfaceDirection.length();if(length<1e-8)return true;surfaceDirection.multiplyScalar(1/length);surfaceRay.near=0;surfaceRay.far=length;
 for(const {mesh,box}of entries){surfaceRay.ray.set(a,surfaceDirection);if(!surfaceRay.ray.intersectsBox(box))continue;
  // These authored walking slabs/landings are horizontal. Three parallel rays
  // retain the true shaft/atrium holes while clearing the camera's vertical cap.
  for(const offset of [-radius,0,radius]){surfaceOrigin.copy(a);surfaceOrigin.y+=offset;surfaceRay.ray.set(surfaceOrigin,surfaceDirection);if(surfaceRay.intersectObject(mesh,false).length)return false;}
 }
 return true;
}

export function oceanExplorerCameraPointClear(p,radius=EXPLORER_VIEW.radius){
 if(!oceanWaterContains(p.x,p.z,1)||p.y-radius<mosaBedY(p.x,p.z)||mosaReefClearance(p.x,p.y,p.z)<radius||mallPressureContact(p.x,p.y,p.z,radius))return false;
 for(const obstacle of terrain)if(pushCapsule({...p},obstacle,radius))return false;
 return true;
}
export function oceanExplorerCameraSegmentClear(a,b){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.12));
 for(let i=0;i<=n;i++){const t=i/n;if(!oceanExplorerCameraPointClear({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t}))return false;}
 return true;
}
export function traceExplorerCamera(target,desired,clear,out=new T.Vector3(),p=new T.Vector3()){
 const end=out===desired?desired.clone():desired;
 if(clear(target,end))return out.copy(end);
 let lo=0,hi=1;for(let i=0;i<12;i++){const t=(lo+hi)/2;p.lerpVectors(target,end,t);if(clear(target,p))lo=t;else hi=t;}
 return out.lerpVectors(target,end,Math.max(0,lo-.0005));
}
// Retain private camera state: the ordinary world orbit runs before this view.
// Follow a stable carrier anchor, not the breathing/gait/head animation.
export function createExplorerCameraFollower(camera,look){
 const position=new T.Vector3(),target=new T.Vector3(),previous=new T.Vector3(),desired=new T.Vector3(),safe=new T.Vector3(),delta=new T.Vector3(),tracePoint=new T.Vector3();let active=false,heading;
 return {get heading(){return active?heading:undefined;},reset(){active=false;heading=undefined;},update(dt,anchor,yaw,pitch,distance,clear){
  desired.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance).add(anchor);
  traceExplorerCamera(anchor,desired,clear,safe,tracePoint);
  if(!active){position.copy(safe);target.copy(anchor);previous.copy(anchor);active=true;}
  else{delta.subVectors(anchor,previous);position.add(delta);target.add(delta);previous.copy(anchor);position.lerp(safe,1-Math.exp(-Math.max(0,dt)*8));target.lerp(anchor,1-Math.exp(-Math.max(0,dt)*10));traceExplorerCamera(anchor,position,clear,safe,tracePoint);position.copy(safe);}
  camera.position.copy(position);look.copy(target);camera.up.set(0,1,0);camera.lookAt(look);heading=Math.atan2(target.x-position.x,target.z-position.z);
  return position.distanceTo(anchor);
 }};
}
