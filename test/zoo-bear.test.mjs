import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {zooAnimals,zooAnimalVertex,zooJointPoint} from '../public/zoo-animals.js';import {ZOO_EXHIBITS} from '../public/zoo-data.js';import {zooBehaviorBag} from '../public/zoo-behavior.js';import {POLAR_DETAIL_REVISION} from '../public/zoo-anatomy-data.js';import {zooBearFurTexture} from '../public/zoo-fur.js';import {encodeZooTemplate,decodeZooTemplate} from '../public/zoo-model-codec.js';
const exhibit=ZOO_EXHIBITS.find(e=>e.species==='polar'),done=m=>{m.dispose();m.geometry.dispose();m.material.dispose();};
test('refined bear stays inside the released mobile geometry/pose budget and rejects the old bear cache',()=>{
 const m=zooAnimals(exhibit),d=m.userData.poseData,g=m.geometry;assert.equal(d.detailRevision,POLAR_DETAIL_REVISION);assert.ok(g.attributes.position.count<=43026);assert.ok(g.index.count/3<=53176);assert.equal(d.values.byteLength,588800);
 const b=encodeZooTemplate(d),length=new DataView(b).getUint32(4,true),text=new TextDecoder().decode(new Uint8Array(b,8,length)).replace('polar-v5','polar-v4');new Uint8Array(b,8,length).set(new TextEncoder().encode(text));assert.throws(()=>decodeZooTemplate(b,'polar'),/Old polar anatomy/);done(m);
});
test('bear actions use their own durations instead of stretching every short action across twenty-six seconds',()=>{
 const bag=zooBehaviorBag('polar',0,0);assert.equal(bag.find(s=>s.name==='swim-dive').seconds,26);assert.equal(bag.find(s=>s.name==='shore-walk').seconds,10);assert.equal(bag.find(s=>s.name==='snow-play').seconds,9);assert.equal(bag.length,5);assert.equal(bag.at(-1).end-bag[0].start,65);
});
test('actual planted bear feet hold still in world space, swing visibly and keep their soles above the land',()=>{
 const m=zooAnimals(exhibit),g=m.geometry,d=m.userData.poseData,walk=zooBehaviorBag('polar',0,0).find(s=>s.name==='shore-walk'),p=new T.Vector3(),q=new T.Vector3();
 let planted=0,raised=0;for(const role of ['FootFrontLeft','FootFrontRight','FootBackLeft','FootBackRight']){
  const id=d.joints.findIndex(j=>j.role===role),vertices=[];for(let i=0;i<g.attributes.position.count;i++)if(g.attributes.aJoints.getX(i)===id&&g.attributes.aWeights.getX(i)>.95)vertices.push(i);vertices.sort((a,b)=>g.attributes.position.getY(a)-g.attributes.position.getY(b));
  const front=role.includes('Front'),left=role.includes('Left'),offset=front?(left?0:Math.PI):left?Math.PI*.55:Math.PI*1.55;
  for(let u=.15;u<.85;u+=.008){const t=walk.start+u*walk.seconds,phase=((u*Math.PI*8+offset)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);zooJointPoint(m,role,0,t,p);zooJointPoint(m,role,0,t+.012,q);
   if(phase>Math.PI+.2&&phase<Math.PI*2-.2){assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<.004,role+' slid during stance');planted++;}
   else if(phase>.6&&phase<2.5)raised=Math.max(raised,p.y);
   for(const i of vertices.slice(0,12))assert.ok(zooAnimalVertex(m,i,0,t).y>-.025,role+' went below the land');
  }
 }
 assert.ok(planted>30);assert.ok(raised>.23,'no visible paw swing');done(m);
});
test('snow play raises a real front paw toward the snowball and rest lowers the body without sinking its soles',()=>{
 const m=zooAnimals(exhibit),g=m.geometry,d=m.userData.poseData,bag=zooBehaviorBag('polar',0,0),play=bag.find(s=>s.name==='snow-play'),rest=bag.find(s=>s.name==='rest'),t=play.start+play.seconds*.46;
 assert.ok(zooJointPoint(m,'FootFrontRight',0,t).y>zooJointPoint(m,'FootFrontRight',0,play.start).y+.15);assert.ok(zooJointPoint(m,'body',0,rest.start+rest.seconds*.5).y<zooJointPoint(m,'body',0,rest.start).y-.4);
 const low=[];for(let i=0;i<g.attributes.position.count;i++)if(d.joints[g.attributes.aJoints.getX(i)].role.startsWith('Foot')&&g.attributes.position.getY(i)<.05)low.push(i);
 for(let u=0;u<=1;u+=.04)for(const i of low)assert.ok(zooAnimalVertex(m,i,0,rest.start+rest.seconds*u).y>-.03,'resting sole penetrated ice');done(m);
});
test('bear coat uses one static eight-tuft atlas and both sides of every hair retain a coherent outward normal',()=>{
 const m=zooAnimals(exhibit),g=m.geometry,texture=zooBearFurTexture(),versions=Object.values(g.attributes).map(a=>a.version),tv=texture.version;assert.equal(texture.image.width,256);assert.equal(texture.image.data.byteLength,65536);assert.equal(m.userData.uniforms.uZooFurMap.value,texture);
 const groups=new Map();for(let i=0;i<g.attributes.aGloss.count;i++)if(g.attributes.aGloss.getY(i)>.5){const p=[g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i)].join(',');if(groups.has(p)){const j=groups.get(p);assert.ok(new T.Vector3().fromBufferAttribute(g.attributes.normal,i).dot(new T.Vector3().fromBufferAttribute(g.attributes.normal,j))>.999);}else groups.set(p,i);}
 for(let i=0;i<300;i++)m.userData.update(i*.1);assert.deepEqual(Object.values(g.attributes).map(a=>a.version),versions);assert.equal(texture.version,tv);done(m);
});
