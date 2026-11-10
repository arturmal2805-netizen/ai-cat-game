import * as T from 'three';
import {SHOWCASE_SURFACE_ASSETS} from './showcase-surface-assets.js';
import {copyGeometryBuffers} from './geometry-tasks.js';

// Selected-only, shared image decoding. No scene/render target or procedural
// texture authoring runs in an animation frame. Failed loads retain the small
// original offline fallback and do not trigger an automatic request loop.
let preparing;
export function prepareShowcaseSurfaces(){
 if(typeof window==='undefined'||typeof createImageBitmap!=='function')return Promise.resolve(false);
 return preparing||=(async()=>{
  const staged=new Map(),queue=Object.entries(SHOWCASE_SURFACE_ASSETS).flatMap(([kind,roles])=>Object.entries(roles).map(([role,url])=>({kind,role,url}))),created=[];
  try{
   const decoded=await Promise.allSettled(Array.from({length:3},async()=>{while(queue.length){const {kind,role,url}=queue.shift(),response=await fetch(url,typeof AbortSignal?.timeout==='function'?{signal:AbortSignal.timeout(8000)}:{});if(!response.ok)throw Error('Water surface unavailable');
    const bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'}),t=new T.Texture(bitmap);
    t.name='Shared water garden '+kind+' '+role;t.flipY=false;t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=role==='color'?T.SRGBColorSpace:T.NoColorSpace;
    t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.userData.sharedScenery=true;t.needsUpdate=true;created.push(t);
    const set=staged.get(kind)||{};set[role]=t;staged.set(kind,set);
   }}));if(decoded.some(r=>r.status==='rejected'))throw Error('Incomplete water surfaces');
   for(const [kind,set]of staged)textures.set(kind,set);return true;
  }catch{for(const t of created){t.dispose();t.image?.close?.();}return false;}
 })();
}

// The small offline fallback remains available without a DOM/network. PBR
// normals/roughness catch the existing sun; there is no ray tracing, render
// target, scene-copy reflection, fur pass, alpha grass or per-frame upload.
const textures=new Map(),size=128;
const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
function noise(x,y,cells){const px=x/size*cells,py=y/size*cells,ix=Math.floor(px),iy=Math.floor(py),a=px-ix,b=py-iy,u=a*a*(3-2*a),v=b*b*(3-2*b),n=(dx,dy)=>hash((ix+dx)%cells,(iy+dy)%cells);return T.MathUtils.lerp(T.MathUtils.lerp(n(0,0),n(1,0),u),T.MathUtils.lerp(n(0,1),n(1,1),u),v);}
function maps(kind){
 if(textures.has(kind))return textures.get(kind);
 const height=new Float32Array(size*size),normal=new Uint8Array(size*size*4),rough=new Uint8Array(normal.length),albedo=new Uint8Array(normal.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let h=noise(x,y,8)*.55+noise(x,y,32)*.28+noise(x,y,64)*.17;
  if(kind==='wood')h=h*.3+.7*(.5+.5*Math.sin(x/size*Math.PI*2*18+Math.sin(y/size*Math.PI*2*3)*.9));
  if(kind==='leaf')h=h*.6+.4*Math.abs(Math.sin(x/size*Math.PI*2*7));
  height[y*size+x]=h;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const at=(dx,dy)=>height[((y+dy+size)%size)*size+(x+dx+size)%size],v=new T.Vector3((at(-1,0)-at(1,0))*3,(at(0,-1)-at(0,1))*3,1).normalize(),i=(y*size+x)*4;
  normal[i]=Math.round((v.x*.5+.5)*255);normal[i+1]=Math.round((v.y*.5+.5)*255);normal[i+2]=Math.round((v.z*.5+.5)*255);normal[i+3]=255;
  const r=Math.round((.65+at(0,0)*.35)*255);rough.set([r,r,r,255],i);
  const seam=kind==='stone'?Math.exp(-Math.abs(Math.sin(y/size*Math.PI*18+noise(x,y,8)*1.4))*15):0,
   tone=T.MathUtils.clamp(.78+at(0,0)*.24-seam*.12,.6,1);
  albedo.set([Math.round(tone*255),Math.round(tone*(kind==='stone'?.97:1)*255),Math.round(tone*(kind==='stone'?.90:1)*255),255],i);
 }
 const texture=(bytes,label)=>{const t=new T.DataTexture(bytes,size,size,T.RGBAFormat);t.name='Shared water-adventure '+kind+' '+label;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=T.NoColorSpace;t.userData.sharedScenery=true;t.needsUpdate=true;return t;};
 const color=texture(albedo,'original painted surface');color.colorSpace=T.SRGBColorSpace;
 const result=['lawn','sand'].includes(kind)?{color}:{normal:texture(normal,'micro-normal'),roughness:texture(rough,'wet roughness'),color};textures.set(kind,result);return result;
}
export const showcaseSurfaceMap=kind=>maps(kind).color;
export const showcaseSurfaceSet=kind=>maps(kind);
export function applyShowcaseSurfaceDetails(root){
 const seen=new Set();root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(!m.isMeshStandardMaterial||m.userData.sharedScenery||seen.has(m)||!['stone','moss','wood','leaf','lawn'].includes(m.userData.surfaceKind))continue;
  seen.add(m);const kind=m.userData.surfaceKind,set=maps(kind);
  m.map=set.color;m.normalMap=set.normal||null;m.normalScale.setScalar(kind==='moss'?.82:kind==='leaf'?.34:kind==='wood'?.38:.65);m.bumpMap=null;m.roughnessMap=set.roughness||null;
  m.roughness=kind==='moss'?.82:kind==='leaf'?.66:kind==='wood'?.85:kind==='lawn'?.98:.90;m.metalness=0;
  m.userData.showcaseSurface={kind,immutable:true,sharedMaps:true};m.needsUpdate=true;
 }});return root;
}

