import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createExplorerCameraFollower,traceExplorerCamera,mallExplorerCameraClear,EXPLORER_VIEW} from '../public/explorer-camera.js';
import {MALL_LAYOUT as L} from '../public/mall-layout.js';

test('third-person follow keeps the real carrier ahead at a small pitch and has no stationary head/gait wobble',()=>{
 const camera=new T.PerspectiveCamera(60,.6,.12,1200),look=new T.Vector3(),follow=createExplorerCameraFollower(camera,look),anchor=new T.Vector3(4,2,7);
 follow.update(.1,anchor,0,EXPLORER_VIEW.pitch,6,()=>true);const before=camera.position.clone();assert.ok(camera.position.z<anchor.z-5);assert.ok(camera.position.y>anchor.y&&camera.position.y<anchor.y+1.5);assert.ok(camera.getWorldDirection(new T.Vector3()).z>.95);
 for(let i=0;i<200;i++){camera.position.set(100,150,50);follow.update(1/60,anchor,0,EXPLORER_VIEW.pitch,6,()=>true);}
 assert.ok(camera.position.distanceTo(before)<1e-10);assert.deepEqual(look.toArray(),anchor.toArray());
});
test('camera follow is independent of 30/60/144 FPS and returns smoothly after an obstruction',()=>{
 const run=rate=>{const c=new T.PerspectiveCamera(),l=new T.Vector3(),f=createExplorerCameraFollower(c,l),p=new T.Vector3(0,1.1,0);f.update(0,p,0,.18,6,()=>true);for(let i=0;i<rate;i++)f.update(1/rate,p,Math.PI/2,.18,6,()=>true);return c.position;};
 assert.ok(run(30).distanceTo(run(144))<1e-9);assert.ok(run(60).distanceTo(run(144))<1e-9);
 const c=new T.PerspectiveCamera(),l=new T.Vector3(),f=createExplorerCameraFollower(c,l),p=new T.Vector3(0,1.1,0),blocked=(_a,b)=>b.z> -2;
 f.update(0,p,0,.18,6,()=>true);f.update(1/60,p,0,.18,6,blocked);assert.ok(c.position.z>=-2,'collision retracts immediately, without interpolating through a wall');const close=c.position.clone();f.update(1/60,p,0,.18,6,()=>true);assert.ok(c.position.z<close.z&&c.position.z> -3,'cleared camera eases back instead of snapping');
 const alias=new T.Vector3(0,0,-6);traceExplorerCamera(new T.Vector3(),alias,blocked,alias);assert.ok(alias.z< -1&&alias.z>=-2);
});
test('mall camera preserves real upper-floor atrium holes and rejects floor slabs, walls and furniture',()=>{
 const boxes=new Map([[1,[]]]),p=(x,y,z=L.z)=>({x,y:L.y+y,z});
 assert.equal(mallExplorerCameraClear(p(0,7),p(0,10),boxes),true,'open atrium is not a merged bounding box');
 assert.equal(mallExplorerCameraClear(p(30,7),p(30,10),boxes),false,'real upper gallery slab stops the camera');
 assert.equal(mallExplorerCameraClear(p(30,1),p(30,-1),boxes),false,'camera cannot pass below ground floor');
 assert.equal(mallExplorerCameraClear(p(55,2),p(65,2),boxes),true,'real joined wing stays open');assert.equal(mallExplorerCameraClear(p(122,2),p(132,2),boxes),false,'outer glass is a real boundary');
 boxes.set(1,[{x:30,z:0,c:1,s:0,hx:.4,hz:1,minY:0,maxY:2.1}]);assert.equal(mallExplorerCameraClear(p(28,1),p(32,1),boxes),false);assert.equal(mallExplorerCameraClear(p(28,4),p(32,4),boxes),true,'camera may pass above a genuinely low fixture');
 const high=new Map([[1,[{x:30,z:0,c:1,s:0,hx:.5,hz:1,minY:3,maxY:5}]]]);assert.equal(mallExplorerCameraClear(p(28,4),p(32,4),boxes,.22,null,high),false,'overhead boxes stay separate from navigation');
});
