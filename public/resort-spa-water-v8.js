import * as T from 'three';
import {applyUnderwaterLighting} from './water-shading.js';
import {registerPositionPreservingShader} from './static-submissions.js';
// Shallow sealed SPA pool profile on the common water core. No ocean/slide
// parameters are changed. The true basin depth and physical steps are retained.
const profiles=new WeakMap();
export function registerSpaCausticProfile(material,profile){profiles.set(material,profile);material.userData.waterLayerDepth=profile.depth>0?profile.depth:-1;}
export function spaPoolOpticsV8(water,liner,{depth,worldLevel,rx}){
 const fieldScale=rx>20?.28:.5;water.fragmentShader=water.fragmentShader.replace('vec2 p=vWaterPoint.xz;',`vec2 p=vWaterPoint.xz*${fieldScale};`);
 water.uniforms.uColor.value.setHex(0x22b9cf);water.uniforms.uShoreColor.value.setHex(0xa1edf0);water.uniforms.uOpacity.value=.54;
 if(!liner?.isMeshStandardMaterial||liner.transparent)return;
 liner.color.setHex(0x8ed9df);liner.roughness=.34;liner.userData.waterLayerDepth=depth;
 profiles.set(liner,{clock:water.uniforms.uTime,worldLevel,fieldScale});
}
// Compose AFTER bounded room lighting. Installing before it would discard the
// caustic hook when room lighting selects its existing native/static path.
export function installSpaPoolCaustics(liner){
 const profile=profiles.get(liner);if(!profile)return;
 const before=liner.onBeforeCompile,key=liner.customProgramCacheKey;
 applyUnderwaterLighting(liner,profile.clock,0x89e3e7,{level:{value:profile.worldLevel},refract:false,light:true,depthFog:false});
 const shared=liner.onBeforeCompile,sharedKey=liner.customProgramCacheKey();
 const intensity=profile.intensity??.54;
 liner.onBeforeCompile=function(shader,...args){shared.call(this,shader,...args);shader.fragmentShader=shader.fragmentShader.replace('waterLight(vWaterLightPoint,uWaterLightTime)',`waterLight(vWaterLightPoint*${profile.fieldScale},uWaterLightTime)`).replace('diffuseColor.rgb*=uUnderwaterTint*(.98+waterCaustic*.20);',`diffuseColor.rgb*=uUnderwaterTint*(.96+waterCaustic*${intensity.toFixed(3)});`).replace('vec3(.012,.029,.043)*waterCaustic*waterCaustic','vec3(.006,.014,.016)*waterCaustic*waterCaustic');};
 liner.customProgramCacheKey=()=>sharedKey+'-spa-shallow-caustics-v8-'+profile.fieldScale+'-soft-'+intensity;registerPositionPreservingShader(liner,before,key);liner.needsUpdate=true;
}

export function addSpaStepLights(root,steps,own){
 const material=new T.MeshBasicMaterial({color:0xffd59d,toneMapped:false});own.push(material);
 for(const step of steps){const g=new T.BoxGeometry(step.w-.12,.022,.035),o=new T.Mesh(g,material);o.position.set(step.x,step.y+.012,step.z-step.d/2+.035);o.name='SPA submerged step edge light';root.add(o);}
}
