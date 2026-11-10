import * as T from 'three';
import {shape} from './fantasy-scenery.js';
// Curved, tapering organic branches, including actual closed ends. The old
// straight shared eight-sided poles read as plastic straws in a close camera.
function line(parent,a,b,color,r=.07){
 const from=new T.Vector3(...a),to=new T.Vector3(...b),axis=to.clone().sub(from),length=axis.length(),bend=new T.Vector3(axis.z*.035,length*.015,-axis.x*.025),curve=new T.CatmullRomCurve3([from,from.clone().lerp(to,.34).add(bend),from.clone().lerp(to,.72).sub(bend),to]),frames=curve.computeFrenetFrames(12,false),p=[],uv=[],idx=[],rows=12,sides=12;
 for(let j=0;j<=rows;j++){const t=j/rows,c=curve.getPoint(t),tip=Math.min(1,Math.sin(t*Math.PI)*7+.05),radius=r*(1-t*.42)*tip;
  for(let k=0;k<=sides;k++){const angle=k/sides*Math.PI*2,grain=1+.055*Math.sin(angle*5+t*21),v=c.clone().addScaledVector(frames.normals[j],Math.cos(angle)*radius*grain).addScaledVector(frames.binormals[j],Math.sin(angle)*radius*grain);p.push(...v.toArray());uv.push(k/sides,t);if(j<rows&&k<sides){const n=j*(sides+1)+k;idx.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:.74}));parent.add(m);return m;
}
function blade(source,points,width,color,seed){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),p=[],uv=[],idx=[],rows=18,cols=6;
 for(let j=0;j<=rows;j++){const t=j/rows,c=curve.getPoint(t),tangent=curve.getTangent(t),across=new T.Vector3(tangent.y,-tangent.x,.12).normalize(),w=width*Math.pow(Math.sin(Math.PI*t),.7);
  for(let k=0;k<=cols;k++){const a=k/cols*2-1,v=c.clone().addScaledVector(across,a*w);v.z+=Math.sin(t*13+seed)*w*a*a*.32;v.y+=w*(1-a*a)*.14;p.push(...v.toArray());uv.push(k/cols,t);if(j<rows&&k<cols){const n=j*(cols+1)+k;idx.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();source.add(new T.Mesh(g,new T.MeshStandardMaterial({color,side:T.DoubleSide,roughness:.65})));
}
function plate(radius,height,seed,golden=false){
 const p=[],uv=[],indices=[],colors=[],inner=new T.Color(golden?0xde8a2b:0xac66ce),edge=new T.Color(golden?0xffdc79:0xffb4e6);
 for(let j=0;j<=16;j++)for(let i=0;i<=96;i++){
  const t=j/16,a=i/96*Math.PI*2,r=radius*t*(1+.13*Math.sin(a*7+seed)+.07*Math.cos(a*13-seed)),y=height+t*t*.11+Math.sin(a*11+seed)*Math.pow(t,3)*.065;
  p.push(Math.cos(a)*r,y,Math.sin(a)*r*.86);uv.push(a*radius,t);const c=inner.clone().lerp(edge,Math.pow(t,5));c.multiplyScalar(.9+.10*Math.cos(a*38+t*45));colors.push(c.r,c.g,c.b);
  if(j<16&&i<96){const k=j*97+i;indices.push(k,k+1,k+97,k+1,k+98,k+97);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function detailedCoral(source,form){
 if(![0,1,2,3,4,5,6,7,8,9,10].includes(form))return false;
 const pigment=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.61,side:T.DoubleSide});
 if(form===9||form===10){
  pigment.dispose();const count=form===9?4:16;
  for(let j=0;j<count;j++){const a=j*2.399,x=Math.sin(a)*.15,z=Math.cos(a)*.13,h=form===9?.95+j*.13:.35+(j%5)*.07;
   if(form===9){const stem=new T.CatmullRomCurve3([[x,0,z],[x+.04,h*.5,z],[x+.12,h,z+.04]].map(p=>new T.Vector3(...p)));source.add(new T.Mesh(new T.TubeGeometry(stem,18,.012,7,false),new T.MeshStandardMaterial({color:0x578846})));for(let k=0;k<8;k++){const t=.12+k*.10,side=k%2?1:-1,y=h*t;blade(source,[[x+.1*t,y,z],[x+side*.10,y+.06,z+.03],[x+side*.25,y+.09,z+.08],[x+side*.38,y+.19,z+.13]],.075,k%3?0x4e9e60:0x9abe53,j+k);}}
   else blade(source,[[x,0,z],[x+.02,h*.38,z],[x+Math.sin(a)*.12,h*.8,z+.06],[x+Math.sin(a)*.24,h,z+.12]],.021,j%3?0x57b69c:0x93c466,j);
  }return true;
 }
 if(form===7||form===8){
  pigment.dispose();const count=form===7?7:9;
  for(let j=0;j<count;j++){const a=j*2.399,x=Math.cos(a)*.24,z=Math.sin(a)*.22,h=.38+j%4*.09;
   const curve=new T.CatmullRomCurve3([[0,.02,0],[x*.5,h*.4,z*.5],[x,h,z]].map(p=>new T.Vector3(...p)));source.add(new T.Mesh(new T.TubeGeometry(curve,14,.016,7,false),new T.MeshStandardMaterial({color:form===7?0xc652a1:0x47b8be})));
   for(let k=1;k<9;k++){const t=k/9,b=curve.getPoint(t);for(const side of [-1,1]){const tip=b.clone().add(new T.Vector3(Math.cos(a)*side*.09,.06,Math.sin(a)*side*.09));line(source,b.toArray(),tip.toArray(),form===7?0xf186c1:0x69dfd0,.009);if(form===8)shape(source,'sphere',0xfac475,...tip.toArray(),.016,.022,.016);}}
  }return true;
 }
 if(form===5||form===6){
  const count=form===5?5:3;for(let j=0;j<count;j++){
   const a=j*2.399,cap=new T.Mesh(plate((form===5?.50:.30)-j*.045,.20+j*.16,j,form===5),pigment);cap.position.set(Math.sin(a)*.14,0,Math.cos(a)*.16);cap.rotation.z=Math.sin(a)*.09;source.add(cap);line(source,[cap.position.x,0,cap.position.z],[cap.position.x,.21+j*.16,cap.position.z],form===5?0xc38342:0xcf6ab5,.045);
  }return true;
 }
 if(form===0){
  pigment.dispose();for(let j=0;j<7;j++){const a=j*2.399,x=Math.cos(a)*.3,z=Math.sin(a)*.25,h=.35+j%3*.13;line(source,[0,0,0],[x,h,z],0xe7669f,.044);
   for(let k=0;k<4;k++){const b=a+k*1.5,tx=x+Math.cos(b)*.19,tz=z+Math.sin(b)*.17,ty=h+.20+k*.035;line(source,[x,h,z],[tx,ty,tz],0xf88ab0,.025);
    for(let tip=0;tip<2;tip++){const dx=(tip?1:-1)*.07;line(source,[tx,ty,tz],[tx+dx,ty+.12,tz+.025],0xffb2bb,.013);shape(source,'sphere',0xffe2bd,tx+dx,ty+.12,tz+.025,.018,.025,.018);}
   }
  }return true;
 }
 if(form===1){
  pigment.dispose();for(let j=0;j<13;j++){
   const a=(j/12-.5)*Math.PI*.95,x=Math.sin(a)*.57,y=.15+Math.cos(a)*.65,curve=new T.CatmullRomCurve3([[0,.04,0],[x*.4,y*.55,.015],[x*.8,y*.82,.03],[x,y,.04]].map(p=>new T.Vector3(...p)));source.add(new T.Mesh(new T.TubeGeometry(curve,15,.014,6,false),new T.MeshStandardMaterial({color:0xa56e88})));
   for(let k=1;k<5;k++){const t=k/5;for(const side of [-1,1])line(source,[x*t,y*t,.02],[x*t+side*.085,y*t+.11,.02+side*.015],0xc9a2ae,.007);}
  }return true;
 }
 if(form===2){
  const g=new T.SphereGeometry(1,96,64),p=g.attributes.position,colors=new Float32Array(p.count*3),bright=new T.Color(0xe9b348),dark=new T.Color(0x926233);for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),groove=Math.pow(Math.abs(Math.sin(x*18+Math.sin(y*14)*1.1+Math.sin(z*17)*.9)),.35),r=.95+.06*groove+.05*Math.sin(x*8+z*5)*Math.cos(y*6);p.setXYZ(i,x*.35*r,.20+y*.21*r,z*.32*r);const c=dark.clone().lerp(bright,groove);colors.set(c.toArray(),i*3);
  }g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeVertexNormals();source.add(new T.Mesh(g,pigment));return true;
 }
 if(form===3){
  for(let tube=0;tube<7;tube++){
   const a=tube*2.399,x=Math.sin(a)*.27,z=Math.cos(a)*.25,h=.42+tube%3*.17,r=.085+tube%2*.022,p=[],uv=[],colors=[],idx=[],n=40,rows=24;
   for(let layer=0;layer<2;layer++)for(let j=0;j<=rows;j++)for(let k=0;k<=n;k++){
    const b=k/n*Math.PI*2,t=j/rows,radius=(layer?r*.73:r)*(.72+t*.28)*(1+.055*Math.sin(t*11+b*3)+.025*Math.sin(t*43+b*19)),y=.05+t*h+.016*Math.sin(b*5+Math.sin(b*3))*t; p.push(x+Math.cos(b)*radius+Math.cos(a)*t*t*.055,y,z+Math.sin(b)*radius+Math.sin(a)*t*t*.055);uv.push(k/n,t);const c=new T.Color(layer?0x665246:[0xc69c61,0x9d7968,0x85788e][tube%3]).multiplyScalar(.80+.16*t+.04*Math.sin(b*11+t*26));colors.push(c.r,c.g,c.b);if(j<rows&&k<n){const q=layer*(rows+1)*(n+1)+j*(n+1)+k;if(layer)idx.push(q,q+1,q+n+1,q+1,q+n+2,q+n+1);else idx.push(q,q+n+1,q+1,q+1,q+n+1,q+n+2);}
   }
   for(let k=0;k<n;k++){const o=rows*(n+1)+k,i=o+(rows+1)*(n+1);idx.push(o,o+1,i,o+1,i+1,i);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();source.add(new T.Mesh(g,pigment));
  }return true;
 }
 if(form===4){
  pigment.dispose();shape(source,'sphere',0xc78bd5,0,.12,0,.29,.12,.28);for(let j=0;j<28;j++){const a=j*2.399,r=.10+(j%5)*.033,x=Math.cos(a)*r,z=Math.sin(a)*r,curve=new T.CatmullRomCurve3([[x,.12,z],[x*1.4,.28,z*1.4],[x*1.1,.44+j%4*.025,z*1.1],[x*.8,.48+j%4*.025,z*.8]].map(p=>new T.Vector3(...p)));source.add(new T.Mesh(new T.TubeGeometry(curve,12,.014,5,false),new T.MeshStandardMaterial({color:j%3?0xe785d6:0xffb5db})));shape(source,'sphere',0xffd1ec,x*.8,.48+j%4*.025,z*.8,.021,.025,.021);}return true;
 }
}
