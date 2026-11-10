import {mosaWaterReflection} from './mosasaur-water-probe.js';
import {mosaWaterField} from './mosasaur-water-field.js';
// Only the expanded ocean opts into metre-scale surface displacement. The
// original shared water fields, reflection sampler, wake slots and clock remain.
export function installMosasaurWaterOptics(material){
 const reflection=mosaWaterReflection();material.uniforms.uWaterEnvironment.value=reflection.texture;
 material.uniforms.uWaterField.value=mosaWaterField();material.toneMapped=true;
 material.onBeforeCompile=shader=>{
  shader.uniforms.uOceanReflectionGain={value:reflection.gain};
  shader.vertexShader='uniform vec2 uScale;attribute float aPhysicalBedDepth;varying float vPhysicalBedDepth;varying float vOceanCrest;\n'+shader.vertexShader
   .replace('vec3 p=position;',`vPhysicalBedDepth=aPhysicalBedDepth;vec3 p=position;
    vec2 oceanMetres=position.xy*uScale*.5;
    float oceanA=dot(oceanMetres,vec2(.68,.43))-uTime*1.35;
    float oceanB=dot(oceanMetres,vec2(-.36,.79))-uTime*1.8;
    float oceanC=dot(oceanMetres,vec2(.19,-.21))-uTime*.76;
    vOceanCrest=smoothstep(.72,.98,sin(oceanA)*.65+sin(oceanB)*.35);
    float oceanShore=smoothstep(.2,3.,aPhysicalBedDepth);`)
   .replace('float wave=sin(p.x*1.3+uTime*.8)*.004+cos(p.y*1.7-uTime*.6)*.003;', 'float wave=(sin(oceanA)*.09+sin(oceanB)*.045+sin(oceanC)*.055)*oceanShore;')
   .replace('vec3 viewNormal=normalMatrix*normal;',`vec2 oceanGradient=(cos(oceanA)*.09*vec2(.68,.43)+cos(oceanB)*.045*vec2(-.36,.79)+cos(oceanC)*.055*vec2(.19,-.21))*oceanShore;
    vec3 viewNormal=normalMatrix*normalize(vec3(-oceanGradient*uScale*.5,1.));`);
  shader.fragmentShader='uniform float uOceanReflectionGain;varying float vPhysicalBedDepth;varying float vOceanCrest;\n'+shader.fragmentShader
   .replace('slope=(fieldA.rg-.5)*.075+(fieldB.gr-.5)*.115;', 'slope=(fieldA.rg-.5)*.28+(fieldB.gr-.5)*.14;')
   .replace('vec3 sky=texture2D(uWaterEnvironment,environmentUv(reflected),.7).rgb;', 'vec3 sky=texture2D(uWaterEnvironment,environmentUv(reflected),.7).rgb*uOceanReflectionGain;')
   .replace('float shallow=(1.0-depth)*uLake;','depth=1.-exp2(-max(0.,vPhysicalBedDepth)*.07);float shallow=(1.0-depth)*uLake;')
   .replace('float caustic=min(1.5,fieldA.b*.7+fieldB.b*.55+fieldA.b*fieldB.b);', `
    float oceanDepth=1.-exp2(-max(0.,vPhysicalBedDepth)*.030);
    body=mix(vec3(.012,.53,.68),vec3(.003,.115,.34),oceanDepth);
    float caustic=min(1.5,fieldA.b*.7+fieldB.b*.55+fieldA.b*fieldB.b);`)
   .replace('vec3 color=mix(body,sky,clamp(.035+fresnel*.91,0.0,.96));',`
    // The interface scatters a little light; underwater objects retain their
    // own depth attenuation. Using the whole seabed distance here incorrectly
    // hid a creature swimming immediately beneath a two-hundred-metre ocean.
    float oceanScatter=.025+.065*(1.-exp2(-max(0.,vPhysicalBedDepth)*.08));
    float oceanSun=min(glint*.35,.18);
    float oceanReflection=clamp(fresnel+oceanSun,0.,.98);
    float oceanCoverage=oceanReflection+(1.-oceanReflection)*oceanScatter;
    vec3 color=(sky*fresnel+vec3(1.,.95,.83)*oceanSun+body*(1.-oceanReflection)*oceanScatter)/max(.001,oceanCoverage);`)
   .replace('color=mix(body*(.93+fieldA.a*.14),sky,clamp(.075+fresnel*.92,0.,.98));','')
   .replace('color+=vec3(1.0,.95,.83)*min(.55,glint);','')
   .replace('float foam=clamp(shoreFoam+wakeFoam,0.0,.64);',`
    shoreFoam=(1.-smoothstep(.25,1.8,vPhysicalBedDepth))*smoothstep(.64,.94,fieldA.a*.45+fieldB.a*.55)*.28;
    float crestFoam=vOceanCrest*smoothstep(.70,.95,fieldA.a)*.07;
    float foam=clamp(shoreFoam+wakeFoam+crestFoam,0.,.48);`)
   .replace('gl_FragColor=vec4(max(color,vec3(0.0)),alpha);',`
    alpha=clamp(1.-(1.-oceanCoverage)*(1.-foam*.65),.025,.98);
    gl_FragColor=vec4(max(color,vec3(0.0)),alpha);`);
 };
 material.customProgramCacheKey=()=> 'physical-ocean-bed-optics-v4-clear-interface';
 return material;
}
