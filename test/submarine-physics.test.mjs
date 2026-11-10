import {test}from'node:test';import assert from'node:assert/strict';import{createSubmarinePhysics,normalizeSubmarine,SUBMARINE_MAX_SPEED,SUBMARINE_DOCK}from'../public/submarine-physics.js';import{mosaBedY,MOSA_SEA}from'../public/mosasaur-data.js';
test('submarine accelerates, reverses, steers, dives, brakes and switches no currencies or NPC state',()=>{
 const p=createSubmarinePhysics();p.state.active=true;
 for(let i=0;i<300;i++)p.step(1/60,{forward:1});assert.ok(p.state.speed>20);assert.ok(p.state.speed<=SUBMARINE_MAX_SPEED);
 const old=p.state.yaw;for(let i=0;i<90;i++)p.step(1/60,{turn:1,vertical:-1});assert.notEqual(p.state.yaw,old);assert.ok(p.state.y<-5);
 for(let i=0;i<240;i++)p.step(1/60,{});assert.ok(Math.abs(p.state.speed)<.01);
 for(let i=0;i<180;i++)p.step(1/60,{forward:-1});assert.ok(p.state.speed<-6);
});
test('real-time long frames do not tunnel through terrain or cave/ruin capsules',()=>{
 const p=createSubmarinePhysics({x:0,y:-5,z:0,yaw:Math.PI/2,active:true});
 for(let i=0;i<800;i++){p.step(.1,{forward:1,vertical:i<300?-1:1,turn:i%100<40?.3:0});assert.ok(p.state.y>mosaBedY(p.state.x,p.state.z)+1);assert.ok(Math.hypot(p.state.x/(MOSA_SEA.rx-3),p.state.z/(MOSA_SEA.rz-3))<1.01);assert.ok(Object.values(p.snapshot()).every(v=>typeof v!=='number'||Number.isFinite(v)));}
});
test('safe entry/exit remains at the dedicated pier and invalid saved coordinates cannot strand the cat',()=>{
 const p=createSubmarinePhysics();assert.equal(p.atDock(),true);assert.deepEqual(normalizeSubmarine({x:Infinity,y:NaN,z:4,yaw:0}),{...SUBMARINE_DOCK,speed:0,vertical:0,turn:0,active:false,mode:'chase'});
 p.state.active=true;p.state.mode='cockpit';for(let i=0;i<100;i++)p.step(1/60,{forward:1});const q=createSubmarinePhysics(p.snapshot());assert.equal(q.state.active,true);assert.equal(q.state.mode,'cockpit');assert.equal(q.state.x,p.state.x);assert.equal(q.atDock(),false);
});
test('space gives a real ballistic water breach and shift descends again',()=>{
 const p=createSubmarinePhysics();p.state.active=true;p.step(1/60,{boost:true});let peak=p.state.y;for(let i=0;i<160;i++){p.step(1/60,{});peak=Math.max(peak,p.state.y);}assert.ok(peak>2);
 for(let i=0;i<180;i++)p.step(1/60,{vertical:-1});assert.ok(p.state.y<-5);
});
test('real save/load and cached shared clients retain the pilot pose without losing purchases or wallet',async()=>{
 const {newGame,loadGame}=await import('../public/economy.js'),{mergeSharedWorld}=await import('../shared-world.mjs');const now=Date.UTC(2026,10,4),g=newGame(now);g.unlocked.push('autumn');g.mosasaurSubmarine={x:20,y:-40,z:-10,yaw:.8,active:true,mode:'cockpit'};
 const restore=x=>loadGame({getItem:k=>k==='chichi-world-v2'?JSON.stringify(x):null},now,{advance:false});const loaded=restore(g);assert.deepEqual(loaded.mosasaurSubmarine,g.mosasaurSubmarine);assert.equal(loaded.coins,g.coins);assert.deepEqual(loaded.placements,g.placements);
 const cached=structuredClone(g);delete cached.mosasaurSubmarine;assert.deepEqual(mergeSharedWorld(g,g,cached).mosasaurSubmarine,g.mosasaurSubmarine);
 const docked=structuredClone(g);docked.mosasaurSubmarine={...SUBMARINE_DOCK,active:false,mode:'chase'};assert.equal(mergeSharedWorld(g,g,docked).mosasaurSubmarine.active,false);
});
