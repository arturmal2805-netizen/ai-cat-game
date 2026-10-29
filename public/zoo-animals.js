import {zooCoatUniforms} from './zoo-coat-atlas.js';
import {zooModelFrames,zooInteractionPose,GORILLA_PLAY_REVISION} from './zoo-play-poses.js';
import {ZOO_CLIP_FRAMES,zooBehaviorFrame,zooClipPose} from './zoo-behavior.js';
import {optimizeGeometryCache} from './geometry-cache.js';
import {ZOO_ANATOMY_REVISION,POLAR_DETAIL_REVISION,ZOO_FACE_REVISIONS} from './zoo-anatomy-data.js';
import {zooTigerCoat,zooTigerCoatSteps} from './zoo-coat-pattern.js';
import {zooFurSteps,zooFurTexture,zooBearFurTexture} from './zoo-fur.js';
import {buildZooAnatomy,paintGorillaFace} from './zoo-anatomy.js';
import {zooEyeCap} from './zoo-eyes.js';
import {runSceneSteps} from './scene-tasks.js';
import {sculptZooAnimalSteps} from './zoo-sculpt.js';
import {zooSurfaceTexture,zooSurfaceTextureSteps,zooSurfaceDeclarations,zooSurfaceColor,zooSurfaceNormal} from './zoo-surface.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {copyGeometryBuffers} from './geometry-tasks.js';
import {ZOO_ANIMALS,ZOO_LINEAR_SCALE,zooFacing} from './zoo-data.js';
import {ZOO_CYCLE,ZOO_POSE_FRAMES,zooAnimalPose} from './zoo-animal-motion.js';
const cache=new Map(),sphere=new T.SphereGeometry(1,20,14),smallSphere=new T.SphereGeometry(1,12,8),largeSphere=new T.SphereGeometry(1,36,24),microSphere=new T.SphereGeometry(1,8,6),eyeSphere=new T.SphereGeometry(1,24,16);for(const g of [sphere,smallSphere,largeSphere,microSphere,eyeSphere])g.userData.sharedScenery=true;
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),TAU=Math.PI*2;
function* buildTemplateSteps(species){
 const joints=[],parts=[],volumes=[],sockets=[],pendingParts=[],map=new Map();
 const joint=(role,pivot,parent='root')=>{if(species==='axolotl'&&(role==='head'||parent==='head'))pivot=[pivot[0],pivot[1]+.12,pivot[2]];const id=joints.length;map.set(role,id);joints.push({role,pivot:v(...pivot),parent:id?map.get(parent):null});return id;};
 joint('root',[0,0,0]);joint('body',[0,1,0]);
 function add(color,pos,size,role='body',options={}){
  if(options.flesh){
   let shifted=pos;if(species==='axolotl'&&role==='head')shifted=[pos[0],pos[1]+.12,pos[2]];
   volumes.push({color,pos:shifted,size,role,id:map.get(role),blend:options.blend,relief:options.relief,stripes:typeof options.stripes==='number'?options.stripes:options.stripes?(role==='head'?2:1):0});return;
  }
  pendingParts.push([color,pos,size,role,options]);
 }
 function bakePart(color,pos,size,role,options){
  const source=options.geometryFactory?.();
  const geo=source||options.geometry?copyGeometryBuffers(source||options.geometry):copyGeometryBuffers(options.micro?microSphere:options.gloss?eyeSphere:Math.max(...size)>.7?largeSphere:Math.max(...size)<.2?smallSphere:sphere);source?.dispose();geo.scale(...size);if(options.aim)geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(v(0,0,1),v(...options.aim).normalize()));if(options.rot)geo.rotateZ(options.rot);geo.translate(...pos);
  if(options.ear){const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)-pos[0],y=p.getY(i)-pos[1],f=1+.045*Math.cos(3*Math.atan2(y/size[1],x/size[0]));p.setXY(i,pos[0]+x*f,pos[1]+y*f);}geo.computeVertexNormals();}
  if(species==='axolotl'){let id=map.get(role);while(id!==undefined&&id!==null){if(joints[id].role==='head'){geo.translate(0,.12,0);break;}id=joints[id].parent;}}
  const p=geo.attributes.position,colors=[],ids=[],weights=[],gloss=[],stripes=[],greetIds=[],greetPivots=[],greetWeights=[];
  for(let i=0;i<p.count;i++){const c=new T.Color(color);
   if(options.iris){const nx=(p.getX(i)-pos[0])/size[0],ny=(p.getY(i)-pos[1])/size[1],r=Math.min(1,Math.hypot(nx,ny)),rim=options.iris==='blue'?0x227f9e:0x54392d;c.lerp(new T.Color(rim),r*r*.55);c.multiplyScalar(1+Math.sin(Math.atan2(ny,nx)*22)*.035);}
   if(options.sculpt||options.painted)c.fromBufferAttribute(geo.attributes.color,i);
   stripes.push(options.sculpt?geo.attributes.aSculptStripe.getX(i):typeof options.stripes==='number'?options.stripes:options.stripes?(role==='head'?2:1):0);
   colors.push(c.r,c.g,c.b);let a=map.get(role),b=a,w=0;
   if(options.sculpt){a=geo.attributes.aSculptJoints.getX(i);b=geo.attributes.aSculptJoints.getY(i);w=geo.attributes.aSculptWeights.getY(i);}
   if(options.trunk){const q=Math.min(3.999999,Math.floor(i/13)/40*4);a=map.get(q<1?'head':'trunk'+Math.floor(q));b=map.get('trunk'+Math.min(4,Math.floor(q)+1));w=q%1;}
   if(options.fur&&p.getY(i)<.12){const foot=joints[a].role.startsWith('Foot')?a:joints[b].role.startsWith('Foot')?b:null;if(foot!==null){a=b=foot;w=0;}}
   ids.push(a,b);weights.push(1-w,w);gloss.push(options.gloss===undefined&&species==='axolotl'?.65:Number(options.gloss)||0,options.fur?1:0);
   const targets=species==='otter'?['root']:species==='elephant'?['trunk0']:species==='gorilla'?['ArmRight','ArmLeft']:species==='polar'?['LegFrontRight','head']:species==='tiger'?['LegFrontLeft','head']:['head'];const find=id=>{while(id!==undefined&&id!==null){if(targets.includes(joints[id].role))return id;id=joints[id].parent;}return -1;},fa=find(a),fb=find(b),found=fa>=0?fa:fb;
   greetIds.push(found);greetWeights.push((fa>=0?1-w:0)+(fb>=0?w:0));greetPivots.push(...(found<0?[0,0,0]:species==='otter'?[0,.43,0]:joints[found].pivot.toArray()));
  }
  for(const name of ['aSculptJoints','aSculptWeights','aSculptStripe'])geo.deleteAttribute(name);
  geo.setAttribute('aGreetWeight',new T.Float32BufferAttribute(greetWeights,1));
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('aJoints',new T.Float32BufferAttribute(ids,2));geo.setAttribute('aWeights',new T.Float32BufferAttribute(weights,2));geo.setAttribute('aGloss',new T.Float32BufferAttribute(gloss,2));geo.setAttribute('aStripe',new T.Float32BufferAttribute(stripes,1));
  geo.setAttribute('aGreetId',new T.Float32BufferAttribute(greetIds,1));geo.setAttribute('aGreetPivot',new T.Float32BufferAttribute(greetPivots,3));parts.push(geo);return geo;
 }
 const curve=(points,r,color,role='head')=>add(color,[0,0,0],[1,1,1],role,{geometryFactory:()=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>v(...p))),20,r,6,false)});
 const eye=(x,y,z,r,parent='head',blue=false,normal=[0,0,1])=>{
  const name='eye'+(x<0?'Left':'Right'),lid='lid'+(x<0?'Left':'Right'),q=new T.Quaternion().setFromUnitVectors(v(0,0,1),v(...normal).normalize()),
   point=(px,py,pz)=>v(px,py,pz).applyQuaternion(q).add(v(x,y,z)).toArray(),
   skin={axolotl:0xf5c6d6,elephant:0x606867,gorilla:0x514d46,tiger:0x716f67,polar:0x6a4934,otter:0x41342b}[species];
  joint(name,[x,y,z],parent);joint(lid,[x,y,z],parent);
  sockets.push({pos:[x,y+(species==='axolotl'?.12:0),z],size:[r*1.4,r*(species==='axolotl'?1.05:['gorilla','elephant'].includes(species)?.86:.95),r*(species==='axolotl'?1.0:1.55)]});
  if(species!=='axolotl')add(skin,point(0,0,-r*.3),[r*1.38,r*.83,r*.22],parent,{aim:normal});
  add(0xffffff,[x,y,z],[1,1,1],name,{geometryFactory:()=>zooEyeCap(r,{blue,axolotl:species==='axolotl',gorilla:species==='gorilla',roundness:species==='elephant'?.81:species==='gorilla'?.56:.69}),gloss:1,painted:true,aim:normal});
  add(0xfff9e9,point(-r*.22,r*.25,r*(species==='axolotl'?.67:.445)),[r*.1,r*.09,r*.035],name,{gloss:1,micro:true,aim:normal});
  add(0xc1d4d5,point(r*.2,-r*.12,r*(species==='axolotl'?.68:.45)),[r*.036,r*.035,r*.02],name,{gloss:1,micro:true,aim:normal});
  const h=species==='axolotl'?.86:species==='elephant'?.81:species==='gorilla'?.56:.69,rim=species==='polar'?0x493626:skin;
  // The axolotl's upper tube floated above its cornea in overhead views.
  // Keep its approved eye/skin and blink squeeze, without a stacked lid cap.
  if(species!=='axolotl')curve([point(-r*1.08,0,r*.04),point(-r*.55,r*h*.83,r*.39),point(0,r*h,r*.47),point(r*.55,r*h*.8,r*.39),point(r*1.08,0,r*.04)],r*.065,rim,parent);
  if(species!=='axolotl')curve([point(-r*1.08,0,r*.03),point(0,-r*h*.85,r*.44),point(r*1.08,0,r*.03)],r*.035,rim,parent);
  if(species!=='axolotl')add(skin,point(0,0,r*.49),[r*1.07,r*h,r*.09],lid,{aim:normal});
 };
 buildZooAnatomy(species,{joint,add,curve,eye,socket:s=>sockets.push(s)});
 const sculpt=yield*sculptZooAnimalSteps(volumes,{resolution:species==='gorilla'?160:species==='elephant'?112:96,soft:species==='axolotl'?.04:.09,sockets,pigment:species==='gorilla'?paintGorillaFace:undefined,targetTriangles:{elephant:28000,axolotl:16500,otter:15000,polar:26000,gorilla:27000}[species]}),sculptStats={volumes:volumes.length,vertices:sculpt.attributes.position.count,triangles:sculpt.index.count/3,weighted:0};for(let i=0;i<sculpt.attributes.position.count;i++)if(sculpt.attributes.aSculptWeights.getY(i)>.001)sculptStats.weighted++;add(0xffffff,[0,0,0],[1,1,1],'body',{geometry:sculpt,sculpt:true,gloss:species==='otter'?.36:species==='elephant'?.08:undefined});const fur=yield*zooFurSteps(sculpt,species);sculptStats.furCards=fur?.userData.furCards||0;if(fur){add(0xffffff,[0,0,0],[1,1,1],'body',{geometry:fur,sculpt:true,fur:true,gloss:species==='otter'?.36:0});fur.dispose();}sculpt.dispose();
 for(let i=0;i<pendingParts.length;i++){bakePart(...pendingParts[i]);if(i%3===0)yield;}
 const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());optimizeGeometryCache(geometry);geometry.computeBoundingSphere();geometry.userData.sharedScenery=true;
 const frameCount=zooModelFrames(species),n=joints.length,values=new Float32Array(n*4*frameCount*4),rest=joints.map((j,i)=>new T.Matrix4().makeTranslation(...j.pivot.toArray())),inverse=rest.map(m=>m.clone().invert()),animated=[];
 for(let f=0;f<frameCount;f++){for(let i=0;i<n;i++){
  const j=joints[i],p=zooInteractionPose(species,f,j.role)||zooClipPose(species,Math.floor(f/ZOO_CLIP_FRAMES),(f%ZOO_CLIP_FRAMES)/(ZOO_CLIP_FRAMES-1),j.role,zooAnimalPose),local=j.pivot.clone().sub(j.parent===null?v():joints[j.parent].pivot).add(v(p.x,p.y,p.z)),m=new T.Matrix4().compose(local,new T.Quaternion().setFromEuler(new T.Euler(p.rx,p.ry,p.rz)),v(p.sx,p.sy,p.sz));
  animated[i]=j.parent===null?m:animated[j.parent].clone().multiply(m);const skin=animated[i].clone().multiply(inverse[i]);values.set(skin.elements,(f*n+i)*16);
 }if(f%8===0)yield;}
 const texture=new T.DataTexture(values,n*4,frameCount,T.RGBAFormat,T.FloatType);texture.minFilter=texture.magFilter=T.NearestFilter;texture.needsUpdate=true;texture.userData.sharedScenery=true;
 return {species,geometry,texture,joints,values,frameCount,width:n*4,refs:0,sculptStats,anatomyRevision:ZOO_ANATOMY_REVISION,faceRevision:ZOO_FACE_REVISIONS[species],detailRevision:species==='polar'?POLAR_DETAIL_REVISION:species==='gorilla'?GORILLA_PLAY_REVISION:undefined};
}
const declarations=`attribute float aGreetWeight;varying vec3 vZooRestNormal;attribute vec2 aJoints;attribute vec2 aWeights;attribute vec2 aGloss;varying float vZooFur;varying vec2 vZooFurUV;attribute float aStripe;varying float vZooStripe;varying vec3 vZooRest;attribute float aZooPhase;varying float vZooGloss;uniform sampler2D uZooPose;uniform float uZooFrameAt[8];uniform float uZooOverrideFrame[8];uniform float uZooOverrideMix[8];uniform vec3 uZooReactShift[8];uniform vec2 uZooReactYaw[8];uniform float uZooGrip[8];uniform float uZooSpecies;uniform float uZooTime;uniform float uZooFrames;uniform float uZooCycle;uniform float uZooGreet;uniform float uZooApproach;uniform float uZooAngle;uniform vec3 uZooAxis;attribute float aGreetId;attribute vec3 aGreetPivot;
vec3 zooAxisRotate(vec3 p,vec3 axis,float a){return p*cos(a)+cross(axis,p)*sin(a)+axis*dot(axis,p)*(1.-cos(a));}
vec3 zooRotate(vec3 p){int i=int(aZooPhase);float a=uZooAngle;vec3 axis=uZooAxis;
if(uZooSpecies>1.5&&uZooSpecies<2.5)a*=1.-uZooOverrideMix[i];
if(uZooSpecies>2.5&&uZooSpecies<3.5&&abs(aGreetPivot.x)>.25){axis=vec3(1.,0.,0.);a=-uZooGreet*.6;}
if(uZooSpecies>3.5&&uZooSpecies<4.5&&abs(aGreetPivot.x)<.2){axis=vec3(0.,1.,0.);a*=.2;}
p=zooAxisRotate(p,axis,a*aGreetWeight);
if(uZooSpecies>1.5&&uZooSpecies<2.5)p=zooAxisRotate(p,vec3(0.,1.,0.),-sign(aGreetPivot.x)*uZooGrip[i]*aGreetWeight);return p;}
vec3 zooRootRotate(vec3 p){vec2 r=uZooReactYaw[int(aZooPhase)];return vec3(p.x*r.x+p.z*r.y,p.y,p.z*r.x-p.x*r.y);}
mat4 zooReadMatrix(float id,float f){int a=int(floor(f)),b=min(a+1,int(uZooFrames)-1),x=int(id)*4;float w=fract(f);return mat4(mix(texelFetch(uZooPose,ivec2(x,a),0),texelFetch(uZooPose,ivec2(x,b),0),w),mix(texelFetch(uZooPose,ivec2(x+1,a),0),texelFetch(uZooPose,ivec2(x+1,b),0),w),mix(texelFetch(uZooPose,ivec2(x+2,a),0),texelFetch(uZooPose,ivec2(x+2,b),0),w),mix(texelFetch(uZooPose,ivec2(x+3,a),0),texelFetch(uZooPose,ivec2(x+3,b),0),w));}
mat4 zooMatrix(float id){int i=int(aZooPhase);float w=uZooOverrideMix[i];if(w>=.9999)return zooReadMatrix(id,uZooOverrideFrame[i]);mat4 normal=zooReadMatrix(id,uZooFrameAt[i]);if(w<=.0001)return normal;return normal*(1.-w)+zooReadMatrix(id,uZooOverrideFrame[i])*w;}
vec3 zooNormal(mat4 m,vec3 n){mat3 a=mat3(m);return mat3(a[0]/max(dot(a[0],a[0]),.000001),a[1]/max(dot(a[1],a[1]),.000001),a[2]/max(dot(a[2],a[2]),.000001))*n;}`;
function motion(material,uniforms){material.onBeforeCompile=shader=>{
 Object.assign(shader.uniforms,uniforms);shader.vertexShader=declarations+'\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nmat4 zooA=zooMatrix(aJoints.x);objectNormal=zooNormal(zooA,objectNormal)*aWeights.x;if(aWeights.y>.0001)objectNormal+=zooNormal(zooMatrix(aJoints.y),normal)*aWeights.y;if(aGreetId>=0.)objectNormal=zooRotate(objectNormal);objectNormal=zooRootRotate(objectNormal);');
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvZooRestNormal=normal;vZooGloss=aGloss.x;vZooFur=aGloss.y;vZooFurUV=uv;vZooStripe=aStripe;vZooRest=position;transformed=(zooMatrix(aJoints.x)*vec4(position,1.)).xyz*aWeights.x;if(aWeights.y>.0001)transformed+=(zooMatrix(aJoints.y)*vec4(position,1.)).xyz*aWeights.y;if(aGreetId>=0.){vec3 pivot=(zooMatrix(aGreetId)*vec4(aGreetPivot,1.)).xyz;transformed=pivot+zooRotate(transformed-pivot);}transformed.z+=uZooGreet*uZooApproach;transformed=zooRootRotate(transformed);');
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 zooPoint=instanceMatrix*vec4(transformed,1.);zooPoint.xyz+=uZooReactShift[int(aZooPhase)];vec4 mvPosition=modelViewMatrix*zooPoint;gl_Position=projectionMatrix*mvPosition;`);
 shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>\n#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined( USE_SHADOWMAP ) || defined( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0\nworldPosition+=modelMatrix*vec4(uZooReactShift[int(aZooPhase)],0.);\n#endif`);
 shader.fragmentShader=zooSurfaceDeclarations+'uniform sampler2D uZooTigerCoat;uniform sampler2D uZooFurMap;varying float vZooFur;varying vec2 vZooFurUV;varying float vZooGloss;varying float vZooStripe;varying vec3 vZooRest;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
