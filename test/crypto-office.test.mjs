import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import{jobBuilding,jobBuildingSteps}from'../public/jobcity-assets.js';import{jobBusiness,jobStations}from'../public/jobcity-data.js';import{workplacePath}from'../public/jobcity-navigation.js';import{jobCatFrame}from'../public/jobcity-runtime.js';import{cryptoDisplays}from'../public/crypto-displays.js';import{disposeScenery}from'../public/scenery-models.js';
test('the actual crypto office is cooperative, open on three floors, and preserves six independent stair-connected work stations',()=>{
 const iterator=jobBuildingSteps('job-crypto');let step,count=0;do{step=iterator.next();count++;}while(!step.done);const root=step.value,b=jobBusiness('job-crypto');
 try{assert.ok(count>6);assert.equal(root.userData.stats.floors,3);assert.equal(root.userData.stats.workplaces,6);assert.equal(root.userData.stats.candlestickScreens,8);assert.ok(root.userData.stats.staticMeshes<=20);assert.ok(root.userData.roof.isGroup);assert.equal(root.userData.roof.parent,root);
  const seats=jobStations(b);assert.equal(new Set(seats.map(p=>[p.x,p.y,p.z].join())).size,6);
  for(let i=0;i<6;i++){const path=workplacePath({x:0,z:59},b,i);assert.ok(path.length>2);assert.deepEqual(path.at(-1),seats[i]);for(let j=1;j<path.length;j++)assert.ok(Math.abs(path[j].y-path[j-1].y)<=4.61);}
 }finally{disposeScenery(root);}
});
test('all eight charts reuse one fixed GPU submission, instance matrix and price array through trading ticks and state clones',()=>{
 const placements=Array.from({length:8},(_,i)=>({x:i,y:2,z:0,w:2,h:1})),d=cryptoDisplays(placements),matrix=d.mesh.instanceMatrix,prices=d.mesh.material.uniforms.prices.value,geometry=d.mesh.geometry;
 const trade={id:'one',status:'open',startedAt:1000,durationMs:45000,path:Array.from({length:65},(_,i)=>42000*(1+i*.001+Math.sin(i)*.003))},state={profiles:{one:{profession:'crypto',investments:{current:trade}},other:{profession:'bank',investments:{current:{...trade,id:'wrong-role'}}}}};
 d.setState(state);const original=Array.from(prices);
 for(let i=0;i<300;i++){d.setState(structuredClone(state));d.update(i/30,false);assert.equal(d.mesh.instanceMatrix,matrix);assert.equal(d.mesh.material.uniforms.prices.value,prices);assert.equal(d.mesh.geometry,geometry);assert.deepEqual(Array.from(prices),original);}
 d.update(1,true);assert.equal(d.mesh.material.uniforms.progress.value,1);assert.equal(d.mesh.count,8);assert.ok(d.mesh.boundingSphere.radius>0);d.mesh.geometry.dispose();d.mesh.material.dispose();
});
test('crypto typing and brief profit/loss expressions expire cleanly and freeze in reduced motion without changing other professions',()=>{
 const visit={id:'pixel',phase:'work',position:{x:0,y:.32,z:0},yaw:0,phaseTime:10,speed:0,job:'crypto'},now=100000,trade={id:'test',status:'closed',margin:100,leverage:2,fee:1,entryPrice:42000,exitPrice:43000,startedAt:50000,endAt:95000,closedAt:95000,durationMs:45000,path:Array(65).fill(42000),pnl:25};
 const base=jobCatFrame(visit,10,false,now),profit=jobCatFrame({...visit,investments:{current:trade}},10,false,now),loss=jobCatFrame({...visit,investments:{current:{...trade,pnl:-25}}},10,false,now),small=jobCatFrame({...visit,investments:{current:{...trade,pnl:0}}},10,false,now);
 assert.equal(profit.cryptoOutcome,'profit');assert.equal(loss.cryptoOutcome,'loss');assert.equal(small.cryptoOutcome,'calm');assert.ok(profit.reaction.paw>base.reaction.paw);assert.ok(loss.reaction.headPitch>profit.reaction.headPitch);
 assert.deepEqual(jobCatFrame({...visit,investments:{current:trade}},10,false,now+1001),base);
 const v={...visit,investments:{current:{...trade,status:'open'}}};assert.deepEqual(jobCatFrame(v,1,true,now),jobCatFrame(v,40,true,now));
 assert.deepEqual(jobCatFrame({...v,job:'bank'},10,false,now),jobCatFrame({...visit,job:'bank'},10,false,now));assert.equal(visit.investments,undefined);
});
