import {mosaRockSurface} from './mosasaur-rock-surfaces.js';
import {useMosasaurWaterField} from './mosasaur-water-field.js';
// Metre-based triplanar stone avoids stretching a single sand image over the
// two-hundred-metre canyon walls. The native underwater shader/clock stays in
// place. These are shared offline maps, not runtime captures or render targets.
export function applyMosasaurBedOptics(material,{stoneNormals=false,reefRock=false}={}){
 useMosasaurWaterField(material);
 material.mosaBedStone=mosaRockSurface().color;material.mosaBedGround=reefRock?mosaRockSurface().reef:mosaRockSurface().sand;
 if(stoneNormals)material.mosaBedNormal=mosaRockSurface().normal;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,...args){
  previous.call(this,shader,...args);shader.uniforms.uMosaBedStone={value:material.mosaBedStone};shader.uniforms.uMosaBedGround={value:material.mosaBedGround};
  if(stoneNormals)shader.uniforms.uMosaStoneNormal={value:material.mosaBedNormal};
  shader.vertexShader='varying vec3 vMosaBedPosition;varying vec3 vMosaBedNormal;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vMosaBedPosition=(modelMatrix*vec4(transformed,1.)).xyz;
   vec3 bedViewNormal=normalize(normalMatrix*objectNormal);
   vMosaBedNormal=normalize(vec3(dot(viewMatrix[0].xyz,bedViewNormal),dot(viewMatrix[1].xyz,bedViewNormal),dot(viewMatrix[2].xyz,bedViewNormal)));`);
  shader.fragmentShader='varying vec3 vMosaBedPosition;varying vec3 vMosaBedNormal;uniform sampler2D uMosaBedStone;uniform sampler2D uMosaBedGround;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
   vec3 bedWeights=pow(abs(normalize(vMosaBedNormal)),vec3(4.));bedWeights/=max(.001,bedWeights.x+bedWeights.y+bedWeights.z);
   vec3 stone=texture2D(uMosaBedStone,vMosaBedPosition.zy*.5).rgb*bedWeights.x+texture2D(uMosaBedStone,vMosaBedPosition.xz*.5).rgb*bedWeights.y+texture2D(uMosaBedStone,vMosaBedPosition.xy*.5).rgb*bedWeights.z;
   vec3 sand=texture2D(uMosaBedGround,vMosaBedPosition.xz*.5).rgb;
   float cliff=1.-smoothstep(.42,.88,abs(vMosaBedNormal.y));
   diffuseColor.rgb*=mix(sand,stone*vec3(.95,.94,.91),cliff);`);
  if(stoneNormals)shader.fragmentShader='uniform sampler2D uMosaStoneNormal;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 rockBase=normalize(vMosaBedNormal),rockWeight=pow(abs(rockBase),vec3(4.));rockWeight/=max(.001,rockWeight.x+rockWeight.y+rockWeight.z);
   vec4 rockTX=texture2D(uMosaStoneNormal,vMosaBedPosition.zy*.5),rockTY=texture2D(uMosaStoneNormal,vMosaBedPosition.xz*.5),rockTZ=texture2D(uMosaStoneNormal,vMosaBedPosition.xy*.5);
   vec3 rockNX=rockTX.xyz*2.-1.,rockNY=rockTY.xyz*2.-1.,rockNZ=rockTZ.xyz*2.-1.;
   vec3 rockDetail=normalize(vec3(rockNX.z*sign(rockBase.x),rockNX.y,rockNX.x)*rockWeight.x+vec3(rockNY.x,rockNY.z*sign(rockBase.y),rockNY.y)*rockWeight.y+vec3(rockNZ.x,rockNZ.y,rockNZ.z*sign(rockBase.z))*rockWeight.z);
   normal=normalize(mat3(viewMatrix)*normalize(rockBase+rockDetail*.36));roughnessFactor*=dot(vec3(rockTX.a,rockTY.a,rockTZ.a),rockWeight);`);
 };
 material.customProgramCacheKey=()=>key+'-mosasaur-scanned-stone-v3-'+stoneNormals+'-'+reefRock;return material;
}
