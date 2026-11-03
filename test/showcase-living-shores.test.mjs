import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {cliffGeometry,cliffSurfacePoint} from '../public/showcase-geology.js';
import {mossMantle,cliffVine,tropicalShrub,broadleaf,gardenUnderstory,canopyVolumeGeometry,gardenGroundCoverSteps,bankGardenSteps} from '../public/showcase-botany.js';
import {naturalBank,naturalBankPoint} from '../public/showcase-bank.js';
import {SHOWCASE_WATER_RIDES} from '../public/showcase-water-data.js';
import {createShowcaseRoute} from '../public/showcase-water-motion.js';
import {runSceneSteps} from '../public/scene-tasks.js';
import {receivingPool} from '../public/reference-slide-assets.js';
import {detailShowcaseBasin,showcaseBedHeight,polishShowcaseWater} from '../public/showcase-water-optics.js';
import {showcaseTrough} from '../public/showcase-water-assets.js';
import {slideRibbon} from '../public/slide-water.js';
import {waterMaterial} from '../public/water-shading.js';

test('eroded bluffs and moss share their real surface rather than independent floating cap radii',()=>{
 for(const [height,radius,seed]of [[7,4,0],[32,8,17],[60,5,-3]]){
  const cliff=cliffGeometry(height,radius,seed),p=cliff.attributes.position,root=new T.Group(),moss=mossMantle(root,0,0,height,radius,seed),m=moss.geometry.attributes.position;
  assert.ok(cliff.index.count/3<1700);assert.ok([...p.array,...cliff.attributes.normal.array].every(Number.isFinite));
  for(let i=0;i<=40;i++){const q=cliffSurfacePoint(height,radius,seed,i/40*Math.PI*2,1),j=18*41+i;assert.ok(q.distanceTo(new T.Vector3().fromBufferAttribute(p,j))<1e-4);}
  for(let i=0;i<=80;i++){const q=cliffSurfacePoint(height,radius,seed,i/80*Math.PI*2,1),v=new T.Vector3().fromBufferAttribute(m,i+1);assert.ok(Math.abs(v.y-q.y-.09)<1e-4);assert.ok(Math.abs(v.x-q.x*1.015)<1e-4);assert.ok(Math.abs(v.z-q.z*1.015)<1e-4);}
 }
});
test('river gardens root on the actual bank cap and never cross the clear boarding/ride volume',()=>{
 const spec=SHOWCASE_WATER_RIDES.find(s=>s.kind==='canyon-rafting'),route=createShowcaseRoute(spec),data=route.geometry[0],end=.82,g=naturalBank(data,spec.radius,spec.radius,1,{end}),positions=g.attributes.position;
 // Compare actual independently indexed top-cap edge vertices, not a copy of
 // a centreline or a two-dimensional box around the river.
 for(const row of [0,11,45,110,160])for(const [edge,x]of [[0,1.8],[1,5.2]]){
  const q=naturalBankPoint(data,spec.radius,spec.radius,1,.045+row/160*(end-.045),x,end),actual=new T.Vector3().fromBufferAttribute(positions,322+row*2+edge);assert.ok(actual.distanceTo(q)<1e-4);
 }
 const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld(true);for(const u of [.143,.291,.487,.693]){const p=naturalBankPoint(data,spec.radius,spec.radius,1,u,3.7,end),up=data.samples[Math.round(u*600)].up,hit=new T.Raycaster(p.clone().addScaledVector(up,3),up.clone().negate()).intersectObject(mesh)[0];assert.ok(hit&&hit.point.distanceTo(p)<.02);}
 const root=new T.Group(),roots=runSceneSteps(bankGardenSteps(root,data,spec.radius,spec.radius,1,end,()=>false));assert.equal(roots.length,0);root.traverse(o=>{if(o.isMesh)assert.equal(o.geometry.attributes.position.count,0);});
});
test('ground-cover placement respects receiving water, solid obstacles and denied walking spaces; all foliage stays opaque and shared',()=>{
 const spec=SHOWCASE_WATER_RIDES[0],root=new T.Group(),obstacles=[{x:0,z:0,radius:8}],denied=runSceneSteps(gardenGroundCoverSteps(root,spec,()=>false,()=>true,obstacles));assert.equal(denied.length,0);assert.equal(root.children.length,0);
 const patches=runSceneSteps(gardenGroundCoverSteps(root,spec,()=>true,(x,y,z)=>x>10,obstacles));assert.ok(patches.length>10&&patches.length<=64);
 for(const p of patches){assert.ok(p.x>10);assert.ok(Math.hypot(p.x,p.z)>9.4);assert.ok(Math.abs(p.x)+p.radius<62&&Math.abs(p.z)+p.radius<60);}
 const grass=root.children.filter(m=>m.userData.gardenPlant==='grass');assert.ok(grass.length>10);assert.ok(grass.every(m=>m.geometry===grass[0].geometry&&!m.material.transparent&&m.material.alphaTest===0));assert.ok(new Set(grass.map(m=>m.material)).size<=3);
 const crown=canopyVolumeGeometry();assert.equal(crown,canopyVolumeGeometry());for(let i=0;i<crown.attributes.position.count;i++){const p=new T.Vector3().fromBufferAttribute(crown.attributes.position,i);assert.ok(Math.abs(p.x)<.49&&Math.abs(p.z)<.49&&p.y>.64&&p.y<1.09);}
});
test('clear blue basins have a real sloping granular bed and all stones remain submerged through immutable updates',()=>{
 const spec=SHOWCASE_WATER_RIDES[0],pool=detailShowcaseBasin(receivingPool(spec)),bed=pool.userData.bed,p=bed.geometry.attributes.position,stones=pool.userData.showcaseBasin.stones;
 assert.ok(bed.material.map);assert.equal(bed.material.vertexColors,true);assert.ok(showcaseBedHeight(0)<showcaseBedHeight(.9)-.4);
 for(let i=0;i<p.count;i++){const y=p.getY(i);assert.ok(y>=-1.036&&y<-.24);assert.ok(pool.position.y+y>.05,'real terrain cannot hide the authored bed');}
 const a=stones.instanceMatrix.array.slice();for(let t=0;t<20;t+=.125)pool.userData.update(t,false);assert.deepEqual(stones.instanceMatrix.array,a);
 for(let i=0;i<24;i++){const mat=new T.Matrix4();stones.getMatrixAt(i,mat);const at=new T.Vector3().setFromMatrixPosition(mat),r=Math.hypot(at.x/spec.pool[2],at.z/spec.pool[3]);assert.ok(Math.abs(at.y-showcaseBedHeight(r)-.08)<1e-5);assert.ok(at.y+.27<.155);}
});
test('wave normals follow the actual small displacement; metre UVs and normalized barrel UVs keep separate clocks without extra samplers',()=>{
 const a=waterMaterial(),b=waterMaterial();b.userData.showcaseNormalisedFlow=true;const original=waterMaterial(),source=original.vertexShader;
 polishShowcaseWater(a,SHOWCASE_WATER_RIDES[0]);polishShowcaseWater(b,SHOWCASE_WATER_RIDES[0]);assert.equal(a.uniforms.uShowcaseNormalisedFlow.value,0);assert.equal(b.uniforms.uShowcaseNormalisedFlow.value,1);assert.match(a.vertexShader,/normalMatrix\*waterShadingNormal/);assert.match(a.vertexShader,/waveGradient=waveGradient\*fade-wave/);assert.equal(original.vertexShader,source);
 assert.equal((a.fragmentShader.match(/texture2D\(/g)||[]).length,(original.fragmentShader.match(/texture2D\(/g)||[]).length);
});

test('every wet trough keeps the real water above its floor through the entire ripple range, including both channel edges',()=>{
 for(const spec of SHOWCASE_WATER_RIDES){const route=createShowcaseRoute(spec);for(const data of route.geometry){if(data.carousel||data.barrel)continue;
  const width=data.surf?15:spec.radius,shell=showcaseTrough(data,width,spec.radius),water=slideRibbon({samples:data.samples,width:width-.12,offset:-spec.radius+.15,steps:360}),floor=shell.floor.attributes.position,wet=water.attributes.position,normal=water.attributes.normal;
  for(let i=0;i<floor.count;i++){
   const row=Math.floor(i/9),sample=data.samples[Math.round(row/360*600)],delta=new T.Vector3().fromBufferAttribute(wet,i).sub(new T.Vector3().fromBufferAttribute(floor,i)),clearance=delta.dot(sample.up),rippleProjection=Math.abs(new T.Vector3().fromBufferAttribute(normal,i).dot(sample.up))*.0945;
   assert.ok(clearance-rippleProjection>.045,spec.kind+' water crosses its floor at vertex '+i+': '+clearance);
  }
  shell.floor.dispose();water.dispose();shell.walls.forEach(g=>g.dispose());
 }}
});

test('large shrubs and broadleaf ground beds replace tiny filler plants while retaining opaque shared templates and full clearance',()=>{
 const spec=SHOWCASE_WATER_RIDES[0],root=new T.Group(),obstacles=[];
 assert.equal(runSceneSteps(gardenUnderstory(root,spec,()=>true,obstacles,()=>false)).length,0);
 const beds=runSceneSteps(gardenUnderstory(root,spec,()=>true,obstacles,()=>true));assert.equal(beds.length,24);assert.equal(obstacles.length,24);
 const shrub=root.children.filter(o=>o.userData.gardenPlant==='shrub'),wide=root.children.filter(o=>o.userData.gardenPlant==='broadleaf');assert.equal(shrub.length,24);assert.equal(wide.length,24);
 assert.ok(shrub.every(o=>o.geometry===shrub[0].geometry&&!o.material.transparent&&o.geometry.index.count/3<=400));assert.ok(wide.every(o=>o.geometry===wide[0].geometry&&!o.material.transparent&&o.geometry.index.count/3<=320));
 for(const o of [...shrub,...wide])assert.ok([...o.geometry.attributes.position.array,...o.geometry.attributes.normal.array].every(Number.isFinite));
 const vine=cliffVine(root,8,2,24,7,3,.8,8),q=cliffSurfacePoint(24,7,3,.8,1),p=new T.Vector3(...vine.userData.cliffVine.root);assert.ok(Math.abs(p.x-q.x*1.035)<1e-6&&Math.abs(p.z-q.z*1.035)<1e-6);assert.ok(p.y>q.y&&p.y-q.y<.1);
});
