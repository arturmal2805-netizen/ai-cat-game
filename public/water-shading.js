import * as THREE from "three";
import { waterEnvironmentTexture } from "./water-environment.js";

export const WATER_FIELD_SIZE = 128;
export const WATER_RIPPLE_SLOTS = 6;
let field = null;

// One small, seamless RGBA field for every lagoon, slide and cascade.
// RG: wave slopes, B: caustic ridges, A: flowing surface detail. No image request,
// render target, scene copy or per-frame texture generation is needed.
export function waterFieldTexture() {
  if (field) return field;
  const size = WATER_FIELD_SIZE,
    cells = 8,
    tau = Math.PI * 2;
  const centers = Array.from({ length: cells * cells }, (_, i) => {
    const hash = (n) => {
      const v = Math.sin(n * 127.1 + 17.7) * 43758.5453;
      return v - Math.floor(v);
    };
    return [0.22 + 0.56 * hash(i + 1), 0.22 + 0.56 * hash(i + 82)];
  });
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size;
      const wx = u * cells + 0.16 * Math.sin(tau * v * 2),
        wy = v * cells + 0.16 * Math.sin(tau * u * 2);
      const cx = Math.floor(wx),
        cy = Math.floor(wy);
      let first = 10,
        second = 10;
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const px = cx + i,
            py = cy + j,
            c =
              centers[
                (((py % cells) + cells) % cells) * cells +
                  (((px % cells) + cells) % cells)
              ];
          const dx = px + c[0] - wx,
            dy = py + c[1] - wy,
            d = dx * dx + dy * dy;
          if (d < first) {
            second = first;
            first = d;
          } else second = Math.min(second, d);
        }
      const a = tau * (3 * u + 2 * v),
        b = tau * (7 * u - 3 * v),
        c = tau * (13 * u + 11 * v);
      const sx = 0.43 * Math.cos(a) + 0.27 * Math.cos(b) + 0.17 * Math.sin(c);
      const sy = 0.35 * Math.cos(a) - 0.28 * Math.cos(b) + 0.22 * Math.cos(c);
      const index = (y * size + x) * 4;
      data[index] = Math.round(127.5 + sx * 117);
      data[index + 1] = Math.round(127.5 + sy * 117);
      data[index + 2] = Math.round(255 * Math.exp(-(second - first) * 28));
      data[index + 3] = Math.round(
        127.5 +
          60 * Math.sin(tau * (5 * u + 3 * v)) +
          45 * Math.cos(tau * (9 * v - 2 * u)),
      );
    }
  field = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  field.name = "Shared lagoon wave and light field";
  field.wrapS = field.wrapT = THREE.RepeatWrapping;
  field.magFilter = THREE.LinearFilter;
  field.minFilter = THREE.LinearMipmapLinearFilter;
  field.generateMipmaps = true;
  field.colorSpace = THREE.NoColorSpace;
  field.userData.sharedScenery = true;
  field.needsUpdate = true;
  return field;
}

const causticCode = `
float waterLight(vec2 p,float time){
 vec4 a=texture2D(uWaterField,p*.115+vec2(time*.009,-time*.006));
 vec4 b=texture2D(uWaterField,p.yx*.147+vec2(-time*.007,time*.011)+(a.rg-.5)*.045);
 return min(1.5,a.b*.7+b.b*.55+a.b*b.b);
}
`;

