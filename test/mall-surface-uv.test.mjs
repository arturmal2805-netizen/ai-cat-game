import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mallSurfaceUVKey,writeMallSurfaceUVs,stampMallSurfaceUVsSteps} from '../public/mall-surface-uv.js';
import {createMallRoomLights} from '../public/mall-room-light.js';
import {runSceneSteps} from '../public/scene-tasks.js';
import {mallKitSteps} from '../public/mall-kit.js';
import {mallArchitectureFloorSteps} from '../public/mall-architecture.js';
const finish=kind=>{const map=new T.Texture();map.userData.mallSurfaceKind=kind;return new T.MeshStandardMaterial({map});};
test('floor tiles retain metre density and match across adjoining transformed panels without changing source geometry',()=>{
 const source=new T.PlaneGeometry(2,2);source.rotateX(-Math.PI/2);
 const before={positions:source.attributes.position.array.slice(),normals:source.attributes.normal.array.slice(),uv:source.attributes.uv.array.slice()};
 const root=new T.Group();root.position.set(12,3,-8);root.rotation.y=.63;root.scale.set(2,1,1.4);
 const a=new T.Mesh(source,finish('marble')),b=new T.Mesh(source,a.material);b.position.x=2;root.add(a,b);root.updateMatrixWorld(true);
 for(const mesh of [a,b]){const copy=source.clone();assert.equal(writeMallSurfaceUVs(mesh,copy),true);assert.deepEqual(copy.attributes.position.array,before.positions);assert.deepEqual(copy.attributes.normal.array,before.normals);
  for(let i=0;i<copy.attributes.position.count;i++){const world=new T.Vector3().fromBufferAttribute(copy.attributes.position,i).applyMatrix4(mesh.matrixWorld);assert.ok(Math.abs(copy.attributes.uv.getX(i)-world.x/2.4)<1e-6);assert.ok(Math.abs(copy.attributes.uv.getY(i)+world.z/2.4)<1e-6);}mesh.geometry=copy;
 }
 // a's right edge is b's left edge in the actual transformed world.
 for(const [i,j] of [[1,0],[3,2]]){assert.equal(a.geometry.attributes.uv.getX(i),b.geometry.attributes.uv.getX(j));assert.equal(a.geometry.attributes.uv.getY(i),b.geometry.attributes.uv.getY(j));}
 assert.deepEqual(source.attributes.position.array,before.positions);assert.deepEqual(source.attributes.normal.array,before.normals);assert.deepEqual(source.attributes.uv.array,before.uv);
});
test('room stamping shares only equivalent finish transforms and preserves native collider positions and primitive UVs',()=>{
 const source=new T.BoxGeometry(2,3,4),original=source.attributes.uv.array.slice(),material=finish('warm'),root=new T.Group();
 const a=new T.Mesh(source,material),b=new T.Mesh(source,material),c=new T.Mesh(source,material);c.position.set(3,0,0);root.add(a,b,c);root.updateMatrixWorld(true);
 assert.equal(mallSurfaceUVKey(a),mallSurfaceUVKey(b));assert.notEqual(mallSurfaceUVKey(a),mallSurfaceUVKey(c));
 const lights=createMallRoomLights();runSceneSteps(lights.stamp(root,2));assert.equal(a.geometry,b.geometry);assert.notEqual(a.geometry,c.geometry);assert.notEqual(a.geometry,source);
 for(const mesh of [a,b,c]){assert.deepEqual(mesh.geometry.attributes.position.array,source.attributes.position.array);assert.deepEqual(mesh.geometry.index.array,source.index.array);assert.ok([...mesh.geometry.attributes.aMallRoom.array].every(id=>id===2));}
 assert.deepEqual(source.attributes.uv.array,original);assert.equal(source.hasAttribute('aMallRoom'),false);
 const plain=new T.Mesh(source,new T.MeshStandardMaterial());plain.updateMatrixWorld();const copy=source.clone();assert.equal(writeMallSurfaceUVs(plain,copy),false);assert.deepEqual(copy.attributes.uv.array,original);lights.finish();lights.texture.dispose();
});

test('the real public floor receives metre UVs even though it bypasses room lighting',()=>{
 const kit=runSceneSteps(mallKitSteps()),floor=runSceneSteps(mallArchitectureFloorSteps({id:1},kit));let slab;
 floor.structure.traverse(mesh=>{if(mesh.userData.mallWalkSurface)slab=mesh;});assert.ok(slab);
 const original=slab.geometry,positions=original.attributes.position.array.slice(),uv=original.attributes.uv.array.slice();
 assert.ok(runSceneSteps(stampMallSurfaceUVsSteps(floor.structure))>0);assert.notEqual(slab.geometry,original);
 assert.deepEqual(slab.geometry.attributes.position.array,positions);assert.deepEqual(original.attributes.uv.array,uv);
 assert.equal(slab.geometry.userData.mallSurfaceMetres,2.4);assert.equal(original.userData.sharedScenery,true);
 for(let i=0;i<slab.geometry.attributes.position.count;i++)if(slab.geometry.attributes.normal.getY(i)>.99){
  assert.ok(Math.abs(slab.geometry.attributes.uv.getX(i)-slab.geometry.attributes.position.getX(i)/2.4)<1e-5);
  assert.ok(Math.abs(slab.geometry.attributes.uv.getY(i)+slab.geometry.attributes.position.getZ(i)/2.4)<1e-5);
 }
});
