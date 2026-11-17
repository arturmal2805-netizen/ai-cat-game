import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSubmarinePhysics} from '../public/submarine-physics.js';
import {mallPressureContact,mallPressureDistance} from '../public/mall-pressure.js';
import {MOSA_REEF_INSTANCES,MOSA_REEF_AUTHORED_INSTANCES} from '../public/mosasaur-reef-data.js';
import {MOSA_FORECOURT,oceanClearanceDistance} from '../public/mosasaur-forecourt.js';
import {mosaReefTemplate} from '../public/mosasaur-reef-sculpt.js';
const clear=s=>{for(const offset of [-1.9,0,1.9])assert.equal(mallPressureContact(s.x+Math.sin(s.yaw)*offset,s.y,s.z+Math.cos(s.yaw)*offset,1.24),null,'the swept hull remains outside the glass');};
test('an old pilot inside the new mall resumes in nearby open water at the same depth and with its pose',()=>{
 const raw={x:0,y:-135,z:65,yaw:0,pitch:.2,active:true,mode:'cockpit'},p=createSubmarinePhysics(raw);
 assert.equal(p.state.active,true);assert.equal(p.state.y,raw.y);assert.equal(p.state.mode,'cockpit');assert.ok(Math.abs(p.state.pitch-raw.pitch)<1e-12);assert.ok(Math.hypot(p.state.x-raw.x,p.state.z-raw.z)<100);clear(p.state);
});
test('faster swept driving stops at the real front glass and vertical controls cannot cross either roof or ground slab',()=>{
 const front=createSubmarinePhysics({x:0,y:-130,z:150,yaw:Math.PI,active:true});front.state.speed=36;
 for(let i=0;i<120;i++){front.step(1/60,{forward:1});clear(front.state);}assert.ok(front.state.z>128);
 for(const [y,vertical]of [[-168,1],[-70,-1]]){
  const p=createSubmarinePhysics({x:0,y,z:65,yaw:0,active:true});assert.equal(p.state.active,true);
  for(let i=0;i<180;i++){p.step(1/60,{vertical});clear(p.state);}assert.ok(y< -165?p.state.y< -166.5:p.state.y> -77.5);
 }
});
test('refitting keeps all twelve original detailed reef templates, scales and unchanged colonies',()=>{
 assert.equal(MOSA_REEF_INSTANCES.length,12);const moved=[];
 for(const [i,c]of MOSA_REEF_INSTANCES.entries()){
  const original=MOSA_REEF_AUTHORED_INSTANCES[i];for(const key of ['radius','scaleXZ','scaleY','kind','top','base','yaw'])assert.equal(c[key],original[key],key);
  if(c.x!==original.x||c.z!==original.z)moved.push(i);else assert.equal(c,original);
 }
 // The enlarged ocean's real forecourt supersedes the old six-translation
 // fixture. Verify actual vertices through the complete navigable depth.
 assert.ok(moved.length>0&&moved.length<12);
 for(const [i,c]of MOSA_REEF_INSTANCES.entries()){
  const p=mosaReefTemplate(c.kind).attributes.position,cos=Math.cos(c.yaw),sin=Math.sin(c.yaw),gap=moved.includes(i)?5:2;
  for(let j=0;j<p.count;j++){const y=c.base+p.getY(j)*c.scaleY;if(y<MOSA_FORECOURT.floor||y>1)continue;const x=c.x+(p.getX(j)*cos+p.getZ(j)*sin)*c.scaleXZ,z=c.z+(-p.getX(j)*sin+p.getZ(j)*cos)*c.scaleXZ;assert.ok(oceanClearanceDistance(x,z)>=gap-1e-6,`reef ${i} vertex ${j} keeps the actual deep approach open`);}
 }
});