// Compose with reef sway rather than replacing its shader or animations.
export function applyUnderwaterLighting(
  material,
  clock,
  tint = 0x73d6db,
  { level = { value: 0.155 }, refract = true, light = true } = {},
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
    shader.vertexShader =
      "varying vec2 vWaterLightPoint;uniform sampler2D uWaterField;uniform float uWaterLightTime;uniform float uWaterLevel;\n" +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        `#include <project_vertex>
      vec4 waterPoint=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
      waterPoint=instanceMatrix*waterPoint;
      #endif
      waterPoint=modelMatrix*waterPoint;
      vWaterLightPoint=waterPoint.xz;
      ${
        refract
          ? `
      float immersion=clamp(uWaterLevel-waterPoint.y,0.0,.9);
      vec2 bend=(texture2D(uWaterField,waterPoint.xz*.10+vec2(uWaterLightTime*.014,-uWaterLightTime*.009)).rg-.5)*immersion*.12;
      waterPoint.xz+=bend;
      waterPoint.y+=immersion*.14;
      gl_Position=projectionMatrix*viewMatrix*waterPoint;`
          : ""
      }`,
      );
    if (!light) return;
    shader.fragmentShader =
      "uniform sampler2D uWaterField;uniform float uWaterLightTime;uniform vec3 uUnderwaterTint;varying vec2 vWaterLightPoint;\n" +
      causticCode +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      float waterCaustic=waterLight(vWaterLightPoint,uWaterLightTime);
      diffuseColor.rgb*=uUnderwaterTint*(.88+waterCaustic*.24);
      diffuseColor.rgb+=vec3(.035,.07,.06)*waterCaustic;`,
      );
  };
  material.customProgramCacheKey = () =>
    key + "-underwater-optics-v2-" + refract + "-" + light;
  material.userData.waterLight = { clock, texture, level, refract, light };
  return material;
}

const vertex = `
uniform float uTime;
uniform float uFall;
uniform float uFlowing;
varying vec3 vWaterPoint;
varying vec3 vWaterNormal;
varying vec2 vWaterUv;
void main(){
 vec3 p=position;
 float wave=sin(p.x*1.3+uTime*.8)*.004+cos(p.y*1.7-uTime*.6)*.003;
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
 vec4 fieldA=texture2D(uWaterField,p*.10+flow);
 vec4 fieldB=texture2D(uWaterField,p.yx*.157-flow*.71+(fieldA.rg-.5)*.045);
 // Cascades need flowing ribbons, not the lake reflection/wake calculations.
 if(uFall>.5){
  float streak=1.0-smoothstep(.02,.17,abs(fract(vWaterUv.x*uScale.x*7.0+fieldA.r*.5)-.5));
  float lace=streak*(.22+.34*fieldB.a);
  vec3 color=mix(uColor*.42,vec3(.75,.97,1.0),.06+lace*.52);
  color+=vec3(.05,.13,.14)*fieldA.b;
  float edgeFade=smoothstep(0.0,.045,vWaterUv.x)*(1.0-smoothstep(.955,1.0,vWaterUv.x));
  float foot=(1.0-smoothstep(0.0,.15,vWaterUv.y))*(.14+fieldB.a*.16);
  color=mix(color,vec3(.82,.98,1.0),foot);
  float alpha=clamp(uOpacity*.83+lace*.26,.28,.86)*edgeFade;
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  return;
 }
 vec2 slope=(fieldA.rg+fieldB.gr-1.0)*.19;
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
 vec3 base=normalize(vWaterNormal);
 if(!gl_FrontFacing)base=-base;
 // A continuous orthonormal basis replaces the old abrupt .9 normal switch.
 // Reflections now travel smoothly over changing slide slopes and view angles.
 float side=base.y>=0.0?1.0:-1.0;
 float basisA=-1.0/(side+base.y),basisB=base.x*base.z*basisA;
 vec3 tangent=vec3(1.0+side*base.x*base.x*basisA,-side*base.x,side*basisB);
 vec3 bitangent=vec3(basisB,-base.z,side+base.z*base.z*basisA);
 vec3 n=normalize(base+tangent*slope.x+bitangent*slope.y);
 vec3 view=normalize(cameraPosition-vWaterPoint);
 float facing=clamp(abs(dot(n,view)),0.0,1.0);
 float fresnel=.025+.975*pow(1.0-facing,5.0);
 vec3 reflected=reflect(-view,n);
 vec3 sky=texture2D(uWaterEnvironment,environmentUv(reflected),.7).rgb;
 vec3 halfSun=normalize(view+normalize(vec3(-.44,.85,-.50)));
 float gloss=max(dot(n,halfSun),0.0);
 float roughness=.085+min(.12,length(fwidth(slope))*.65);
 float a2=roughness*roughness;
 float denominator=gloss*gloss*(a2-1.0)+1.0;
 float glint=(a2/(3.14159*denominator*denominator))*.014*(.4+fieldB.a*.6);
 float edge=length((vWaterUv-.5)*2.0);
 float depth=clamp((1.0-edge*edge)*uLake,0.0,1.0);
 float shallow=(1.0-depth)*uLake;
 float opticalDepth=(.12+depth*.88)/max(facing,.3);
 float pink=smoothstep(.15,.55,uColor.r-uColor.g);
 vec3 absorption=mix(vec3(2.7,.42,.20),vec3(.22,1.65,.7),pink);
 vec3 transmission=exp2(-absorption*opticalDepth);
 vec3 deep=uColor*vec3(.24,.53,.69);
 vec3 shore=mix(uColor,uShoreColor,.3);
 vec3 body=mix(uColor*.7,mix(deep,shore,transmission),uLake);
 float caustic=min(1.5,fieldA.b*.7+fieldB.b*.55+fieldA.b*fieldB.b);
 vec3 color=mix(body,sky,clamp(.035+fresnel*.91,0.0,.96));
 vec3 lightTint=mix(vec3(.08,.21,.20),vec3(.22,.13,.18),smoothstep(.15,.55,uColor.r-uColor.g));
 color+=lightTint*caustic*(.3+shallow*.2);
 color+=vec3(1.0,.95,.83)*min(.55,glint);
 float shoreFoam=smoothstep(.945,.995,edge)*(.15+.4*fieldA.a)*uLake;
 float foam=clamp(shoreFoam+wakeFoam,0.0,.64);
 if(uFlowing>.5){
  float across=abs(vWaterUv.x-.5)*2.;
  float rim=smoothstep(.66,.99,across)*(.09+fieldA.a*.12);
  float ribbon=pow(max(0.,fieldA.a*.65+fieldB.a*.35-.5),2.)*.22;
  float travel=(vWaterUv.y*uFlowScale.y-uTime*uFlowSpeed)*.8+fieldA.r*.22;
  float footprint=fwidth(travel);
  float crest=1.-smoothstep(.025+footprint,.11+footprint,abs(fract(travel)-.5));
  foam=clamp(foam+rim+ribbon+crest*(.055+fieldB.a*.13),0.,.48);
  color=mix(color,uColor*(.62+fieldB.a*.3),.2);
  color+=mix(vec3(.10,.22,.25),vec3(.24,.12,.20),pink)*(fieldA.b*.7+fieldB.b*.4);
 }
 color=mix(color,vec3(.88,1.0,.96),foam);
 color+=vec3(.035,.065,.07)*abs(wake);
 float alpha=clamp(uOpacity*(.55+depth*.23)+fresnel*.42-shallow*.07+foam*.16,.16,.94);
 if(uFlowing>.5)alpha=max(alpha,.62+fresnel*.22);
 gl_FragColor=vec4(max(color,vec3(0.0)),alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
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
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uLake: { value: 0 },
      uShoreColor: { value: new THREE.Color(0x73e4c5) },
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
    toneMapped: false,
    // These are thin sheets, not transparent volumes. A second back/front pass
    // doubles shading work and is unnecessary for the authored surfaces.
    forceSinglePass: true,
  });
  material.userData.waterVersion = "lagoon-optics-v3-slide-flow";
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
