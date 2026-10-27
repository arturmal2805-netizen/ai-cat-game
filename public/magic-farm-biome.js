import * as T from 'three';
import {MAGIC_FRUITS,magicFarmLayout,magicFarm} from './magic-farms-data.js';
import {fruitGeometry,fruitMaterial} from './magic-fruit-models.js';
import {shape,line,torus,flowerCluster,lantern,fluffyTree,crescentGate,surfaceTexture} from './fantasy-scenery.js';
import {lagoonSteps,waterfallSteps} from './lagoon.js';
import {batchModelSteps} from './model-batching.js';
import {disposeScenery,sceneryModelSteps,positionScenery} from './scenery-models.js';
import {runSceneSteps} from './scene-tasks.js';
const TAU=Math.PI*2;
function road(g,a,b,width=5){const m=shape(g,'cube',0xeadac4,(a.x+b.x)/2,.06,(a.z+b.z)/2,width,.12,Math.hypot(b.x-a.x,b.z-a.z));m.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);}
function* bake(group){const m=yield*batchModelSteps(group,{combineColors:true});group.traverse(o=>{if(o.geometry&&!o.geometry.userData.sharedScenery)o.geometry.dispose();});return m;}
function fieldTree(g,f,p){
 const y=p.height;
 if(p.kind==='pumpkin'){
  shape(g,'pole',0x72956e,p.x,1,p.z,.24,2,.24);for(let j=0;j<5;j++){const a=j*TAU/5;const leaf=shape(g,'sphere',0x89b383,p.x+Math.sin(a)*2.4,.35,p.z+Math.cos(a)*2.4,2.6,.28,1.4);leaf.rotation.y=a;}
 }else if(f.kind==='crystal'){
  for(let k=0;k<4;k++){const a=k*TAU/4,c=shape(g,'crystal',k%2?0xaa9bea:0x85d8d1,p.x+Math.sin(a)*2.4,y*.6,p.z+Math.cos(a)*2.4,2.1,y*(.8+k*.1),2.1);c.rotation.z=(k-1.5)*.13;}
 }else{
  const trunk=shape(g,'pole',f.kind==='moon'?0xbdccd4:0xa58175,p.x,y*.42,p.z,.65,y*.85,.65);trunk.rotation.z=Math.sin(p.x)*.09;
  for(let k=0;k<3;k++){const a=k*TAU/3;line(g,[p.x,y*.55,p.z],[p.x+Math.sin(a)*3,y*.9,p.z+Math.cos(a)*3],f.kind==='moon'?0xc2d4e2:0xa58175,.32);}
  for(let k=0;k<5;k++){const a=k*TAU/5,color=f.kind==='cloud'?(k%2?0xadddf3:0xf3b5d8):f.kind==='moon'?(k%2?0xc2d9e6:0xd8e1ed):k%2?0x8ec9aa:0x71bca2;shape(g,'sphere',color,p.x+Math.sin(a)*2.9,y+Math.sin(k)*.7,p.z+Math.cos(a)*2.7,3.8,2.5,3.7);}
 }
}
export function* magicFarmBiomeSteps(biome,{lowOnly=false,scenery=[]}={}){
 const f=magicFarm(biome.id),layout=magicFarmLayout(f.id),root=new T.Group(),base=new T.Group(),detail=new T.Group(),low=new T.Group(),props=new T.Group(),animations=[],lagoons=new Map(),fruitBatches=[];
 root.name=f.name;root.add(base,detail,low);yield;
 // A real cut-out lagoon, continuous lawn, floating cliff and pointed underside.
 const s=new T.Shape();s.absarc(0,0,f.radius,0,TAU,false);const [px,pz,rx,rz]=layout.pond,hole=new T.Path();hole.absellipse(px,-pz,rx,rz,0,TAU,true);s.holes.push(hole);
 const top=new T.ExtrudeGeometry(s,{depth:.35,bevelEnabled:false,curveSegments:64});top.rotateX(-Math.PI/2);top.translate(0,-.27,0);
 const lawn=new T.Mesh(top,new T.MeshStandardMaterial({color:f.ground,map:surfaceTexture('lawn'),roughness:.93}));lawn.receiveShadow=true;base.add(lawn);yield;
 const cliff=new T.Mesh(new T.CylinderGeometry(f.radius*.98,f.radius*.85,16,64,2,true),new T.MeshStandardMaterial({color:f.edge,roughness:.94}));cliff.position.y=-8;base.add(cliff);
 const point=shape(base,'cone',f.edge,0,-30,0,f.radius*.86,36,f.radius*.86);point.rotation.z=Math.PI;cliff.name='Floating farm cliff';yield;
 for(let i=0;i<12;i++){const a=i*TAU/12;shape(base,'stone',f.edge,Math.sin(a)*(f.radius-3),-6,Math.cos(a)*(f.radius-3),7,13,7);if(i%2===0)shape(base,'sphere',0xeff1fa,Math.sin(a)*f.radius,-28,Math.cos(a)*f.radius,16,3,9);yield;}
 // A cheap authored silhouette is retained at a distance. Full fields only
 // exist in the selected island's cooperative detail preparation.
 for(let i=0;i<3;i++)shape(low,f.kind==='crystal'?'crystal':'sphere',f.foliage,(i-1)*22,7,-18,13,f.kind==='crystal'?23:8,13);
 if(!lowOnly){
  const lake=yield*lagoonSteps({x:px,z:pz,rx,rz,fishCount:8,color:f.water,bedColor:f.ground,seed:349+MAGIC_FRUITS.findIndex(x=>x.biome===f.id)});detail.add(lake);lagoons.set('lake-'+f.id,lake);animations.push(lake);
  for(let i=0;i<4;i++){const a=(i+.3)*TAU/4,waterfall=yield*waterfallSteps(Math.sin(a)*(f.radius-.3),Math.cos(a)*(f.radius-.3),4.2,28,{color:f.kind==='cloud'?0xf0b1de:f.water});waterfall.rotation.y=a;detail.add(waterfall);animations.push(waterfall);}
  const nodes=layout.plants;
  // Distinct traversable layouts: oval orchard, parallel cloud rows, crystal
  // canyon banks and concentric pumpkin walks. No repeated recoloured map.
  road(props,layout.gate,layout.storage,8);
  if(f.kind==='star'||f.kind==='moon')for(let i=0;i<nodes.length;i++){const a=nodes[i],b=nodes[(i+1)%nodes.length];road(props,{x:a.x,z:a.z+7},{x:b.x,z:b.z+7},6);yield;}
  else if(f.kind==='cloud')for(const x of [-64,-21,22,65])road(props,{x,z:-68},{x,z:64},6);
  else for(const x of [-20,20])road(props,{x,z:-72},{x,z:66},6);
  road(props,{x:-65,z:60},{x:65,z:60},7);
  for(const [i,p]of nodes.entries()){
   fieldTree(props,f,p);flowerCluster(props,p.x+4,p.z-3,f.accent,1.4);if(i%3===0)lantern(props,p.x-4,0,p.z+5,1.3);yield;
  }
  // Storage is shared with the native farm inventory and has visible baskets.
  for(const x of [-22.5,-7.5,7.5,22.5]){shape(props,'cube',0xbb946f,x,1.1,73,4,2.2,3);for(let k=0;k<3;k++)shape(props,'pole',0xefd6a6,x-1.6+k*1.6,1.1,74.55,.08,2,.08);}
  for(const x of [-36,36])shape(props,'pole',0x987d6c,x,5,69,.35,10,.35);
  const canopy=shape(props,'cube',f.foliage,0,9.8,69,76,.5,7);canopy.rotation.z=.02;
  if(f.kind==='star'){
   const medallion=new T.Mesh(fruitGeometry('star'),fruitMaterial('sunstar',true));medallion.scale.setScalar(7);medallion.position.set(0,19,-19);props.add(medallion);
   for(let i=0;i<7;i++){const a=i*TAU/7;shape(props,'stone',0xb9b3d4,Math.sin(a)*26,.5,-7+Math.cos(a)*25,2,1.3,2);yield;}
  }else if(f.kind==='cloud'){
   for(let i=0;i<6;i++){const x=Math.sin(i*2.7)*73,z=Math.cos(i*2.7)*65;shape(props,'sphere',i%2?0xbde7f9:0xf2c4e6,x,2,z,8,3,7);yield;}
  }else if(f.kind==='crystal'){
   for(let i=0;i<18;i++){const a=(i/18)*TAU,x=Math.sin(a)*83,z=Math.cos(a)*78;const m=shape(props,'crystal',i%3===0?0xffa6df:i%2?0xa695eb:0x87dce0,x,8+i%5,z,4.4,16+i%5*3,4.4);m.rotation.z=Math.sin(i)*.2;yield;}
  }else{
   crescentGate(props,0,0,-43,0xffdf9e,7);for(let i=0;i<10;i++){const a=i*TAU/10;lantern(props,Math.sin(a)*76,0,Math.cos(a)*70,2.2,0xffd291);yield;}
  }
  detail.add(yield*bake(props));yield;
  // One fixed instanced draw per fruit/material; matrices change only on
  // harvest/regrowth stage transitions, never on every animation frame.
  for(const fruit of MAGIC_FRUITS.filter(x=>x.biome===f.id)){
   const plants=nodes.filter(p=>p.fruit===fruit.id),meshes=[false,true].map(core=>new T.InstancedMesh(fruitGeometry(f.kind),fruitMaterial(fruit.id,core),plants.length));
   for(const m of meshes){m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.name=fruit.name;detail.add(m);}fruitBatches.push({fruit,plants,meshes,stages:new Map()});yield;
  }
  // Small fixed firefly buffer: all motion stays in the vertex shader.
  const positions=new Float32Array(48*3);for(let i=0;i<48;i++){positions[i*3]=Math.sin(i*13)*65;positions[i*3+1]=3+i%11;positions[i*3+2]=Math.cos(i*7)*65;}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));const clock={value:0};
  const flies=new T.Points(geo,new T.ShaderMaterial({uniforms:{clock},transparent:true,depthWrite:false,vertexShader:'uniform float clock;void main(){vec3 p=position+vec3(sin(clock*.7+position.z),sin(clock+position.x)*.5,cos(clock*.6+position.x));vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(90./max(1.,-v.z),1.,5.);}',fragmentShader:'void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(1.,.91,.62,(1.-smoothstep(.1,.5,d))*.8);}'}));flies.frustumCulled=false;detail.add(flies);animations.push({userData:{update:t=>{clock.value=t;}}});
 }
 const matrix=new T.Object3D(),color=new T.Color(),pickedPlants=new Set();let state,lastStageAt=-Infinity;
 function syncOrchard(next,now=Date.now()){
  if(next===state&&now-lastStageAt<5000)return;state=next;lastStageAt=now;
  for(const b of fruitBatches)for(const [i,p]of b.plants.entries()){
   const readyAt=state?.plants?.[p.id]?.readyAt||0,left=readyAt-now,stage=pickedPlants.has(p.id)?-1:left<=0?2:left<b.fruit.seconds*500?1:0;if(b.stages.get(p.id)===stage)continue;b.stages.set(p.id,stage);
   const size=(stage===-1?0:stage===2?1:stage===1?.68:.35)*(p.kind==='pumpkin'?2.8:1.5);
   for(const [layer,m]of b.meshes.entries()){
    matrix.position.set(p.x,p.kind==='pumpkin'?2.2:3.5,p.z+1.1+(layer&&f.kind!=='crystal'?.3:0));matrix.rotation.set(0,Math.sin(i)*.35,0);matrix.scale.setScalar(size*(layer?.45:1));matrix.updateMatrix();m.setMatrixAt(i,matrix.matrix);color.set(stage===2?0xffffff:0x8fc18e);m.setColorAt(i,color);m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere();
   }
  }
 }
 const sceneryObjects=new Map();root.userData={biomeId:f.id,magicFarm:f.id,detail,lowDetail:low,lowOnly,navigationSurface:base,lagoons,trees:[],sceneryObjects,stats:{staticMeshes:0,sourceMeshes:0,fishCount:lowOnly?0:8},syncOrchard,setPlantPicked(id,yes){yes?pickedPlants.add(id):pickedPlants.delete(id);lastStageAt=-Infinity;syncOrchard(state);},update(time,reduced){if(!detail.visible)return;for(const a of animations)a.userData.update?.(reduced?0:time,reduced);syncOrchard(state);},dispose:()=>disposeScenery(root)};
 root.userData.placementSteps=function*(_items=[],records=[]){for(const [id,m]of sceneryObjects)if(!records.some(r=>r.id===id&&!r.stored)){m.removeFromParent();disposeScenery(m);sceneryObjects.delete(id);yield;}if(!lowOnly)for(const r of records.filter(r=>r.biome===f.id&&!r.stored)){let m=sceneryObjects.get(r.id);if(!m){m=yield*sceneryModelSteps(r);sceneryObjects.set(r.id,m);detail.add(m);}positionScenery(m,r);yield;}};
 root.userData.updatePlacements=(...args)=>runSceneSteps(root.userData.placementSteps(...args));yield*root.userData.placementSteps([],scenery);
 root.userData.stats.staticMeshes=detail.children.filter(o=>o.isMesh).length;syncOrchard(null);detail.visible=!lowOnly;low.visible=lowOnly;return root;
}
