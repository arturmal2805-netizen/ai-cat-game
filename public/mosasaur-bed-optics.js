import {mosaRockSurface} from './mosasaur-rock-surfaces.js';
import {useMosasaurWaterField} from './mosasaur-water-field.js';
import {sandDetailTexture} from './mosasaur-sand-detail.js';
import {SEABED_REEF_PATCH} from './mosasaur-seabed-patch-data.js';
import {WORLD_CENTERS} from './world-layout.js';
// Metre-based triplanar stone avoids stretching a single sand image over the
// two-hundred-metre canyon walls. The native underwater shader/clock stays in
// place. These are shared offline maps, not runtime captures or render targets.
export function applyMosasaurBedOptics(material,{stoneNormals=false,reefRock=false}={}){
 useMosasaurWaterField(material);
 material.mosaBedStone=mosaRockSurface().color;material.mosaBedGround=reefRock?mosaRockSurface().reef:mosaRockSurface().sand;
 if(stoneNormals)material.mosaBedNormal=mosaRockSurface().normal;
 if(!reefRock)material.seabedSandDetail=sandDetailTexture();
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,...args){
  previous.call(this,shader,...args);shader.uniforms.uMosaBedStone={value:material.mosaBedStone};shader.uniforms.uMosaBedGround={value:material.mosaBedGround};
  if(stoneNormals)shader.uniforms.uMosaStoneNormal={value:material.mosaBedNormal};
  if(!reefRock){shader.uniforms.uSeabedSandDetail={value:material.seabedSandDetail};shader.uniforms.uSeabedPatchCenter={value:[WORLD_CENTERS.autumn[0]+SEABED_REEF_PATCH.x,WORLD_CENTERS.autumn[1]+SEABED_REEF_PATCH.z]};shader.uniforms.uSeabedPatchRadii={value:[SEABED_REEF_PATCH.rx,SEABED_REEF_PATCH.rz]};}
  shader.vertexShader='varying vec3 vMosaBedPosition;varying vec3 vMosaBedNormal;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 bedWorld=vec4(transformed,1.);
   #ifdef USE_INSTANCING
   bedWorld=instanceMatrix*bedWorld;
   #endif
   vMosaBedPosition=(modelMatrix*bedWorld).xyz;
   vec3 bedViewNormal=normalize(transformedNormal);
   vMosaBedNormal=normalize(vec3(dot(viewMatrix[0].xyz,bedViewNormal),dot(viewMatrix[1].xyz,bedViewNormal),dot(viewMatrix[2].xyz,bedViewNormal)));`);
  shader.fragmentShader='varying vec3 vMosaBedPosition;varying vec3 vMosaBedNormal;uniform sampler2D uMosaBedStone;uniform sampler2D uMosaBedGround;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
   vec3 bedWeights=pow(abs(normalize(vMosaBedNormal)),vec3(4.));bedWeights/=max(.001,bedWeights.x+bedWeights.y+bedWeights.z);
   vec3 stone=texture2D(uMosaBedStone,vMosaBedPosition.zy*.5).rgb*bedWeights.x+texture2D(uMosaBedStone,vMosaBedPosition.xz*.5).rgb*bedWeights.y+texture2D(uMosaBedStone,vMosaBedPosition.xy*.5).rgb*bedWeights.z;
   vec3 sand=texture2D(uMosaBedGround,vMosaBedPosition.xz*.5).rgb;
   float cliff=1.-smoothstep(.42,.88,abs(vMosaBedNormal.y));
   // Patch edges follow the actual slope with broad sediment variation. Keep
   // the scanned maps in metre scale; no island-wide tiled colour overlay.
   float sediment=.5+.26*sin(vMosaBedPosition.x*.071+sin(vMosaBedPosition.z*.047)*1.6)+.18*cos(vMosaBedPosition.z*.093-vMosaBedPosition.x*.038);
   float exposed=clamp(cliff+smoothstep(.58,.88,sediment)*.38,0.,1.);
   diffuseColor.rgb*=mix(sand*vec3(1.06,1.02,.94),stone*vec3(.95,.94,.91),exposed);`);
  if(!reefRock)shader.fragmentShader=shader.fragmentShader.replace('vec3 sand=texture2D(uMosaBedGround,vMosaBedPosition.xz*.5).rgb;',`vec3 sand=texture2D(uMosaBedGround,vMosaBedPosition.xz*.5).rgb;
   vec2 sandPatchPoint=vMosaBedPosition.xz-uSeabedPatchCenter;
   float sandPatchR=length(sandPatchPoint/uSeabedPatchRadii)+.055*sin(sandPatchPoint.x*.8)*sin(sandPatchPoint.y*.9);
   if(sandPatchR<1.){vec3 secondSand=texture2D(uMosaBedGround,vec2(-vMosaBedPosition.z,vMosaBedPosition.x)*.5+vec2(.37,.61)).rgb;
    float variation=.5+.5*sin(sandPatchPoint.x*.43+sin(sandPatchPoint.y*.61));sand=mix(sand,secondSand,(1.-smoothstep(.65,1.,sandPatchR))*(.22+variation*.4));}`);
  if(!reefRock)shader.fragmentShader='uniform sampler2D uSeabedSandDetail;uniform vec2 uSeabedPatchCenter;uniform vec2 uSeabedPatchRadii;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec2 patchPoint=vMosaBedPosition.xz-uSeabedPatchCenter;
   float patchR=length(patchPoint/uSeabedPatchRadii)+.055*sin(patchPoint.x*.8)*sin(patchPoint.y*.9);
   float patchMask=(1.-smoothstep(.65,1.,patchR))*smoothstep(.45,.8,abs(vMosaBedNormal.y));
   if(patchMask>.001){
    vec4 detail=texture2D(uSeabedSandDetail,vMosaBedPosition.xz*.5);
    vec3 sandBase=normalize(vMosaBedNormal),sandTangent=normalize(vec3(1.,0.,0.)-sandBase*sandBase.x),sandBitangent=cross(sandTangent,sandBase),detailN=detail.xyz*2.-1.;
    vec3 sandNormal=normalize(sandBase*detailN.z+sandTangent*detailN.x+sandBitangent*detailN.y);
    normal=normalize(mix(normal,mat3(viewMatrix)*sandNormal,patchMask*.75));roughnessFactor=mix(roughnessFactor,detail.a,patchMask);
   }`);
  if(stoneNormals)shader.fragmentShader='uniform sampler2D uMosaStoneNormal;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 rockBase=normalize(vMosaBedNormal),rockWeight=pow(abs(rockBase),vec3(4.));rockWeight/=max(.001,rockWeight.x+rockWeight.y+rockWeight.z);
   vec4 rockTX=texture2D(uMosaStoneNormal,vMosaBedPosition.zy*.5),rockTY=texture2D(uMosaStoneNormal,vMosaBedPosition.xz*.5),rockTZ=texture2D(uMosaStoneNormal,vMosaBedPosition.xy*.5);
   vec3 rockNX=rockTX.xyz*2.-1.,rockNY=rockTY.xyz*2.-1.,rockNZ=rockTZ.xyz*2.-1.;
   vec3 rockDetail=normalize(vec3(rockNX.z*sign(rockBase.x),rockNX.y,rockNX.x)*rockWeight.x+vec3(rockNY.x,rockNY.z*sign(rockBase.y),rockNY.y)*rockWeight.y+vec3(rockNZ.x,rockNZ.y,rockNZ.z*sign(rockBase.z))*rockWeight.z);
   normal=normalize(mat3(viewMatrix)*normalize(rockBase+rockDetail*.36));roughnessFactor*=dot(vec3(rockTX.a,rockTY.a,rockTZ.a),rockWeight);`);
 };
 material.customProgramCacheKey=()=>key+'-mosasaur-scanned-stone-v6-local-sand-'+stoneNormals+'-'+reefRock;return material;
}
