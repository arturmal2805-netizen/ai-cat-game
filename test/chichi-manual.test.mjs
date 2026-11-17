import test from'node:test';import assert from'node:assert/strict';import{stepChichiWalk}from'../public/chichi-manual.js';
test('third-person walking is camera-relative, diagonal-normalized and sweeps the full body before a thin wall',()=>{
 const surface=(p,r)=>p.x+r<1&&Math.abs(p.z)<20?{y:.16,biome:'moon'}:null;const s={x:0,y:.16,z:0,yaw:0};for(let i=0;i<20;i++)stepChichiWalk(s,.1,{forward:1,side:0,heading:Math.PI/2},surface,.6);assert.ok(s.x<.4&&s.x>0);assert.ok(Math.abs(s.z)<1e-8);const t={x:0,y:.16,z:0,yaw:0};const f=stepChichiWalk(t,.1,{forward:1,side:1,heading:0},()=>({y:.16,biome:'moon'}),.6);assert.ok(Math.abs(f.distance-.5)<1e-9);assert.ok(t.x>0&&t.z>0);
});
test('native ground heights are followed without stepping through a cliff and turning is independent of FPS',()=>{
 const surface=p=>({y:p.z>.6?2.56:.16,biome:'moon'}),s={x:0,y:.16,z:0,yaw:0};for(let i=0;i<30;i++)stepChichiWalk(s,1/30,{forward:1,side:0,heading:0},surface,.6);assert.ok(s.z<=.6);assert.equal(s.y,.16);const run=hz=>{const p={x:0,y:.16,z:0,yaw:0};for(let i=0;i<hz;i++)stepChichiWalk(p,1/hz,{forward:1,side:0,heading:1},()=>({y:.16,biome:'moon'}),.6);return p;};const a=run(30),b=run(60);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-8);assert.ok(Math.abs(a.yaw-b.yaw)<1e-8);
});
