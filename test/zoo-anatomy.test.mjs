import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {zooAnimals,zooAnimalVertex,zooJointPoint,zooAnimalPreview} from '../public/zoo-animals.js';import {ZOO_EXHIBITS} from '../public/zoo-data.js';import {ZOO_ANATOMY_REVISION} from '../public/zoo-anatomy-data.js';import {zooAnimalPose} from '../public/zoo-animal-motion.js';import {zooFurTexture} from '../public/zoo-fur.js';import {encodeZooTemplate,decodeZooTemplate} from '../public/zoo-model-codec.js';
import {zooTigerCoat} from '../public/zoo-coat-pattern.js';
const done=m=>{m.dispose();m.geometry.dispose();m.material.dispose();};
test('tiger flank pigment branches from both sides of the spine without wrapping every stripe through the belly',()=>{
 const {data,width:n}=zooTigerCoat().image;
 for(let y=n/2-8;y<n/2+8;y++)for(let x=0;x<n;x++)assert.equal(data[(y*n+x)*4],0,'unbroken dark belly ring');
 for(const y of [16,n-17])assert.ok(Array.from({length:n},(_,x)=>data[(y*n+x)*4]).some(v=>v>128),'missing dorsal stripes');
});
test('new anatomy has inset natural mammal eyes and individually recognizable limbs, with cute large axolotl eyes retained',()=>{
 for(const e of ZOO_EXHIBITS){const m=zooAnimals(e),d=m.userData.poseData,g=m.geometry,eye=d.joints.findIndex(j=>j.role==='eyeLeft'),box=new T.Box3();assert.equal(d.anatomyRevision,ZOO_ANATOMY_REVISION);
  for(let i=0;i<g.attributes.position.count;i++)if(g.attributes.aJoints.getX(i)===eye)box.expandByPoint(new T.Vector3().fromBufferAttribute(g.attributes.position,i));
  g.computeBoundingBox();const ratio=box.getSize(new T.Vector3()).y/g.boundingBox.getSize(new T.Vector3()).y;
  assert.ok(ratio>0);assert.ok(e.species==='axolotl'?ratio>.12:ratio<.095,e.species+' eye/body ratio '+ratio);
  if(['tiger','elephant','polar','otter'].includes(e.species))for(const side of ['Left','Right'])for(const end of ['Front','Back']){assert.ok(d.joints.some(j=>j.role==='Knee'+end+side));assert.ok(d.joints.some(j=>j.role==='Foot'+end+side));}
  done(m);
 }
});
test('static fibre ribbons have fixed buffers and remain within the WebGL2 sixteen-attribute budget',()=>{
 const texture=zooFurTexture(),version=texture.version;assert.ok(texture.image.data.some(v=>v===0));assert.ok(texture.image.data.some(v=>v>128));
 for(const e of ZOO_EXHIBITS){const m=zooAnimals(e),g=m.geometry,attrs=Object.values(g.attributes),versions=attrs.map(a=>a.version);assert.equal(g.attributes.aGloss.itemSize,2);assert.ok(Object.keys(g.attributes).length+4<=16);
  const furVertices=Array.from({length:g.attributes.aGloss.count},(_,i)=>g.attributes.aGloss.getY(i)).filter(v=>v>.5).length;
  assert.equal(furVertices>0,['tiger','polar','gorilla','otter'].includes(e.species));for(let i=0;i<120;i++)m.userData.update(i/20);assert.deepEqual(attrs.map(a=>a.version),versions);done(m);
 }
 assert.equal(texture.version,version);
});
test('actual articulated sole vertices retain ground clearance through walking and lying instead of moving rigid poles',()=>{
 for(const [species,end] of [['elephant',12.8],['polar',3]]){
  const m=zooAnimals(ZOO_EXHIBITS.find(e=>e.species===species)),g=m.geometry,d=m.userData.poseData,indices=[];
  for(const role of d.joints.filter(j=>j.role.startsWith('Foot'))){const id=d.joints.indexOf(role),vertices=[];for(let i=0;i<g.attributes.position.count;i++)if(g.attributes.aJoints.getX(i)===id&&g.attributes.aWeights.getX(i)>.95)vertices.push(i);vertices.sort((a,b)=>g.attributes.position.getY(a)-g.attributes.position.getY(b));indices.push(...vertices.slice(0,20));}
  for(let t=0;t<end;t+=.2)for(const i of indices){const p=zooAnimalVertex(m,i,0,t);assert.ok(p.y>-.075,`${species} ${t.toFixed(2)} sole ${p.y}`);}
  if(species==='tiger'){let raised=false;for(let t=0;t<45;t+=.2){raised||=zooJointPoint(m,'FootFrontRight',0,t).y>zooJointPoint(m,'FootFrontRight',0,0).y+.45;for(const i of indices)assert.ok(zooAnimalVertex(m,i,0,t).y>-.075,'tiger sole '+t);}assert.ok(raised);}
  done(m);
 }
});
test('land-to-swim limb transitions remain smooth on either side of the old abrupt thresholds',()=>{
 for(const role of ['LegFrontLeft','KneeFrontLeft','FootFrontLeft'])for(const t of [3.2,3.84,7.04,25.6,28.16,29.44]){const a=zooAnimalPose('polar',t-.001,role),b=zooAnimalPose('polar',t+.001,role);assert.ok(Math.abs(a.rx-b.rx)<.02,role+' at '+t);}
});
test('a source/cached model cannot silently revert to the old cartoon material layout or preview framing',()=>{
 const e=ZOO_EXHIBITS.find(e=>e.species==='gorilla'),m=zooAnimals(e),buffer=encodeZooTemplate(m.userData.poseData),legacy=buffer.slice(0),view=new DataView(legacy),length=view.getUint32(4,true),header=new TextDecoder().decode(new Uint8Array(legacy,8,length)).replace('"schema":2','"schema":1');new Uint8Array(legacy,8,length).set(new TextEncoder().encode(header));assert.throws(()=>decodeZooTemplate(legacy,e.species));done(m);
 const preview=zooAnimalPreview(e),box=new T.Box3().setFromObject(preview);assert.ok(box.getSize(new T.Vector3()).length()<7,'preview used the nine-unit gameplay culling volume');preview.userData.disposeStaff();
});
