import * as T from 'three';
import {MOSA_REEF_INSTANCES} from './mosasaur-reef-data.js';
import {MOSA_BENTHIC_ROCKS} from './mosasaur-benthic-data.js';
import {mosaReefTemplateSteps,mosaReefLods} from './mosasaur-reef-sculpt.js';
import {applyMosasaurBedOptics} from './mosasaur-bed-optics.js';
import {applyUnderwaterLighting} from './water-shading.js';
import {waterSandTexture} from './water-sand.js';
import {MOSA_SEA} from './mosasaur-data.js';
export function* mosaRockReefSteps({spatialBenthic=true}={}){
 const root=new T.Group(),clock={value:0},variants=new Map(),material=applyMosasaurBedOptics(applyUnderwaterLighting(new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,map:waterSandTexture(),roughness:.88}),clock,0x45c7db,{level:{value:MOSA_SEA.surfaceY}}),{stoneNormals:true,reefRock:true});root.name='Continuous eroded reef cliffs, overhangs and navigable grottoes';
 for(const c of MOSA_REEF_INSTANCES){
  yield;const g=yield* mosaReefTemplateSteps(c.kind);if(!variants.has(c.kind))variants.set(c.kind,mosaReefLods(c.kind,g));
  const lod=new T.LOD();lod.position.set(c.x,c.base+20*c.scaleY,c.z);lod.rotation.y=c.yaw;lod.scale.set(c.scaleXZ,c.scaleY,c.scaleXZ);root.add(lod);
  for(const [i,distance]of [0,90,220].entries()){const mesh=new T.Mesh(variants.get(c.kind)[i],material);mesh.position.y=-20;mesh.castShadow=mesh.receiveShadow=true;lod.addLevel(mesh,distance,.08);}
 }
 // Immutable garden batches reuse the very same three rock vertex buffers.
 // Distant surface views select their own deep-floor LOD, independently of
 // the tall upper cliffs; no per-frame matrix changes or extra texture set.
 const center=new T.Vector3(0,-188,178),dummy=new T.Object3D();
 const sortingSpheres=new Map(),farBatches=[],gardens=new T.Group();
 if(spatialBenthic)root.add(gardens);
 if(spatialBenthic)for(const kind of [0,1,2]){
  yield;const own=MOSA_BENTHIC_ROCKS.filter(p=>p.kind===kind),source=new T.InstancedMesh(variants.get(kind)[0],material,own.length);
  for(const [i,c]of own.entries()){dummy.position.set(c.x-center.x,c.base-center.y,c.z-center.z);dummy.rotation.set(0,c.yaw,0);dummy.scale.set(c.scaleXZ,c.scaleY,c.scaleXZ);dummy.updateMatrix();source.setMatrixAt(i,dummy.matrix);}
  source.computeBoundingSphere();sortingSpheres.set(kind,source.boundingSphere.clone());
  source.geometry=variants.get(kind)[2];source.position.copy(center);source.instanceMatrix.needsUpdate=true;source.castShadow=source.receiveShadow=true;farBatches.push(source);
 }
 for(let garden=0;garden<(spatialBenthic?16:1);garden++)for(const kind of [0,1,2]){
  yield;const own=MOSA_BENTHIC_ROCKS.filter((p,i)=>p.kind===kind&&(!spatialBenthic||Math.floor(i/4)===garden));
  if(!own.length)continue;
  // Select detail at the real garden, not the empty central passage. Keep the
  // original Float32 instance rows and geometry origin exactly; the mesh's
  // counter-translation cancels the LOD anchor before native rendering.
  const anchor=spatialBenthic?own.reduce((v,p)=>v.add(new T.Vector3(p.x,p.base+20*p.scaleY,p.z)),new T.Vector3()).multiplyScalar(1/own.length):center;
  const lod=new T.LOD();lod.position.copy(anchor);lod.userData.benthicRockIds=own.map(p=>p.id);(spatialBenthic?gardens:root).add(lod);let full;
  for(const [level,distance]of [0,55,130].entries()){
   const mesh=new T.InstancedMesh(variants.get(kind)[level],material,own.length);mesh.name='Eroded benthic rocks';
   mesh.position.copy(center).sub(anchor);mesh.userData.benthicRockIds=lod.userData.benthicRockIds;
   if(!level){for(const [i,c]of own.entries()){dummy.position.set(c.x-center.x,c.base-center.y,c.z-center.z);dummy.rotation.set(0,c.yaw,0);dummy.scale.set(c.scaleXZ,c.scaleY,c.scaleXZ);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;full=mesh;}
   else mesh.instanceMatrix=full.instanceMatrix;
   mesh.computeBoundingSphere();
   // Three also uses this sphere for native opaque depth sorting. Retain the
   // former whole-kind sphere/order at intersecting surfaces. LOD selection
   // still uses the real garden anchor; shadow casters are never colour-culled.
   if(spatialBenthic)mesh.boundingSphere.copy(sortingSpheres.get(kind));
   mesh.castShadow=mesh.receiveShadow=true;lod.addLevel(mesh,distance,.08);
  }
 }
 if(spatialBenthic){
  root.remove(gardens);const selector=new T.LOD(),far=new T.Group(),cameraPoint=new T.Vector3(),anchor=new T.Vector3();let current=0;
  far.add(...farBatches);selector.userData.benthicFarSelector=true;selector.addLevel(gardens,0);selector.addLevel(far,130,.08);far.visible=false;root.add(selector);
  selector.getCurrentLevel=()=>current;
  selector.update=function(camera){
   cameraPoint.setFromMatrixPosition(camera.matrixWorld);let nearest=Infinity;
   for(const lod of gardens.children)nearest=Math.min(nearest,cameraPoint.distanceTo(anchor.copy(lod.position).applyMatrix4(this.matrixWorld)));
   // Native LOD selection/hysteresis, measured at the closest real garden.
   // When every garden is far, retain the original three combined submissions.
   const visible=this.getObjectForDistance(nearest/camera.zoom);current=visible===far?1:0;gardens.visible=visible===gardens;far.visible=visible===far;
  };
 }
 root.userData.instances=MOSA_REEF_INSTANCES;root.userData.benthicRocks=MOSA_BENTHIC_ROCKS;root.userData.update=(time,reduced=false)=>{clock.value=reduced?0:time;};return root;
}
