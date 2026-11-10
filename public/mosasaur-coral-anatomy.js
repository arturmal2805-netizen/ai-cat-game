import * as T from 'three';
import {shape,line} from './fantasy-scenery.js';
function plate(radius,height,seed){
 const p=[],uv=[],indices=[],colors=[],inner=new T.Color(0xe968ac),edge=new T.Color(0xffc69e);
 for(let j=0;j<=8;j++)for(let i=0;i<=56;i++){
  const t=j/8,a=i/56*Math.PI*2,r=radius*t*(1+.13*Math.sin(a*7+seed)+.07*Math.cos(a*13-seed)),y=height+t*t*.11+Math.sin(a*11+seed)*Math.pow(t,3)*.065;
  p.push(Math.cos(a)*r,y,Math.sin(a)*r*.86);uv.push(a*radius,t);const c=inner.clone().lerp(edge,Math.pow(t,5));c.multiplyScalar(.9+.10*Math.cos(a*38+t*45));colors.push(c.r,c.g,c.b);
  if(j<8&&i<56){const k=j*57+i;indices.push(k,k+1,k+57,k+1,k+58,k+57);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function detailedCoral(source,form){
 if(![0,5,6].includes(form))return false;
 const pigment=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.61,side:T.DoubleSide});
 if(form===5||form===6){
  const count=form===5?5:3;for(let j=0;j<count;j++){
   const a=j*2.399,cap=new T.Mesh(plate((form===5?.50:.30)-j*.045,.20+j*.16,j),pigment);cap.position.set(Math.sin(a)*.14,0,Math.cos(a)*.16);cap.rotation.z=Math.sin(a)*.09;source.add(cap);line(source,[cap.position.x,0,cap.position.z],[cap.position.x,.21+j*.16,cap.position.z],0xcf6ab5,.045);
  }return true;
 }
 if(form===0){
  pigment.dispose();for(let j=0;j<7;j++){const a=j*2.399,x=Math.cos(a)*.3,z=Math.sin(a)*.25,h=.35+j%3*.13;line(source,[0,0,0],[x,h,z],0xe7669f,.044);
   for(let k=0;k<4;k++){const b=a+k*1.5,tx=x+Math.cos(b)*.19,tz=z+Math.sin(b)*.17,ty=h+.20+k*.035;line(source,[x,h,z],[tx,ty,tz],0xf88ab0,.025);
    for(let tip=0;tip<2;tip++){const dx=(tip?1:-1)*.07;line(source,[tx,ty,tz],[tx+dx,ty+.12,tz+.025],0xffb2bb,.013);shape(source,'sphere',0xffe2bd,tx+dx,ty+.12,tz+.025,.018,.025,.018);}
   }
  }return true;
 }
}
