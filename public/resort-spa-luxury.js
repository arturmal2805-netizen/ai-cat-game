import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RESORT_ZONES,RESORT_SPA as S,resortSpaSeat} from './resort-spa-data.js';
import {createResortBasin} from './resort-spa-basin.js';
import {resortSkyPool} from './resort-spa-pool-data.js';

// Authored in metres around existing contacts. This module owns only SPA art;
// IDs, purchases, the shell, navigation, cat rig and service runtime are retained.
export function* resortLuxurySteps({solid,decor,shell,surfaces,basins,waters,mats}){
 const geometries=new Map(),materials=new Set(),textures=new Set(),dynamic=new T.Group(),fish=[],starTimes=[];
 mats.amber.emissiveIntensity=2;mats.pink.emissiveIntensity=.6;
 const report={version:6,rooms:{},skyPool:null,source:'SPA-local 3D geometry; no reference images used as scenery'};
 let floor=0,room=null;
 const material=(color,options={})=>{const m=new T.MeshStandardMaterial({color,roughness:.65,...options});materials.add(m);return m;};
 const cream=material(0xfff0de,{roughness:.9}),rose=material(0xdfa5bc,{roughness:.95}),navy=material(0x111c38,{roughness:.88}),bronze=material(0x33241f,{roughness:.55}),green=material(0x326c55),leafLight=material(0x6e9f67),petal=material(0xf3a4cf,{roughness:.7,side:T.DoubleSide}),petalDark=material(0xd9599c,{roughness:.65,side:T.DoubleSide}),ivoryLight=material(0xfff4e6),silk=material(0xf9ddcc,{roughness:.9,side:T.DoubleSide}),silver=material(0xb8d7e6,{roughness:.16,metalness:.8});
 for(const m of [cream,rose,navy,silk])for(const key of ['map','normalMap','roughnessMap'])m[key]=mats.cloth[key];
 const glow=new T.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.14,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});materials.add(glow);
 const geometry=(key,make)=>{if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);};
 const cube=geometry('rounded',()=>new RoundedBoxGeometry(1,1,1,2,.07)),unitBox=geometry('box',()=>new T.BoxGeometry(1,1,1)),sphere=geometry('sphere',()=>new T.SphereGeometry(1,12,8)),cylinder=geometry('cylinder',()=>new T.CylinderGeometry(1,1,1,24));
 function mesh(parent,g,m,x,y,z,sx=1,sy=1,sz=1){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.userData.resortFloor=floor;o.userData.resortRoom=room;o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);if(room)report.rooms[room].meshes++;return o;}
 const box=(p,m,x,y,z,w,h,d,rounded=false)=>mesh(p,rounded?cube:unitBox,m,x,y,z,w,h,d);
 const ball=(p,m,x,y,z,rx,ry=rx,rz=rx)=>mesh(p,sphere,m,x,y,z,rx,ry,rz);
 const disk=(p,m,x,y,z,rx,rz,h=.2)=>mesh(p,cylinder,m,x,y,z,rx,h,rz);
 function line(parent,m,points,r=.07){const key='line:'+r+':'+points.map(p=>p.join(',')).join('|'),g=geometry(key,()=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(8,points.length*3),r,6,false));return mesh(parent,g,m,0,0,0);}
 function ring(parent,m,x,y,z,rx,rz,r=.08){const points=Array.from({length:49},(_,i)=>{const a=i*Math.PI/24;return[x+Math.cos(a)*rx,y,z+Math.sin(a)*rz];});return line(parent,m,points,r);}
 const petalGeo=geometry('curled-petal',()=>{const p=[],uv=[],ix=[];for(let i=0;i<=5;i++)for(let j=0;j<=2;j++){const t=i/5,s=j-1;p.push(Math.sin(Math.PI*t)*s*.28,.22*t*t+.08*s*s*t,.7*t);uv.push(j/2,t);}for(let i=0;i<5;i++)for(let j=0;j<2;j++){const a=i*3+j;ix.push(a,a+1,a+3,a+1,a+4,a+3);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;});
 const flowerCluster=geometry('blossom-cluster',()=>{const parts=[];for(let i=0;i<12;i++){const a=i*2.39996,r=.25+Math.sqrt(i/12)*1.1;for(let j=0;j<5;j++){const g=petalGeo.clone();g.scale(.38,.38,.38);g.rotateY(j*Math.PI*2/5);g.rotateX(Math.sin(i)*.55);g.translate(Math.sin(a)*r,Math.cos(i*3)*.35,Math.cos(a)*r);parts.push(g);}}const g=mergeGeometries(parts);for(const p of parts)p.dispose();return g;});
 const leafGeo=geometry('arched-leaf',()=>{const g=petalGeo.clone();g.scale(.65,1.4,2.2);return g;});
 function plant(x,y,z,size=1,flowers=false){disk(solid,mats.gold,x,y+.4*size,z,.55*size,.55*size,.8*size);disk(decor,mats.wood,x,y+.81*size,z,.48*size,.48*size,.06);for(let j=0;j<7;j++){const o=mesh(decor,leafGeo,j%2?green:leafLight,x,y+.7*size,z,size,size,size);o.rotation.y=j*2.39996;o.rotation.x=-.4+j%3*.17;}if(flowers)mesh(decor,flowerCluster,petal,x,y+1.5*size,z,.7*size,.7*size,.7*size);}
 function tree(x,y,z,size=1){disk(solid,mats.ivory,x,y+.35,z,1.1,1.1,.7);disk(decor,mats.gold,x,y+.72,z,1.12,1.12,.07);line(solid,mats.wood,[[x,y+.7,z],[x-.2*size,y+2*size,z],[x+.15*size,y+3.7*size,z]],.15*size);for(let j=0;j<5;j++){const a=j*2.39996,b=[x+Math.sin(a)*1.5*size,y+(3.5+j%2*.7)*size,z+Math.cos(a)*1.5*size];line(decor,mats.wood,[[x,y+2*size,z],b],.07*size);mesh(decor,flowerCluster,j%2?petal:petalDark,...b,1.15*size,.95*size,1.15*size);}
  if(room)report.rooms[room].floweringTrees++;
 }
 function lantern(x,y,z,size=1){disk(solid,mats.gold,x,y+.08,z,.43*size,.43*size,.16);box(decor,mats.amber,x,y+.55*size,z,.32*size,.72*size,.32*size,true);for(const a of [-1,1])for(const b of [-1,1])box(decor,mats.gold,x+a*.27*size,y+.55*size,z+b*.27*size,.045*size,1*size,.045*size);disk(decor,mats.gold,x,y+1.08*size,z,.42*size,.42*size,.1);ball(decor,glow,x,y+.55*size,z,.4*size,.7*size,.4*size);ball(decor,mats.gold,x,y+1.25*size,z,.1*size,.14*size);}
 function lotus(x,y,z,size=1){disk(decor,mats.gold,x,y-.08,z,size*.75,size*.75,.12);for(let ringIndex=0;ringIndex<2;ringIndex++)for(let i=0;i<8;i++){const a=i*Math.PI/4+ringIndex*.25,o=mesh(decor,petalGeo,ringIndex?petalDark:petal,x,y,z,size,size,size);o.rotation.y=a;o.rotation.x=-(.5+ringIndex*.5);}ball(decor,mats.amber,x,y+.25*size,z,.15*size,.3*size);}
 function tray(x,y,z,food=false){disk(decor,mats.gold,x,y,z,.55,.4,.045);for(let j=0;j<3;j++){const q=x+(j-1)*.3;disk(decor,ivoryLight,q,y+.1,z,.12,.12,.15);if(food){ball(decor,rose,q,y+.22,z,.14,.11,.14);ball(decor,petalDark,q,y+.33,z,.04);}else{disk(decor,bronze,q,y+.18,z,.1,.1,.02);const handle=mesh(decor,geometry('cup-handle',()=>new T.TorusGeometry(.08,.018,5,12)),mats.gold,q+.13,y+.11,z);handle.rotation.y=Math.PI/2;}}
 }
 function station(s,key){const y=s.y-S.y-.012;
  if(['cabana','nap','amber','midnight'].includes(key)){
   const pad=key==='midnight'?navy:cream;box(decor,pad,s.x,y+.96,s.z,2.8,.13,1.45,true);for(const side of [-1,1])box(decor,side<0?rose:cream,s.x+side*1.08,y+1.1,s.z-.34,.48,.24,.48,true);
   // Draped blanket keeps the original native resting support unchanged.
   box(decor,key==='midnight'?silver:rose,s.x-.35,y+1.01,s.z+.42,.8,.08,.65,true);
   disk(solid,mats.gold,s.x+2.5,y+.46,s.z-1,1.0,.8,.1);disk(solid,mats.gold,s.x+2.5,y+.2,s.z-1,.07,.4);tray(s.x+2.5,y+.54,s.z-1);lantern(s.x-2.35,y,s.z-1.25,.65);
  }else if(key==='cafe'){tray(s.x,y+1.3,s.z,true);lotus(s.x+.6,y+1.35,s.z,.45);}
  else if(key==='beauty'){
   for(let j=0;j<4;j++){const g=geometry('comb-tooth',()=>new T.BoxGeometry(.035,.05,.23));mesh(decor,g,mats.gold,s.x+1.9+j*.07,y+1.47,s.z-1.7);}
   ring(decor,mats.amber,s.x,y+2.05,s.z-2.01,1.15,.015,.035);
   box(decor,mats.ivory,s.x+1.7,y+1.3,s.z-2,1.5,.16,.65,true);tray(s.x+1.7,y+1.42,s.z-2);
  }else if(key==='aroma'){
   const radius=2.5;for(const side of [-1,1]){const points=Array.from({length:13},(_,i)=>{const a=i*Math.PI/12;return[s.x+side*radius*Math.cos(a),y+1.2+3.3*Math.sin(a),s.z-1];});line(decor,mats.gold,points,.065);}
   disk(solid,mats.gold,s.x+2.3,y+.55,s.z-1,.6,.6,.1);ball(decor,mats.glass,s.x+2.3,y+.8,s.z-1,.25,.3,.25);ball(decor,mats.amber,s.x+2.3,y+.75,s.z-1,.08,.15);
  }
 }
 function architecture(zone){const y=zone.level*S.rise,roofY=y+4;
  ring(decor,mats.gold,zone.x,y-.16,zone.z,zone.rx,zone.rz,.16);ring(decor,mats.amber,zone.x,y+.07,zone.z,zone.rx-.22,zone.rz-.22,.035);ring(decor,mats.gold,zone.x,roofY,zone.z,zone.rx,zone.rz,.12);
  for(let j=0;j<10;j++){const a=j*Math.PI/5,points=Array.from({length:13},(_,i)=>{const t=i*Math.PI/24;return[zone.x+Math.cos(a)*zone.rx*Math.cos(t),roofY+6*Math.sin(t),zone.z+Math.sin(a)*zone.rz*Math.cos(t)];});line(decor,mats.gold,points,.055);}
  for(const side of [-1,1]){const x=zone.x+side*(zone.rx*.73),z=zone.z-zone.rz*.57;lantern(x,y,z);plant(zone.x+side*(zone.rx*.77),y,zone.z+zone.rz*.48,1.3,true);}
 }
 function chandelier(x,y,z,r=2){for(let i=0;i<3;i++)ring(decor,i===1?mats.amber:mats.gold,x,y+i*.35,z,r*(1-i*.2),r*(1-i*.2),i===1?.055:.065);for(let j=0;j<12;j++){const a=j*Math.PI/6;line(decor,mats.gold,[[x,y+1.4,z],[x+Math.sin(a)*r,y,z+Math.cos(a)*r]],.018);ball(decor,mats.amber,x+Math.sin(a)*r,y-.22,z+Math.cos(a)*r,.07,.24,.07);}}
 function curtains(x,y,z,r=2.8){const g=geometry('pleated-curtain',()=>{const p=[],uv=[],ix=[];for(let i=0;i<=16;i++)for(let j=0;j<2;j++){const t=i/16;p.push(t*1.1,j*2.6,Math.sin(t*Math.PI*8)*.1);uv.push(t,j);}for(let i=0;i<16;i++){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;});for(const side of [-1,1]){const o=mesh(decor,g,silk,x+side*r,y+1,z-1);o.rotation.y=side*.3;}}
 function domedCeiling(zone,color){
  const m=material(color,{roughness:.78,side:T.DoubleSide,transparent:true,opacity:.85,depthWrite:false});const g=geometry('star-ceiling',()=>new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2));mesh(shell,g,m,zone.x,zone.level*S.rise+7,zone.z,zone.rx*.92,2.2,zone.rz*.92);
  const points=[],phases=[],colors=[],warm=new T.Color(zone.key==='midnight'?0xbacfff:zone.key==='nap'?0xd7b6fb:0xffd08a),cool=new T.Color(0xa698e6);
  for(let i=0;i<1200;i++){const a=i*2.399963,r=Math.sqrt((i+.5)/1200)*.87;points.push(zone.x+Math.cos(a)*r*zone.rx,zone.level*S.rise+6.97+Math.sqrt(Math.max(0,1-(r/.92)**2))*2.2,zone.z+Math.sin(a)*r*zone.rz);phases.push(i*1.117);const c=i%7?warm:cool;colors.push(c.r,c.g,c.b);}
  const stars=new T.BufferGeometry();stars.setAttribute('position',new T.Float32BufferAttribute(points,3));stars.setAttribute('aPhase',new T.Float32BufferAttribute(phases,1));stars.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometries.set(zone.id+'-v6-stars',stars);
  const time={value:0},sm=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,uniforms:{time},vertexShader:'attribute float aPhase;uniform float time;varying vec3 ink;varying float glow;void main(){ink=color;glow=.78+.22*sin(time*.35+aPhase);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp((1.7+fract(aPhase)*2.)*32./max(1.,-p.z),.65,5.);}',fragmentShader:'varying vec3 ink;varying float glow;void main(){float d=length(gl_PointCoord-.5);float a=exp(-d*d*22.)*glow;gl_FragColor=vec4(ink,a);\n#include <colorspace_fragment>\n}'});materials.add(sm);starTimes.push(time);const sky=new T.Points(stars,sm);sky.userData.resortFloor=zone.level;dynamic.add(sky);
 }
 function textSign(zone){if(typeof document==='undefined')return;const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');c.textAlign='center';c.fillStyle='#ffe7ab';c.font='500 48px sans-serif';const words=zone.name.split(' '),mid=Math.ceil(words.length/2);c.fillText(words.slice(0,mid).join(' '),512,108,970);c.fillText(words.slice(mid).join(' '),512,172,970);const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;textures.add(t);const m=new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:T.DoubleSide});materials.add(m);mesh(decor,geometry('room-sign',()=>new T.PlaneGeometry(9,2.25)),m,zone.x,zone.level*S.rise+4,zone.z-zone.rz+.35);}
 function fishModel(spec){const root=new T.Group(),parts=[],bodyMat=material(spec.color,{metalness:.2,roughness:.3}),finMat=material(spec.fin,{metalness:.15,roughness:.35,side:T.DoubleSide,emissive:spec.fin,emissiveIntensity:.18});
  const ray=spec.name.includes('ray'),angel=spec.name.includes('angelfish'),body=sphere.clone();body.scale(spec.length,ray?.16:angel?1:.5,ray?1.3:.35);parts.push(body);
  const finParts=[];for(const side of [-1,1]){const fin=petalGeo.clone();fin.scale(spec.length*(ray?3:1.5),ray?.3:angel?3:1.6,ray?4:2);fin.rotateZ(side*(ray?.15:.65));fin.rotateY(Math.PI/2);if(ray)fin.rotateX(side*Math.PI/2);fin.translate(-spec.length*.2,side*.22,0);finParts.push(fin);}const tail=petalGeo.clone();tail.scale(ray?.25:2,ray?.2:2.5,ray?5:3);tail.rotateY(-Math.PI/2);tail.translate(-spec.length,0,0);finParts.push(tail);
  const bodyG=mergeGeometries(parts),finG=mergeGeometries(finParts);geometries.set('fish-body-'+spec.name,bodyG);geometries.set('fish-fin-'+spec.name,finG);for(const g of [...parts,...finParts])g.dispose();root.add(new T.Mesh(bodyG,bodyMat),new T.Mesh(finG,finMat));root.name='SPA aquarium '+spec.name;root.userData.resortFloor=1;dynamic.add(root);fish.push({root,speed:spec.speed,phase:fish.length*2.1});return root;
 }
 for(const zone of RESORT_ZONES){
  floor=zone.level;room=zone.id;report.rooms[room]={key:zone.key,meshes:0,floweringTrees:0,features:[]};const features=report.rooms[room].features,y=zone.level*S.rise;
  architecture(zone);textSign(zone);for(let i=0;i<zone.seats;i++)station(resortSpaSeat(zone,i),zone.key);
  if(zone.key==='thermal'){
   features.push('elliptical thermal hall','ten perimeter chaise lounges','four conversation islands','sculpted central lotus');
   for(let i=0;i<10;i++){const a=i*Math.PI*2/10,x=zone.x+Math.cos(a)*(zone.rx-2.4),z=zone.z+Math.sin(a)*(zone.rz-2.4),o=box(solid,cream,x,y+.55,z,1.25,.7,2.5,true);o.rotation.y=-a;const pillow=box(decor,rose,x,y+.96,z,1.0,.16,.55,true);pillow.rotation.y=-a;}
   lotus(zone.x,y+.4,zone.z,3.2);for(const side of [-1,1]){tree(zone.x+side*31,y,zone.z-15,1.2);chandelier(zone.x+side*22,y+5.5,zone.z,2.6);}
  }else if(zone.key==='jacuzzi'){
   features.push('panoramic jacuzzi hall','sculpted stone rims','lantern terraces');
   for(const side of [-1,1]){tree(zone.x+side*16,y,zone.z-10,1);for(let j=0;j<3;j++)lantern(zone.x+side*17,y,zone.z-5+j*6,.8);}
  }else if(zone.key==='massage'){
   features.push('six private treatment rooms','gold cabin arches','towel and oil stations');
   for(let i=0;i<zone.seats;i++){const s=resortSpaSeat(zone,i);curtains(s.x,y,s.z,3.3);lantern(s.x-2.5,y,s.z-2.5,.55);box(decor,cream,s.x,y+.99,s.z,1.55,.08,3.45,true);for(let j=0;j<3;j++){const towel=geometry('rolled-towel',()=>new T.CylinderGeometry(.14,.14,.45,12)),o=mesh(decor,towel,cream,s.x+2.7,y+1.2+j*.3,s.z-2.65);o.rotation.z=Math.PI/2;}}
  }else if(zone.key==='aroma'){
   features.push('private arched garden seats','flowering grove','aroma vessels','curved leaf canopies');
   for(const side of [-1,1])for(let i=0;i<3;i++)tree(zone.x+side*18,y,zone.z-11+i*10,.9);
   chandelier(zone.x,y+6.6,zone.z,2);lotus(zone.x,y+.4,zone.z,1.7);
  }else if(zone.key==='sauna'){
   features.push('cedar sauna tiers','steam salon','cooling lounge');
   for(let tier=0;tier<3;tier++){box(solid,mats.wood,zone.x,y+.3+tier*.35,zone.z-17+tier*1.15,24,.35,1.1,true);for(let j=0;j<18;j++)box(decor,mats.gold,zone.x-11.5+j*1.35,y+.48+tier*.35,zone.z-17+tier*1.15,.04,.025,.95);}
   for(let j=0;j<7;j++)box(decor,mats.wood,zone.x-11+j*3.5,y+2.5,zone.z-19,3.2,5,.15);
   chandelier(zone.x,y+7,zone.z,2.3);
  }else if(zone.key==='cabana'){
   features.push('six private transparent pavilions','pleated curtains','canopied rest seats');
   for(let i=0;i<zone.seats;i++){const s=resortSpaSeat(zone,i);curtains(s.x,y,s.z);ring(decor,mats.gold,s.x,y+2.8,s.z,3.1,3.1,.055);for(let j=0;j<4;j++){const a=j*Math.PI/2;line(decor,mats.gold,Array.from({length:11},(_,k)=>{const t=k*Math.PI/20;return[s.x+Math.cos(a)*3.1*Math.cos(t),y+2.8+3.5*Math.sin(t),s.z+Math.sin(a)*3.1*Math.cos(t)];}),.04);}}
  }else if(zone.key==='beauty'){
   features.push('six lit grooming stations','accessory displays','flowering salon island');
   tree(zone.x,y,zone.z,1.1);for(const side of [-1,1]){box(solid,mats.ivory,zone.x+side*20,y+1.4,zone.z-8,3,2.8,1,true);for(let j=0;j<7;j++)ball(decor,j%2?rose:petalDark,zone.x+side*20+(j%3-1)*.6,y+1.2+Math.floor(j/3)*.6,zone.z-7.45,.13,.1,.08);}
  }else if(zone.key==='vip'){
   features.push('golden galaxy ceiling','private turquoise bath','cream lounges','amber chandelier');
   domedCeiling(zone,0x291f29);chandelier(zone.x-7,y+5.6,zone.z-2,2.7);tree(zone.x-13,y,zone.z+8,1);for(let j=0;j<3;j++)lantern(zone.x+15,y,zone.z-9+j*7,.8);
  }else if(zone.key==='meditation'){
   features.push('ocean panorama','sculptural meditation lotus','individual cushions','quiet stone garden');
   lotus(zone.x,y+.45,zone.z,2.0);disk(solid,mats.ivory,zone.x,y+.13,zone.z,2.5,2.5,.26);for(const side of [-1,1])for(let j=0;j<4;j++)ball(decor,j%2?mats.ivory:silver,zone.x+side*18,y+.2,zone.z-7+j*4,.5,.3,.4);
  }else if(zone.key==='nap'){
   features.push('deep lavender star dome','individual sleep niches','soft blankets');domedCeiling(zone,0x171d3a);for(const side of [-1,1])curtains(zone.x+side*12,y,zone.z-10,2.8);
  }else if(zone.key==='cafe'){
   features.push('curved marble bar','dessert service','central exotic fish aquarium','sculpted blossom trees');
   const shape=new T.Shape();shape.absarc(0,-203,12.05,0,Math.PI*2,false);const opening=new T.Path();opening.absarc(0,-203,6.3,0,Math.PI*2,true);shape.holes.push(opening);const floorGeometry=new T.ShapeGeometry(shape,72);floorGeometry.rotateX(-Math.PI/2);geometries.set('cafe-bar-walkway',floorGeometry);mesh(surfaces,floorGeometry,mats.ivory,0,y,0);
   for(let j=0;j<24;j++){const a=-Math.PI*.7+j*Math.PI*1.4/23,x=zone.x+Math.sin(a)*9,z=zone.z+Math.cos(a)*9,o=box(solid,mats.ivory,x,y+1.1,z,2.1,2.2,1.4,true);o.rotation.y=a;const top=box(decor,mats.gold,x,y+2.23,z,2.15,.12,1.5,true);top.rotation.y=a;if(j%3===0)tray(x,y+2.35,z,true);}
   const tankGeo=geometry('aquarium-wall',()=>new T.CylinderGeometry(5.8,5.8,6.2,64,1,true));mesh(shell,tankGeo,mats.glass,0,y+3.1,203);ring(decor,mats.gold,0,y+.2,203,5.8,5.8,.12);ring(decor,mats.gold,0,y+6.2,203,5.8,5.8,.12);
   for(const spec of [{name:'ribbon betta',length:1.2,color:0x31c5e2,fin:0xdc7eda,speed:.2},{name:'gold angelfish',length:.65,color:0xeeb559,fin:0x759fdd,speed:.32},{name:'violet ray',length:.9,color:0x997ae2,fin:0x6ad6d3,speed:.13}])fishModel(spec);
   for(const side of [-1,1])tree(side*30,y,203,1.3);chandelier(-12,y+6.8,203,2);
  }else if(zone.key==='waterfall'){
   features.push('two real multilevel cascades','flowering water garden','panorama lanterns');
   for(const side of [-1,1]){tree(zone.x+side*37,y,zone.z-9,1.2);lotus(zone.x+side*28,y+1.05,zone.z+1,1);for(let j=0;j<4;j++)lantern(zone.x+side*38,y,zone.z-3+j*5,.8);}
  }else if(zone.key==='amber'){
   features.push('curved amber star ceiling','cream conversational suites','warm lanterns');domedCeiling(zone,0x33241e);chandelier(zone.x,y+6.4,zone.z,2.8);for(const side of [-1,1])tree(zone.x+side*18,y,zone.z-9,.9);
  }else if(zone.key==='midnight'){
   features.push('midnight star vault','silver-blue textiles','quiet private niches');domedCeiling(zone,0x0e1831);for(const side of [-1,1])plant(zone.x+side*20,y,zone.z-10,1.3,true);
  }
  yield;
 }
 room=null;floor=2;
 // This exact upper-floor opening existed already. No opaque backing disk is
 // placed beneath the glass: both directions see the lower atrium and water.
 const glass=mats.glass.clone();glass.opacity=.2;glass.roughness=.09;glass.side=T.DoubleSide;glass.depthWrite=false;materials.add(glass);
 const skySpec=resortSkyPool(),sky=createResortBasin(skySpec,{stone:mats.ivory,liner:glass});sky.name='Glass Sky Pool';sky.position.set(skySpec.x,skySpec.y-S.y,skySpec.z);sky.traverse(o=>{if(o.isMesh)o.userData.resortFloor=2;});sky.userData.bed.name='Glass Sky Pool transparent bottom';sky.userData.bed.renderOrder=1;sky.userData.surface.renderOrder=2;sky.userData.surface.material.uniforms.uOpacity.value=.54;surfaces.add(sky);basins.push(sky);waters.push(sky.userData.surface);report.skyPool={...skySpec,glassBottom:true,opaqueBacking:false};
 box(solid,mats.ivory,0,17.97,214.8,5,.06,2.8);
 for(let j=0;j<12;j++){const a=(j+.5)*Math.PI/6;lantern(Math.sin(a)*12.9,18,203+Math.cos(a)*12.9,.6);}ring(decor,mats.gold,0,18.03,203,10.3,10.3,.08);
 floor=0;
 // Public gate remains open across the original real route and lift arrival.
 const entry=Array.from({length:25},(_,i)=>{const a=i*Math.PI/24;return[Math.cos(a)*10,1+Math.sin(a)*11,173];});line(decor,mats.gold,entry,.18);line(decor,mats.amber,entry.map(p=>[p[0]*.98,p[1],p[2]+.03]),.04);
 const upperDome=Array.from({length:25},(_,i)=>{const t=i*Math.PI/48;return[35*Math.cos(t),19+18*Math.sin(t),203];});
 for(let j=0;j<16;j++){const a=j*Math.PI/8;line(decor,mats.gold,upperDome.map(([x,y,z])=>[Math.cos(a)*x,y,z+Math.sin(a)*x]),.09);}
 lotus(0,37,203,4);
 yield;
 return{dynamic,report,flora:{geometry:flowerCluster,material:petal},update(time,reduced=false){for(const t of starTimes)t.value=reduced?0:time;for(const f of fish){const a=f.phase+(reduced?0:time*f.speed);f.root.position.set(Math.cos(a)*3,12+Math.sin(a*.7)*1.1,203+Math.sin(a)*3);f.root.rotation.y=-a-Math.PI/2;f.root.rotation.z=reduced?0:Math.sin(a*2)*.07;}},inspect(level){for(const o of dynamic.children)o.visible=level==null||o.userData.resortFloor<=level;},dispose(){for(const g of geometries.values())g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}
