import * as T from 'three';
import {MeshoptDecoder} from 'meshoptimizer/decoder';
const MAGIC=0x53434e32,types={Float64Array,Float32Array,Uint16Array,Uint32Array,Uint8Array};
// Offline lossless prediction keeps every float and the exact index sequence.
// Shared LOD attributes are stored/decoded once; no quantization is applied.
export async function encodeSceneryGeometries(models,revision,extras={}){
 const {MeshoptEncoder}=await import('meshoptimizer/encoder');await MeshoptEncoder.ready;
 let size=0;const chunks=[],shared=new Map(),attribute=(a,index=false)=>{
  const v=a.array;if(shared.has(v))return {...shared.get(v),itemSize:a.itemSize,normalized:!!a.normalized};
  const raw=new Uint8Array(v.buffer,v.byteOffset,v.byteLength),stride=a.itemSize*v.BYTES_PER_ELEMENT,mode=index?'sequence':stride%4===0?'vertices':'raw',data=mode==='sequence'?MeshoptEncoder.encodeIndexSequence(raw,v.length,v.BYTES_PER_ELEMENT):mode==='vertices'?MeshoptEncoder.encodeVertexBuffer(raw,a.count,stride):raw;
  const m={type:v.constructor.name,offset:size,length:v.length,itemSize:a.itemSize,normalized:!!a.normalized,mode,bytes:data.byteLength};shared.set(v,m);chunks.push({data,offset:size});size+=Math.ceil(data.byteLength/4)*4;return m;
 };
 const h={revision,models:Object.fromEntries(Object.entries(models).map(([name,g])=>[name,{attributes:Object.fromEntries(Object.entries(g.attributes).map(([k,a])=>[k,attribute(a)])),index:attribute(g.index,true)}])),extras:Object.fromEntries(Object.entries(extras).map(([name,a])=>[name,attribute(a)]))},json=new TextEncoder().encode(JSON.stringify(h)),start=8+Math.ceil(json.length/4)*4,buffer=new ArrayBuffer(start+size),view=new DataView(buffer);view.setUint32(0,MAGIC,true);view.setUint32(4,json.length,true);new Uint8Array(buffer,8,json.length).set(json);for(const {data,offset}of chunks)new Uint8Array(buffer,start+offset,data.byteLength).set(data);return buffer;
}
export async function decodeSceneryGeometries(buffer,revision,names){
 await MeshoptDecoder.ready;
 const view=new DataView(buffer);if(view.getUint32(0,true)!==MAGIC)throw Error('Invalid scenery geometry');const length=view.getUint32(4,true);if(length>65536||length+8>buffer.byteLength)throw Error('Invalid scenery header');const h=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,length))),start=8+Math.ceil(length/4)*4;if(h.revision!==revision||Object.keys(h.models||{}).length!==names.length)throw Error('Old scenery geometry');
 const shared=new Map(),attribute=m=>{
  const Type=types[m?.type];if(!Type||!Number.isInteger(m.offset)||m.offset<0||m.offset%4||!Number.isInteger(m.length)||m.length<1||m.length>3000000||!Number.isInteger(m.bytes)||m.bytes<1||start+m.offset+m.bytes>buffer.byteLength||!Number.isInteger(m.itemSize)||m.itemSize<1||m.itemSize>4)throw Error('Invalid scenery buffer');
  const key=[m.type,m.offset,m.length,m.itemSize,!!m.normalized].join(':');if(shared.has(key))return shared.get(key);
  const array=new Type(m.length),target=new Uint8Array(array.buffer),source=new Uint8Array(buffer,start+m.offset,m.bytes),stride=Type.BYTES_PER_ELEMENT*m.itemSize;
  if(m.mode==='vertices')MeshoptDecoder.decodeVertexBuffer(target,m.length/m.itemSize,stride,source);else if(m.mode==='sequence')MeshoptDecoder.decodeIndexSequence(target,m.length,Type.BYTES_PER_ELEMENT,source);else if(m.mode==='raw'&&source.length===target.length)target.set(source);else throw Error('Invalid scenery encoding');
  const a=new T.BufferAttribute(array,m.itemSize,!!m.normalized);shared.set(key,a);return a;
 };
 const models={};for(const name of names){const row=h.models[name];if(!row)throw Error('Missing scenery geometry');const g=new T.BufferGeometry();for(const key of ['position','normal','color','uv',...['aReefGlow','aReefSway'].filter(k=>row.attributes[k])]){const a=row.attributes[key];if(a?.itemSize!==(key.startsWith('aReef')?1:key==='uv'?2:3))throw Error('Invalid scenery attribute');g.setAttribute(key,attribute(a));}const count=g.attributes.position.count;if(count>150000||Object.values(g.attributes).some(a=>a.count!==count))throw Error('Invalid scenery vertex count');g.setIndex(attribute(row.index));g.userData.sharedScenery=true;g.userData.prebaked=true;g.computeBoundingBox();g.computeBoundingSphere();models[name]=g;}
 const extras={};for(const [name,m]of Object.entries(h.extras||{})){if(m.itemSize!==1||m.length>262144)throw Error('Invalid scenery extra');extras[name]=attribute(m);}return {models,extras};
}
