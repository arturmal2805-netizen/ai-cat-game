import * as T from 'three';
import {shape,line,torus,flowerCluster} from './fantasy-scenery.js';
import {batchModelSteps} from './model-batching.js';
import {showcaseWaterRide} from './showcase-water-data.js';
import {showcaseRouteSteps} from './showcase-water-motion.js';
import {showcaseProps} from './showcase-water-props.js';
import {receivingPool} from './reference-slide-assets.js';
import {installSlideWater,slideRibbon} from './slide-water.js';
import {waterMaterial,advanceWater} from './water-shading.js';
import {rideActingFrame} from './ride-acting.js';
import {showcaseWaterfallSteps as waterfallSteps} from './showcase-waterfalls.js';
import {atollApproach} from './atoll-slide-navigation.js';
import {groupApproach} from './group-boarding.js';
import {showcaseRideReaction,sampleShowcaseActing} from './showcase-water-acting.js';
import {applyShowcaseSurfaceDetails,showcaseSurfaceUVSteps,showcaseMaterialSteps} from './showcase-surface-details.js';
import {boulderGeometry} from './showcase-geology.js';
import {polishShowcaseWater,submergeReceivingFloor,submergeReceivingWalls,receivingBankEnd,detailShowcaseBasin,receivingRailPoint} from './showcase-water-optics.js';
import {naturalBank} from './showcase-bank.js';
import {cliffGeometry} from './showcase-geology.js';
import {fern,gardenFlowerCluster,gardenBlossom} from './showcase-botany.js';
const profiles=new Map();
const boatRoundGeometry=new T.SphereGeometry(1,24,14);boatRoundGeometry.userData.sharedScenery=true;
const bankPaint=new Map();
function materialForBank(river){const key=river?'river':'canyon';if(!bankPaint.has(key)){const m=new T.MeshStandardMaterial({color:river?0xaeb39a:0xc4a17f,roughness:.72});m.userData.sharedScenery=true;m.userData.surfaceKind='stone';bankPaint.set(key,m);}return bankPaint.get(key);}
// Wide flat-bottom channels really support a raft; a broad flat raft cannot
// sit at the bottom of a narrow circular pipe without intersecting its walls.
function trough(data,width,depth){
 const g=slideRibbon({samples:data.samples,width,offset:-depth-.08,shellDepth:.55,steps:360,colors:[0xffffff]});
 const walls=[];for(const side of [-1,1]){const p=[],index=[];for(let i=0;i<=240;i++){const s=data.samples[Math.round(i/240*600)];for(const y of [-depth-.1,-depth+2.5])p.push(...s.p.clone().addScaledVector(s.right,side*width).addScaledVector(s.up,y).toArray());if(i){const a=(i-1)*2;index.push(a,a+1,a+2,a+1,a+3,a+2);}}const w=new T.BufferGeometry();w.setAttribute('position',new T.Float32BufferAttribute(p,3));w.setIndex(index);w.computeVertexNormals();walls.push(w);}return {floor:g,walls};
}
function vehicle(props,spec){
 const g=new T.Group();g.name=spec.name+' · власний засіб катання';const kind=spec.kind;
 if(['barrel-wave','surf-halfpipe'].includes(kind)){
  shape(g,'sphere',kind==='barrel-wave'?0xffd56f:0xea9cdd,0,-.23,0,1.65,.22,3.2);shape(g,'sphere',0xfff2cf,0,-.05,0,1.3,.08,2.7);
  if(kind==='surf-halfpipe')shape(g,'petal',0x55bfdf,0,-.5,-1.9,.15,.7,.45);
  else for(const x of [-.8,.8])line(g,[x,.06,.9],[x,.06,1.7],0xe0a84c,.12);
 }else if(kind==='lazy-river'||kind==='fountain-carousel'){
  const ring=torus(g,kind==='lazy-river'?0xffd472:0xf4c37c,2.2,.55,0,-.12,0);ring.rotation.x=Math.PI/2;shape(g,'sphere',0xffeac9,0,-.2,0,1.9,.18,1.9);
 }else if(kind==='canyon-rafting'){
  torus(g,0xffd356,5.9,.5,0,-.04,0).rotation.x=Math.PI/2;shape(g,'pole',0xf4d7a2,0,-.32,0,5.45,.38,5.45);
  for(const x of [-2.65,2.65])for(const z of [-2.2,2.2]){shape(g,'sphere',0xe8a84e,x,-.08,z,1.4,.15,1.2);line(g,[x-1.1,.35,z+1],[x+1.1,.35,z+1],0xc38f47,.15);}
 }else{
  const large=kind==='pool-pendulum',w=large?11.7:8.3,d=large?9:6.7;shape(g,'sphere',0xf3c355,0,-.45,0,w/2,.55,d/2);shape(g,'cube',0xf9dfaa,0,-.18,0,w*.88,.26,d*.8);
  for(const side of [-1,1]){line(g,[-w*.4,.7,side*d*.37],[w*.4,.7,side*d*.37],0xc99b5d,.14);for(const x of [-w*.4,w*.4])shape(g,'pole',0xd6ad70,x,.2,side*d*.37,.13,1.2,.13);}
  if(large){for(const x of [-7.5,7.5])line(g,[x,0,0],[x,44,0],0xd6b077,.9);line(g,[-8,44,0],[8,44,0],0xf4cf84,1.0);}
  if(large){
   const outline=new T.Shape();outline.moveTo(-9,2);outline.quadraticCurveTo(-8,-.9,-4,-1.2);outline.quadraticCurveTo(0,-1.6,4,-1.2);outline.quadraticCurveTo(8,-.9,9,2);outline.lineTo(6,1);outline.quadraticCurveTo(0,-.1,-6,1);outline.closePath();
   for(const x of [-5.7,5.7]){const geometry=new T.ExtrudeGeometry(outline,{depth:.45,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.18,bevelThickness:.18});geometry.rotateY(Math.PI/2);const hull=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0xb67b43,roughness:.4,metalness:.08}));hull.material.userData.surfaceKind='wood';hull.position.x=x;g.add(hull);line(g,[x,1.0,-6],[x,1.0,6],0xf4d58a,.22);}
   for(const z of [-8,8]){shape(g,'sphere',0xf4cf77,0,1.55,z,4.4,.35,1.2);shape(g,'sphere',0xe8a54f,0,2.3,z,1.2,.9,.6);}
  }
 }
 // The close guest camera sees real curved hulls, deck seams and edge ropes.
 // These details are baked once into the same bounded vehicle batch.
 if(kind==='canyon-rafting'){
  torus(g,0xffefbf,5.9,.13,0,.48,0).rotation.x=Math.PI/2;
  for(let i=-4;i<=4;i++){const width=Math.sqrt(Math.max(0,5.2**2-i*i))*2;shape(g,'cube',i%2?0xe7bd7e:0xf1cf95,0,-.18,i,width,.12,.88);}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;shape(g,'sphere',0xe9b35d,Math.sin(a)*5.95,.05,Math.cos(a)*5.95,.16,.3,.16);}
 }else if(!['barrel-wave','surf-halfpipe','lazy-river','fountain-carousel'].includes(kind)){
  const large=kind==='pool-pendulum',w=large?10.2:7,d=large?8:5.8;
  for(let i=0;i<7;i++)shape(g,'cube',i%2?0xedc78d:0xf7dfa9,0,-.10,-d/2+i*d/6,w,.08,.09);
  for(const side of [-1,1])for(let j=0;j<7;j++)shape(g,'sphere',0xffe6a7,side*(large?5.95:3.8),.06,-d/2+j*d/6,.13,.13,.13);
  shape(g,'sphere',0xf7e7b3,0,.15,large?7.8:3.0,.65,.13,.55);
  for(const x of [-.55,-.18,.22,.55])shape(g,'sphere',0xf7e7b3,x,.16,large?8.45:3.55,.17,.12,.20);
 }else if(['lazy-river','fountain-carousel'].includes(kind)){
  const rim=torus(g,0xffedb4,2.2,.10,0,.38,0);rim.rotation.x=Math.PI/2;
  for(let j=0;j<8;j++){const a=j*Math.PI/4;shape(g,'sphere',0xe4a156,Math.sin(a)*2.25,-.1,Math.cos(a)*2.25,.18,.32,.18);}
 }else{
  shape(g,'sphere',0x6acde5,0,-.02,.6,.72,.045,1.55);
  for(const x of [-.7,.7])line(g,[x,.04,-.8],[x,.04,1.7],0xffefc0,.07);
 }
 g.traverse(o=>{if(!o.isMesh)return;if(o.geometry.type==='SphereGeometry')o.geometry=boatRoundGeometry;
  if(o.material.userData.surfaceKind==='leaf'||o.geometry.type==='TorusGeometry'){const material=o.material.clone();material.userData.sharedScenery=false;material.userData.surfaceKind='rubber';material.map=material.bumpMap=material.normalMap=material.roughnessMap=null;material.roughness=.55;material.metalness=0;o.material=material;}
 });
 return g;
}
function waveBody(props,root,spec,extra){
 const positions=[],uv=[],index=[],count=144,across=28,range=Math.PI*1.24,r=23+spec.radius-.15;
 const point=(a,v)=>{
  const crest=Math.max(0,Math.min(1,(a-Math.PI*.63)/(Math.PI*.61))),width=34-crest*12;
  const z=-21+(v-.5)*width,bulge=Math.sin(v*Math.PI)*(.6+Math.sin(a*2)*.45);
  return new T.Vector3(-Math.sin(a)*(r+bulge),31-Math.cos(a)*(r+bulge),z);
 };
 for(let i=0;i<=count;i++){const a=i/count*range;for(let j=0;j<=across;j++){
  positions.push(...point(a,j/across).toArray());uv.push(j/across,1-i/count);
  if(i&&j){const k=i*(across+1)+j;index.push(k,k-1,k-across-1,k-1,k-across-2,k-across-1);}
 }}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(index);geometry.computeVertexNormals();
 const wet=waterMaterial(0x00baf2,.94,{flow:{speed:13,width:34,length:r*range}});
 // The curling lip moves on the GPU, not by replacing its buffers. The rider's
 // deep centre corridor stays clear; only the distant crest can breathe.
 wet.vertexShader=wet.vertexShader.replace('vec4 world=modelMatrix*vec4(p,1.0);','p+=normal*sin(p.z*.24+uTime*1.8)*smoothstep(39.,59.,p.y)*.65;\n vec4 world=modelMatrix*vec4(p,1.0);');
 wet.fragmentShader=wet.fragmentShader.replace('gl_FragColor=vec4(max(color,vec3(0.0)),alpha);','color=mix(color,uColor*.82,.28);\n gl_FragColor=vec4(max(color,vec3(0.0)),.96);');
 geometry.computeBoundingBox();geometry.boundingBox.expandByScalar(.7);geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new T.Sphere());
 const sheet=new T.Mesh(geometry,wet);sheet.name='Curling blue barrel with a moving foamy lip';root.add(sheet);extra.push(wet);
 // A continuous aerated lip, instead of a necklace of large white balls.
 const froth=(points,radius,color)=>{
  const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,120,radius,8,false),p=g.attributes.position,centres=Array.from({length:121},(_,i)=>curve.getPointAt(i/120));
  for(let i=0;i<p.count;i++){const row=Math.floor(i/9),c=centres[row],v=new T.Vector3().fromBufferAttribute(p,i).sub(c),s=1+.16*Math.sin(row*.29)+.09*Math.sin(row*.73+i%9*1.7);v.multiplyScalar(s).add(c);p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();props.add(new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:.38})));
 };
 froth(Array.from({length:65},(_,i)=>point(Math.PI*.52+(range-Math.PI*.52)*i/64,1)),1.45,0xd9fcff);
 froth(Array.from({length:65},(_,i)=>point(range-.018*Math.sin(i*.43),i/64)),1.75,0xf2ffff);
 for(let j=0;j<18;j++){
  const p=point(range-.07,j/17),size=.3+Math.sin(j*1.73)**2*.5;
  shape(props,'sphere',0xe5ffff,p.x+Math.sin(j*2.3)*.7,p.y+2.1+Math.sin(j*.7)**2*1.6,p.z,size,size*1.5,size);
 }
 for(let k=0;k<5;k++){
  const points=Array.from({length:40},(_,i)=>point(Math.PI*.08+i/39*Math.PI*1.11,.08+k*.2).add(new T.Vector3(0,.09,0)));
  const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),64,.10+(k%2)*.05,4,false),new T.MeshStandardMaterial({color:0xb1f5ff,roughness:.35}));props.add(mesh);
 }
}
export function* showcaseWaterSteps(id){
 const spec=showcaseWaterRide(id);if(!spec)return null;
 const root=new T.Group(),props=new T.Group(),route=yield*showcaseRouteSteps(spec),actual={...spec,pool:route.pool},moving=vehicle(props,spec),channels=[],extra=[],materials=[];root.name=spec.name;root.add(moving);
 const scenery=yield*showcaseProps(props,root,actual,route),pool=detailShowcaseBasin(receivingPool(actual)),hub=new T.Group(),bankGardens=[];root.add(pool);
 if(spec.kind==='fountain-carousel'){
  for(const [y,radius]of [[2.3,8],[8,5.5],[14,3.5]]){shape(props,'pole',0xeed4a6,0,y,0,radius,.5,radius);const jet=yield*waterfallSteps(0,0,radius*1.8,5.2,{color:0x47d8ed});jet.position.y+=y+5.2-.12;root.add(jet);scenery.waterfalls.push(jet);}
  shape(props,'pole',0xf0d2a0,0,8,0,1.5,16,1.5);
  gardenBlossom(props,0,15.2,0,0xf2a2d2,30,0);gardenBlossom(props,0,15.6,0,0xffc5de,21,Math.PI/5);
  for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.sin(a)*16,z=Math.cos(a)*16;line(hub,[0,1.25,0],[x,1.25,z],0xf0c482,.45);shape(hub,'pole',0xeed3a3,x,1.5,z,3.4,.3,3.4);}
  const batchedHub=yield*batchModelSteps(hub,{combineColors:true});hub.clear();hub.add(batchedHub);root.add(hub);
 }
 if(spec.kind==='pool-pendulum'){shape(props,'sphere',0xe7c889,0,48.5,1.5,2.2,.4,1.7);for(const [x,y]of [[-2.2,51],[0,52],[2.2,51],[3.1,49.2]])shape(props,'sphere',0xe7c889,x,y,1.5,.8,.9,.4);}

 for(const data of route.geometry){
  yield;
  if(data.bowl)continue;
  const surf=!!data.surf,river=!!data.river,carousel=!!data.carousel,width=surf?15:spec.radius,depth=spec.radius;
  if(!carousel&&!data.barrel){const shell=trough(data,width,depth);if(!data.closed&&!surf)submergeReceivingFloor(shell.floor,route.pool,spec.surfaceY);const floor=new T.Mesh(shell.floor,new T.MeshStandardMaterial({color:0x4baaf2,roughness:.42,metalness:0,side:T.DoubleSide}));props.add(floor);
   if(data.rapids||river){
    for(const geometry of shell.walls)geometry.dispose();
    const bankEnd=receivingBankEnd(data,depth,route.pool,spec.surfaceY);
    for(const side of [-1,1]){const material=new T.MeshStandardMaterial({color:river?0xb4b99a:0xc4a17f,roughness:.72,side:T.DoubleSide,vertexColors:true});material.userData.surfaceKind='stone';const bank=new T.Mesh(naturalBank(data,width,depth,side,{end:bankEnd}),material);bank.castShadow=bank.receiveShadow=true;props.add(bank);}
    for(let i=36;i<Math.min(data.samples.length-30,(bankEnd-.015)*(data.samples.length-1));i+=60){const s=data.samples[i];for(const side of [-1,1]){const p=s.p.clone().addScaledVector(s.right,side*(width+3.8)).addScaledVector(s.up,-depth+.6),rock=shape(props,'stone',river?0xaebba0:0xddb58a,...p.toArray(),2.7,1.5,2.3);rock.geometry=boulderGeometry(i+side);rock.rotation.y=i*.71;
     const moss=s.p.clone().addScaledVector(s.right,side*(width+3.8)).addScaledVector(s.up,-depth+1.9);shape(props,'sphere',i%120?0x76b76e:0x9bc575,...moss.toArray(),1.8,.2,1.1);
     const bankRow=(i/(data.samples.length-1)-.045)/(bankEnd-.045)*160,irregular=Math.sin(bankRow*.61+side)*.36+Math.sin(bankRow*.17)*.3,across=(4.6-1.8)/(5.2-1.8),soil=1.4+across*.4+(Math.sin(bankRow*.31+1)*(1-across)+Math.sin(bankRow*.31+2)*across)*.16;
     const plant=s.p.clone().addScaledVector(s.right,side*(width+4.6+irregular)).addScaledVector(s.up,-depth+soil+.08);
     if(scenery.canPlant(plant.x,plant.y+.7,plant.z,2.6)){fern(props,...plant.toArray(),1.7,i*.23);bankGardens.push({position:plant.toArray(),radius:2.6});if(i%120===36)gardenFlowerCluster(props,plant.x,plant.z,river?0xf499cf:0xffc0b0,3.4,plant.y+.2);}
     const foot=s.p.clone().addScaledVector(s.right,side*(width+7)).addScaledVector(s.up,-depth-1);
     if(foot.y>6&&scenery.canPlace(foot.x,foot.y/2,foot.z,3.8,foot.y/2,3.8)){const column=new T.Mesh(cliffGeometry(foot.y,3.8,i),materialForBank(river));column.position.set(foot.x,0,foot.z);column.castShadow=column.receiveShadow=true;props.add(column);}
    }}
    if(data.rapids)for(const k of [110,220,330,450,520].filter(i=>i/(data.samples.length-1)<bankEnd-.02)){const s=data.samples[k],points=Array.from({length:17},(_,j)=>s.p.clone().addScaledVector(s.right,(j/16*2-1)*(width-.8)).addScaledVector(s.up,-depth+.22+Math.sin(j*1.3)*.07));props.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.12,4,false),new T.MeshStandardMaterial({color:0xdafaff,roughness:.4})));}
   }else{
    for(const geometry of shell.walls){if(!data.closed&&!surf)submergeReceivingWalls(geometry,route.pool,spec.surfaceY);props.add(new T.Mesh(geometry,new T.MeshStandardMaterial({color:0xa2e7f4,transparent:true,opacity:.24,depthWrite:false,roughness:.2,side:T.DoubleSide})));}
    for(const side of [-1,1]){const points=data.samples.filter((_,i)=>i%3===0).map(s=>!data.closed&&!surf?receivingRailPoint(s,side,width,depth,route.pool,spec.surfaceY):s.p.clone().addScaledVector(s.right,side*width).addScaledVector(s.up,-depth+2.5));const rail=new T.TubeGeometry(new T.CatmullRomCurve3(points),240,.13,5,false);props.add(new T.Mesh(rail,new T.MeshStandardMaterial({color:spec.accent,roughness:.3,metalness:.3})));}
   }
  }
  const channel=(samples,options={})=>channels.push({samples,width:width-.12,offset:-depth+.15,steps:360,colors:[0x9af0fc,0x2acced],outlet:(!data.closed&&!surf&&route.geometry.indexOf(data)===route.geometry.length-1)||!!data.launch||!!data.river,...options});
  if(surf){channel(data.samples.slice(0,301),{outlet:true,outletPoint:new T.Vector3(0,spec.surfaceY,-1)});channel(data.samples.slice(300).reverse(),{outlet:true,outletPoint:new T.Vector3(0,spec.surfaceY,-1)});}
  else channel(data.samples);
  if(data.barrel)waveBody(props,root,spec,extra);
  if(spec.kind==='glass-drop'){
   for(const x of [-1,1]){const pane=new T.Mesh(new T.BoxGeometry(.08,spec.height,17),new T.MeshStandardMaterial({color:0x9be3f5,transparent:true,opacity:.12,depthWrite:false,roughness:.12}));pane.position.set(9+x*9,spec.height/2,-7);root.add(pane);}
  }
 }
 if(spec.kind==='fountain-carousel')channels.push({curve:new T.CatmullRomCurve3([new T.Vector3(0,15,0),new T.Vector3(0,8,1),new T.Vector3(0,spec.surfaceY,2)]),width:2,offset:0,steps:100,outlet:true,outletPoint:new T.Vector3(0,spec.surfaceY,2)});
 if(spec.kind==='lagoon-launch'){
  const flight=route.flights[0],leg=route.legs.find(l=>l.phase==='flight'),samples=Array.from({length:601},(_,i)=>{const f=leg.fn(i/600),q=new T.Quaternion().fromArray(f.quaternion);return{p:new T.Vector3(...f.position),q,up:new T.Vector3(0,1,0).applyQuaternion(q),right:new T.Vector3(1,0,0).applyQuaternion(q)};});
  channels.push({samples,width:5.2,offset:-.65,steps:240,outlet:false,colors:[0xd0fcff,0x13ceee]});
  for(const side of [-1,1]){const points=samples.filter((_,i)=>i%6===0).map(s=>s.p.clone().addScaledVector(s.right,side*4.9).addScaledVector(s.up,-.6));props.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),120,.12,4,false),new T.MeshStandardMaterial({color:0xe2fdff,roughness:.4})));}
 }
 if(spec.kind==='pool-pendulum'){/* Airborne swing only touches its real basin; no fake dry flume. */}
 yield*showcaseSurfaceUVSteps(props);
 yield*showcaseMaterialSteps(props);
 const staticModel=yield*batchModelSteps(props,{combineColors:true});applyShowcaseSurfaceDetails(staticModel);root.add(staticModel);props.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedScenery)o.geometry.dispose();});
 yield*showcaseSurfaceUVSteps(moving);
 yield*showcaseMaterialSteps(moving);
 const boat=yield*batchModelSteps(moving,{combineColors:true});applyShowcaseSurfaceDetails(boat);moving.clear();moving.add(boat);moving.visible=false;
 const groundApproach=atollApproach(actual,scenery.groundObstacles),approach=spec.seats>1?groupApproach(route,groundApproach,spec.seats):groundApproach;
 root.userData={id,referenceSlide:true,showcaseWater:true,premiumWater:true,mega:true,handpainted:true,moving,pool,route,footprint:spec.footprint,duration:route.duration,rideFrame:route.frame,seatHeight:0,approachOffset:route.entry,dismount:route.entry,approachFrame:approach.frame,approachDuration:approach.duration,approachYaw:approach.yaw,
  groupSeats:spec.seats>1?spec.seats:0,sharedVehicle:spec.seats>1&&spec.kind!=='fountain-carousel',vehicleFrame:route.vehicleFrame,vehicleFrameForLane:route.boatFrame,hollowPassages:scenery.hollowPassages,
  entryForSlot:i=>route.frame(0,false,i).position,
  queueForSlot:spec.seats>1?i=>approach.queues[i]:i=>[route.entry[0]-(i%2)*3.2,route.entry[1],route.entry[2]+Math.floor(i/2)*4.5],
  gardenPatches:scenery.gardenPatches,bankGardens,promenadeGardens:scenery.promenadeGardens,stats:{sourceMeshes:staticModel.userData.sourceMeshes,staticMeshes:staticModel.children.length,waterDraws:channels.length+extra.length+1},
  update(time,reduced=false){pool.userData.update(time,reduced);scenery.update(time,reduced);for(const m of extra)advanceWater(m,time,reduced);
   const riders=[...(root.userData.slideRiders?.values()||[])],at=riders.find(r=>Number.isFinite(r.elapsed))?.elapsed??root.userData.rideElapsed;
   if(spec.kind==='fountain-carousel')hub.rotation.y=Number.isFinite(at)?route.vehicleFrame(at,reduced).carouselAngle||0:0;
   if(!riders.length){const f=Number.isFinite(at)?route.vehicleFrame(at,reduced):null;moving.visible=!!f&&!['board','climb','exit','done'].includes(f.phase);if(f){moving.position.set(...f.position);moving.quaternion.fromArray(f.quaternion||[0,0,0,1]);}}
},
 };
 if(!profiles.has(id))profiles.set(id,route.lanes.map(l=>sampleShowcaseActing(l,route.duration)));
 const acting=profiles.get(id),scratch=acting.map(()=>({}));root.userData.rideActing=acting[0];root.userData.rideReaction=(time,reduced=false,lane=0)=>showcaseRideReaction(spec,route,time,rideActingFrame(acting[lane%acting.length],time,reduced,scratch[lane%acting.length]),reduced);
 installSlideWater(root,{channels,pool,color:0x20cce9,speed:spec.kind==='lazy-river'?4.5:8,extraSurfaces:extra});
 root.traverse(o=>{if(o.isMesh&&o.material.uniforms?.uWaterField)polishShowcaseWater(o.material,actual);});
 root.userData.update(0,true);return root;
}
