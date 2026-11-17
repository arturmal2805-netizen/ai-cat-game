import * as THREE from "three";
import { waterEnvironmentTexture } from "./water-environment.js";

import {waterFieldTexture} from './water-field.js';
import {WATER_WAVES_GLSL,WATER_FIELD_GLSL,WATER_SURFACE_GLSL,WATER_MEDIUM} from './water-core.js';
export {waterFieldTexture,legacyWaterFieldTexture,prepareWaterField,WATER_FIELD_SIZE} from './water-field.js';
export const WATER_RIPPLE_SLOTS=6;

const causticCode = `
${WATER_FIELD_GLSL}
float waterLight(vec2 p,float time){
 vec4 a,b;sharedWaterField(p,vec2(time*.014,-time*.009),a,b);
 float ridge=max(a.b,b.b*.85);
 return smoothstep(.24,.85,ridge)*(.6+.4*a.a);
}
`;

// Compose with reef sway rather than replacing its shader or animations.
export function applyUnderwaterLighting(
  material,
  clock,
  tint = 0x73d6db,
  { level = { value: 0.155 }, refract = true, light = true, depthFog = light } = {},
) {
  const previous = material.onBeforeCompile,
    key = material.customProgramCacheKey();
  const texture = waterFieldTexture(),
    color = new THREE.Color(tint).lerp(new THREE.Color(0xffffff), 0.78);
  material.onBeforeCompile = function (shader, ...args) {
    previous.call(this, shader, ...args);
    shader.uniforms.uWaterField = { value: texture };
    shader.uniforms.uWaterLightTime = clock;
    shader.uniforms.uUnderwaterTint = { value: color };
    shader.uniforms.uWaterLevel = level;
    shader.uniforms.uWaterLayerDepth={value:material.userData.waterLayerDepth??-1};
    shader.uniforms.uWaterExtinction={value:new THREE.Vector3(...WATER_MEDIUM.extinction)};
    shader.uniforms.uWaterScatterRate={value:WATER_MEDIUM.scatterRate};
    shader.uniforms.uWaterScatterTint={value:new THREE.Color(tint).multiplyScalar(.60)};
    shader.vertexShader =
      "varying float vClearWaterImmersion;varying float vWaterWorldY;varying vec2 vWaterLightPoint;uniform float uWaterLayerDepth;uniform sampler2D uWaterField;uniform float uWaterLightTime;uniform float uWaterLevel;\n" +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        `#include <project_vertex>
      vec4 waterPoint=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
      waterPoint=instanceMatrix*waterPoint;
      #endif
      waterPoint=modelMatrix*waterPoint;
      vWaterLightPoint=waterPoint.xz;vWaterWorldY=waterPoint.y;vClearWaterImmersion=uWaterLayerDepth>=0.?uWaterLayerDepth:max(0.,uWaterLevel-waterPoint.y);
      ${
        refract
          ? `
      float immersion=clamp(uWaterLevel-waterPoint.y,0.0,.9);
      vec2 bend=(texture2D(uWaterField,waterPoint.xz*.075+vec2(uWaterLightTime*.014,-uWaterLightTime*.009)*.75).rg-.5)*immersion*.12;
      waterPoint.xz+=bend;
      waterPoint.y+=immersion*.14;
      gl_Position=projectionMatrix*viewMatrix*waterPoint;`
          : ""
      }`,
      );
    if (!light && !depthFog) return;
    shader.fragmentShader =
      "uniform sampler2D uWaterField;uniform float uWaterLightTime;uniform vec3 uWaterExtinction;uniform float uWaterScatterRate;varying float vWaterWorldY;uniform vec3 uUnderwaterTint;uniform vec3 uWaterScatterTint;uniform float uWaterLevel;varying vec2 vWaterLightPoint;varying float vClearWaterImmersion;\n" +
      (light?causticCode:"") +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      ${light?`float waterCaustic=waterLight(vWaterLightPoint,uWaterLightTime);
      waterCaustic*=.12+.88*exp2(-min(vClearWaterImmersion,40.)*.07);
      diffuseColor.rgb*=uUnderwaterTint*(.98+waterCaustic*.20);
      diffuseColor.rgb+=vec3(.012,.029,.043)*waterCaustic*waterCaustic;`:''}
      ${depthFog?`
      vec3 submergedPoint=vec3(vWaterLightPoint.x,vWaterWorldY,vWaterLightPoint.y);
      float opticalPath=length(cameraPosition-submergedPoint)*clamp(vClearWaterImmersion/max(cameraPosition.y-submergedPoint.y,.01),0.,1.);
      vec3 clearTransmission=exp2(-uWaterExtinction*min(opticalPath,60.));
      diffuseColor.rgb*=clearTransmission;
      diffuseColor.rgb=mix(diffuseColor.rgb,uWaterScatterTint,(1.-exp2(-opticalPath*uWaterScatterRate))*.55);
      `:''}`,
      );
  };
  material.customProgramCacheKey = () =>
    key + "-underwater-optics-v4-shared-" + refract + "-" + light+"-"+depthFog;
  material.userData.waterLight = { clock, texture, level, refract, light, depthFog };
  return material;
}

const vertex = `
uniform float uTime;
uniform float uFall;
uniform float uFlowing;
varying vec3 vWaterPoint;
varying vec3 vWaterNormal;
varying vec2 vWaterUv;
${WATER_WAVES_GLSL}
void main(){
 vec3 p=position;
 vec3 baseWave=sharedWaterWaves(p.xy,uTime,vec4(1.3,0.,.004,-.8),vec4(0.,1.7,.003,.6),vec4(0.),vec3(0.,1.57079632679,0.));
 float wave=baseWave.x;
 p+=normal*wave*(1.0+uFall*3.0+step(.5,uFlowing)*2.0);
 vec4 world=modelMatrix*vec4(p,1.0);
 vWaterPoint=world.xyz;
 // normalMatrix is inverse-transpose: unlike mat3(modelMatrix), it also
 // handles non-uniformly scaled/moved channels without faceted lighting.
 vec3 viewNormal=normalMatrix*normal;
 vWaterNormal=normalize(vec3(dot(viewMatrix[0].xyz,viewNormal),dot(viewMatrix[1].xyz,viewNormal),dot(viewMatrix[2].xyz,viewNormal)));
 vWaterUv=uv;
 gl_Position=projectionMatrix*viewMatrix*world;
}`;
const fragment = `
uniform float uTime;
uniform sampler2D uWaterField;
uniform sampler2D uWaterEnvironment;
uniform float uWaterEnvironmentGain;uniform float uWaterDepth;
uniform vec3 uColor;
uniform vec3 uShoreColor;
uniform float uOpacity;
uniform float uLake;
uniform float uFall;
uniform float uFlowing;
uniform float uFlowSpeed;
uniform vec2 uFlowScale;
uniform vec2 uScale;
uniform float uRippleCount;
uniform vec4 uRipples[6];
varying vec3 vWaterPoint;
varying vec3 vWaterNormal;
varying vec2 vWaterUv;
vec2 environmentUv(vec3 direction){
 vec3 p=direction/(abs(direction.x)+abs(direction.y)+abs(direction.z));
 vec2 uv=p.xz;
 if(p.y<0.0)uv=(1.0-abs(uv.yx))*sign(uv.xy+vec2(.00001));
 return uv*.5+.5;
}
${WATER_FIELD_GLSL}
void main(){
 vec2 p=vWaterPoint.xz;
 vec2 flow=vec2(uTime*.014,-uTime*.009);
 if(uFlowing>.5){
  p=vWaterUv*uFlowScale;
  flow=vec2(0.,-uTime*uFlowSpeed*.1);
  if(uFlowing>1.5){
   float angle=vWaterUv.x*6.2831853-uTime*uFlowSpeed*.12;
   p=vec2(cos(angle),sin(angle))*(1.0+vWaterUv.y*uFlowScale.y);
   flow=vec2(-uTime*.035,uTime*.021);
  }
 }
 if(uFall>.5){p=vWaterUv*uScale;flow=vec2(uTime*.005,uTime*.28);}
 vec4 fieldA,fieldB;
 sharedWaterField(p,flow,fieldA,fieldB);
 // Cascades need flowing ribbons, not the lake reflection/wake calculations.
 if(uFall>.5){
  float streak=1.0-smoothstep(.02,.17,abs(fract(vWaterUv.x*uScale.x*7.0+fieldA.r*.5)-.5));
  float lace=streak*(.22+.34*fieldB.a);
  vec3 color=mix(uColor*.78,vec3(.90,.985,1.),.08+lace*.48);
  color+=vec3(.025,.075,.10)*fieldA.b;
  float edgeFade=smoothstep(0.0,.045,vWaterUv.x)*(1.0-smoothstep(.955,1.0,vWaterUv.x));
  float foot=(1.0-smoothstep(0.0,.15,vWaterUv.y))*(.14+fieldB.a*.16);
  color=mix(color,vec3(.82,.98,1.0),foot);
  float alpha=clamp(uOpacity*.46+lace*.24+foot*.12,.18,.82)*edgeFade;
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  return;
 }
 vec2 slope=sharedWaterSlope(fieldA,fieldB);
 float wake=0.0;
 float wakeFoam=0.0;
 // Most surfaces are idle: skip all six disturbances until a swimmer arrives.
 if(uRippleCount>.5){
  for(int i=0;i<6;i++){
   float age=uTime-uRipples[i].z;
   if(uRipples[i].w>0.0 && age>=0.0 && age<3.5){
    vec2 delta=vWaterPoint.xz-uRipples[i].xy;
    float d=length(delta),ring=d-age*1.15;
    float envelope=exp2(-ring*ring*11.0)*(1.0-age/3.5)*uRipples[i].w;
    float pulse=sin(ring*15.0);
    float wave=pulse*envelope;
    slope+=delta/max(d,.05)*wave*.15;
    wake+=wave;
    float crest=max(pulse,0.0);
    wakeFoam+=envelope*crest*crest*.045;
   }
  }
 }
 ${WATER_SURFACE_GLSL}
}`;

export function waterMaterial(
  color = 0x08b5d0,
  opacity = 0.62,
  { waterfall = false, width = 1, height = 1, flow = null } = {},
) {
  const material = new THREE.ShaderMaterial({
    name: waterfall
      ? "Luminous flowing waterfall"
      : "Clear living lagoon water",
    uniforms: {
      uTime: { value: 0 },
      uWaterField: { value: waterFieldTexture() },
      uWaterEnvironment: { value: waterEnvironmentTexture() },
      uWaterEnvironmentGain:{value:1},uWaterDepth:{value:.785},
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uLake: { value: 0 },
      uShoreColor: { value: new THREE.Color(0xb3ecff) },
      uFall: { value: waterfall ? 1 : 0 },
      uFlowing: { value: flow ? (flow.vortex ? 2 : 1) : 0 },
      uFlowSpeed: { value: flow?.speed ?? 5 },
      uFlowScale: {
        value: new THREE.Vector2(flow?.width ?? 1, flow?.length ?? 1),
      },
      uScale: { value: new THREE.Vector2(width, height) },
      uRippleCount: { value: 0 },
      uRipples: {
        value: Array.from(
          { length: WATER_RIPPLE_SLOTS },
          () => new THREE.Vector4(0, 0, -100, 0),
        ),
      },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true,
    // These are thin sheets, not transparent volumes. A second back/front pass
    // doubles shading work and is unnecessary for the authored surfaces.
    forceSinglePass: true,
  });
  material.userData.waterVersion = "lagoon-optics-v4-crystal-water";
  return material;
}

export function advanceWater(material, time, reduced = false) {
  const t = reduced ? 0 : time;
  material.uniforms.uTime.value = t;
  let count = 0;
  for (const ripple of material.uniforms.uRipples.value) {
    const age = t - ripple.z;
    if (reduced || age >= 3.5 || age < 0) ripple.w = 0;
    if (ripple.w > 0) count++;
  }
  material.uniforms.uRippleCount.value = count;
}
