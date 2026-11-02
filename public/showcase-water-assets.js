import * as T from 'three';
import {shape,line,torus} from './fantasy-scenery.js';
import {batchModelSteps} from './model-batching.js';
import {showcaseWaterRide} from './showcase-water-data.js';
import {showcaseRouteSteps} from './showcase-water-motion.js';
import {showcaseProps} from './showcase-water-props.js';
import {receivingPool,vortexBowl} from './reference-slide-assets.js';
import {installSlideWater,slideRibbon} from './slide-water.js';
import {waterMaterial,advanceWater} from './water-shading.js';
import {rideActingFrame} from './ride-acting.js';
import {showcaseWaterfallSteps as waterfallSteps} from './showcase-waterfalls.js';
import {atollApproach} from './atoll-slide-navigation.js';
import {groupApproach} from './group-boarding.js';
import {showcaseRideReaction,sampleShowcaseActing} from './showcase-water-acting.js';
import {applyShowcaseSurfaceDetails} from './showcase-surface-details.js';
import {boulderGeometry} from './showcase-geology.js';
import {polishShowcaseWater} from './showcase-water-optics.js';
const profiles=new Map();
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
   for(const x of [-5.7,5.7]){const geometry=new T.ExtrudeGeometry(outline,{depth:.45,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.18,bevelThickness:.18});geometry.rotateY(Math.PI/2);const hull=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0xb67b43,roughness:.4,metalness:.08}));hull.position.x=x;g.add(hull);line(g,[x,1.0,-6],[x,1.0,6],0xf4d58a,.22);}
   for(const z of [-8,8]){shape(g,'sphere',0xf4cf77,0,1.55,z,4.4,.35,1.2);shape(g,'sphere',0xe8a54f,0,2.3,z,1.2,.9,.6);}
  }
 }
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
 const scenery=yield*showcaseProps(props,root,actual,route),pool=receivingPool(actual),hub=new T.Group();root.add(pool);
 if(spec.kind==='fountain-carousel'){
  for(const [y,radius]of [[2.3,8],[8,5.5],[14,3.5]]){shape(props,'pole',0xeed4a6,0,y,0,radius,.5,radius);const jet=yield*waterfallSteps(0,0,radius*1.8,5.2,{color:0x47d8ed});jet.position.y+=y+5.2-.12;root.add(jet);scenery.waterfalls.push(jet);}
  shape(props,'pole',0xf0d2a0,0,8,0,1.5,16,1.5);
  for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.sin(a)*16,z=Math.cos(a)*16;line(hub,[0,1.25,0],[x,1.25,z],0xf0c482,.45);shape(hub,'pole',0xeed3a3,x,1.5,z,3.4,.3,3.4);}
  const batchedHub=yield*batchModelSteps(hub,{combineColors:true});hub.clear();hub.add(batchedHub);root.add(hub);
 }
 if(spec.kind==='pool-pendulum'){shape(props,'sphere',0xe7c889,0,48.5,1.5,2.2,.4,1.7);for(const [x,y]of [[-2.2,51],[0,52],[2.2,51],[3.1,49.2]])shape(props,'sphere',0xe7c889,x,y,1.5,.8,.9,.4);}

 for(const data of route.geometry){
  yield;
  if(data.bowl)continue;
  const surf=!!data.surf,river=!!data.river,carousel=!!data.carousel,width=surf?15:spec.radius,depth=spec.radius;
  if(!carousel&&!data.barrel){const shell=trough(data,width,depth),floor=new T.Mesh(shell.floor,new T.MeshStandardMaterial({color:river?0x75bbb0:spec.color,roughness:.3,metalness:.1,side:T.DoubleSide}));props.add(floor);
   if(data.rapids||river){
    for(const geometry of shell.walls)geometry.dispose();
    for(let i=0;i<data.samples.length;i+=10){const s=data.samples[i];for(const side of [-1,1]){const p=s.p.clone().addScaledVector(s.right,side*(width+2.5)).addScaledVector(s.up,-depth+.4),rock=shape(props,'stone',river?0xb7be98:i%3?0xd3b28b:0xbba084,...p.toArray(),3.4,2+(i%3)*.4,2.8);rock.geometry=boulderGeometry(i+side);rock.rotation.y=i*.71;if(i%30===0){const foot=shape(props,'stone',river?0xb6b497:0xc2a485,p.x,p.y*.5,p.z,3.3,Math.max(2,p.y*.5),3.1);foot.geometry=boulderGeometry(i);}}}
    if(data.rapids)for(const k of [110,220,330,450,520]){const s=data.samples[k],points=Array.from({length:17},(_,j)=>s.p.clone().addScaledVector(s.right,(j/16*2-1)*(width-.8)).addScaledVector(s.up,-depth+.22+Math.sin(j*1.3)*.07));props.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.12,4,false),new T.MeshStandardMaterial({color:0xdafaff,roughness:.4})));}
   }else{
    for(const geometry of shell.walls)props.add(new T.Mesh(geometry,new T.MeshStandardMaterial({color:0xa2e7f4,transparent:true,opacity:.24,depthWrite:false,roughness:.2,side:T.DoubleSide})));
    for(const side of [-1,1]){const points=data.samples.filter((_,i)=>i%3===0).map(s=>s.p.clone().addScaledVector(s.right,side*width).addScaledVector(s.up,-depth+2.5));const rail=new T.TubeGeometry(new T.CatmullRomCurve3(points),240,.13,5,false);props.add(new T.Mesh(rail,new T.MeshStandardMaterial({color:spec.accent,roughness:.3,metalness:.3})));}
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
 // The annular vortex is a flowing section; a second spiral overlay would z-fight.
 if(spec.kind==='fountain-carousel')channels.push({curve:new T.CatmullRomCurve3([new T.Vector3(0,15,0),new T.Vector3(0,8,1),new T.Vector3(0,spec.surfaceY,2)]),width:2,offset:0,steps:100,outlet:true,outletPoint:new T.Vector3(0,spec.surfaceY,2)});
 for(const b of route.bowls){yield;
  const wet=vortexBowl(b,{...actual,accent:0x16a9cf},props,root);wet.uniforms.uColor.value.setHex(0x00b8ef);wet.fragmentShader=wet.fragmentShader.replace('gl_FragColor=vec4(max(color,vec3(0.0)),alpha);','color=mix(color,uColor*.85,.25);gl_FragColor=vec4(max(color,vec3(0.0)),.95);');extra.push(wet);
  for(let stream=0;stream<5;stream++){
   const points=Array.from({length:145},(_,i)=>{const u=i/144,a=stream*Math.PI*2/5+u*Math.PI*2*1.6,radius=30-u*22;return new T.Vector3(b.x+Math.cos(a)*radius,b.base+b.depth*(radius/b.radius)**1.7+.28,b.z+Math.sin(a)*radius);});
   props.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),180,.10,4,false),new T.MeshStandardMaterial({color:0xc8faff,roughness:.35})));
  }
 }
 if(spec.kind==='lagoon-launch'){
  const flight=route.flights[0],leg=route.legs.find(l=>l.phase==='flight'),samples=Array.from({length:601},(_,i)=>{const f=leg.fn(i/600),q=new T.Quaternion().fromArray(f.quaternion);return{p:new T.Vector3(...f.position),q,up:new T.Vector3(0,1,0).applyQuaternion(q),right:new T.Vector3(1,0,0).applyQuaternion(q)};});
  channels.push({samples,width:5.2,offset:-.65,steps:240,outlet:false,colors:[0xd0fcff,0x13ceee]});
  for(const side of [-1,1]){const points=samples.filter((_,i)=>i%6===0).map(s=>s.p.clone().addScaledVector(s.right,side*4.9).addScaledVector(s.up,-.6));props.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),120,.12,4,false),new T.MeshStandardMaterial({color:0xe2fdff,roughness:.4})));}
 }
 if(spec.kind==='pool-pendulum'){/* Airborne swing only touches its real basin; no fake dry flume. */}
 const staticModel=yield*batchModelSteps(props,{combineColors:true});applyShowcaseSurfaceDetails(staticModel);root.add(staticModel);props.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedScenery)o.geometry.dispose();});
 const boat=yield*batchModelSteps(moving,{combineColors:true});applyShowcaseSurfaceDetails(boat);moving.clear();moving.add(boat);moving.visible=false;
 const groundApproach=atollApproach(actual,scenery.groundObstacles),approach=spec.seats>1?groupApproach(route,groundApproach,spec.seats):groundApproach;
 root.userData={id,referenceSlide:true,showcaseWater:true,premiumWater:true,mega:true,handpainted:true,moving,pool,route,footprint:spec.footprint,duration:route.duration,rideFrame:route.frame,seatHeight:0,approachOffset:route.entry,dismount:route.entry,approachFrame:approach.frame,approachDuration:approach.duration,approachYaw:approach.yaw,
  groupSeats:spec.seats>1?spec.seats:0,sharedVehicle:spec.seats>1&&spec.kind!=='fountain-carousel',vehicleFrame:route.vehicleFrame,vehicleFrameForLane:route.boatFrame,hollowPassages:scenery.hollowPassages,
  entryForSlot:i=>route.frame(0,false,i).position,
  queueForSlot:spec.seats>1?i=>approach.queues[i]:null,
  stats:{sourceMeshes:staticModel.userData.sourceMeshes,staticMeshes:staticModel.children.length,waterDraws:channels.length+extra.length+1},
  update(time,reduced=false){pool.userData.update(time,reduced);scenery.update(time,reduced);for(const m of extra)advanceWater(m,time,reduced);
   const riders=[...(root.userData.slideRiders?.values()||[])],at=riders.find(r=>Number.isFinite(r.elapsed))?.elapsed??root.userData.rideElapsed;
   if(spec.kind==='fountain-carousel')hub.rotation.y=Number.isFinite(at)?route.vehicleFrame(at,reduced).carouselAngle||0:0;
   if(!riders.length){const f=Number.isFinite(at)?route.vehicleFrame(at,reduced):null;moving.visible=!!f&&!['board','climb','exit','done'].includes(f.phase);if(f){moving.position.set(...f.position);moving.quaternion.fromArray(f.quaternion||[0,0,0,1]);}}
},
 };
 if(!profiles.has(id))profiles.set(id,route.lanes.map(l=>sampleShowcaseActing(l,route.duration)));
 const acting=profiles.get(id),scratch=acting.map(()=>({}));root.userData.rideActing=acting[0];root.userData.rideReaction=(time,reduced=false,lane=0)=>showcaseRideReaction(spec,route,time,rideActingFrame(acting[lane%acting.length],time,reduced,scratch[lane%acting.length]),reduced);
 installSlideWater(root,{channels,pool,color:0x20cce9,speed:spec.kind==='lazy-river'?4.5:8,extraSurfaces:extra});
 for(const material of root.userData.slideWater.materials)polishShowcaseWater(material);
 root.userData.update(0,true);return root;
}
