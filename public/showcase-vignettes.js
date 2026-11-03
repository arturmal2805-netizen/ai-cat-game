import * as T from 'three';
import {shape,line,torus,teaPavilion} from './fantasy-scenery.js';
import {flowerBank} from './showcase-water-landscape.js';

const coralPaint=new Map();
function paint(color){if(!coralPaint.has(color))coralPaint.set(color,new T.MeshStandardMaterial({color,roughness:.4}));return coralPaint.get(color);}
function branch(parent,points,radius,color){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),g=new T.TubeGeometry(curve,14,radius,6,false),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const row=Math.floor(i/7),c=curve.getPointAt(row/14),v=new T.Vector3().fromBufferAttribute(p,i).sub(c).multiplyScalar(1-row/14*.83).add(c);p.setXYZ(i,v.x,v.y,v.z);}
 g.computeVertexNormals();const m=new T.Mesh(g,paint(color));m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
function reef(parent,x,y,z,scale=1){
 for(let j=0;j<5;j++){
  const a=j*1.37,dx=Math.sin(a)*2.3*scale,dz=Math.cos(a)*1.6*scale,h=(2.8+j%3)*scale,color=[0xec96c6,0xb79ae0,0xffbd8c][j%3];
  branch(parent,[[x,y,z],[x+dx*.4,y+h*.55,z+dz*.4],[x+dx,y+h,z+dz]],.31*scale,color);
  for(const side of [-1,1])branch(parent,[[x+dx*.4,y+h*.55,z+dz*.4],[x+dx*.7+side*scale,y+h*.8,z+dz*.7],[x+dx+side*scale,y+h*.98,z+dz]],.18*scale,color);
 }
}

export function* showcaseVignettes(props,spec,route,{canPlace,groundObstacles}){
 const occupied=[];
 for(const lane of route.lanes)for(let t=0;t<route.duration;t+=.6){occupied.push(lane.frame(t).position);if(occupied.length%96===0)yield;}
 const safe=(x,y,z,rx,ry,rz)=>canPlace(x,y,z,rx,ry,rz)&&!occupied.some(p=>Math.abs(p[0]-x)<rx+3.2&&Math.abs(p[1]-y)<ry+2.8&&Math.abs(p[2]-z)<rz+3.2),
  coral=(x,y,z,s)=>{if(safe(x,y+3*s,z,4*s,3*s,4*s))reef(props,x,y,z,s);},
  flower=(x,y,z,s=1)=>{if(safe(x,y+1,z,3*s,2,3*s))flowerBank(props,x,y,z,spec.accent,s);};
 switch(spec.kind){
 case 'barrel-wave':
  coral(-28,.3,17,1.3);coral(28,.3,17,1.2);for(const x of [-39,39])flower(x,.4,30,1.1);
  break;
 case 'jungle-coaster':{
  const x=28,z=-42,base=33;
  if(safe(x,base+13,z,6,5,5)){
   shape(props,'cube',0xd9b276,x,base+12,z,12,.6,10);for(const dx of [-5,5])line(props,[x+dx,base+12,z-4],[x+dx,base+17,z-4],0xc2975c,.25);
   teaPavilion(props,x,base+12.5,z,0xd9b369,2.7);
   for(let j=0;j<5;j++)branch(props,[[x+Math.sin(j)*4,base+23,z+Math.cos(j)*4],[x+Math.sin(j)*7,base+17,z+Math.cos(j)*6],[x+Math.sin(j)*6,base+11,z+Math.cos(j)*5]],.15,0x4c8b53);
  }break;
 }
 case 'crystal-vortex':
  for(const x of [-23,23])flower(x,1,-46,1.5);break;
 case 'canyon-rafting':
  for(const [x,z]of [[-40,20],[41,10],[-38,-15]])flower(x,1,z,1.3);break;
 case 'glass-drop':{
  const arch=torus(props,0xffedce,13.5,1.2,9,70,-15,false,Math.PI);arch.receiveShadow=true;
  for(const x of [-4,23])for(const y of [10,31,52,73]){shape(props,'pole',0xf4ce83,x,y,-13,3.5,.35,3.5);for(const dx of [-1.2,0,1.2])line(props,[x+dx,y-8,-9.9],[x+dx,y+7,-9.9],0xfff0d4,.11);}
  break;
 }
 case 'lagoon-launch':
  coral(-27,.3,15,1.1);coral(29,.3,16,1.2);
  for(const side of [-1,1]){const x=-8+side*(spec.radius+4);branch(props,[[x,2,-28],[x,6,-28],[x,7,-25]],.65,0x87b5ba);shape(props,'pole',0xe3bc6a,x,2,-27,2.8,.8,2.8);groundObstacles.push({x,z:-27,radius:3.5});}
  break;
 case 'surf-halfpipe':
  coral(-29,.2,29,1.4);coral(29,.2,29,1.5);
  for(const side of [-1,1]){line(props,[side*39,3,-5],[side*28,12,-5],0xd2ad78,.5);for(const j of [9,18,27])shape(props,'cube',0xf0c779,side*39,j,-5,2,.7,2);}
  break;
 case 'lazy-river':
  for(let j=0;j<8;j++){const a=j*Math.PI/4,x=Math.sin(a),z=Math.cos(a);branch(props,[[x,5,z-4],[x*5,1.4,z*5-4],[x*14,.15,z*14-4]],1.2,0xa3774f);}
  groundObstacles.push({x:0,z:-4,radius:15});
  if(safe(0,14,-4,6,4,6)){shape(props,'cube',0xd3ac78,0,12,-4,12,.6,10);teaPavilion(props,0,12.5,-4,0xe1bd73,2.5);}break;
 case 'fountain-carousel':
  for(const x of [-36,36])for(const z of [-12,14]){
   if(!safe(x,1,z,4,2,3))continue;
   shape(props,'cube',0xffe7cb,x,.8,z,6,.5,2.6);for(const dx of [-2,2])shape(props,'cube',0xe2c79e,x+dx,.3,z,.6,.8,2.1);flower(x,1,z+3,.9);groundObstacles.push({x,z,radius:3.5});
  }break;
 case 'pool-pendulum':
  for(const x of [-17,17])for(const z of [-28,28]){shape(props,'cube',0xf2dfbd,x,.8,z,5.5,1.6,5.5);shape(props,'cube',0xd8b474,x,1.7,z,4.8,.25,4.8);groundObstacles.push({x,z,radius:3.5});}
  for(const x of [-30,30]){flower(x,.4,15,1.4);flower(x,.4,-19,1.4);if(safe(x,4,0,3,4,3)){shape(props,'pole',0xf5e3c2,x,3,0,.6,6,.6);const ring=torus(props,0xefc572,2,.25,x,7,0);shape(props,'sphere',0xe9b8dc,x,7,.15,1.25,.6,.2);}}
  break;
 }
 yield;
}
