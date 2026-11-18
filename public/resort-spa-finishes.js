import * as T from 'three';
import {RESORT_ZONES,RESORT_SPA as L} from './resort-spa-data.js';
import {createMallRoomLights,mallRoomLightMaterial} from './mall-room-light.js';
import {batchModelSteps} from './model-batching.js';
// Existing immutable bounded room-lamp table, not extra scene PointLights.
// Stamp before merging; full-detail native source remains the physics target.
export function* finishResortSpaSteps(root){
 const lights=createMallRoomLights(),ids=new Map();
 for(const z of RESORT_ZONES){const id=lights.register(z.x,z.z,z.key==='midnight'?0xb7caff:0xffc383);ids.set(z.id,id);lights.texture.image.data[id*4+1]=z.level*L.rise+5.5;}
 const sources=[];root.updateWorldMatrix(true,true);root.traverse(o=>{if(o.isMesh)sources.push(o);});const p=new T.Vector3();
 for(const mesh of sources){
  mesh.getWorldPosition(p);const z=RESORT_ZONES.reduce((best,z)=>{const d=Math.hypot(p.x-z.x,p.z-z.z)+Math.abs(p.y-z.y)*3;return !best||d<best.d?{z,d}:best;},null).z;
  mesh.userData.resortFloor=z.level;yield* lights.stamp(mesh,ids.get(z.id));
 }
 lights.finish();const batch=new T.Group(),levels=new Map(),inverse=root.matrixWorld.clone().invert();
 for(let level=0;level<3;level++){
  const sourceGroup=new T.Group();for(const source of sources){if(source.userData.resortFloor!==level)continue;const clone=new T.Mesh(source.geometry,source.material);clone.matrixAutoUpdate=false;clone.matrix.multiplyMatrices(inverse,source.matrixWorld);sourceGroup.add(clone);}
  const rendered=yield* batchModelSteps(sourceGroup,{combineColors:false});levels.set(level,rendered);batch.add(rendered);
 }
 root.userData.setInspectionLevel=level=>{for(const [id,g]of levels)g.visible=level==null||id<=level;for(const [id,g]of root.userData.zones){const zone=RESORT_ZONES.find(z=>z.id===id);g.visible=level==null||zone.level<=level;}};
 const materials=new Set();batch.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial)materials.add(o.material);});for(const m of materials)mallRoomLightMaterial(m,lights,.18);
 // Hidden source geometry is still queried directly for floor holes and body
 // collisions. Its authored detail and transforms are preserved exactly.
 for(const source of sources)source.visible=false;root.add(batch);
 const stamped=new Set(sources.map(o=>o.geometry));const previous=root.userData.dispose;root.userData.renderBatch=batch;root.userData.roomLightTexture=lights.texture;
 root.userData.dispose=()=>{const geometries=new Set();batch.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});for(const g of geometries)g.dispose();for(const g of stamped)g.dispose();lights.texture.dispose();previous?.();};
 return root;
}
