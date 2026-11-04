import * as T from 'three';
import {waterfallSteps} from './lagoon.js';
import {advanceWater} from './water-shading.js';
// Identical eighteen streaks and foam, with the original modulo trajectory in
// the vertex shader. Keep all matrices frozen after construction.
export function* showcaseWaterfallSteps(x,z,width,height,options){
 const group=yield*waterfallSteps(x,z,width,height,options),lines=group.children.find(o=>o.isInstancedMesh),sheet=group.children.find(o=>o.isMesh&&!o.isInstancedMesh),clock={value:0};
 lines.geometry.setAttribute('aFallPhase',new T.InstancedBufferAttribute(Float32Array.from({length:18},(_,i)=>i*.24),1));
 lines.material.depthWrite=false;
 lines.material.onBeforeCompile=shader=>{shader.uniforms.uFallTime=clock;shader.uniforms.uFallHeight={value:height};shader.vertexShader='attribute float aFallPhase;uniform float uFallTime;uniform float uFallHeight;varying float vFallOpacity;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float fallDistance=mod(uFallTime*2.1+aFallPhase,uFallHeight),progress=fallDistance/max(uFallHeight,.001);
 transformed.y+=mod(aFallPhase,uFallHeight)-fallDistance;
 vFallOpacity=smoothstep(0.,.12,progress)*(1.-smoothstep(.82,1.,progress));`);
 shader.fragmentShader='varying float vFallOpacity;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vFallOpacity;');};
 lines.material.customProgramCacheKey=()=> 'showcase-waterfall-fixed-v2';
 sheet.material.fragmentShader=sheet.material.fragmentShader.replace('vec3 color=mix(uColor*.42,vec3(.75,.97,1.0),.06+lace*.52);','vec3 color=mix(uColor*.78,vec3(.90,1.0,1.0),.12+lace*.66);');
 group.userData.update=(time,reduced=false)=>{clock.value=reduced?0:time;advanceWater(sheet.material,time,reduced);};return group;
}
