import * as T from 'three';
import {courtFood} from './foodcourt-assets.js';
import {batchModelSteps} from './model-batching.js';
import {copyGeometryBuffers} from './geometry-tasks.js';

// Twelve real sushi dishes move along an oval. Their transforms and vertex
// buffers stay fixed: colour and shadow shaders read the same shared clock.
export function* mallConveyorSteps(clock){
  const root=new T.Group(),source=new T.Group(),food=courtFood('sushi');
  food.scale.setScalar(.65);food.position.y=.04;source.add(food);
  const plate=new T.Mesh(new T.CylinderGeometry(.28,.28,.035,24),new T.MeshStandardMaterial({color:0xf5efe6,roughness:.38}));source.add(plate);
  const baked=yield* batchModelSteps(source,{combineColors:true});
  const phases=new T.InstancedBufferAttribute(Float32Array.from({length:12},(_,i)=>i*Math.PI/6),1);
  const patch=shader=>{
    shader.uniforms.uMallBeltTime=clock;
    shader.vertexShader='attribute float aMallBeltPhase;uniform float uMallBeltTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float belt=aMallBeltPhase+uMallBeltTime*.28;
      transformed+=vec3(cos(belt)*2.2,.2,sin(belt)*.95);`);
  };
  for(const sourceMesh of baked.children){
    if(!sourceMesh.isMesh)continue;yield;
    const geometry=copyGeometryBuffers(sourceMesh.geometry);geometry.setAttribute('aMallBeltPhase',phases);
    const material=sourceMesh.material.clone();material.onBeforeCompile=patch;material.customProgramCacheKey=()=> 'mall-sushi-conveyor-colour-v1';
    const mesh=new T.InstancedMesh(geometry,material,12);
    mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});mesh.customDepthMaterial.onBeforeCompile=patch;mesh.customDepthMaterial.customProgramCacheKey=()=> 'mall-sushi-conveyor-shadow-v1';
    mesh.boundingSphere=new T.Sphere(new T.Vector3(0,.3,0),3.1);mesh.boundingBox=new T.Box3(new T.Vector3(-2.7,-.1,-1.5),new T.Vector3(2.7,1,1.5));
    mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    sourceMesh.geometry.dispose();if(!sourceMesh.material.userData.sharedScenery)sourceMesh.material.dispose();
  }
  return root;
}
