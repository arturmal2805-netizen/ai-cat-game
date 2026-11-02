import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {zooAnimals} from '../public/zoo-animals.js';import {ZOO_EXHIBITS} from '../public/zoo-data.js';
test('shinier elephant skin and softer facial details preserve every player-approved animation byte and landmark role',()=>{
 const approved=JSON.parse(fs.readFileSync(new URL('./fixtures/approved-elephant-animation.json',import.meta.url))),m=zooAnimals(ZOO_EXHIBITS[0]),p=m.userData.poseData;
 try{assert.equal(createHash('sha256').update(new Uint8Array(p.values.buffer)).digest('hex'),approved.poseSHA256);assert.equal(p.values.byteLength,approved.poseBytes);assert.equal(p.frameCount,approved.frames);assert.deepEqual(p.joints.map(({role,parent})=>({role,parent})),approved.joints);
 assert.ok(m.geometry.attributes.position.count<=24027);assert.ok(m.geometry.index.count/3<=44604);assert.equal(p.sculptStats.furCards,46);const versions=Object.values(m.geometry.attributes).map(a=>a.version);for(let i=0;i<120;i++)m.userData.update(i/20);assert.deepEqual(Object.values(m.geometry.attributes).map(a=>a.version),versions);
 }finally{m.dispose();m.geometry.dispose();m.material.dispose();}
});
