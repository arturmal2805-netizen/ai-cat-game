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
  shader.vertexShader='uniform vec2 uScale;attribute float aPhysicalBedDepth;varying float vPhysicalBedDepth;varying float vOceanCrest;\n'+shader.vertexShader
   .replace('vec3 p=position;',`vPhysicalBedDepth=aPhysicalBedDepth;vec3 p=position;
    vec2 oceanMetres=position.xy*uScale*.5;
    float oceanA=dot(oceanMetres,vec2(.12,.072))-uTime*1.17;
    float oceanB=dot(oceanMetres,vec2(-.073,.104))-uTime*1.12;
    float oceanC=dot(oceanMetres,vec2(.039,-.034))-uTime*.71;
    vOceanCrest=smoothstep(.72,.98,sin(oceanA)*.65+sin(oceanB)*.35);
    float oceanShore=smoothstep(.2,3.,aPhysicalBedDepth);`)
   .replace('float wave=sin(p.x*1.3+uTime*.8)*.004+cos(p.y*1.7-uTime*.6)*.003;', 'float wave=(sin(oceanA)*.50+sin(oceanB)*.23+sin(oceanC)*.10)*oceanShore;')
   .replace('vec3 viewNormal=normalMatrix*normal;',`vec2 oceanGradient=(cos(oceanA)*.50*vec2(.12,.072)+cos(oceanB)*.23*vec2(-.073,.104)+cos(oceanC)*.10*vec2(.039,-.034))*oceanShore;
    vec3 viewNormal=normalMatrix*normalize(vec3(-oceanGradient*uScale*.5,1.));`);
  shader.fragmentShader='varying float vPhysicalBedDepth;\n'+shader.fragmentShader
   .replace('float waterDepth=mix(.23,uWaterDepth*(1.-.8*smoothstep(.55,1.,edge)),uLake);','float waterDepth=max(0.,vPhysicalBedDepth);');
 };
 material.customProgramCacheKey=()=> 'shared-physical-water-v1-ocean-depth';
 return material;
}
