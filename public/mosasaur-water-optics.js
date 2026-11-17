import {mosaWaterReflection} from './mosasaur-water-probe.js';
import {waterFieldTexture} from './water-shading.js';
import {MOSA_OCEAN_PROFILE} from './mosasaur-water-profile.js';
// Only the expanded ocean opts into metre-scale surface displacement. The
// original shared water fields, reflection sampler, wake slots and clock remain.
// Swell wavelengths resolve on the existing polar grid even at its outer edge;
// fine ripples stay in the shared normal field rather than aliased geometry.
export function installMosasaurWaterOptics(material){
 const reflection=mosaWaterReflection();material.uniforms.uWaterEnvironment.value=reflection.texture;
 material.uniforms.uWaterField.value=waterFieldTexture();
 material.uniforms.uWaterEnvironmentGain.value=reflection.gain;
 material.uniforms.uWaterDepth.value=200;
 material.userData.oceanProfile=MOSA_OCEAN_PROFILE.version;material.toneMapped=true;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='uniform vec2 uScale;attribute float aPhysicalBedDepth;varying float vPhysicalBedDepth;\n'+shader.vertexShader
   .replace('vec3 p=position;',`vPhysicalBedDepth=aPhysicalBedDepth;vec3 p=position;
    vec2 oceanMetres=position.xy*uScale*.5;
    vec3 oceanWave=sharedWaterWaves(oceanMetres,uTime,vec4(.12,.072,.50,1.17),vec4(-.073,.104,.23,1.12),vec4(.039,-.034,.10,.71),vec3(0.));
    float oceanShore=smoothstep(.2,3.,aPhysicalBedDepth);`)
   .replace('float wave=baseWave.x;', 'float wave=oceanWave.x*oceanShore;')
   .replace('vec3 viewNormal=normalMatrix*normal;',`vec2 oceanGradient=oceanWave.yz*oceanShore;
    vec3 viewNormal=normalMatrix*normalize(vec3(-oceanGradient*uScale*.5,1.));`);
  shader.fragmentShader='varying float vPhysicalBedDepth;\n'+shader.fragmentShader
   .replace('float waterDepth=mix(.23,uWaterDepth*(1.-.8*smoothstep(.55,1.,edge)),uLake);','float waterDepth=max(0.,vPhysicalBedDepth);');
 };
 material.customProgramCacheKey=()=> 'shared-physical-water-v1-ocean-depth';
 return material;
}
