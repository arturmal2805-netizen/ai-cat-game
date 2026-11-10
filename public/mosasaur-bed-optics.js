import {showcaseSurfaceMap} from './showcase-surface-details.js';
// Metre-based triplanar stone avoids stretching a single sand image over the
// two-hundred-metre canyon walls. The native underwater shader/clock stays in
// place. These are shared offline maps, not runtime captures or render targets.
export function applyMosasaurBedOptics(material){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,...args){
  previous.call(this,shader,...args);shader.uniforms.uMosaBedStone={value:showcaseSurfaceMap('stone')};
  shader.vertexShader='varying vec3 vMosaBedPosition;varying vec3 vMosaBedNormal;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vMosaBedPosition=(modelMatrix*vec4(transformed,1.)).xyz;
   vec3 bedViewNormal=normalize(normalMatrix*objectNormal);
   vMosaBedNormal=normalize(vec3(dot(viewMatrix[0].xyz,bedViewNormal),dot(viewMatrix[1].xyz,bedViewNormal),dot(viewMatrix[2].xyz,bedViewNormal)));`);
  shader.fragmentShader='varying vec3 vMosaBedPosition;varying vec3 vMosaBedNormal;uniform sampler2D uMosaBedStone;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
   vec3 bedWeights=pow(abs(normalize(vMosaBedNormal)),vec3(4.));bedWeights/=max(.001,bedWeights.x+bedWeights.y+bedWeights.z);
   vec3 stone=texture2D(uMosaBedStone,vMosaBedPosition.zy*.23).rgb*bedWeights.x+texture2D(uMosaBedStone,vMosaBedPosition.xz*.23).rgb*bedWeights.y+texture2D(uMosaBedStone,vMosaBedPosition.xy*.23).rgb*bedWeights.z;
   vec3 sand=texture2D(map,vMosaBedPosition.xz*.028).rgb;
   float cliff=1.-smoothstep(.42,.88,abs(vMosaBedNormal.y));
   diffuseColor.rgb*=mix(sand,stone*vec3(.79,.89,.83),cliff*.87);`);
 };
 material.customProgramCacheKey=()=>key+'-mosasaur-physical-stone-v1';return material;
}
