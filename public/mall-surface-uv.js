import * as T from 'three';
import {runSceneSteps} from './scene-tasks.js';
import {copyGeometryBuffers} from './geometry-tasks.js';
// Metres per tile, shared by every floor/shop. Assign UVs before immutable
// batching, so texture density survives furniture scale without shader work.
const metres={marble:2.4,warm:1.5,metal:.75,fabric:.25,leather:.45};
export function mallSurfaceUVKey(mesh){
 const kind=mesh.material?.map?.userData.mallSurfaceKind;if(!metres[kind])return '';
 return kind+':'+mesh.matrixWorld.elements.slice(0,15).map(v=>Math.round(v*1e5)).join(',');
}
export function* writeMallSurfaceUVsSteps(mesh,geometry){
 const kind=mesh.material?.map?.userData.mallSurfaceKind,tile=metres[kind];if(!tile||!geometry.attributes.uv)return false;
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,position=new T.Vector3(),normal=new T.Vector3(),normalMatrix=new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
 for(let i=0;i<p.count;i++){
  if((i&1023)===0)yield;
  position.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);normal.fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();
  const ax=Math.abs(normal.x),ay=Math.abs(normal.y),az=Math.abs(normal.z);
  if(ay>=ax&&ay>=az)uv.setXY(i,position.x/tile,-position.z/tile);
  else if(ax>=az)uv.setXY(i,-position.z/tile,position.y/tile);
  else uv.setXY(i,position.x/tile,position.y/tile);
 }
 geometry.userData.mallSurfaceMetres=tile;return true;
}

export function writeMallSurfaceUVs(mesh,geometry){return runSceneSteps(writeMallSurfaceUVsSteps(mesh,geometry));}
// Architecture bypasses the room-lamp stamp. Prepare its tiled finish once,
// before batching, while retaining the original shared collision sources.
export function* stampMallSurfaceUVsSteps(root){
 root.updateWorldMatrix(true,true);const meshes=[];
 root.traverse(mesh=>{if(mesh.isMesh&&!mesh.isInstancedMesh&&mallSurfaceUVKey(mesh))meshes.push(mesh);});
 const copies=new Map();
 for(const mesh of meshes){
  yield;const source=mesh.geometry,key=mallSurfaceUVKey(mesh);let variants=copies.get(source);
  if(!variants)copies.set(source,variants=new Map());let geometry=variants.get(key);
  if(!geometry){geometry=copyGeometryBuffers(source);geometry.userData.sharedScenery=false;yield* writeMallSurfaceUVsSteps(mesh,geometry);variants.set(key,geometry);}
  mesh.geometry=geometry;
 }
 return meshes.length;
}
