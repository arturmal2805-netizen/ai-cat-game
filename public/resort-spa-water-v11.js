import {installSpaWaterHighlights} from './resort-spa-water-highlights.js';
import * as T from 'three';
import {spaWaterQuality} from './resort-spa-water-quality.js';
import {createSpaRefraction} from './resort-spa-refraction.js';
import {registerSpaCausticProfile} from './resort-spa-water-v8.js';

// This adapter retains the common field, six wake slots and actual room probes.
// Physical depth comes from the authored basin/steps, never an edge-colour mask.
export function configureSpaWater(material,{kind='thermal',depth,rx=0,rz=0,steps=false}={}){
 if(material.userData.spaWaterQuality)return material.userData.spaWaterQuality;
 if(!Number.isFinite(depth)||depth<=0)throw Error('SPA water needs physical depth in metres');
 const q=spaWaterQuality(kind),u=material.uniforms;
 u.uColor.value.set(q.clear);u.uShoreColor.value.set(q.shallow);u.uOpacity.value=q.transparency;u.uWaterDepth.value=depth;
 Object.assign(u,{uSpaSceneColor:{value:null},uSpaRefractionReady:{value:0},uSpaViewport:{value:new T.Vector2(1,1)},uSpaAbsorption:{value:new T.Vector3(...q.absorption)},uSpaScatter:{value:q.scattering},uSpaRefract:{value:q.refractionStrength},uSpaRoughness:{value:q.roughness},uSpaWaveSpeed:{value:q.waveSpeed},uSpaNormal:{value:q.normalStrength},uSpaWaveAmplitude:{value:q.waveAmplitude},uSpaFoam:{value:q.foamIntensity},uSpaReflection:{value:q.reflectionStrength},uSpaBasin:{value:new T.Vector3(rx,rz,steps?1:0)}});
 material.vertexShader='uniform float uSpaWaveSpeed,uSpaWaveAmplitude;\n'+material.vertexShader.replace('sharedWaterWaves(p.xy,uTime,','sharedWaterWaves(mix(p.xz,p.xy,uFall),uTime*uSpaWaveSpeed,').replace('float wave=baseWave.x;','float wave=baseWave.x+sin(dot(p.xz,vec2(.31,.17))-uTime*uSpaWaveSpeed*.65)*uSpaWaveAmplitude;');
 const header=`
uniform sampler2D uSpaSceneColor;uniform float uSpaRefractionReady;uniform vec2 uSpaViewport;
uniform vec3 uSpaAbsorption;uniform float uSpaScatter,uSpaRefract,uSpaRoughness,uSpaWaveSpeed,uSpaNormal,uSpaWaveAmplitude,uSpaReflection,uSpaFoam;
uniform vec3 uSpaBasin;
float spaMetricDepth(){
 float depth=uWaterDepth;
 if(uSpaBasin.z>.5){
  float x=(vWaterUv.x-.5)*2.*uSpaBasin.x;
  float run=vWaterUv.y*2.*uSpaBasin.y;
  if(abs(x)<2.&&run<4.5)depth=min(depth,(floor(max(0.,run)/.75)+1.)*.3);
 }
 return depth;
}
vec3 spaLinear(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
vec3 spaEncoded(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
void spaRefract(vec2 slope,float depth){
 if(uSpaRefractionReady<.5)return;
 vec2 uv=gl_FragCoord.xy/uSpaViewport;
 vec2 delta=slope*uSpaRefract*min(depth,2.)*.014;
 // Fade distortion at the real silhouette: no neighbouring rim colour leak.
 if(uSpaBasin.x>0.)delta*=smoothstep(0.,.1,1.-length((vWaterUv-.5)*2.));
 vec3 behind=spaLinear(texture2D(uSpaSceneColor,clamp(uv+delta,vec2(.001),vec2(.999))).rgb);
 float facing=max(.35,abs(dot(normalize(cameraPosition-vWaterPoint),normalize(vWaterNormal))));
 float path=min(6.,depth/facing);
 vec3 transmitted=behind*exp(-uSpaAbsorption*path);
 float scatter=(1.-exp(-uSpaScatter*path))*.3;
 transmitted=mix(transmitted,uColor,scatter);
 // The framebuffer is already tone mapped/sRGB. Compose AFTER colour output;
 // do not apply ACES or the sRGB transfer twice, or alpha-blend it twice.
 gl_FragColor.rgb=mix(spaEncoded(transmitted),gl_FragColor.rgb,gl_FragColor.a);
 gl_FragColor.a=1.;
}
`;
 let f=material.fragmentShader;
 // Replace the V8 basin field scale if installed, or the common one otherwise.
 f=f.replace(/vec2 p=vWaterPoint\.xz(?:\*[\d.]+)?;/,'vec2 p=vWaterPoint.xz*'+q.causticScale+';');
 f=f.replace('vec2 flow=vec2(uTime*.014,-uTime*.009);','vec2 flow=vec2(uTime*.014,-uTime*.009)*uSpaWaveSpeed;');
 f=f.replace('vec2 slope=sharedWaterSlope(fieldA,fieldB);',`vec2 slope=sharedWaterSlope(fieldA,fieldB)*uSpaNormal;
 vec2 broadPhase=vec2(dot(vWaterPoint.xz,vec2(.31,.17)),dot(vWaterPoint.xz,vec2(-.19,.27)))-uTime*uSpaWaveSpeed*vec2(.65,.43);
 slope+=cos(broadPhase)*uSpaWaveAmplitude*vec2(.31,.27);`);
 f=f.replace('float foam=clamp(shoreFoam+wakeFoam,0.,.48);','float foam=clamp((shoreFoam+wakeFoam)*uSpaFoam/.04,0.,.2);');
 f=f.replace('float roughness=.085;','float roughness=uSpaRoughness;').replace('sky*fresnel','sky*fresnel*uSpaReflection');
 f=f.replace(/float waterDepth=(?:mix\([^;]+\)|uWaterDepth);/,'float waterDepth=spaMetricDepth();');
 // Both waterfall early-return and ordinary surface use this same transfer.
 f=f.replaceAll('#include <colorspace_fragment>','#include <colorspace_fragment>\n spaRefract(sharedWaterSlope(fieldA,fieldB),spaMetricDepth());');
 const at=f.indexOf('void main(){');if(at<0)throw Error('SPA shared water entry hook changed');
 material.fragmentShader=f.slice(0,at)+header+f.slice(at);
 material.userData.spaWaterQuality={version:11,kind,depth,profile:q};material.needsUpdate=true;
 return material.userData.spaWaterQuality;
}

