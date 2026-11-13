import * as T from 'three';
import {MALL_ICE_FLAVORS} from './mall-ice-data.js';
import {prepareMallIceServings,mallIceServing} from './mall-ice-serving.js';

function iceFinish(kit,id,color,roughness=.36,metalness=.05){kit.iceMaterials??=new Map();if(!kit.iceMaterials.has(id))kit.iceMaterials.set(id,new T.MeshStandardMaterial({color,roughness,metalness}));return kit.iceMaterials.get(id);}
export function* mallIceFrontSteps(physical,header,store,placement,kit,f){
  yield* prepareMallIceServings();const {cube,tube,mats,label}=kit,{soft}=f,front=placement.d/2;
  const pearl=iceFinish(kit,'pearl',0xf1f0e7),teal=iceFinish(kit,'teal',0x45bec8),berry=iceFinish(kit,'berry',0xde6297);
  soft(header,pearl,0,6.61,front+.20,placement.w-.25,1.75,.42);
  soft(header,teal,0,7.48,front+.34,placement.w+.1,.16,.75);
  cube(header,berry,0,5.75,front+.44,placement.w-.7,.06,.065);
  const sign=label(header,4+kit.storeIds.indexOf(store.id),0,6.62,front+.46,18,1.05),colors=sign.geometry.getAttribute('color');if(colors)for(let i=0;i<colors.count;i++)colors.setXYZ(i,.025,.20,.24);
  for(const [i,x]of [-11,11].entries()){
    const cone=mallIceServing(i?'cosmic-rainbow':'blue-lagoon');cone.position.set(x,5.82,front+.70);cone.scale.setScalar(1.45);header.add(cone);
    soft(physical,teal,x>0?placement.w/2-.35:-placement.w/2+.35,2.7,front,.45,5.4,.5);
  }
}

