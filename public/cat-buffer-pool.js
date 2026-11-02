import * as THREE from 'three';
import {retireGeometryBuffers,isGeometryBufferRetirement} from './geometry-residency.js';

// Pool only complete, byte-identical structural cohorts. Sharing a universal
// tiny index/weight attribute across unrelated shapes would connect the whole
// colony in the GPU residency graph and pin unrelated large buffers.
const structural=['position','normal','aRigJoints','aRigWeights','index'];
const upload=THREE.BufferAttribute.prototype.onUploadCallback;
function layout(a){return [a.array.constructor.name,a.itemSize,a.normalized,a.gpuType,!!a.isFloat16BufferAttribute,a.usage].join(':');}
function eligible(a){return a&&!a.isInterleavedBufferAttribute&&!a.isInstancedBufferAttribute&&a.array?.byteLength&&a.version===0&&a.usage===THREE.StaticDrawUsage&&!a.updateRanges.length&&a.onUploadCallback===upload;}
function hash(a){
 const view=new DataView(a.array.buffer,a.array.byteOffset,a.array.byteLength);let h=2166136261;
 const words=Math.floor(view.byteLength/4),count=Math.min(64,words);
 for(let i=0;i<count;i++){const at=Math.floor(i*(words-1)/Math.max(1,count-1))*4;h=Math.imul(h^view.getUint32(at,true),16777619);}
 for(let i=words*4;i<view.byteLength;i++)h=Math.imul(h^view.getUint8(i),16777619);
 return layout(a)+':'+view.byteLength+':'+(h>>>0);
}
function equal(a,b){
 if(layout(a)!==layout(b)||a.array.byteLength!==b.array.byteLength)return false;
 const aa=new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength),bb=new Uint8Array(b.array.buffer,b.array.byteOffset,b.array.byteLength);
 let start=0;
 if(!(aa.byteOffset%4)&&!(bb.byteOffset%4)){
  const count=Math.floor(aa.length/4),x=new Uint32Array(aa.buffer,aa.byteOffset,count),y=new Uint32Array(bb.buffer,bb.byteOffset,count);
  for(let i=0;i<count;i++)if(x[i]!==y[i])return false;start=count*4;
 }
 for(let i=start;i<aa.length;i++)if(aa[i]!==bb[i])return false;
 return true;
}
export function createCatBufferPool({maxKeys=512,maxBucket=8}={}){
 const cohorts=new Map(),owned=new WeakMap(),stats={lookups:0,cohorts:0,sharedBytes:0},read=(g,n)=>n==='index'?g.index:g.attributes[n];
 function disposal(entry,record){return function(event){
  const g=event.target,mesh=record.mesh?.deref(),resident=record.mesh?!!mesh?.userData.nativeBuffersResident:!record.retired;
  record.retired=true;if(mesh)mesh.userData.nativeBuffersResident=false;
  // Three's VAO cache compares attribute identities, not the GL buffer hidden
  // behind them. Removing one shared VBO without retiring peer VAOs leaves
  // those VAOs pointing at the deleted buffer. Invalidate every resident peer
  // through the existing GPU-only retirement scope; never destroy their rigs.
  if(resident&&!entry.retiring){entry.retiring=true;try{
   for(const peer of entry.owners){const geometry=peer.geometry.deref(),model=peer.mesh?.deref();
    if(!geometry){entry.owners.delete(peer);continue;}
    const alive=peer.mesh?!!model?.userData.nativeBuffersResident:!peer.retired;
    if(geometry!==g&&alive)retireGeometryBuffers(geometry);
   }
  }finally{entry.retiring=false;}}
  if(!isGeometryBufferRetirement(g)){entry.owners.delete(record);owned.delete(g);g.removeEventListener('dispose',record.dispose);}
 };}
 function own(g,entry,mesh){
  for(const r of entry.owners)if(!r.geometry.deref())entry.owners.delete(r);
  const record={geometry:new WeakRef(g),mesh:mesh?new WeakRef(mesh):null,retired:false};record.dispose=disposal(entry,record);entry.owners.add(record);owned.set(g,record);g.addEventListener('dispose',record.dispose);
 }
 let enabled=true;
 return {stats,setEnabled(value){enabled=!!value;},intern(g,mesh){
  if(!enabled||typeof WeakRef==='undefined'||Object.keys(g.attributes).length!==5||Object.keys(g.morphAttributes).length)return g;
  if(owned.has(g))return g;
  const attrs=structural.map(n=>read(g,n)),color=g.attributes.color;
  if(!attrs.every(eligible)||!eligible(color))return g;
  stats.lookups++;const key=attrs.map(hash).join('|');let bucket=cohorts.get(key);
  if(!bucket){if(cohorts.size>=maxKeys)cohorts.delete(cohorts.keys().next().value);cohorts.set(key,bucket=[]);}
  let entry;
  for(let i=bucket.length-1;i>=0;i--){const candidate=bucket[i],live=candidate.attrs.map(r=>r.deref());
   if(live.some(a=>!a)){bucket.splice(i,1);continue;}
   if(live.every((a,k)=>eligible(a)&&equal(a,attrs[k]))){entry=candidate;for(let k=0;k<structural.length;k++){const name=structural[k];if(name==='index')g.setIndex(live[k]);else g.setAttribute(name,live[k]);stats.sharedBytes+=attrs[k].array.byteLength;}break;}
  }
  if(!entry){entry={attrs:attrs.map(a=>new WeakRef(a)),colors:new Map(),owners:new Set(),retiring:false};if(bucket.length>=maxBucket)bucket.shift();bucket.push(entry);stats.cohorts++;}
  own(g,entry,mesh);
  const colorKey=hash(color);let colors=entry.colors.get(colorKey);
  if(!colors){if(entry.colors.size>=128)entry.colors.delete(entry.colors.keys().next().value);entry.colors.set(colorKey,colors=[]);}
  for(let i=colors.length-1;i>=0;i--){const candidate=colors[i].deref();if(!candidate){colors.splice(i,1);continue;}if(candidate!==color&&eligible(candidate)&&equal(candidate,color)){g.setAttribute('color',candidate);stats.sharedBytes+=color.array.byteLength;return g;}}
  if(colors.length>=maxBucket)colors.shift();colors.push(new WeakRef(color));return g;
 }};
}
export const nativeCatBufferPool=createCatBufferPool();
