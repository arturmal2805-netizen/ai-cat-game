import * as T from 'three';
import {MOSA_ANATOMY_REVISION} from './mosasaur-anatomy.js';
const MAGIC=0x4d4f5341,types={Float32Array,Uint32Array,Uint16Array};
export function encodeMosasaurModels(models){
 let bytes=0;const chunks=[],attribute=a=>{const data=a.array,meta={type:data.constructor.name,length:data.length,offset:bytes,itemSize:a.itemSize};chunks.push({data,offset:bytes});bytes+=Math.ceil(data.byteLength/4)*4;return meta;};
 const header={revision:MOSA_ANATOMY_REVISION,models:Object.fromEntries(Object.entries(models).map(([kind,g])=>[kind,{attributes:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,attribute(a)])),index:attribute(g.index),anchors:g.userData.dentalAnchors}]))};
 const json=new TextEncoder().encode(JSON.stringify(header)),start=8+Math.ceil(json.length/4)*4,buffer=new ArrayBuffer(start+bytes),view=new DataView(buffer);view.setUint32(0,MAGIC,true);view.setUint32(4,json.length,true);new Uint8Array(buffer,8,json.length).set(json);
 for(const {data,offset}of chunks)new Uint8Array(buffer,start+offset,data.byteLength).set(new Uint8Array(data.buffer,data.byteOffset,data.byteLength));return buffer;
}
export function decodeMosasaurModels(buffer){
 const view=new DataView(buffer);if(view.getUint32(0,true)!==MAGIC)throw Error('Invalid marine model');const length=view.getUint32(4,true);if(length>65536||length+8>buffer.byteLength)throw Error('Invalid marine header');
 const h=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,length))),start=8+Math.ceil(length/4)*4;if(h.revision!==MOSA_ANATOMY_REVISION)throw Error('Old marine anatomy');
 const array=m=>{const Type=types[m.type];if(!Type||!Number.isInteger(m.length)||m.length<1||!Number.isInteger(m.offset)||m.offset<0||m.offset%4||start+m.offset+m.length*Type.BYTES_PER_ELEMENT>buffer.byteLength)throw Error('Invalid marine buffer');return new Type(buffer,start+m.offset,m.length);};
 const models={};for(const kind of ['body','jaw']){
  const row=h.models?.[kind];if(!row)throw Error('Missing marine surface');const g=new T.BufferGeometry();for(const name of ['position','normal','uv','color']){const m=row.attributes[name];if(!m||m.itemSize!==(name==='uv'?2:3))throw Error('Invalid marine attribute');g.setAttribute(name,new T.BufferAttribute(array(m),m.itemSize));}
  const count=g.attributes.position.count;if(count>60000||Object.values(g.attributes).some(a=>a.count!==count))throw Error('Invalid marine vertices');g.setIndex(new T.BufferAttribute(array(row.index),1));
  if(!Array.isArray(row.anchors)||row.anchors.length!==(kind==='body'?80:72)||row.anchors.some(a=>!Array.isArray(a.point)||a.point.length!==3||a.point.some(n=>!Number.isFinite(n))))throw Error('Invalid marine teeth');
  g.userData.dentalAnchors=row.anchors;g.userData.sharedScenery=true;g.computeBoundingSphere();g.computeBoundingBox();models[kind]=g;
 }return models;
}
