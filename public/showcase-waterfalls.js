import * as T from 'three';
import {waterfallSteps} from './lagoon.js';
import {advanceWater} from './water-shading.js';
// Identical eighteen streaks and foam, with the original modulo trajectory in
// the vertex shader. Keep all matrices frozen after construction.
export function* showcaseWaterfallSteps(x,z,width,height,options){
 const group=yield*waterfallSteps(x,z,width,height,options),lines=group.children.find(o=>o.isInstancedMesh),sheet=group.children.find(o=>o.isMesh&&!o.isInstancedMesh),clock={value:0};
 lines.geometry.setAttribute('aFallPhase',new T.InstancedBufferAttribute(Float32Array.from({length:18},(_,i)=>i*.24),1));
 lines.material.onBeforeCompile=shader=>{shader.uniforms.uFallTime=clock;shader.uniforms.uFallHeight={value:height};shader.vertexShader='attribute float aFallPhase;uniform float uFallTime;uniform float uFallHeight;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=mod(aFallPhase,uFallHeight)-mod(uFallTime*2.1+aFallPhase,uFallHeight);');};
 lines.material.customProgramCacheKey=()=> 'showcase-waterfall-fixed-v1';
 group.userData.update=(time,reduced=false)=>{clock.value=reduced?0:time;advanceWater(sheet.material,time,reduced);};return group;
}
