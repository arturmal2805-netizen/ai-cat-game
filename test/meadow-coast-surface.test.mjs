import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {mosasaurBiomeSteps} from '../public/mosasaur-biome.js';import {byBiome} from '../public/game-data.js';import {runSceneSteps} from '../public/scene-tasks.js';
import {coastMeadowGeometrySteps} from '../public/meadow-coast-surface.js';
import {coastMeadowCover,coastMeadowCells} from '../public/meadow-coast-field.js';
const root=runSceneSteps(mosasaurBiomeSteps(byBiome('autumn'),{lowOnly:true})),shore=root.getObjectByName('Wide dry beaches and walkable island ring'),source=shore.geometry;
const geometry=runSceneSteps(coastMeadowGeometrySteps(source));
test('full-coast soil grid retains the original plane, cap area, holes and every solid side face',()=>{
 const sourceP=source.attributes.position,sourceN=source.attributes.normal,p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,legacy=geometry.groups[0].count;
 const original=[];for(let i=0;i<sourceP.count;i+=3)if([0,1,2].some(j=>sourceN.getY(i+j)<.9))for(let j=0;j<3;j++)original.push(i+j);
 assert.equal(legacy,original.length);for(let i=0;i<original.length;i++){assert.equal(p.getX(i),sourceP.getX(original[i]));assert.equal(p.getY(i),sourceP.getY(original[i]));assert.equal(p.getZ(i),sourceP.getZ(original[i]));assert.equal(n.getY(i),sourceN.getY(original[i]));}
 let area=0;const index=geometry.index;for(let i=legacy;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2),signed=((p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a))-(p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a)))/2;assert.ok(signed>0,'every cap triangle faces up');area+=signed;}
 assert.ok(Math.abs(area-geometry.userData.coastMeadow.originalTopArea)<.1);
 for(let i=legacy;i<p.count;i++){assert.ok(Math.abs(p.getY(i)-.14)<1e-6);assert.equal(n.getY(i),1);assert.equal(uv.getX(i),p.getX(i));assert.equal(uv.getY(i),-p.getZ(i));const soil=geometry.attributes.aMeadowSoil.getX(i);assert.ok(soil>=0&&soil<=1);}
 const meta=geometry.userData.coastMeadow;
 for(const [ring,boundary]of [[0,meta.innerBoundary],[meta.rings-1,meta.outerBoundary]])for(const [x,z]of boundary){let nearest=Infinity;for(let i=0;i<meta.angles;i++){const id=legacy+i*meta.rings+ring;nearest=Math.min(nearest,Math.hypot(p.getX(id)-x,p.getZ(id)-z));}assert.ok(nearest<.00004,'the native polygon boundary must survive the soil grid');}
 assert.ok(geometry.index.count/3<70000,'the soil mask must not become a million-triangle island mesh');
});
test('sampled native downward rays see exactly the same shore opening and walk height',()=>{
 root.updateMatrixWorld(true);const material=new T.MeshBasicMaterial(),candidate=new T.Mesh(geometry,[material,material]),ray=new T.Raycaster();candidate.updateMatrixWorld(true);let samples=0;
 for(let x=-410;x<=410;x+=37)for(let z=-400;z<=400;z+=41){ray.set(new T.Vector3(x,10,z),new T.Vector3(0,-1,0));const a=ray.intersectObject(shore,false),b=ray.intersectObject(candidate,false);assert.equal(!!a.length,!!b.length,x+','+z);if(a.length)assert.ok(Math.abs(a[0].point.y-b[0].point.y)<1e-6);samples++;}assert.ok(samples>200);material.dispose();
});
test('shore field excludes water, cliffs, outside land and the existing pier approach',()=>{
 assert.equal(coastMeadowCover(0,0).grass,0);assert.equal(coastMeadowCover(500,0).region,0);
 for(let z=235;z<310;z+=2)assert.equal(coastMeadowCover(0,z).grass,0);
 const cover=coastMeadowCover(367,-25);assert.ok(cover.grass>.8);
});
test('visible grass cells are deterministic and bounded at every coast camera and sleep far above or below it',()=>{
 for(let a=0;a<Math.PI*2;a+=.17){const eye={x:Math.cos(a)*376,y:2,z:Math.sin(a)*358},cells=coastMeadowCells(eye);assert.ok(cells.length<=192);assert.equal(new Set(cells.map(c=>c.key)).size,cells.length);assert.deepEqual(cells,coastMeadowCells(eye));for(let i=1;i<cells.length;i++)assert.ok(cells[i].distance>=cells[i-1].distance);}
 assert.deepEqual(coastMeadowCells({x:373,y:100,z:-25}),[]);assert.deepEqual(coastMeadowCells({x:373,y:-150,z:-25}),[]);assert.deepEqual(coastMeadowCells({x:0,y:2,z:0}),[]);
});
