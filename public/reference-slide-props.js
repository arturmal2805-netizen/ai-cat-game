import * as THREE from "three";
import { shape, line, torus, flowerCluster, lantern, teaPavilion } from "./fantasy-scenery.js";
import { dreamStair } from "./reference-slide-motion.js";
const GOLD=0xffd17f, CREAM=0xffedcf;
export function shellFan(props,x,y,z,size=1,pink=0xf3b6dc) {
  const fan=new THREE.Group();fan.position.set(x,y,z);fan.scale.setScalar(size);props.add(fan);
  for(let i=0;i<13;i++) {
    const a=(i-6)*.18, c=i%3===0?0xe4cef6:i%3===1?pink:0xffd6d9,
      p=shape(fan,"sphere",c,Math.sin(a)*5,Math.cos(a)*4.3,0,1.05,5.8,.55);
    p.rotation.z=-a;
    const end=[Math.sin(a)*9.9,Math.cos(a)*9.9,0];
    line(fan,[0,0,.6],[end[0]*.84,end[1]*.84,.6],GOLD,.055);
  }
  shape(fan,"sphere",0xfff4e0,0,.8,.7,2.1,1.4,.6);
  return fan;
}
function palm(p,x,y,z,s=1) {
  shape(p,"pole",0xb48d66,x,y+2.6*s,z,.25*s,5.2*s,.25*s);
  for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7,m=shape(p,"petal",i%2?0x66b85b:0x8ac564,x+Math.sin(a)*1.1*s,y+5*s,z+Math.cos(a)*1.1*s,.55*s,.25*s,2.7*s);
    m.rotation.y=a;m.rotation.x=.23;
  }
}
function crystal(p,x,y,z,h,c) {
  const m=shape(p,"crystal",c,x,y+h/2,z,1.6,h,1.6);m.rotation.z=(x%3-.8)*.1;
  shape(p,"crystal",0xd9f6ff,x+.8,y+h*.25,z+.5,.65,h*.5,.65);
}
function pine(p,x,z,h) {
  shape(p,"pole",0x9d8c83,x,h*.35,z,.16,h*.7,.16);
  for(let i=0;i<3;i++){
    shape(p,"cone",0x558e86,x,h*(.45+i*.19),z,h*(.31-i*.055),h*.45,h*(.31-i*.055));
    shape(p,"cone",0xe7f7ff,x,h*(.49+i*.19),z,h*(.28-i*.055),h*.35,h*(.28-i*.055));
  }
}
export function* referenceProps(props,spec,route) {
  const {height:h,kind,color,accent}=spec;
  // A low oval garden, not an obstructing square foundation.
  const garden=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshStandardMaterial({color:0xb0cf94,roughness:.95}));
  garden.rotation.x=-Math.PI/2;garden.scale.set(20,21,1);garden.position.y=.07;props.add(garden);
  for(let i=0;i<38;i++){
    yield;
    const a=i*Math.PI*2/38,x=Math.sin(a)*18.7,z=Math.cos(a)*19.4;
    flowerCluster(props,x,z,[0xffaed2,0xcab5ef,0xffe496][i%3],.75,.1);
    if(i%5===0)lantern(props,x,0,z,.8);
  }
  for(const [x,z] of [[17,-14],[-18,13],[16,15]])palm(props,x,.1,z,.8);
  // Every stair tread and the deck follow the real boarding route.
  const steps=Math.ceil((route.height-1.76)/.28);
  for(let i=0;i<=steps;i++){
    yield;
    const p=dreamStair(route.height,i/steps),m=shape(props,"cube",i%2?CREAM:accent,...[p[0],p[1]-.11,p[2]],3.5,.2,1.05);
    m.rotation.y=i/steps*Math.PI*2*Math.max(1,Math.round(route.height/8));
  }
  shape(props,"pole",color,-20,(route.height-1.6)/2,-13,.7,route.height-1.6,.7);
  const rail=[];for(let i=0;i<=130;i++){const a=i/130*Math.PI*2*Math.max(1,Math.round(route.height/8)),p=dreamStair(route.height,i/130);rail.push(new THREE.Vector3(-20+Math.sin(a)*5.2,p[1]+1,-13+Math.cos(a)*5.2));}
  props.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail),240,.055,5,false),new THREE.MeshStandardMaterial({color:GOLD,metalness:.25,roughness:.4})));
  const stationY=route.height-1.6;
  for(const dx of [-2.2,2.2])for(const dz of [-2,2])
    shape(props,"pole",GOLD,-20+dx,stationY+2.25,-9.6+dz,.09,4.5,.09);
  shape(props,"cone",accent,-20,stationY+5.1,-9.6,3.6,1.3,3.1).rotation.y=Math.PI/4;
  for(const lane of route.lanes) {
    yield;
    const top=lane.top,board=lane.board;
    const a=new THREE.Vector3(...top),b=new THREE.Vector3(...board),delta=b.clone().sub(a),length=delta.length(),mid=a.clone().add(b).multiplyScalar(.5);
    const deck=shape(props,"cube",CREAM,mid.x,mid.y-.18,mid.z,3.6,.24,length);
    deck.rotation.y=Math.atan2(delta.x,delta.z);
    for(const side of [-1,1]) {
      const right=new THREE.Vector3(delta.z,0,-delta.x).normalize().multiplyScalar(side*1.7),aa=a.clone().add(right),bb=b.clone().add(right);
      aa.y+=.85;bb.y+=.85;
      // Last two metres are open for boarding the tube, never a bar over a face.
      bb.lerp(aa,Math.min(.85,2/(length||1)));
      line(props,aa.toArray(),bb.toArray(),GOLD,.045);
    }
  }
  const scenicPavilions=kind==="four-funnels"?5:3;
  for(let i=0;i<scenicPavilions;i++) {
    yield;
    const x=i===0?-12:i%2?16:-18,z=i===0?14.5:-13+i*5.7,y=i?Math.max(0,h*.65-i*3):0;
    if(y)for(let j=0;j<3;j++)shape(props,"stone",j%2?0xa8b2aa:0xc0b5ab,x+(j-1)*.65,y/2,z,1.5,y/2,1.7);
    teaPavilion(props,x,y,z,0xffd17c,.95);
    flowerCluster(props,x+1.4,z+1.2,0xffb4d7,.9,y);
  }
  // A terraced cliff garden connects the towers to the themed landscape.
  // It sits behind the wet routes, leaving the whole front walkway accessible.
  for(let i=0;i<8;i++) {
    yield;
    const x=-12+i*4,y=5+(i%4)*3.2,ice=kind==="ice-tunnel";
    for(let j=0;j<3;j++)shape(props,"stone",ice?0xc7e5f6:j%2?0xb7afa5:0x9ca8a2,x+(j-1)*.65,y/2,-20.5,2.3,y/2+1,2.3);
    shape(props,"sphere",ice?0xe3f4ff:0x8eb66d,x,y+.4,-20.5,2.2,.4,2.1);
    flowerCluster(props,x,-19.8,ice?0xd7b8f4:i%2?0xf9b2ce:0xffdb8b,.85,y+.5);
    if(i%2===0)palm(props,x,y+.5,-20.5,.6);
    if(i%3===1)teaPavilion(props,x,y+.6,-20.5,0xffd07a,.8);
  }
  if(["pearl-funnel","orbital-shell"].includes(kind))shellFan(props,0,10,-8,1.05,color);
  if(kind==="twin-shell")shellFan(props,0,19,-14,1.2,color);
  if(kind==="crystal-loops" || kind==="cave-loop" || kind==="luminous-vortex") {
    for(let i=0;i<11;i++)crystal(props,-12+i*2.3,0,-17.5,8+(i%4)*4,i%2?0xb0a4f8:0x8ee8f7);
    if(kind!=="crystal-loops")for(let i=0;i<8;i++){
      const m=shape(props,"crystal",i%2?0xd3b1ff:0x79e9ff,-12+i*3.3,h-3,-16,.7,5+(i%3),.7);m.rotation.z=Math.PI;
    }
  }
  if(kind==="canyon-twins" || kind==="canyon-eight") {
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const y=i*3;shape(props,"stone",i%2?0xccba9b:0xb1a8a2,side*5,y,-3,2.4,3,2.9);
    }
  }
  if(kind==="blossom-tree") {
    shape(props,"pole",0xa37a61,0,h*.45,-3,1.5,h*.9,1.6);
    for(let i=0;i<10;i++){
      const a=i*Math.PI*2/10, x=Math.sin(a)*5,z=-3+Math.cos(a)*5;
      line(props,[0,h*.55,-3],[x,h-2,z],0xad8265,.45);
      shape(props,"sphere",i%2?0xf6acd5:0xe999c6,x,h+1+(i%3),z,4.3,3.4,4.3);
      flowerCluster(props,x,z,0xffda8d,2,h+4);
    }
    teaPavilion(props,0,h*.44,-3,accent,1.4);
  }
  if(kind==="ice-tunnel") {
    for(let i=0;i<7;i++){
      const x=-14+i*4.5;crystal(props,x,0,-17,12+(i%3)*6,i%2?0xb2d9f3:0xe0ecff);pine(props,x,-17.5,5+(i%3));
    }
    const mid=route.geometry[0].samples[280],gate=torus(props,0xcceeff,3.35,.52,...mid.p.toArray());gate.quaternion.copy(mid.q);
    for(let i=0;i<7;i++){const a=i/6*Math.PI,local=new THREE.Vector3(Math.cos(a)*3.6,Math.sin(a)*3.6,0).applyQuaternion(mid.q).add(mid.p);shape(props,"crystal",0xf3fbff,local.x,local.y-.6,local.z,.3,1.4,.3);}
  }
  if(kind==="lighthouse") {
    for(let i=0;i<9;i++)shape(props,"pole",i%2?0xf4a4a8:0xfff4df,0,1+i*2.8,-3,2.35,2.8,2.35);
    shape(props,"cube",0xeed4a9,0,27,-3,5.6,.35,5.6);
    shape(props,"pole",0x7aaccb,0,28.6,-3,1.65,3,1.65);
    shape(props,"sphere",0xffe1a1,0,28.6,-3,.9,1.1,.9,true);
    shape(props,"cone",0xef8e9e,0,30.7,-3,3.5,2.1,3.5);
    for(let i=0;i<4;i++)shape(props,"sphere",0xffe4a3,0,3+i*6,-.6,.65,.9,.12,true);
  }
  if(kind==="dragon-tail") {
    const head=new THREE.Group();head.position.set(0,h-2,-13);props.add(head);
    shape(head,"sphere",0x5ebcae,0,0,0,3.4,3,3.8);
    shape(head,"sphere",0xa1d8bb,0,-.7,2.8,2.8,1.5,2.8);
    shape(head,"sphere",0xe3ead2,0,-1.4,3.1,2.35,.35,2.2);
    for(const side of [-1,1]) {
      shape(head,"sphere",0xffe2a5,side*2.1,1.2,2.1,.9,1,.7);
      shape(head,"sphere",0x244c5a,side*2.2,1.25,2.65,.45,.63,.25);
      shape(head,"sphere",0xffffff,side*2.25,1.5,2.84,.16,.18,.09,true);
      const horn=shape(head,"cone",GOLD,side*2,3,0,.6,3,.6);horn.rotation.z=-side*.4;
      shape(head,"sphere",0x559d9b,side*2,0,4.2,.3,.25,.2);
    }
    for(let i=0;i<6;i++)shape(head,"cone",GOLD,0,2.4-i*.3,-2-i*.8,.4,1.7,.4);
  }
  if(kind==="waterfall-arch" || kind==="water-lift") {
    const x=kind==="water-lift"?-9:-4,z=kind==="water-lift"?-11:-8;
    for(const side of [-1,1]) {
      shape(props,"cube",CREAM,x+side*5,h/2,z,2.6,h,3);
      for(let i=0;i<8;i++)shape(props,"cube",0xd8c09d,x+side*5,h*i/8,z,2.9,.35,3.3);
      teaPavilion(props,x+side*5,h,z,GOLD,.9);
    }
    torus(props,CREAM,5,.9,x,h-1,z,false,Math.PI);
  }
  if(["sky-bridge","royal-aqueduct","terrace-cascades"].includes(kind)) {
    for(const part of route.geometry)for(const idx of [60,260,460]) {
      const s=part.samples[idx],y=s.p.y-6.2;if(y<1)continue;
      const right=new THREE.Vector3(s.right.x,0,s.right.z).normalize(),forward=new THREE.Vector3(0,0,1).applyQuaternion(s.q),yaw=Math.atan2(forward.x,forward.z);
      for(const side of [-1,1])shape(props,"pole",0xe4cba6,s.p.x+right.x*side*3.5,y/2,s.p.z+right.z*side*3.5,.52,y,.52);
      const arch=torus(props,CREAM,3.5,.4,s.p.x,y,s.p.z,false,Math.PI);arch.rotation.y=yaw;
    }
  }
  if(kind==="cloud-star") {
    const crown=torus(props,GOLD,12,.23,0,h+6,-3,true);crown.rotation.x=Math.PI/2;
    for(let i=0;i<18;i++){const a=i*Math.PI*2/18;shape(props,"sphere",0xe9e0ff,Math.sin(a)*12,h+4.2,-3+Math.cos(a)*12,2.3,1,1.9);}
    teaPavilion(props,0,h+6,-3,GOLD,1.8);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;line(props,[0,h+8.6,-3],[Math.sin(a)*12,h+6,-3+Math.cos(a)*12],GOLD,.035);}
  }
  if(kind==="four-funnels")for(const b of route.bowls)shellFan(props,b.x,b.base+2,b.z-b.radius,.46,accent);
}
