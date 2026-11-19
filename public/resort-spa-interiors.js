import * as T from 'three';
import {RESORT_ZONES,RESORT_SPA as S,resortSpaSeat} from './resort-spa-data.js';
import {createResortBasin} from './resort-spa-basin.js';
import {waterMaterial} from './water-shading.js';
// Owned, immutable room furnishings. Everything is authored away from station
// approaches and is captured by the same static batch and actual collision pass.
export function createResortInteriors({solid,decor,shell,surfaces,basins,waters,mats,flora=null}){
 const geometries=new Map(),materials=new Set(),extraWater=[],textures=new Set();let level=0;
 const own=(color,roughness=.8)=>{const m=new T.MeshStandardMaterial({color,roughness});materials.add(m);return m;},green=own(0x528875),leafLight=own(0x89ae80),rose=own(0xdf81b3),bloom=own(0xf6b9d5),cream=own(0xfff4e7);
 const geo=(key,make)=>{if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);};
 function mesh(parent,g,m,x,y,z,sx=1,sy=1,sz=1){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.userData.resortFloor=level;o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
 const box=(parent,m,x,y,z,w,h,d)=>mesh(parent,geo('box',()=>new T.BoxGeometry(1,1,1)),m,x,y,z,w,h,d);
 const ball=(parent,m,x,y,z,w,h=w,d=w)=>mesh(parent,geo('ball',()=>new T.SphereGeometry(1,12,8)),m,x,y,z,w,h,d);
 const cylinder=(parent,m,x,y,z,rx,h,rz=rx)=>mesh(parent,geo('cylinder',()=>new T.CylinderGeometry(1,1,1,16)),m,x,y,z,rx,h,rz);
 function stem(a,b,r=.06){const direction=new T.Vector3().subVectors(b,a),m=cylinder(decor,mats.wood,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,r,direction.length());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());}
 const leafGeometry=geo('curved-leaf',()=>{const p=[],uv=[],indices=[];for(let i=0;i<=10;i++)for(let j=0;j<3;j++){const u=i/10,s=j-1;p.push(s*Math.sin(Math.PI*u)*.24,.58*u*u+.03*(1-s*s),u*1.6);uv.push(j/2,u);}for(let i=0;i<10;i++)for(let j=0;j<2;j++){const a=i*3+j;indices.push(a,a+3,a+1,a+1,a+3,a+4);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;});
 function plant(x,y,z,size=1,flowers=false){cylinder(solid,mats.ivory,x,y+.35,z,.68*size,.7);cylinder(decor,mats.gold,x,y+.69,z,.69*size,.08);for(let i=0;i<8;i++){const a=i*2.399,leaf=mesh(decor,leafGeometry,i%2?green:leafLight,x,y+.72,z,size,size,size);leaf.rotation.y=a;leaf.rotation.x=-.35+(i%3)*.13;}if(flowers)for(let i=0;i<7;i++){const a=i*2.399,x1=x+Math.sin(a)*.45*size,z1=z+Math.cos(a)*.45*size,h=1.1+i%3*.25;stem(new T.Vector3(x,y+.72,z),new T.Vector3(x1,y+h,z1),.025);for(let j=0;j<5;j++){const b=j*Math.PI*2/5;ball(decor,i%2?rose:bloom,x1+Math.cos(b)*.13,y+h,z1+Math.sin(b)*.13,.12,.055,.12);}ball(decor,mats.gold,x1,y+h+.025,z1,.055);}}
 function sakura(x,y,z){cylinder(solid,mats.ivory,x,y+.4,z,1.2,.8);cylinder(solid,mats.wood,x,y+2.1,z,.2,3.4);for(let i=0;i<7;i++){const a=i*2.399,b=new T.Vector3(x+Math.sin(a)*(1.3+i%3*.3),y+3.5+i%3*.6,z+Math.cos(a)*(1.3+i%3*.3));stem(new T.Vector3(x,y+2,z),b,.1);if(flora)mesh(decor,flora.geometry,flora.material,b.x,b.y,b.z,1.2,1,1.2);else for(let j=0;j<7;j++){const c=j*2.399;ball(decor,j%2?rose:bloom,b.x+Math.sin(c)*.65,b.y+(j%3)*.24,b.z+Math.cos(c)*.65,.55,.4,.55);}}}
 function lamp(x,y,z){cylinder(solid,mats.gold,x,y+1,z,.07,2);cylinder(solid,mats.gold,x,y+.07,z,.45,.14);ball(decor,mats.amber,x,y+2.1,z,.26,.4,.26);}
 function ring(x,y,z,rx,rz){for(let i=0;i<64;i++){const a=i*Math.PI/32,b=(i+1)*Math.PI/32,ax=x+Math.cos(a)*rx,az=z+Math.sin(a)*rz,bx=x+Math.cos(b)*rx,bz=z+Math.sin(b)*rz,m=box(solid,mats.ivory,(ax+bx)/2,y-.2,(az+bz)/2,.3,.4,Math.hypot(bx-ax,bz-az)+.02);m.rotation.y=Math.atan2(bx-ax,bz-az);}}
 function basin(x,y,z,rx,rz,depth){const b=createResortBasin({rx,rz,depth,probeLayer:RESORT_ZONES.findIndex(z=>z.key==='waterfall')},{stone:mats.ivory});b.position.set(x,y,z);b.traverse(o=>{if(o.isMesh)o.userData.resortFloor=level;});surfaces.add(b);basins.push(b);waters.push(b.userData.surface);ring(x,y,z,rx+.4,rz+.4);return b;}
 for(const zone of RESORT_ZONES){level=zone.level;const y=level*S.rise;
  if(zone.key==='aroma'){for(const side of [-1,1]){sakura(zone.x+side*15,y,zone.z-9);for(let i=0;i<4;i++)plant(zone.x+side*17,y,zone.z-3+i*4,1,true);}}
  else if(zone.key==='waterfall'){
   for(const side of [-1,1]){const x=zone.x+side*28,z=zone.z;basin(x,y+.8,z,8,6,.65);cylinder(solid,mats.ivory,x,y+.07,z,8,.14,6);basin(x,y+3.8,z-2,4.5,4,.45);box(solid,mats.ivory,x,y+1.65,z-2,7,3.3,5);
    const material=waterMaterial(0x22bfd1,.72,{waterfall:true,width:5,height:3}),g=geo('garden-waterfall',()=>new T.PlaneGeometry(5,3,8,24)),fall=mesh(decor,g,material,x,y+2.3,z+2);extraWater.push(material);waters.push(fall);plant(x+side*9,y,zone.z-6,1.5,true);lamp(x-side*10,y,zone.z+8);
   }sakura(zone.x-18,y,zone.z+14);sakura(zone.x+18,y,zone.z+14);
  }else if(zone.key==='cabana'){
   for(let i=0;i<zone.seats;i++){const s=resortSpaSeat(zone,i),g=geo('private-cabana-dome',()=>new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2));mesh(shell,g,mats.glass,s.x,y+2.8,s.z,3.1,3.5,3.1);for(let j=0;j<32;j++){const a=(j+.5)*Math.PI/16,x=Math.sin(a)*3.1,z=Math.cos(a)*3.1;if(z>0&&Math.abs(x)<1.5)continue;const wall=box(solid,mats.glass,s.x+x,y+1.4,s.z+z,2*3.1*Math.sin(Math.PI/32)+.01,2.8,.06);wall.rotation.y=a;}lamp(s.x-2.1,y,s.z-1.6);}
  }else if(zone.key==='sauna'){
   const x=zone.x+16,z=zone.z+10;box(solid,mats.wood,x,y+.65,z,3,1.3,2.5);for(let j=0;j<12;j++)ball(decor,j%2?mats.ivory:mats.gold,x+(j%4-1.5)*.6,y+1.35+(j%3)*.12,z+(Math.floor(j/4)-1)*.6,.36,.23,.32);plant(zone.x-16,y,zone.z+13,1.2);lamp(zone.x-18,y,zone.z-11);
  }else if(zone.key==='beauty'){
   for(let i=0;i<zone.seats;i++){const s=resortSpaSeat(zone,i);box(decor,mats.wood,s.x+2.3,y+1.25,s.z-1.9,1.4,.18,.65);for(let j=0;j<4;j++){cylinder(decor,j%2?mats.pink:mats.gold,s.x+1.8+j*.3,y+1.5,s.z-1.9,.08,.32);ball(decor,cream,s.x+1.8+j*.3,y+1.7,s.z-1.9,.07);}}
   plant(zone.x-19,y,zone.z-9,1.3,true);plant(zone.x+19,y,zone.z-9,1.3,true);
  }else if(zone.key==='cafe'){
   box(solid,mats.gold,14,y+.65,193,4,1.3,1.3);box(decor,mats.ivory,14,y+1.35,193,4.2,.12,1.5);box(decor,mats.wood,14,y+1.65,192.7,.7,.5,.5);for(const side of [-1,1])plant(side*28,y,203,1.25,true);
  }else if(zone.key==='massage'){
   for(const side of [-1,1]){plant(zone.x+side*18,y,zone.z-14,1.2,true);lamp(zone.x+side*17,y,zone.z+16);}
  }else{
   for(const side of [-1,1]){plant(zone.x+side*(zone.rx-5),y,zone.z-4,1.1,zone.key==='meditation');lamp(zone.x+side*(zone.rx-6),y,zone.z+8);}
  }
  if(['sleep','lounge','cabana'].includes(zone.procedure))for(let i=0;i<zone.seats;i++){const s=resortSpaSeat(zone,i);ball(decor,cream,s.x+1.0,y+1.05,s.z-.32,.4,.13,.38);box(decor,rose,s.x-1.1,y+.97,s.z-.25,.5,.1,.65);}
 }
 level=0;for(const side of [-1,1]){sakura(side*12,0,181);lamp(side*9,0,180);}
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffe5a4';ctx.textAlign='center';ctx.font='600 100px sans-serif';ctx.fillText('CHICHI CAT SPA',512,119,1000);ctx.fillStyle='#ffecc9';ctx.font='38px sans-serif';ctx.fillText('& WELLNESS RESORT',512,195);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=true;textures.add(texture);const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide});materials.add(material);mesh(decor,geo('resort-brand',()=>new T.PlaneGeometry(23,5.75)),material,0,8,238.2);
 }
 return{dispose(){for(const g of geometries.values())g.dispose();for(const m of materials)m.dispose();for(const m of extraWater)m.dispose();for(const t of textures)t.dispose();}};
}
