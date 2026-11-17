import * as T from 'three';
import {registerPositionPreservingShader} from './static-submissions.js';
import {retireGeometryBuffers} from './geometry-residency.js';
// Exact Float32 RGB dictionary for baked Mall scenery only. No colour rounding,
// vertex/normal/UV/index changes, cat rigs, textures or per-frame uploads.
export function* mallColourPaletteSteps(root){
 const targets=new Set(),owners=new Map();
 for(const floor of root.userData.floors.values())for(const key of ['structure','detail','ceiling'])floor.userData[key]?.traverse(o=>{if(o.isMesh)targets.add(o);});
 root.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)){let set=owners.get(o.material);if(!set)owners.set(o.material,set=new Set());set.add(o);}});
 const valid=o=>targets.has(o)&&!o.isSkinnedMesh&&!o.isInstancedMesh&&o.userData.staticModel&&o.material.vertexColors&&(o.material.isMeshStandardMaterial||o.material.isMeshBasicMaterial)&&o.geometry.attributes.color?.array instanceof Float32Array&&!o.geometry.attributes.color.isInterleavedBufferAttribute&&o.geometry.attributes.color.itemSize===3&&!o.geometry.attributes.color.normalized&&!Object.keys(o.geometry.morphAttributes).length;
 const materials=[...owners].filter(([,set])=>[...set].every(valid)).map(([m])=>m),meshes=materials.flatMap(m=>[...owners.get(m)]),seen=new Set(),states=[],dictionary=new Map(),values=[];let sourceBytes=0,indexBytes=0;
 for(const mesh of meshes){
  const g=mesh.geometry;if(seen.has(g))continue;seen.add(g);const colour=g.attributes.color,bits=new Uint32Array(colour.array.buffer,colour.array.byteOffset,colour.array.length),indices=new Uint16Array(colour.count);
  for(let i=0;i<colour.count;i++){
   if((i&2047)===0)yield;const k=i*3,key=bits[k]+','+bits[k+1]+','+bits[k+2];let id=dictionary.get(key);
   if(id===undefined){id=dictionary.size;if(id>=65535)return null;dictionary.set(key,id);values.push(colour.array[k],colour.array[k+1],colour.array[k+2],1);}
   indices[i]=id;
  }
  const encoded=new T.Uint16BufferAttribute(indices,1);states.push({geometry:g,colour,encoded});sourceBytes+=colour.array.byteLength;indexBytes+=indices.byteLength;
 }
 if(!states.length)return null;
 const width=Math.min(1024,T.MathUtils.ceilPowerOfTwo(dictionary.size)),height=Math.ceil(dictionary.size/width),data=new Float32Array(width*height*4);data.set(values);
 const texture=new T.DataTexture(data,width,height,T.RGBAFormat,T.FloatType);texture.name='Exact Mall Float32 colour dictionary';texture.minFilter=texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=T.NoColorSpace;texture.needsUpdate=true;
 const programs=materials.map(material=>{const hook=material.onBeforeCompile,key=material.customProgramCacheKey,cacheKey=key.call(material);const palette=function(shader,...args){hook.call(this,shader,...args);shader.uniforms.uMallColourPalette={value:texture};shader.uniforms.uMallColourGrid={value:new T.Vector2(width,height)};shader.vertexShader='attribute float aMallColourIndex;uniform sampler2D uMallColourPalette;uniform vec2 uMallColourGrid;\n'+shader.vertexShader.replace('#include <color_vertex>',`#include <color_vertex>
 vColor.rgb=texture2D(uMallColourPalette,(vec2(mod(aMallColourIndex,uMallColourGrid.x),floor(aMallColourIndex/uMallColourGrid.x))+.5)/uMallColourGrid).rgb;`);};const paletteKey=()=>cacheKey+'-mall-exact-float32-rgb-v1';return{material,hook,key,palette,paletteKey};});
 let enabled=null;
 const setEnabled=value=>{value=!!value;if(value===enabled)return;for(const s of states){retireGeometryBuffers(s.geometry);if(value){s.geometry.deleteAttribute('color');s.geometry.setAttribute('aMallColourIndex',s.encoded);}else{s.geometry.deleteAttribute('aMallColourIndex');s.geometry.setAttribute('color',s.colour);}}
  for(const p of programs){if(enabled!==null)p.material.dispose();p.material.onBeforeCompile=value?p.palette:p.hook;p.material.customProgramCacheKey=value?p.paletteKey:p.key;if(value)registerPositionPreservingShader(p.material,p.hook,p.key);p.material.needsUpdate=true;}enabled=value;
 };
 setEnabled(true);root.userData.ownedTextures.push(texture);
 return{texture,setEnabled,get enabled(){return enabled;},states,stats:{geometries:states.length,colours:dictionary.size,sourceBytes,indexBytes,textureBytes:data.byteLength,savedBytes:sourceBytes-indexBytes-data.byteLength}};
}
