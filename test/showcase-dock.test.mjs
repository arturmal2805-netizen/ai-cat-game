import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {SHOWCASE_WATER_RIDES} from '../public/showcase-water-data.js';
import {createShowcaseRoute} from '../public/showcase-water-motion.js';
import {showcaseProps} from '../public/showcase-water-props.js';
import {showcaseMooring,dockFenceRuns} from '../public/showcase-dock.js';
import {referenceSlideAttraction} from '../public/reference-slide-assets.js';
import {runSceneSteps} from '../public/scene-tasks.js';
import {disposeScenery} from '../public/scenery-models.js';

test('all four landing gates keep actual posts and rail vertices outside the real moored hull while retaining the surrounding fence',()=>{
 let checked=0,gates=0;const p=new T.Vector3();
 for(const spec of SHOWCASE_WATER_RIDES){
  const route=createShowcaseRoute(spec),mooring=showcaseMooring(spec,route);if(!mooring)continue;
  const root=new T.Group(),props=new T.Group();root.add(props);runSceneSteps(showcaseProps(props,root,spec,route));root.updateMatrixWorld(true);
  const model=referenceSlideAttraction(spec.id),moving=model.userData.moving;model.updateMatrixWorld(true);const inverse=moving.matrixWorld.clone().invert();let hull=0,posts=0,rails=0;
  moving.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);hull=Math.max(hull,Math.hypot(p.x,p.z));}});
  assert.ok(hull+.15<mooring.radius,spec.kind+' clearance smaller than the actual hull');
  props.traverse(o=>{if(!o.userData.showcaseDockFence)return;if(o.geometry.type==='TubeGeometry')rails++;else posts++;const a=o.geometry.attributes.position;
   for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);if(p.y<mooring.position.y-.4||p.y>mooring.position.y+4.5)continue;assert.ok(Math.hypot(p.x-mooring.position.x,p.z-mooring.position.z)>hull+.05,spec.kind+' fence through the real boat at '+p.toArray());checked++;}
  });
  assert.ok(posts>8&&rails>3,spec.kind+' surrounding fence was lost');gates++;disposeScenery(model);disposeScenery(root);
 }
 assert.equal(gates,4);assert.ok(checked>10000);
});

test('ordinary railings retain the original points without a landing obstruction',()=>{
 const points=[new T.Vector3(0,20,0),new T.Vector3(10,20,0),new T.Vector3(20,20,0)],mooring={position:new T.Vector3(10,2,0),radius:6.8};
 for(const dock of [null,mooring]){const result=dockFenceRuns(points,dock);assert.equal(result.runs.length,1);assert.equal(result.runs[0],points);assert.deepEqual(result.ends,[]);}
 for(const spec of SHOWCASE_WATER_RIDES){const route=createShowcaseRoute(spec);if(showcaseMooring(spec,route))continue;const root=new T.Group(),props=new T.Group();root.add(props);runSceneSteps(showcaseProps(props,root,spec,route));props.traverse(o=>{if(o.userData.showcaseDockFence&&o.geometry.type==='TubeGeometry')assert.equal(o.geometry.parameters.tubularSegments,24,spec.kind+' ordinary rail tessellation changed');});disposeScenery(root);}
});
