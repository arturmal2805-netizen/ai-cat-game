import * as T from 'three';

// Nine tiny immutable maps are shared by the whole collection. Ordinary PBR
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
 const result={normal:texture(normal,'micro-normal'),roughness:texture(rough,'wet roughness'),color};textures.set(kind,result);return result;
}
export function applyShowcaseSurfaceDetails(root){
 const seen=new Set();root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(!m.isMeshStandardMaterial||m.userData.sharedScenery||seen.has(m)||!m.userData.surfaceKind||m.userData.surfaceKind==='lawn')continue;
  seen.add(m);const moss=m.userData.surfaceKind==='moss',kind=moss?'leaf':['wood','leaf'].includes(m.userData.surfaceKind)?m.userData.surfaceKind:'stone',set=maps(kind);
  m.map=set.color;m.normalMap=set.normal;m.normalScale.setScalar(kind==='leaf'?.27:.38);m.bumpMap=null;m.roughnessMap=set.roughness;
  m.roughness=moss?.24:kind==='leaf'?.33:kind==='wood'?.52:.71;m.metalness=0;
  m.userData.showcaseSurface={kind,immutable:true,sharedMaps:true};m.needsUpdate=true;
 }});return root;
}
