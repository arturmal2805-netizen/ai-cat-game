import {test} from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';import * as T from 'three';
import {zooAnimals} from '../public/zoo-animals.js';import {ZOO_EXHIBITS} from '../public/zoo-data.js';
import {encodeZooTemplate,decodeZooTemplate} from '../public/zoo-model-codec.js';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function bodySignature(attrs,index){const p=attrs.position.array,names=Object.keys(attrs).sort(),keys=[],body=[];for(let i=0;i<p.length/3;i++){body[i]=!(p[i*3+2]>.42&&p[i*3+1]>.40&&Math.abs(p[i*3])>.12);let parts=[];for(const name of names){const a=attrs[name],b=a.array,offset=b.byteOffset+i*a.itemSize*b.BYTES_PER_ELEMENT;parts.push(Buffer.from(b.buffer,offset,a.itemSize*b.BYTES_PER_ELEMENT));}keys[i]=sha(Buffer.concat(parts));}
 const vertices=keys.filter((_,i)=>body[i]).sort(),triangles=[];for(let i=0;i<index.length;i+=3){const ids=[index[i],index[i+1],index[i+2]];if(ids.every(i=>body[i])){const a=ids.map(i=>keys[i]);triangles.push([a.join(''),[a[1],a[2],a[0]].join(''),[a[2],a[0],a[1]].join('')].sort()[0]);}}
 return {vertices:vertices.length,triangles:triangles.length,verticesSHA256:sha(vertices.join('')),trianglesSHA256:sha(triangles.sort().join(''))};}
function ordinaryGorillaPose(poses,joints){const n=joints.length,out=[];for(let f=0;f<496;f++)for(let i=0;i<n;i++)if(!/^(eye|lid)/.test(joints[i].role))out.push(...poses.subarray((f*n+i)*16,(f*n+i+1)*16));return sha(Buffer.from(new Float32Array(out).buffer));}

const approved=JSON.parse(readFileSync(new URL('./fixtures/zoo-approved-axolotl.json',import.meta.url))),done=m=>{m.dispose();m.geometry.dispose();m.material.dispose();};
test('axolotl eye cleanup preserves every approved nonocular vertex, normal, colour, triangle and all 400 pose rows',()=>{
 const m=zooAnimals(ZOO_EXHIBITS.find(e=>e.species==='axolotl')),d=m.userData.poseData,g=d.geometry;
 assert.deepEqual(bodySignature(g.attributes,g.index.array),approved.body);assert.equal(crypto.createHash('sha256').update(Buffer.from(d.values.buffer,d.values.byteOffset,d.values.byteLength)).digest('hex'),approved.axolotlPosesSHA256);done(m);
});
test('axolotl has no opaque lid cap to overlap its eye and still closes and reopens the real eye',()=>{
 const m=zooAnimals(ZOO_EXHIBITS.find(e=>e.species==='axolotl')),g=m.geometry,d=m.userData.poseData,lids=d.joints.flatMap((j,i)=>j.role.startsWith('lid')?[i]:[]);assert.equal(lids.length,2);
 for(let i=0;i<g.attributes.position.count;i++){assert.ok(!lids.includes(g.attributes.aJoints.getX(i))||g.attributes.aWeights.getX(i)<.0001);assert.ok(!lids.includes(g.attributes.aJoints.getY(i))||g.attributes.aWeights.getY(i)<.0001);}
 const eye=d.joints.findIndex(j=>j.role==='eyeLeft'),heights=Array.from({length:400},(_,f)=>new T.Vector3(d.values[(f*d.joints.length+eye)*16+4],d.values[(f*d.joints.length+eye)*16+5],d.values[(f*d.joints.length+eye)*16+6]).length());assert.ok(Math.min(...heights)<.2);assert.ok(Math.max(...heights)>.95);done(m);
});
test('gorilla muzzle is compact while its nonocular motion, branch grips and palm anchors remain exactly approved',()=>{
 const m=zooAnimals(ZOO_EXHIBITS.find(e=>e.species==='gorilla')),g=m.geometry,d=m.userData.poseData;let front=-Infinity;
 for(let i=0;i<g.attributes.position.count;i++){const p=new T.Vector3().fromBufferAttribute(g.attributes.position,i);if(Math.abs(p.x)<.26&&p.y>1.84&&p.y<2.24&&g.attributes.aGloss.getY(i)<.5)front=Math.max(front,p.z);}
 assert.ok(front>.9&&front<1.1,'elongated muzzle '+front);assert.equal(ordinaryGorillaPose(d.values,d.joints),approved.ordinaryGorillaPosesSHA256);done(m);
});
test('old cached eye/face geometry is rejected independently without invalidating other species',()=>{
 for(const species of ['axolotl','gorilla']){const m=zooAnimals(ZOO_EXHIBITS.find(e=>e.species===species)),d=m.userData.poseData;assert.ok(d.faceRevision);assert.throws(()=>decodeZooTemplate(encodeZooTemplate({...d,faceRevision:undefined}),species),/Old zoo face/);assert.equal(decodeZooTemplate(encodeZooTemplate(d),species).faceRevision,d.faceRevision);done(m);}
});
