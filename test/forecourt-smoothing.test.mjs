import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MOSA_FORECOURT as c,oceanForecourtBedY} from '../public/mosasaur-forecourt.js';
import {mallConstructionFootprintDistance,mallFoundationBedY} from '../public/mall-layout.js';
import {mosaNaturalBedY} from '../public/mosasaur-data.js';
const source=readFileSync(new URL('./fixtures/forecourt-fe9415c.txt',import.meta.url),'utf8'),provenance=JSON.parse(readFileSync(new URL('./fixtures/forecourt-fe9415c.json',import.meta.url)));
assert.equal(createHash('sha256').update(source).digest('hex'),provenance.sha256);
const approvedSource=readFileSync(new URL('./fixtures/forecourt-approved-0bf98d5.txt',import.meta.url),'utf8');
assert.equal(createHash('sha256').update(approvedSource).digest('hex'),JSON.parse(readFileSync(new URL('./fixtures/forecourt-approved-0bf98d5.json',import.meta.url))).sha256);
const absolute=JSON.stringify(new URL('../public/mall-layout.js',import.meta.url).href),old=await import('data:text/javascript;base64,'+Buffer.from(source.replace("'./mall-layout.js'",absolute)).toString('base64'));
const approved=await import('data:text/javascript;base64,'+Buffer.from(approvedSource.replace("'./mall-layout.js'",absolute)).toString('base64'));
test('only the front bay grows modestly, keeping its depth and the released Mall foundation',()=>{
 assert.equal(c.z+c.rz-(old.MOSA_FORECOURT.z+old.MOSA_FORECOURT.rz),46);
 assert.equal(c.rx-old.MOSA_FORECOURT.rx,12);assert.equal(c.floor,old.MOSA_FORECOURT.floor);
 for(let z=-40;z<=300;z+=2)for(let x=-210;x<=210;x+=2){
  if(mallConstructionFootprintDistance(x,z)>0)continue;
  const bed=mallFoundationBedY(x,z,mosaNaturalBedY(x,z));assert.equal(oceanForecourtBedY(x,z,bed),old.oceanForecourtBedY(x,z,bed));
 }
});
test('smoothing never fills released swimming space, and far floor remains exact',()=>{
 let newlyDeep=0;
 for(let z=-20;z<=340;z+=1.5)for(let x=-280;x<=280;x+=1.5){
  const bed=mallFoundationBedY(x,z,mosaNaturalBedY(x,z)),before=old.oceanForecourtBedY(x,z,bed),after=oceanForecourtBedY(x,z,bed);
  assert.ok(after<=before+1e-10,`no buried saved swimmer at ${x},${z}`);
  assert.ok(after<=approved.oceanForecourtBedY(x,z,bed)+1e-10,'approved shoulder never fills');assert.ok(Number.isFinite(after));if(after<before-3)newlyDeep++;
 }
 assert.ok(newlyDeep>1000);
 for(const [x,z]of [[300,200],[-300,200],[0,320],[0,-100]])assert.equal(oceanForecourtBedY(x,z,-90),-90);
 assert.equal(oceanForecourtBedY(0,275,-90),-190,'the former front rim now has full swimming depth');
});
test('the forward extension joins the approved shoulder with zero first and second excavation derivatives',()=>{
 for(let i=0;i<16;i++){
  const angle=i*Math.PI/8,r=1+c.shoulder/c.rz,at=d=>{const x=Math.cos(angle)*c.rx*(r-d),z=c.z+Math.sin(angle)*c.rz*(r-d);return oceanForecourtBedY(x,z,-100)-approved.oceanForecourtBedY(x,z,-100);};
  // Normalized radial step is at most 0.2 mm; measure the boundary limit.
  const h=1e-6,f0=at(0),f1=at(h),f2=at(2*h);assert.ok(Math.abs(f0)<1e-9);assert.ok(Math.abs(f1)/h<.001);assert.ok(Math.abs(f2-2*f1+f0)/(h*h)<1);
 }
});
