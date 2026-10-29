import {zooModelFrames,GORILLA_PLAY_REVISION} from './zoo-play-poses.js';
import {ZOO_ANATOMY_REVISION,POLAR_DETAIL_REVISION} from './zoo-anatomy-data.js';
import * as T from 'three';
import {ZOO_POSE_FRAMES} from './zoo-animal-motion.js';
const MAGIC=0x5a4f4f33,types={Float32Array,Uint32Array,Uint16Array,Uint8Array};
export function encodeZooTemplate(t){
 let bytes=0;const chunks=[],attribute=(a)=>{const data=a.array||a,meta={type:data.constructor.name,length:data.length,offset:bytes,itemSize:a.itemSize,normalized:!!a.normalized};chunks.push({data,offset:bytes});bytes+=Math.ceil(data.byteLength/4)*4;return meta;};
 const header={schema:2,anatomyRevision:t.anatomyRevision,species:t.species,detailRevision:t.detailRevision,frameCount:t.frameCount===400?undefined:t.frameCount,joints:t.joints.map(j=>({role:j.role,pivot:j.pivot.toArray(),parent:j.parent})),sculptStats:t.sculptStats,
  attributes:Object.fromEntries(Object.entries(t.geometry.attributes).map(([name,a])=>[name,attribute(a)])),index:attribute(t.geometry.index),poses:attribute(t.values)};
 const json=new TextEncoder().encode(JSON.stringify(header)),start=8+Math.ceil(json.byteLength/4)*4,buffer=new ArrayBuffer(start+bytes),view=new DataView(buffer);
 view.setUint32(0,MAGIC,true);view.setUint32(4,json.byteLength,true);new Uint8Array(buffer,8,json.length).set(json);
 for(const {data,offset}of chunks)new Uint8Array(buffer,start+offset,data.byteLength).set(new Uint8Array(data.buffer,data.byteOffset,data.byteLength));return buffer;
}
export function decodeZooTemplate(buffer,species){
 const view=new DataView(buffer);if(view.getUint32(0,true)!==MAGIC)throw Error('Invalid zoo model');
 const length=view.getUint32(4,true);if(length>65536||length+8>buffer.byteLength)throw Error('Invalid zoo header');
 const h=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,length))),start=8+Math.ceil(length/4)*4;
 if(h.schema!==2||h.anatomyRevision!==ZOO_ANATOMY_REVISION||h.species!==species||!Array.isArray(h.joints)||h.joints.length<5||h.joints.length>100)throw Error('Invalid zoo rig');
 if(species==='polar'&&h.detailRevision!==POLAR_DETAIL_REVISION)throw Error('Old polar anatomy');
 const frameCount=h.frameCount||400;if(frameCount!==zooModelFrames(species)||species==='gorilla'&&h.detailRevision!==GORILLA_PLAY_REVISION)throw Error('Old zoo interaction poses');
 const array=m=>{const Type=types[m.type];if(!Type||!Number.isInteger(m.length)||m.length<1||!Number.isInteger(m.offset)||m.offset<0||m.offset%4||start+m.offset+m.length*Type.BYTES_PER_ELEMENT>buffer.byteLength)throw Error('Invalid zoo buffer');return new Type(buffer,start+m.offset,m.length);};
 const geometry=new T.BufferGeometry();for(const [name,m]of Object.entries(h.attributes)){if(!Number.isInteger(m.itemSize)||m.itemSize<1||m.itemSize>4)throw Error('Invalid zoo attribute');geometry.setAttribute(name,new T.BufferAttribute(array(m),m.itemSize,m.normalized));}
 for(const name of ['position','normal','uv','color','aJoints','aWeights','aGloss','aStripe','aGreetWeight','aGreetId','aGreetPivot'])if(!geometry.attributes[name])throw Error('Incomplete zoo model');
 if(geometry.attributes.aGloss.itemSize!==2)throw Error('Old zoo material layout');
 const count=geometry.attributes.position.count;if(count>100000||Object.values(geometry.attributes).some(a=>a.count!==count))throw Error('Invalid zoo vertex counts');
 geometry.setIndex(new T.BufferAttribute(array(h.index),1));geometry.computeBoundingSphere();geometry.userData.sharedScenery=true;
 const values=array(h.poses);if(values.length!==h.joints.length*16*frameCount)throw Error('Invalid zoo poses');
 const texture=new T.DataTexture(values,h.joints.length*4,frameCount,T.RGBAFormat,T.FloatType);texture.minFilter=texture.magFilter=T.NearestFilter;texture.needsUpdate=true;texture.userData.sharedScenery=true;
 return {species,geometry,texture,values,frameCount,prebaked:true,anatomyRevision:h.anatomyRevision,detailRevision:h.detailRevision,width:h.joints.length*4,refs:0,sculptStats:h.sculptStats,joints:h.joints.map((j,i)=>{if(j.parent!==null&&(!Number.isInteger(j.parent)||j.parent>=i||j.parent<0))throw Error('Invalid zoo parent');return {...j,pivot:new T.Vector3(...j.pivot)};})};
}