${zooSurfaceColor}
if(vZooStripe>.1){
 float mask=0.;
 if(vZooStripe>3.5)mask=texture2D(uZooTigerCoat,vZooFurUV).a;
 else if(vZooStripe>2.5)mask=texture2D(uZooTigerCoat,vec2(fract(vZooRest.z*.6+abs(vZooRest.x)),clamp(vZooRest.y/1.55,0.,1.))).g;
 else if(vZooStripe>1.5)mask=texture2D(uZooTigerCoat,vec2(vZooRest.x+.5,clamp((vZooRest.y-1.1)/.9,0.,1.))).b;
 else {float angle=atan(vZooRest.x/.55,(vZooRest.y-1.2)/.65)/6.2831853;mask=texture2D(uZooTigerCoat,vec2((vZooRest.z+1.6)/3.2,fract(angle+1.))).r;}
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.022,.027,.03),mask*min(1.,vZooStripe));}`).replace('void main() {',`void main() {\nif(vZooFur>.5&&texture2D(uZooFurMap,vZooFurUV).r<.24)discard;`).replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n'+zooSurfaceNormal).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(mix(.78,.065,vZooGloss)+zooMicroRoughness,.065,.95);');
 };material.customProgramCacheKey=()=> 'zoo-groomed-skin-v6';return material;}
export function zooAnimals(exhibit){return runSceneSteps(zooAnimalSteps(exhibit));}
export function* zooAnimalSteps(exhibit){
 yield*zooSurfaceTextureSteps();yield*zooTigerCoatSteps();
 let template=cache.get(exhibit.species);if(!template){template=yield*buildTemplateSteps(exhibit.species);cache.set(exhibit.species,template);}if(!template.refs++)template.texture.needsUpdate=true;
 const spec=ZOO_ANIMALS[exhibit.species],uniforms={...zooCoatUniforms,uZooOverrideFrame:{value:new Float32Array(8)},uZooOverrideMix:{value:new Float32Array(8)},uZooGrip:{value:new Float32Array(8)},uZooReactShift:{value:Array.from({length:8},()=>v())},uZooReactYaw:{value:Float32Array.from({length:16},(_,i)=>i%2?0:1)},uZooFrameAt:{value:new Float32Array(8)},uZooSpecies:{value:{elephant:1,gorilla:2,tiger:3,polar:4,otter:5,axolotl:6}[exhibit.species]},uZooTigerCoat:{value:zooTigerCoat()},uZooFurMap:{value:exhibit.species==='polar'?zooBearFurTexture():zooFurTexture()},uZooWrinkles:{value:exhibit.species==='elephant'?1:0},uZooSurface:{value:zooSurfaceTexture()},uZooSkin:{value:['elephant','axolotl'].includes(exhibit.species)?1:0},uZooPose:{value:template.texture},uZooTime:{value:0},uZooFrames:{value:template.frameCount||ZOO_POSE_FRAMES},uZooCycle:{value:ZOO_CYCLE},uZooGreet:{value:0},uZooApproach:{value:exhibit.species==='axolotl'?.8:0},uZooAngle:{value:0},uZooAxis:{value:exhibit.species==='otter'?v(0,0,1):exhibit.species==='axolotl'||exhibit.species==='tiger'?v(0,1,0):v(1,0,0)}},geometry=copyGeometryBuffers(template.geometry),phases=new Float32Array(spec.count),dummy=new T.Object3D();
 const material=motion(new T.MeshStandardMaterial({vertexColors:true,roughness:.76,alphaToCoverage:false}),uniforms),mesh=new T.InstancedMesh(geometry,material,spec.count);mesh.name='Zoo animals · '+exhibit.species;const bound=exhibit.species==='gorilla'?15:9;mesh.boundingSphere=new T.Sphere(v(0,exhibit.species==='gorilla'?2:1,0),bound);mesh.boundingBox=new T.Box3(v(-bound,-4,-bound),v(bound,10,bound));mesh.frustumCulled=true;mesh.raycast=()=>{};geometry.userData.sharedScenery=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.customDepthMaterial=motion(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}),uniforms);mesh.customDistanceMaterial=motion(new T.MeshDistanceMaterial(),uniforms);
 const anchors=spec.count===8?[[-2,1.2,-.8],[0,2.3,-1],[1.8,1.4,-.2],[-1.5,2.6,1.2],[.6,1.1,1.8],[2.1,2.7,1],[-2.4,1.7,1],[0,2.5,2.2]]:spec.count===4?[[-.2,0,0],[.1,0,0],[0,0,0],[0,0,0]]:exhibit.species==='polar'?[[-1.2,0,-.35],[1.25,0,-.45],[0,0,1.25]]:exhibit.species==='tiger'?[[-1.2,0,-.45],[1.3,0,-.55],[-.3,0,1.2]]:exhibit.species==='gorilla'?[[-1.9,0,-.35],[1.85,0,-.45],[.4,0,-.65]]:[[-1.6,0,-.35],[1.7,0,-.45],[-.6,0,1.45]];
 for(const anchor of anchors){anchor[0]*=exhibit.radius/4.5;anchor[2]*=exhibit.radius/4.5;}
 const actorData=[];
 for(let i=0;i<spec.count;i++){
  const scale=spec.scale[i],anchor=anchors[i],phase=exhibit.species==='otter'?i*ZOO_CYCLE/4+i*.21:['gorilla','tiger','polar'].includes(exhibit.species)?i*8+i*.31:i*.48;
  phases[i]=i;uniforms.uZooFrameAt.value[i]=zooBehaviorFrame(exhibit.species,i,0);dummy.position.set(...anchor);dummy.rotation.set(0,exhibit.species==='gorilla'?0:zooFacing(exhibit),0);dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);actorData.push({anchor,scale,phase,matrix:dummy.matrix.clone()});
 }
 geometry.setAttribute('aZooPhase',new T.InstancedBufferAttribute(phases,1));
 let disposed=false;mesh.userData={zooSpecies:exhibit.species,actors:actorData,poseTexture:template.texture,poseData:template,uniforms,update(time,reduced=false,greet=0,elapsed=0){uniforms.uZooTime.value=reduced?0:time;for(let i=0;i<spec.count;i++)uniforms.uZooFrameAt.value[i]=zooBehaviorFrame(exhibit.species,i,reduced?0:Math.max(0,time-(actorData[i].timeOrigin||0)));uniforms.uZooGreet.value=reduced?0:greet;uniforms.uZooAngle.value=reduced?0:exhibit.species==='otter'?TAU*T.MathUtils.smoothstep(elapsed,0,4):greet*(exhibit.species==='elephant'?-.7:exhibit.species==='polar'?-.7:exhibit.species==='gorilla'?-.45:Math.sin(elapsed*3.8)*.28);},dispose(){if(disposed)return;disposed=true;mesh.customDepthMaterial.dispose();mesh.customDistanceMaterial.dispose();if(--template.refs===0)template.texture.dispose();}};
 mesh.userData.setActorPlay=(i,play)=>{actorData[i].play=play;uniforms.uZooOverrideFrame.value[i]=play?.frame||0;uniforms.uZooOverrideMix.value[i]=play?.mix||0;uniforms.uZooGrip.value[i]=play?.grip||0;uniforms.uZooReactShift.value[i].set(play?.x||0,play?.y||0,play?.z||0);const angle=play?.yaw||0;uniforms.uZooReactYaw.value[i*2]=Math.cos(angle);uniforms.uZooReactYaw.value[i*2+1]=Math.sin(angle);};
 mesh.userData.restartActor=(i,time)=>{actorData[i].timeOrigin=time;mesh.userData.setActorPlay(i,null);};
 mesh.addEventListener('dispose',mesh.userData.dispose);return mesh;
}
function poseMatrix(mesh,id,index,time,out=new T.Matrix4()){
 const d=mesh.userData,a=d.actors[index],data=d.poseData,u=d.uniforms,mix=u.uZooOverrideMix.value[index],normal=zooBehaviorFrame(d.zooSpecies,index,Math.max(0,time-(a.timeOrigin||0))),frame=u.uZooOverrideFrame.value[index];
 const read=(f,target)=>{const lo=Math.floor(f),hi=Math.min(lo+1,(data.frameCount||400)-1),w=f-lo,n=data.joints.length;for(let k=0;k<16;k++)target.elements[k]=data.values[(lo*n+id)*16+k]*(1-w)+data.values[(hi*n+id)*16+k]*w;return target;};
 if(mix>=.9999)return read(frame,out);read(normal,out);if(mix>.0001){const target=read(frame,new T.Matrix4());for(let k=0;k<16;k++)out.elements[k]=out.elements[k]*(1-mix)+target.elements[k]*mix;}return out;
}
function greetTarget(mesh,id){const data=mesh.userData.poseData,s=mesh.userData.zooSpecies,roles=s==='otter'?['root']:s==='elephant'?['trunk0']:s==='gorilla'?['ArmLeft','ArmRight']:s==='polar'?['LegFrontRight','head']:s==='tiger'?['LegFrontLeft','head']:['head'];while(id!==null&&id!==undefined){if(roles.includes(data.joints[id].role))return id;id=data.joints[id].parent;}return -1;}
function rotateGreeting(mesh,out,index,pivot,weight=1){const d=mesh.userData,u=d.uniforms,s=d.zooSpecies;let angle=u.uZooAngle.value,axis=u.uZooAxis.value;
 if(s==='gorilla')angle*=1-u.uZooOverrideMix.value[index];if(s==='tiger'&&Math.abs(pivot.x)>.25){axis=v(1,0,0);angle=-u.uZooGreet.value*.6;}if(s==='polar'&&Math.abs(pivot.x)<.2){axis=v(0,1,0);angle*=.2;}
 out.applyAxisAngle(axis,angle*weight);if(s==='gorilla')out.applyAxisAngle(v(0,1,0),-Math.sign(pivot.x)*u.uZooGrip.value[index]*weight);return out;
}
function rootTransform(mesh,out,index,direction=false){const u=mesh.userData.uniforms,r=u.uZooReactYaw.value,x=out.x,z=out.z;out.x=x*r[index*2]+z*r[index*2+1];out.z=z*r[index*2]-x*r[index*2+1];if(direction)return out.transformDirection(mesh.userData.actors[index].matrix);return out.applyMatrix4(mesh.userData.actors[index].matrix).add(u.uZooReactShift.value[index]);}
export function zooAnimalPoint(mesh,index,time,out=new T.Vector3()){return zooJointPoint(mesh,'root',index,time,out);}
// Exact CPU skin queries include event overlays and match the colour/depth pose.
export function zooAnimalVertex(mesh,vertex,index,time,out=new T.Vector3()){
 const d=mesh.userData,g=mesh.geometry,p=new T.Vector3().fromBufferAttribute(g.attributes.position,vertex),ia=g.attributes.aJoints.getX(vertex),ib=g.attributes.aJoints.getY(vertex),wa=g.attributes.aWeights.getX(vertex),wb=g.attributes.aWeights.getY(vertex);
 out.copy(p).applyMatrix4(poseMatrix(mesh,ia,index,time)).multiplyScalar(wa);if(wb>.0001)out.add(p.clone().applyMatrix4(poseMatrix(mesh,ib,index,time)).multiplyScalar(wb));const id=g.attributes.aGreetId.getX(vertex);
 if(id>=0){const rest=new T.Vector3().fromBufferAttribute(g.attributes.aGreetPivot,vertex),pivot=rest.clone().applyMatrix4(poseMatrix(mesh,id,index,time));out.sub(pivot);rotateGreeting(mesh,out,index,rest,g.attributes.aGreetWeight.getX(vertex));out.add(pivot);}out.z+=d.uniforms.uZooGreet.value*d.uniforms.uZooApproach.value;return rootTransform(mesh,out,index);
}
export function zooLocalJointPoint(mesh,role,index,time,out=new T.Vector3(),restPoint){const data=mesh.userData.poseData,id=data.joints.findIndex(j=>j.role===role);if(id<0)throw Error('Unknown zoo joint '+role);return out.copy(restPoint||data.joints[id].pivot).applyMatrix4(poseMatrix(mesh,id,index,time));}
export function zooJointPoint(mesh,role,index,time,out=new T.Vector3(),restPoint){
 const data=mesh.userData.poseData,id=data.joints.findIndex(j=>j.role===role);if(id<0)throw Error('Unknown zoo joint '+role);zooLocalJointPoint(mesh,role,index,time,out,restPoint);const target=greetTarget(mesh,id);
 if(target>=0){const rest=mesh.userData.zooSpecies==='otter'?v(0,.43,0):data.joints[target].pivot,pivot=rest.clone().applyMatrix4(poseMatrix(mesh,target,index,time));out.sub(pivot);rotateGreeting(mesh,out,index,rest);out.add(pivot);}out.z+=mesh.userData.uniforms.uZooGreet.value*mesh.userData.uniforms.uZooApproach.value;return rootTransform(mesh,out,index);
}
export function zooJointDirection(mesh,role,index,time,out=new T.Vector3()){
 const data=mesh.userData.poseData,id=data.joints.findIndex(j=>j.role===role);if(id<0)throw Error('Unknown zoo joint '+role);out.set(0,0,1).transformDirection(poseMatrix(mesh,id,index,time));const target=greetTarget(mesh,id);if(target>=0)rotateGreeting(mesh,out,index,data.joints[target].pivot);return rootTransform(mesh,out,index,true);
}
// Catalogue artwork uses the same real animal, framed alone, with no new rig.
export function zooAnimalPreview(exhibit){
 const group=new T.Group(),a=zooAnimals(exhibit),m=new T.Matrix4();a.count=1;a.setMatrixAt(0,m);a.instanceMatrix.needsUpdate=true;a.userData.actors[0].matrix.identity();a.geometry.computeBoundingBox();a.boundingBox=a.geometry.boundingBox.clone();a.boundingSphere=a.geometry.boundingSphere.clone();group.add(a);
 group.userData.disposeStaff=()=>{a.dispose();a.geometry.dispose();a.material.dispose();};return group;
}

// Exact authoring output can be installed before the selected island prepares.
// A living template always wins; never invalidate its pose/geometry owners.
export function installZooAnimalTemplate(template){
 const old=cache.get(template.species);if(old?.refs){template.geometry.dispose();template.texture.dispose();return false;}
 if(old){old.geometry.dispose();old.texture.dispose();}cache.set(template.species,template);return true;
}