export function prepareSpaWaterQuality(root){
 const data=root.userData,assigned=new Set(),ornamentalMaterials=new Map();
 const ornamental=(bed,wall,water,kind,level,depth)=>{
  const key=kind+':'+level+':'+depth;let m=ornamentalMaterials.get(key);
  if(!m){m=bed.material.clone();m.color.setHex(0x87d3da);m.roughness=.34;const q=spaWaterQuality(kind);registerSpaCausticProfile(m,{clock:water.uniforms.uTime,worldLevel:level,fieldScale:q.causticScale,intensity:q.causticIntensity,depth:0});ornamentalMaterials.set(key,m);}
  for(const o of [bed,wall]){o.material=m;o.receiveShadow=false;o.userData.resortWaterLiner=true;}
 };
 for(const b of data.basins){const p=b.userData.palacePool,water=b.userData.surface.material;
  const kind=p.sky?'sky':p.id==='thermal-main'?'thermal':p.id.startsWith('cafe')?'cafe':'vip';
  configureSpaWater(water,{kind,depth:b.userData.depth,rx:p.rx,rz:p.rz,steps:true});assigned.add(water);
  if(!p.sky){const q=spaWaterQuality(kind);registerSpaCausticProfile(b.userData.bed.material,{clock:water.uniforms.uTime,worldLevel:p.y,fieldScale:q.causticScale,intensity:q.causticIntensity,depth:b.userData.depth});
   // Steps need their own optical material; the shared public ivory must not
   // inherit underwater caustics. Mesh transforms/support triangles are intact.
   const stepMaterial=b.userData.steps[0].material.clone();stepMaterial.name='SPA submerged step optics';
   registerSpaCausticProfile(stepMaterial,{clock:water.uniforms.uTime,worldLevel:p.y,fieldScale:q.causticScale,intensity:q.causticIntensity,depth:0});
   for(const step of b.userData.steps)step.material=stepMaterial;
   const dispose=b.userData.dispose;b.userData.dispose=()=>{stepMaterial.dispose();dispose();};
  }
 }
 for(const f of data.gardenFeatures||[])for(const t of f.tiers){const kind=f.level===1?'aroma':'waterfall';configureSpaWater(t.water.material,{kind,depth:t.spec.depth,rx:t.spec.rx,rz:t.spec.rz});ornamental(t.bed,t.wall,t.water.material,kind,root.position.y+t.spec.y,t.spec.depth);assigned.add(t.water.material);}
 for(const f of data.thermalCascades||[]){configureSpaWater(f.source.material,{kind:'cascade',depth:f.spec.depth,rx:f.spec.rx,rz:f.spec.rz});ornamental(f.bed,f.wall,f.source.material,'cascade',root.position.y+f.spec.y,f.spec.depth);assigned.add(f.source.material);}
 for(const w of data.waters)if(!assigned.has(w.material))configureSpaWater(w.material,{kind:'cascade',depth:w.material.uniforms.uFall.value>.5?.035:w.material.uniforms.uWaterDepth.value});
 data.waterQuality={version:11,surfaces:data.waters.length,profiles:data.waters.map(w=>w.material.userData.spaWaterQuality)};
 const dispose=data.dispose;data.dispose=()=>{for(const m of ornamentalMaterials.values())m.dispose();dispose();};
}

export function attachSpaRefraction(root){
 installSpaWaterHighlights(root);
 const capture=createSpaRefraction(root),dispose=root.userData.dispose;
 root.userData.waterQuality.refraction=capture.stats;
 root.userData.dispose=()=>{capture.dispose();dispose();};
}