export function* showcaseMaterialSteps(root){
 const meshes=[],copies=new Map();root.traverse(o=>{if(o.isMesh&&o.material?.isMeshStandardMaterial&&['wood','stone','leaf','moss','lawn'].includes(o.material.userData.surfaceKind))meshes.push(o);});
 for(const mesh of meshes){yield;const source=mesh.material;if(!copies.has(source)){const own=source.clone();own.userData.sharedScenery=false;copies.set(source,own);}mesh.material=copies.get(source);}
 // Install shared maps BEFORE tint batching, so equivalent leaf/wood surfaces
 // become one native material family rather than separate historical paints.
 applyShowcaseSurfaceDetails(root);
}

// Physical texture density is authored before batching; shared primitive UVs
// must never be changed. Long beams retain grain along their actual long axis.
export function* showcaseSurfaceUVSteps(root){
 const meshes=[];root.traverse(o=>{if(o.isMesh&&!o.geometry.userData.showcaseSurfaceUV&&['wood','stone','moss','lawn'].includes(o.material?.userData.surfaceKind)&&o.geometry.attributes.uv)meshes.push(o);});
 for(const mesh of meshes){
  yield;const source=mesh.geometry,g=copyGeometryBuffers(source),uv=g.attributes.uv,p=g.attributes.position,n=g.attributes.normal,kind=mesh.material.userData.surfaceKind;
  g.userData.sharedScenery=false;g.userData.showcaseSurfaceUV=true;mesh.geometry=g;
  if(kind==='wood'){
   source.computeBoundingBox();const box=source.boundingBox,size=box.getSize(new T.Vector3()).multiply(mesh.scale),dims=[Math.abs(size.x),Math.abs(size.y),Math.abs(size.z)],axis=dims.indexOf(Math.max(...dims));
   for(let i=0;i<uv.count;i++){
    if((i&1023)===0)yield;
    if(source.type==='TubeGeometry'){uv.setXY(i,uv.getY(i)*Math.max(dims[0],dims[2])*.8,uv.getX(i)*Math.max(...dims)/4);continue;}
    if(source.type==='CylinderGeometry'){uv.setXY(i,uv.getX(i)*Math.max(dims[0],dims[2])*Math.PI/1.5,uv.getY(i)*dims[1]/4);continue;}
    const coords=[p.getX(i)*mesh.scale.x,p.getY(i)*mesh.scale.y,p.getZ(i)*mesh.scale.z],normal=n?[Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i))]:[0,1,0],face=normal.indexOf(Math.max(...normal)),long=face===axis?(axis+1)%3:axis,cross=[0,1,2].find(a=>a!==face&&a!==long);
    uv.setXY(i,coords[cross??(long+1)%3]/1.5,coords[long]/4);
   }
  }else if(kind==='lawn'){
   for(let i=0;i<uv.count;i++){if((i&1023)===0)yield;uv.setXY(i,p.getX(i)/12,p.getY(i)/12);}
  }else for(let i=0;i<uv.count;i++){if((i&1023)===0)yield;uv.setXY(i,uv.getX(i)*2.4,uv.getY(i)*2.4);}
  if(!source.userData.sharedScenery)source.dispose();
 }
}
