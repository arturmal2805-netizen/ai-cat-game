import * as T from 'three';
import {RESORT_ZONES,RESORT_SPA as L} from './resort-spa-data.js';
import {createMallRoomLights,mallRoomLightMaterial} from './mall-room-light.js';
import {batchModelSteps} from './model-batching.js';
import {registerPositionPreservingShader} from './static-submissions.js';
// The resort's sealed interiors exclude most exterior daylight. Attenuate only
// their own incident light; preserve emissive fixtures, local lamps and probes.
export function resortInteriorLighting(material,lights){
 mallRoomLightMaterial(material,lights,.8);const before=material.onBeforeCompile,previousKey=material.customProgramCacheKey,key=previousKey.call(material);
 material.onBeforeCompile=function(shader,...args){before.call(this,shader,...args);shader.fragmentShader=shader.fragmentShader.replace('outgoingLight+=vMallLampColor.rgb','outgoingLight=(outgoingLight-totalEmissiveRadiance)*.32+totalEmissiveRadiance;\n      outgoingLight+=vMallLampColor.rgb').replace('diffuseColor.rgb*(.18+lampFalloff*.88*lampDiffuse)','diffuseColor.rgb*(.035+lampFalloff*.88*lampDiffuse)');};
 material.customProgramCacheKey=()=>key+'-spa-sealed-interior-v1';registerPositionPreservingShader(material,before,previousKey);material.needsUpdate=true;
}
// Existing immutable bounded room-lamp table, not extra scene PointLights.
// Stamp before merging; full-detail native source remains the physics target.
export function* finishResortSpaSteps(root){
 const lights=createMallRoomLights(),ids=new Map(),waterIds=new Map();
 for(const z of RESORT_ZONES){const lamps=[-.55,0,.55].map(offset=>{const x=z.x+z.rx*offset,id=lights.register(x,z.z,z.key==='midnight'?0xb7caff:0xffc383);lights.texture.image.data[id*4+1]=z.level*L.rise+5.5;return{id,x,z:z.z};}),water=lights.register(z.x,z.z,0x62dce8);ids.set(z.id,lamps);waterIds.set(z.id,water);lights.texture.image.data[water*4+1]=z.level*L.rise+1.3;lights.texture.image.data[water*4+3]=Math.max(z.rx,z.rz)*1.6;lights.texture.image.data[(64+water)*4+3]=.8;}
 const sources=[];root.updateWorldMatrix(true,true);root.traverse(o=>{if(o.isMesh)sources.push(o);});const p=new T.Vector3();
 for(const mesh of sources){
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();mesh.geometry.boundingBox.getCenter(p).applyMatrix4(mesh.matrixWorld);
  const authored=mesh.userData.resortFloor,choices=Number.isInteger(authored)?RESORT_ZONES.filter(z=>z.level===authored):RESORT_ZONES,z=choices.reduce((best,z)=>{const d=Math.hypot(p.x-z.x,p.z-z.z)+Math.abs(p.y-z.y)*3;return !best||d<best.d?{z,d}:best;},null).z;
  const lamp=ids.get(z.id).reduce((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)<Math.hypot(p.x-b.x,p.z-b.z)?a:b);mesh.userData.resortFloor=Number.isInteger(authored)?authored:z.level;yield* lights.stamp(mesh,mesh.userData.resortWaterLiner?waterIds.get(z.id):lamp.id);
 }
 lights.finish();const batch=new T.Group(),levels=new Map(),inverse=root.matrixWorld.clone().invert();
 for(let level=0;level<3;level++){
  const sourceGroup=new T.Group();for(const source of sources){if(source.userData.resortFloor!==level)continue;const clone=new T.Mesh(source.geometry,source.material);clone.castShadow=source.castShadow;clone.receiveShadow=source.receiveShadow;clone.matrixAutoUpdate=false;clone.matrix.multiplyMatrices(inverse,source.matrixWorld);sourceGroup.add(clone);}
  const rendered=yield* batchModelSteps(sourceGroup,{combineColors:false});levels.set(level,rendered);batch.add(rendered);
 }
 root.userData.inspectionLevels=levels;root.userData.setInspectionLevel=level=>{for(const [id,g]of levels)g.visible=level==null||id<=level;for(const [id,g]of root.userData.zones){const zone=RESORT_ZONES.find(z=>z.id===id);g.visible=level==null||zone.level<=level;}};
 const materials=new Set();batch.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial)materials.add(o.material);});for(const m of materials)resortInteriorLighting(m,lights);
 // Hidden source geometry is still queried directly for floor holes and body
 // collisions. Its authored detail and transforms are preserved exactly.
 for(const source of sources)source.visible=false;root.add(batch);
 const stamped=new Set(sources.map(o=>o.geometry));const previous=root.userData.dispose;root.userData.renderBatch=batch;root.userData.roomLightTexture=lights.texture;
 root.userData.dispose=()=>{const geometries=new Set();batch.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});for(const g of geometries)g.dispose();for(const g of stamped)g.dispose();lights.texture.dispose();previous?.();};
 return root;
}