export function* mallIceShopSteps(parent,ceiling,motion,store,placement,kit,f){
  yield* prepareMallIceServings();const {cube,mesh,disk,tube,orb,glassMat,mats,labelText,chair,clock}=kit,{soft,paint,touchscreen}=f;
  const pearl=iceFinish(kit,'pearl',0xf1f0e7),teal=iceFinish(kit,'teal',0x45bec8),berry=iceFinish(kit,'berry',0xde6297),steel=iceFinish(kit,'steel',0xadb8b8,.27,.75),dark=iceFinish(kit,'dark',0x253a40,.5);
  const back=-placement.d/2;
  // Own pearl-and-turquoise tiled back wall, menu and illuminated medallions.
  // These are physical fittings, with the floor/door/contact layout retained.
  soft(parent,pearl,0,4.8,back+.38,27,4.8,.18);
  for(let row=0;row<7;row++)for(let col=0;col<27;col++){
    const x=-12.6+col*.96+(row%2)*.48;if(x>13)continue;
    soft(parent,row%3===0?teal:pearl,x,2.85+row*.52,back+.50,.92,.48,.045);
  }
  soft(parent,teal,0,5.9,back+.61,16,1.7,.12);
  labelText(parent,store.name,0,5.92,back+.70,15,1.1);
  for(const side of [-1,1]){
    const medallion=disk(parent,berry,side*10.2,6.1,back+.64,.80,.1);medallion.rotation.x=Math.PI/2;
    const cone=mallIceServing(side<0?'blue-lagoon':'cosmic-rainbow');cone.position.set(side*10.2,5.58,back+.78);cone.scale.setScalar(.90);parent.add(cone);
  }

  // An actual refrigerated six-pan display, within the original cashier
  // counter's measured footprint. The customer/staff aisle stays clear.
  soft(parent,pearl,0,.43,5.5,14,.8,1.4);soft(parent,teal,0,.43,6.16,13.8,.61,.06);
  for(let i=0;i<36;i++)cube(parent,steel,-6.65+i*.38,.18,6.20,.19,.028,.018);
  cube(parent,steel,0,.91,5.5,14.1,.10,1.4);
  for(const [index,flavor]of MALL_ICE_FLAVORS.entries()){
    yield;const x=(index-2.5)*2.10;
    soft(parent,steel,x,.97,5.5,1.95,.17,1.13);
    for(let row=0;row<2;row++)for(let col=0;col<3;col++){
      const mound=mallIceServing(flavor.key).userData.cream.children[0].clone(true);mound.position.set(x+(col-1)*.54,1.06,5.2+row*.48);mound.scale.set(.95,.48,.82);parent.add(mound);
    }
    soft(parent,dark,x,.68,6.22,1.98,.30,.035);labelText(parent,`${flavor.name} · ${flavor.price}`,x,.69,6.245,1.85,.17);
  }
  // Curved glass canopy with real edge seals instead of a blue opaque box.
  const p=[],uv=[],indices=[];
  for(let i=0;i<=24;i++){const a=i/24*Math.PI,z=5.5+Math.cos(a)*.69,y=1.06+Math.sin(a)*.80;p.push(-7.04,y,z,7.04,y,z);uv.push(0,i/24,1,i/24);if(i<24){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const canopy=new T.BufferGeometry();canopy.setAttribute('position',new T.Float32BufferAttribute(p,3));canopy.setAttribute('uv',new T.Float32BufferAttribute(uv,2));canopy.setIndex(indices);canopy.computeVertexNormals();mesh(parent,canopy,glassMat);
  for(const x of [-7.04,7.04]){const points=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI;points.push([x,1.06+Math.sin(a)*.80,5.5+Math.cos(a)*.69]);}tube(parent,points,.035,steel);}
  for(const x of [-6.1,6.1]){const till=new T.Group();till.position.set(x,.98,5.45);till.scale.setScalar(.45);parent.add(till);touchscreen(till,0,.35,0);}
  yield;
  // Two full machines, three flavour tanks each: lit product windows, steel
  // levers/nozzles, drip grills, controls, refrigeration vents and service doors.
  const outlets=[];
  for(const side of [-1,1]){
    const x=side*8.8,z=back+3.1;
    soft(parent,steel,x,1.85,z,6.6,3.6,2.8);soft(parent,teal,x,3.6,z+1.43,6.45,.12,.06);soft(parent,pearl,x,3.66,z,6.72,.14,2.9);
    cube(parent,dark,x,1.83,z+1.43,6.2,1.58,.06);
    for(let i=0;i<3;i++){
      const index=(side<0?0:3)+i,flavor=MALL_ICE_FLAVORS[index],px=x+(i-1)*2.0,m=iceFinish(kit,flavor.key,flavor.color,.35);
      soft(parent,m,px,2.96,z+1.45,1.78,1.1,.13);cube(parent,glassMat,px,2.96,z+1.53,1.64,.97,.035);
      labelText(parent,`${flavor.name} · ${flavor.price}`,px,3.0,z+1.57,1.5,.20);
      const nozzle=disk(parent,steel,px,2.27,z+1.63,.13,.27);tube(parent,[[px,2.45,z+1.65],[px,2.81,z+1.69],[px,2.88,z+1.85]],.045,steel);orb(parent,m,px,2.88,z+1.87,.08);
      soft(parent,steel,px,1.48,z+1.35,1.65,.10,1.0);for(let j=0;j<9;j++)cube(parent,dark,px-.7+j*.175,1.54,z+1.35,.065,.025,.82);
      const cone=mallIceServing(flavor.key);cone.position.set(px,1.55,z+1.40);cone.scale.setScalar(.55);parent.add(cone);outlets.push({x:px,y:1.93,z:z+1.63});
    }
    for(let i=0;i<18;i++)for(let row=0;row<3;row++)cube(parent,dark,x-2.9+i*.34,.32+row*.09,z+1.43,.15,.025,.035);
    for(const side of [-1,1])disk(parent,dark,x+side*2.94,1.15,z+1.47,.035,.03).rotation.x=Math.PI/2;
    for(const dx of [-1.6,1.6]){cube(parent,steel,x+dx,.72,z+1.44,2.5,.025,.025);cube(parent,steel,x+dx,.72,z+1.47,.5,.055,.035);}
    yield;
  }
  // Fixed six-stream GPU effect. No matrix or geometry upload during serving;
  // only the active order's nozzle and elapsed checkout time change uniforms.
  const selected={value:-1},elapsed={value:0},geometry=new T.CylinderGeometry(.032,.024,.40,10),ids=new T.InstancedBufferAttribute(Float32Array.from({length:6},(_,i)=>i),1);geometry.setAttribute('aIceNozzle',ids);
  const material=new T.MeshStandardMaterial({color:0xfff2d7,roughness:.43});
  material.onBeforeCompile=s=>{s.uniforms.uIceNozzle=selected;s.uniforms.uIceElapsed=elapsed;s.uniforms.uIceClock=clock;s.vertexShader='attribute float aIceNozzle;varying float vIceNozzle;varying float vIceY;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvIceNozzle=aIceNozzle;vIceY=position.y;');s.fragmentShader='uniform float uIceNozzle;uniform float uIceElapsed;uniform float uIceClock;varying float vIceNozzle;varying float vIceY;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(abs(vIceNozzle-uIceNozzle)>.1||uIceElapsed<.2||uIceElapsed>2.25)discard;');s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=.94+.06*sin(vIceY*90.+uIceClock*20.);');};material.customProgramCacheKey=()=> 'mall-ice-six-static-nozzles-v1';
  const streams=new T.InstancedMesh(geometry,material,6),dummy=new T.Object3D();outlets.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.updateMatrix();streams.setMatrixAt(i,dummy.matrix);});streams.instanceMatrix.needsUpdate=true;streams.computeBoundingBox();streams.computeBoundingSphere();motion.add(streams);
  kit.iceStation.current={setServing(key,time=0){const index=MALL_ICE_FLAVORS.findIndex(f=>f.key===key);selected.value=index;elapsed.value=time;if(index>=0)material.color.setHex(MALL_ICE_FLAVORS[index].color);},streams};
  // Topping jars and cone storage behind the work aisle.
  soft(parent,pearl,0,1,back+1.5,8,1.8,1.3);
  for(let i=0;i<12;i++){
    const x=-3.5+i*.64,m=iceFinish(kit,MALL_ICE_FLAVORS[i%6].key,MALL_ICE_FLAVORS[i%6].color,.35);
    disk(parent,glassMat,x,2.25,back+1.4,.23,.60);disk(parent,steel,x,2.57,back+1.4,.24,.045);
    for(let j=0;j<7;j++)orb(parent,m,x+Math.sin(j*2.4)*.13,2.02+j%3*.13,back+1.4+Math.cos(j*2.4)*.13,.045,.035,.05);
  }
  // Real retained dining seats, with different served examples on the tables.
  for(const side of [-1,1])for(const z of [.8,5.8]){
    const x=side*8;soft(parent,pearl,x,.95,z,2.4,.13,2.05);disk(parent,steel,x,.48,z,.065,.88);chair(parent,x,z+1.6,side<0?teal:berry,.65,Math.PI);
    const cone=mallIceServing(side<0?'strawberry-cloud':'mango-sun');cone.position.set(x+.3,1.04,z);cone.scale.setScalar(.55);parent.add(cone);
  }
  for(const x of [-9,0,9]){cube(ceiling,pearl,x,7.7,0,5.7,.14,placement.d-1);tube(ceiling,[[x-2.6,7.55,back+.7],[x-2.6,7.55,placement.d/2-.7]],.028,mats.cyan);tube(ceiling,[[x+2.6,7.55,back+.7],[x+2.6,7.55,placement.d/2-.7]],.028,mats.pink);}
}
