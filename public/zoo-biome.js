import {GORILLA_BRANCH_HEIGHT,GORILLA_BRANCH_X,GORILLA_BRANCH_Z} from './zoo-gorilla-swing.js';
import {createGorillaPlay,zooJump,smooth} from './zoo-play.js';
import {zooPlayWater} from './zoo-play-water.js';
import {POLAR_INSPECTION_POINT} from './zoo-anatomy-data.js';
import * as T from 'three';
import {ZOO_ID,ZOO_LINEAR_SCALE as S,ZOO_RADIUS as R,ZOO_EXHIBITS,zooFacing,zooViewGate} from './zoo-data.js';
import {zooIsOpen} from './zoo-system.js';
import {zooAnimalSteps,zooJointPoint,zooJointDirection} from './zoo-animals.js';
import {zooWaterlife,zooWaterfallSteps} from './zoo-waterlife.js';
import {shape,line,flowerCluster,lantern,fluffyTree,teaPavilion,surfaceTexture} from './fantasy-scenery.js';
import {junglePlant,jungleFlowers} from './jungle-props.js';
import {coralCluster} from './reef.js';
import {lagoonSteps,waterfallSteps} from './lagoon.js';
import {waterMaterial,advanceWater,applyUnderwaterLighting} from './water-shading.js';
import {batchModelSteps} from './model-batching.js';
import {courtLabel} from './foodcourt-assets.js';
import {runSceneSteps} from './scene-tasks.js';
import {disposeScenery} from './scenery-models.js';
import {BIOME_STYLES} from './biome-styles.js';
const TAU=Math.PI*2;
const pools=ZOO_EXHIBITS.filter(e=>e.species!=='axolotl').map(e=>({id:'zoo-water-'+e.species,x:e.x,z:e.z+(e.species==='elephant'?-2.55:e.species==='tiger'?-2.2:e.species==='gorilla'?-2.8:.1)*S,rx:(e.species==='otter'?3.6:e.species==='polar'?3.5:e.species==='gorilla'?2:2.7)*(e.radius/4.5),rz:(e.species==='otter'?3.25:e.species==='polar'?2.9:1.2)*(e.radius/4.5),color:e.species==='polar'?0x27bdd5:0x1ac6e3,fishCount:0,depth:e.species==='polar'?2.85:e.species==='otter'?1.55:1.2}));
function platform(base){
 const outline=new T.Shape();outline.absarc(0,0,R,0,TAU,false);
 for(const p of pools){const hole=new T.Path();hole.absellipse(p.x,-p.z,p.rx,p.rz,0,TAU,true);outline.holes.push(hole);}
 const geo=new T.ExtrudeGeometry(outline,{depth:.3,bevelEnabled:true,bevelSize:.05,bevelThickness:.03,bevelSegments:2,curveSegments:128});geo.rotateX(-Math.PI/2);geo.translate(0,-.18,0);
 const top=new T.Mesh(geo,new T.MeshStandardMaterial({color:0xa8c883,roughness:.88,map:surfaceTexture('ground')}));top.receiveShadow=true;base.add(top);
 const cliff=new T.Mesh(new T.CylinderGeometry(R-.1,R-2.6,9.2,144,3,true),new T.MeshStandardMaterial({color:0x999c91,roughness:.9,map:surfaceTexture('stone')}));cliff.position.y=-4.75;cliff.castShadow=true;base.add(cliff);
 const point=new T.Mesh(new T.ConeGeometry(R-2.5,14.5,128,3),new T.MeshStandardMaterial({color:0x818c91,roughness:.94}));point.rotation.z=Math.PI;point.position.y=-16.5;base.add(point);
}
function pathMesh(parent,points,width=1.6,color=0xf3dfb1){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],.2,p[1]))),verts=[],normals=[],uv=[],ix=[],s=80;for(let i=0;i<=s;i++){const p=curve.getPoint(i/s),t=curve.getTangent(i/s),r=new T.Vector3(t.z,0,-t.x).normalize().multiplyScalar(width/2);for(const side of [-1,1]){verts.push(p.x+r.x*side,p.y,p.z+r.z*side);normals.push(0,1,0);uv.push(side<0?0:1,i/5);}if(i<s){const k=i*2;ix.push(k,k+2,k+1,k+1,k+2,k+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);const m=new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:.85,side:T.DoubleSide,map:surfaceTexture('ground')}));m.receiveShadow=true;parent.add(m);}
function ringPath(parent,r,width){const p=Array.from({length:65},(_,i)=>[Math.sin(i/64*TAU)*r,Math.cos(i/64*TAU)*r]);pathMesh(parent,p,width);}
function tree(props,x,y,z,pink=false,scale=1){fluffyTree(props,x,z,pink?0xf4b4d1:0x6ca84d,'oak',scale,y);}
function* habitat(props,e,detail,effects,lagoons){
 const y=.16,S=e.radius/4.5;
 const land=new T.Shape();land.absarc(e.x,-e.z,e.radius,0,TAU,false);
 const pond=pools.find(p=>p.id==='zoo-water-'+e.species);
 if(pond){const hole=new T.Path();hole.absellipse(pond.x,-pond.z,pond.rx,pond.rz,0,TAU,true);land.holes.push(hole);}
 const landGeo=new T.ShapeGeometry(land,48);landGeo.rotateX(-Math.PI/2);landGeo.translate(0,.17,0);
 const ground=new T.Mesh(landGeo,new T.MeshStandardMaterial({color:e.ground,roughness:.9}));ground.receiveShadow=true;props.add(ground);
 for(let i=0;i<32;i++){
  const a=i/32*TAU,facing=zooFacing(e),delta=Math.atan2(Math.sin(a-facing),Math.cos(a-facing));if(Math.abs(delta)<.28)continue;
  const x=e.x+Math.sin(a)*(e.radius+.04),z=e.z+Math.cos(a)*(e.radius+.04),next=a+TAU/32;
  shape(props,'pole',0xc79b67,x,.6,z,.055,1,.055);
  for(const h of [.46,.83])line(props,[x,h,z],[e.x+Math.sin(next)*(e.radius+.04),h,e.z+Math.cos(next)*(e.radius+.04)],0xc18b5c,.036);
  if(i%4===0){jungleFlowers(props,x, .18,z,.5,e.species==='tiger'?0xc7a1f2:i%8?0xffbdd8:0xffdf9e);lantern(props,x,1.02,z,.25);}yield;
 }
 for(let k=0;k<9;k++){
  const a=zooFacing(e)+Math.PI+(k-4)*.18,x=e.x+Math.sin(a)*3.8*S,z=e.z+Math.cos(a)*3.8*S;
  shape(props,'stone',e.species==='polar'?0x8d9c86:e.species==='tiger'?0xa4a2c6:0x9aa28b,x,.7+(k%3)*.3,z,.65,1+(k%3)*.4,.65);
  if(e.species!=='polar'){jungleFlowers(props,x,1.55+(k%3)*.45,z,.9,k%2?0xff91c0:0xfbd989);if(k%3===0)tree(props,x,1.45,z,e.species==='tiger'||e.species==='axolotl',.7);}
  yield;
 }
 const back=zooFacing(e)+Math.PI;teaPavilion(props,e.x+Math.sin(back)*3.75*S,1.2,e.z+Math.cos(back)*3.75*S,e.species==='polar'?0xbba174:0xe2ac72,.35);
 const snow=false,grizzly=e.species==='polar';
 for(let i=0;i<10;i++){
  const a=i/10*TAU,x=e.x+Math.sin(a)*4*S,z=e.z+Math.cos(a)*4*S,front=Math.cos(a-zooFacing(e));
  if(front>.62)continue;
  shape(props,'stone',snow?0xcceefa:e.species==='tiger'?0xb2b4c9:0x929c81,x,.35+(i%3)*.15,z,.48,.58+(i%3)*.24,.46);
  if(snow||grizzly){for(let k=0;k<3;k++)shape(props,'cone',snow&&k===2?0xe5f5f3:0x5f9464,x,.75+k*.3,z,.55-k*.1,1-k*.13,.55-k*.1);shape(props,'pole',0x9e9d93,x,.42,z,.08,.8,.08);}
  else if(e.species==='tiger'){tree(props,x,.2,z,true,.65);jungleFlowers(props,x+.25,.25,z,.5,0xb98ae5);}
  else if(i%2===0)tree(props,x,.18,z,e.species==='axolotl',e.species==='gorilla'?.95:.7);
  else junglePlant(props,x,.2,z,.8,i);
  yield;
 }
 if(e.species==='axolotl'){
  const rx=3.8*S,rz=3.25*S,base=.42,h=3.65;
  const clock={value:0},level={value:base+h},floorMat=applyUnderwaterLighting(new T.MeshStandardMaterial({color:0x55d5e6,roughness:.55}),clock,0x39cced,{level,refract:false});
  const tankFloor=new T.Mesh(new T.CylinderGeometry(1,1,.18,144),floorMat);tankFloor.scale.set(rx,1,rz);tankFloor.position.set(e.x,base-.08,e.z);tankFloor.receiveShadow=true;detail.add(tankFloor);effects.push({userData:{update:(t,r)=>{clock.value=r?0:t;}}});
  const glass=new T.Mesh(new T.CylinderGeometry(1,1,h,144,1,true),new T.MeshPhysicalMaterial({color:0x23d4eb,roughness:.15,metalness:.02,transparent:true,opacity:.21,depthWrite:false,side:T.DoubleSide}));glass.scale.set(rx,1,rz);glass.position.set(e.x,base+h/2,e.z);glass.renderOrder=4;detail.add(glass);
  const surfaceMat=waterMaterial(0x13c4e9,.32),surface=new T.Mesh(new T.CircleGeometry(1,144),surfaceMat);surface.rotation.x=-Math.PI/2;surface.scale.set(rx,rz,1);surface.position.set(e.x,base+h,e.z);surface.renderOrder=4;detail.add(surface);effects.push({userData:{update:(t,r)=>advanceWater(surfaceMat,t,r)}});
  for(let i=0;i<24;i++){const a=i*2.399,r=(1+(i%5)*.5)*S,x=e.x+Math.sin(a)*r,z=e.z+Math.cos(a)*r;coralCluster(props,x,z,.65+(i%3)*.22,i,base+.05);yield;}
  const life=zooWaterlife(S);life.position.set(e.x,base,e.z);detail.add(life);effects.push(life);
  for(const height of [base,base+h]){const rim=new T.Mesh(new T.TorusGeometry(1,.027,6,144),new T.MeshStandardMaterial({color:0xf2d4a7,metalness:.3,roughness:.4}));rim.rotation.x=Math.PI/2;rim.scale.set(rx,rz,1);rim.position.set(e.x,height,e.z);detail.add(rim);}
 }else{
  const p=pools.find(p=>p.id==='zoo-water-'+e.species),lake=yield*lagoonSteps({...p,ambientOnly:true});detail.add(lake);lagoons.set(p.id,lake);effects.push(lake);
  const bZ=e.z-3.45*S,bX=e.x+(e.species==='tiger'?1:0)*S,height=e.species==='polar'?2.55:2.1;
  for(let i=0;i<7;i++){const x=bX+(i-3)*.62*S;shape(props,'stone',snow?0xc8e7f3:e.species==='tiger'?0x9898b9:0x929a86,x,height*.4,bZ,.5,height*.55+(i%2)*.2,.48);if(snow)shape(props,'cube',0xecfbff,x,height+.02,bZ,.55,.15,.5);else junglePlant(props,x,height+.1,bZ,.6,i);yield;}
  for(const offset of [-.62,.62]){const fall=yield*zooWaterfallSteps(bX+offset*S,bZ+.45*S,.5,height,{color:0x7edfee});fall.position.y+=height;detail.add(fall);effects.push(fall);}
  if(e.species==='otter')for(const [x,z]of [[0,1.65],[-2.4,.2],[2.4,-.1]])shape(props,'stone',0xa5aa95,e.x+x*S,.17,e.z+z*S,.9,.35,.6);
  if(grizzly)for(const [x,z,rx,rz]of [[-.2,-.9,1.3,1.05],[2.25,-.9,1.1,.9],[.52,.95,.8,.65]]){const ice=new T.Mesh(new T.CylinderGeometry(1,1.04,.2,8),new T.MeshStandardMaterial({color:0x9aa68a,roughness:.84}));ice.scale.set(rx*S,1,rz*S);ice.position.set(e.x+x*S,.07,e.z+z*S);ice.rotation.y=.23;ice.receiveShadow=true;props.add(ice);}

  if(e.species==='gorilla'){
   // Branches coincide with the baked palms of every actual instance, including
   // the smaller gorilla. No moving branch matrices or duplicate animal rigs.
   for(const [ax,az,k] of [[-1.9*S,-.35*S,1],[1.85*S,-.45*S,.9],[.4*S,-.65*S,.6]]){
    const h=GORILLA_BRANCH_HEIGHT*k,z=e.z+az+GORILLA_BRANCH_Z*k,x=e.x+ax;
    for(const side of [-1,1]){const tx=x+side*(GORILLA_BRANCH_X+.45)*k;line(props,[tx,.16,z-.35*k],[tx,h+.9*k,z-.2*k],0x916340,.18*k);line(props,[tx,h+.12,z-.2*k],[x+side*GORILLA_BRANCH_X*k,h,z],0xa77b4a,.12*k);for(let j=0;j<3;j++)shape(props,'sphere',j%2?0x59a65e:0x77ba68,tx+(j-1)*.6*k,h+.7*k,z-.35*k,.85*k,.55*k,.8*k);}
    for(const side of [-1,1])line(props,[x+side*(GORILLA_BRANCH_X+.65)*k,h,z],[x+side*(GORILLA_BRANCH_X-1.05)*k,h,z],0xa97948,.12*k);
   }

  }
 }
}
export function* zooBiomeSteps(biome,{lowOnly=false,preview=false}={}){
 const cameraDirection=new T.Vector3(),polarLook=new T.Vector3(...POLAR_INSPECTION_POINT),root=new T.Group(),base=new T.Group(),detail=new T.Group(),low=new T.Group(),props=new T.Group(),effects=[],edgeEffects=[],lagoons=new Map(),actors=new Map(),zones=new Map(),plays=new Map(),playWater=new Map();root.name='Чарівний зоопарк · п’ять просторих мінібіомів';root.add(base,detail,low);platform(base);yield;
 const lowProps=new T.Group();
 for(const e of ZOO_EXHIBITS){shape(lowProps,'sphere',e.ground,e.x,.55,e.z,4.2*S,.6,4.2*S);shape(lowProps,'sphere',e.accent,e.x,1.1,e.z,.8,.7,.8);}
 low.add(yield*batchModelSteps(lowProps,{combineColors:true}));yield;
 // The visible basalt foundation and clouds never turn into a flat disk.
 for(let i=0;i<44;i++){const a=i/44*TAU,x=Math.sin(a)*(R-.2),z=Math.cos(a)*(R-.2);shape(props,'stone',[0x939d91,0xb0aea0,0x8d9797][i%3],x,-2.9-(i%3)*.3,z,.8,2.9+(i%3)*.5,.8);if(i%3===0){line(props,[x,0,z],[x*1.01,-4.6,z*1.01],0x6f984f,.04);for(let k=0;k<5;k++)shape(props,'petal',0x78ac57,x+(k%2?.12:-.12),-.3-k*.65,z,.15,.17,.08);}yield;}
 for(const [x,z]of [[-16,-11],[17,8],[-15,12],[3,-19]]){const r=Math.hypot(x,z),fall=yield*zooWaterfallSteps(x/r*(R+.7),z/r*(R+.7),1.05,11,{color:0x85e3ee});fall.rotation.y=Math.atan2(x,z);root.add(fall);edgeEffects.push(fall);const mat=waterMaterial(0x40d6ed,.56),lip=new T.Mesh(new T.PlaneGeometry(1.1,1.4),mat);lip.rotation.set(-Math.PI/2,0,Math.atan2(x,z));lip.position.set(x/r*(R+.1),.19,z/r*(R+.1));root.add(lip);edgeEffects.push({userData:{update:(t,reduced)=>advanceWater(mat,t,reduced)}});}
 const clouds=new T.InstancedMesh(new T.SphereGeometry(1,14,9),new T.MeshStandardMaterial({color:0xf6edff,transparent:true,opacity:.62,depthWrite:false,roughness:1}),18),dummy=new T.Object3D();
 for(let i=0;i<18;i++){const a=i*2.399;dummy.position.set(Math.sin(a)*(R+1),-10-(i%3)*1.1,Math.cos(a)*(R+1));dummy.scale.set(2.7+(i%3),.9,1.5);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}clouds.name='Clouds below the floating zoo';base.add(clouds);
 if(!lowOnly){
  ringPath(props,11.6,3.2);ringPath(props,38.15,1.6);
  pathMesh(props,[[0,39.2],[-8,35.2],[-13.8,24.2],[-12.8,15.2],[-6,11.6]],3.2);pathMesh(props,[[0,39.2],[8,35.2],[13.8,24.2],[12.8,15.2],[6,11.6]],3.2);
  for(const e of ZOO_EXHIBITS){const p=zooViewGate(e);pathMesh(props,[[p.x*.66,p.z*.66],[p.x,p.z]],3.2);yield;yield*habitat(props,e,detail,effects,lagoons);}
  const fountain=yield*lagoonSteps({x:0,z:0,rx:2*S,rz:2*S,fishCount:0,ambientOnly:true,depth:.4,color:0x4bcde4});fountain.position.y=.48;detail.add(fountain);effects.push(fountain);tree(props,0,.55,0,true,.85);
  for(let i=0;i<14;i++){const a=i/14*TAU;flowerCluster(props,Math.sin(a)*2.3*S,Math.cos(a)*2.3*S,[0xffadd3,0xffe4b1,0xe1b8f1][i%3],.75,.23);}
  for(let i=0;i<38;i++){const a=i/38*TAU,x=Math.sin(a)*18.9*S,z=Math.cos(a)*18.9*S;if(Math.abs(x)<3&&z>15)continue;flowerCluster(props,x,z,[0xff8ec4,0xffcf64,0xd49ef3][i%3],1.15,.2);if(i%3===0)lantern(props,x,0,z,.45);yield;}
  for(const side of [-1,1]){shape(props,'pole',0xc49a64,side*3.3*S,1.8,19.8*S,.22,3.6,.22);lantern(props,side*3.3*S,3.35,19.8*S,.6);for(let i=0;i<4;i++)shape(props,'petal',0x72a950,side*3.35*S,2.6-i*.48,19.75*S,.3,.22,.1);}
  const arch=new T.Mesh(new T.TorusGeometry(3.45*S,.18,8,48,Math.PI),new T.MeshStandardMaterial({color:0xedc48b,roughness:.55}));arch.position.set(0,3.3,19.8*S);props.add(arch);
  const title=courtLabel('Чарівний зоопарк',8.5,1);title.material?.addEventListener('dispose',()=>title.material?.map?.dispose());title.position.set(0,3.38,20.1*S);detail.add(title);
  for(const side of [-1,1])teaPavilion(props,side*9.5*S,.2,16.7*S,0xd29b67,.55);
  for(const e of ZOO_EXHIBITS){yield;const group=new T.Group();group.position.set(e.x,.16,e.z);detail.add(group);const animals=yield*zooAnimalSteps(e);group.add(animals);actors.set(e.id,animals);if(['elephant','axolotl','otter'].includes(e.species)){const water=zooPlayWater();detail.add(water);playWater.set(e.id,water);}zones.set(e.id,{open:preview||!e.index,start:null,greet:-100,greetElapsed:0});}
 }
 const baked=yield*batchModelSteps(props,{combineColors:true});detail.add(baked);props.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedScenery)o.geometry.dispose();});
 root.userData={biomeId:ZOO_ID,navigationSurface:base,detail,lowDetail:low,lowOnly,style:BIOME_STYLES[ZOO_ID],sceneryObjects:new Map(),lagoons,trees:[],stats:{fishCount:lowOnly?0:14,species:ZOO_EXHIBITS.length,animals:[...actors.values()].reduce((n,a)=>n+a.count,0),staticMeshes:baked.children.length,sourceMeshes:baked.userData.sourceMeshes},zoo:{actors,zones},setZooState(state){for(const e of ZOO_EXHIBITS){const z=zones.get(e.id);if(z){const open=!e.index||!!state?.receipts?.[e.id];if(open!==z.open)z.open=open;}}},greet(id,time,visit,model){const z=zones.get(id);if(!z?.open)return;if(time-z.greet>6){z.greet=time;z.visitor=visit;}if(id==='zoo-gorilla'&&visit?.seatIndex===0&&model&&!plays.has(id)){plays.set(id,createGorillaPlay(actors.get(id),ZOO_EXHIBITS.find(e=>e.id===id),visit,model));}},
 publicPlayBlocker(){const p=plays.get('zoo-gorilla');if(!p)return null;const a=actors.get('zoo-gorilla'),e=ZOO_EXHIBITS.find(e=>e.species==='gorilla'),point=zooJointPoint(a,'root',0,a.userData.uniforms.uZooTime.value);return Math.hypot(point.x,point.z)>e.radius-1?{catId:'zoo-gorilla-performer',biome:ZOO_ID,position:{x:e.x+point.x,z:e.z+point.z,y:point.y+.16},radius:1.3}:null;},
 visitorFrame(visit,reduced=false){const p=plays.get(visit.objectId);return p?.visit===visit?p.frame(visit.elapsed,reduced):null;},
 cancelVisit(visit){const p=plays.get(visit.objectId);if(p?.visit===visit){p.cancel();plays.delete(visit.objectId);}if(visit.zooCarry){visit.position={...visit.seat};visit.zooCarry=0;}},animalPoint(id,i,time,out=new T.Vector3()){const a=actors.get(id),e=ZOO_EXHIBITS.find(e=>e.id===id);if(!a)return out;zooJointPoint(a,'head',i,a.userData.uniforms.uZooTime.value,out,e.species==='polar'?polarLook:undefined);out.x+=e.x;out.y+=.16;out.z+=e.z;return out;},animalHeading(id,i){const a=actors.get(id);if(!a)return 0;zooJointDirection(a,'head',i,a.userData.uniforms.uZooTime.value,cameraDirection);return Math.atan2(cameraDirection.x,cameraDirection.z);},update(time,reduced=false){for(const g of edgeEffects)g.userData.update?.(time,reduced);if(!detail.visible)return;for(const g of effects)g.userData.update?.(time,reduced);for(const [id,a]of actors){const z=zones.get(id);if(z.start===null)z.start=time;const elapsed=time-z.greet,greet=elapsed>=0&&elapsed<6?Math.sin(Math.PI*elapsed/6)**2:0;a.userData.update(time-z.start,reduced,greet,Math.min(6,Math.max(0,elapsed)));
 const e=ZOO_EXHIBITS.find(e=>e.id===id),water=playWater.get(id);water?.userData.stop();
 if(e.species==='gorilla')for(let i=plays.has(id)?1:0;i<a.count;i++){const w=smooth(elapsed/.4)*smooth((4-elapsed)/.5);a.userData.setActorPlay(i,w>0?{frame:(elapsed*68+i*13)%79,mix:w,y:reduced?0:w*(zooJump(elapsed-.7-i*.16,.5)+zooJump(elapsed-1.8-i*.12,.65)),yaw:Math.sin(elapsed*5+i)*.15*w}:null);}
 if(e.species==='axolotl')for(let i=0;i<a.count;i++){const w=smooth(elapsed/.9)*smooth((5.8-elapsed)/1.1);a.userData.setActorPlay(i,null);if(w>0){const head=zooJointPoint(a,'head',i,a.userData.uniforms.uZooTime.value),rise=Math.max(0,3.64-head.y);a.userData.setActorPlay(i,{y:(rise+(reduced?0:Math.sin(elapsed*6+i)*.12))*w});}}
 if(e.species==='otter')for(let i=0;i<a.count;i++)a.userData.setActorPlay(i,greet>0?{y:reduced?0:zooJump(elapsed-1-i*.2,.25)}:null);
 if(water&&greet>0&&!reduced){
  const end=new T.Vector3(e.x, .28,e.z),start=new T.Vector3();
  if(e.species==='elephant'){zooJointPoint(a,'trunk4',0,a.userData.uniforms.uZooTime.value,start,new T.Vector3(0,.31,2.56));start.x+=e.x;start.y+=.16;start.z+=e.z;const seat=z.visitor?.seat||zooViewGate(e);end.set(seat.x,.45,seat.z);water.userData.play(start,end,elapsed,greet,0);}
  else {const p=zooJointPoint(a,'head',0,a.userData.uniforms.uZooTime.value);end.set(e.x+p.x,e.species==='axolotl'?4.09:.25,e.z+p.z);water.userData.play(end,end,elapsed,greet,1);}
 }}},placementSteps:function*(){yield;},updatePlacements(){},updateScenery(){},dispose(){for(const p of plays.values())p.cancel();plays.clear();for(const a of actors.values())a.userData.dispose();}};
 // Large, accurate click volumes also cover tiny axolotls behind their glass.
 for(const e of ZOO_EXHIBITS){const hit=new T.Mesh(new T.CylinderGeometry(e.radius,e.radius,e.species==='axolotl'?4.3:1.4,32),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hit.position.set(e.x,e.species==='axolotl'?2.2:.7,e.z);hit.userData.zooExhibit=e.id;base.add(hit);}
 detail.visible=!lowOnly;low.visible=lowOnly;return root;
}
