import test from 'node:test';
import assert from 'node:assert/strict';
import {stepMallWalker} from '../public/mall-walker.js';
import {MALL_LAYOUT as L} from '../public/mall-layout.js';
const floors=()=>new Map(Array.from({length:7},(_,i)=>{const boxes=[];boxes.layoutVersion=2;boxes.floor=i+1;return [i+1,boxes];}));
test('walker traverses the complete authored escalator both ways and retains the true storey',()=>{
 const obstacles=floors(),s={x:18.4,y:L.y+.18,z:L.z-13.6,floor:1,yaw:0};
 for(let i=0;i<60;i++)stepMallWalker(s,.1,{forward:1},obstacles);
 assert.equal(s.floor,2);assert.ok(Math.abs(s.y-(L.y+L.rise+.18))<.2);assert.ok(s.z>L.z+13);
 for(let i=0;i<60;i++)stepMallWalker(s,.1,{forward:-1},obstacles);
 assert.equal(s.floor,1);assert.ok(Math.abs(s.y-(L.y+.18))<.2);
});
test('walking cannot cross the shaft, wall, furniture or another cat; jump lands on the same floor',()=>{
 const obstacles=floors(),s={x:-43,y:L.y+.18,z:105,floor:1,yaw:Math.PI};
 for(let i=0;i<80;i++)stepMallWalker(s,.1,{forward:1},obstacles);
 assert.ok(s.z>L.lift.z+L.lift.radius+.6);
 const before={...s};for(let i=0;i<10;i++)stepMallWalker(s,.1,{forward:-1},obstacles,.6,[{id:'friend',x:s.x,y:s.y,z:s.z+.9,radius:.6}]);assert.equal(s.z,before.z);
 for(let i=0;i<20;i++)stepMallWalker(s,.05,{jump:i===0},obstacles);assert.ok(Math.abs(s.y-(L.y+.18))<.01);
 const wall={x:-43,y:L.y+.18,z:117,floor:1,yaw:0};for(let i=0;i<20;i++)stepMallWalker(wall,.1,{forward:1},obstacles);assert.ok(wall.z<119);
 const chamber={x:-43,y:L.y+.18,z:105,floor:1,yaw:0};for(let i=0;i<20;i++)stepMallWalker(chamber,.1,{forward:1},obstacles);assert.ok(chamber.z<110,'closed inner pressure door blocks ordinary walking');
});
