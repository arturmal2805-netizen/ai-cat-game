import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {sculptMosasaurSteps,MOSA_ANATOMY_REVISION} from '../public/mosasaur-anatomy.js';
import {mosasaurGeometry,mosasaurDentalAnchors} from '../public/mosasaur-sculpt.js';
import {encodeMosasaurModels,decodeMosasaurModels} from '../public/mosasaur-model-codec.js';
import {runSceneSteps} from '../public/scene-tasks.js';
test('the new long sculpt closes its snout and tail instead of clipping at the authoring grid boundary',()=>{
 const g=runSceneSteps(sculptMosasaurSteps('body')),p=g.attributes.position,edges=new Map();
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(n=>Math.round(n*10000)).join(',');
 const index=g.index.array;for(let i=0;i<index.length;i+=3)for(let j=0;j<3;j++){const a=key(index[i+j]),b=key(index[i+(j+1)%3]),k=a<b?a+'|'+b:b+'|'+a;if(a===b)continue;edges.set(k,(edges.get(k)||0)+1);}
 assert.equal([...edges.values()].filter(n=>n!==2).length,0,'every skin edge belongs to two triangles');
 const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));
 const hit=new T.Raycaster(new T.Vector3(0,.3,12),new T.Vector3(0,0,-1)).intersectObject(mesh)[0];assert.ok(hit&&hit.point.z>9,'a real continuous nose closes the head');
 g.dispose();mesh.material.dispose();
});
test('offline marine assets preserve every skin attribute, tooth root and closed-mouth surface; corrupt data is rejected',()=>{
 const models={body:mosasaurGeometry('body'),jaw:mosasaurGeometry('jaw')};
 for(const [kind,g]of Object.entries(models)){const anchors=mosasaurDentalAnchors(kind,g);assert.equal(anchors.length,kind==='body'?80:72);}
 const bytes=encodeMosasaurModels(models),copy=decodeMosasaurModels(bytes);
 for(const kind of ['body','jaw']){
  for(const name of ['position','normal','color','uv'])assert.deepEqual(copy[kind].attributes[name].array,models[kind].attributes[name].array);
  assert.deepEqual(copy[kind].index.array,models[kind].index.array);assert.deepEqual(copy[kind].userData.dentalAnchors,models[kind].userData.dentalAnchors);copy[kind].dispose();
 }
 assert.throws(()=>decodeMosasaurModels(bytes.slice(0,bytes.byteLength-32)),/Invalid marine buffer/);
 const bad=bytes.slice(0);new DataView(bad).setUint32(0,0,true);assert.throws(()=>decodeMosasaurModels(bad),/Invalid marine model/);
 assert.ok(MOSA_ANATOMY_REVISION.includes('continuous'));
});
