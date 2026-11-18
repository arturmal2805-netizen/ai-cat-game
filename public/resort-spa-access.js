import * as T from 'three';
import {RESORT_SPA as S,RESORT_FOOT_OFFSET as F} from './resort-spa-data.js';
import {RESORT_LIFT as L} from './resort-spa-lift.js';
export const RESORT_UPPER_APPROACH=Object.freeze([{x:0,z:309},{x:20,z:309},{x:20,z:300}]);
// Leave the south-facing pressure port before turning east. Turning at the
// port itself puts the outside miter wall across the cabin's exit sweep.
export const RESORT_LOWER_APPROACH=Object.freeze([{x:20,z:293.2},{x:20,z:289},{x:55,z:289},{x:55,z:247},{x:26,z:223}]);
// Exact mitered ribbon: actual floor/roof polygon and corresponding wall runs.
// No disconnected endpoints or overlapping wall strips at a turn.
export function corridorOutline(points,width=5){
 const half=width/2,normal=(a,b)=>{const l=Math.hypot(b.x-a.x,b.z-a.z);return{x:-(b.z-a.z)/l,z:(b.x-a.x)/l};};
 const left=[],right=[];
 for(let i=0;i<points.length;i++){const p=points[i],a=normal(points[Math.max(0,i-1)],points[i===0?1:i]),b=normal(points[i===points.length-1?i-1:i],points[Math.min(points.length-1,i+1)]);let nx=a.x+b.x,nz=a.z+b.z,l=Math.hypot(nx,nz);nx/=l;nz/=l;const scale=half/(nx*b.x+nz*b.z);left.push({x:p.x+nx*scale,z:p.z+nz*scale});right.push({x:p.x-nx*scale,z:p.z-nz*scale});}
 return{outline:[...left,...right.reverse()],openEdges:new Set([points.length-1,points.length*2-1])};
}
export function createResortSpaAccess(mats){
 const solid=new T.Group(),surfaces=new T.Group(),shell=new T.Group(),cabin=new T.Group(),gates=new T.Group(),geometries=new Set(),materials=new Set(),doorBoxes=[],cabinBoxes=[];
 const native=k=>{const source=mats[k],m=new T.MeshStandardMaterial({color:source.color,roughness:source.roughness,metalness:source.metalness,map:source.map||null,normalMap:source.normalMap||null,roughnessMap:source.roughnessMap||null,transparent:source.transparent,opacity:source.opacity,depthWrite:source.depthWrite,side:source.side});materials.add(m);return m;},cabinFloor=native('ivory'),cabinGlass=native('glass'),cabinGold=native('gold');
 function box(parent,material,x,y,z,w,h,d){const g=new T.BoxGeometry(w,h,d);geometries.add(g);const m=new T.Mesh(g,material);m.position.set(x,y,z);m.castShadow=!material.transparent;m.receiveShadow=true;parent.add(m);return m;}
 function floor(parent,material,outline,y){const shape=new T.Shape();shape.moveTo(outline[0].x,-outline[0].z);for(const p of outline.slice(1))shape.lineTo(p.x,-p.z);shape.closePath();const g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);geometries.add(g);const m=new T.Mesh(g,material);m.position.y=y;m.receiveShadow=true;parent.add(m);return m;}
 function corridor(points,y,roof=true){const{outline,openEdges}=corridorOutline(points);floor(surfaces,mats.ivory,outline,y);if(roof)floor(shell,mats.glass,outline,y+4.6);for(let i=0;i<outline.length;i++){if(openEdges.has(i))continue;const a=outline[i],b=outline[(i+1)%outline.length],wall=box(solid,mats.glass,(a.x+b.x)/2,y+2.3,(a.z+b.z)/2,.09,4.6,Math.hypot(b.x-a.x,b.z-a.z));wall.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);}}
 const upper=L.upperY-S.y-F;corridor(RESORT_UPPER_APPROACH,upper,false);corridor(RESORT_LOWER_APPROACH,0);
 box(solid,mats.ivory,L.x,upper-.15,L.z,16,.3,20);box(solid,mats.ivory,L.x,-.15,296,16,.3,9);
 // Glass shaft has only the two actual landing openings, not an empty
 // vertical slit. Its individual chord panels preserve each pressure port.
 const n=64,top=upper+4.6;
 for(let i=0;i<n;i++){const a=(i+.5)*Math.PI*2/n,px=Math.sin(a)*L.radius,pz=Math.cos(a)*L.radius,chord=2*L.radius*Math.sin(Math.PI/n)+.01,near=Math.abs(px)<2.3,positive=pz>0;
  const spans=near?(positive?[[0,upper],[upper+4.6,top]]:[[4.6,top]]):[[0,top]];
  for(const[lo,hi]of spans)if(hi-lo>.001){const wall=box(solid,mats.glass,L.x+px,(lo+hi)/2,L.z+pz,chord,hi-lo,.08);wall.rotation.y=a;}
 }
 const cg=new T.CylinderGeometry(5.7,5.7,.18,48);geometries.add(cg);const deck=new T.Mesh(cg,cabinFloor);deck.position.y=-.09;cabin.add(deck);
 for(let i=0;i<48;i++){const a=(i+.5)*Math.PI*2/48,px=Math.sin(a)*5.7,pz=Math.cos(a)*5.7;if(Math.abs(px)<2.3)continue;const wall=box(cabin,cabinGlass,px,2.3,pz,2*5.7*Math.sin(Math.PI/48)+.01,4.6,.06);wall.rotation.y=a;cabinBoxes.push({x:L.x+px,z:L.z+pz,c:Math.cos(a),s:Math.sin(a),hx:(2*5.7*Math.sin(Math.PI/48)+.01)/2,hz:.03});}
 const roof=new T.Mesh(cg,cabinGold);roof.position.y=4.6;cabin.add(roof);
 const doors=[];
 for(const [floorId,sign,y]of[[0,1,upper],[1,-1,0]])for(const side of[-1,1]){const mesh=box(gates,cabinGlass,L.x+side,y+2.3,L.z+sign*L.radius,2,4.6,.1);doors.push({mesh,side,floor:floorId,sign,y,cabin:false});}
 for(const sign of[-1,1])for(const side of[-1,1]){const mesh=box(cabin,cabinGlass,side,2.3,sign*5.7,2,4.6,.1);doors.push({mesh,side,sign,cabin:true});}
 let cabinY=0;function update(state){cabinY=state.y-S.y-F;cabin.position.set(L.x,state.y-S.y-F,L.z);for(const d of doors){const open=d.cabin?state.door:state.floor===d.floor?state.door:0,x=d.side*(1+open*2.2);d.mesh.position.x=(d.cabin?0:L.x)+x;const b=d.bodyBox||(d.bodyBox={h:4.6,hx:1,hz:.05});b.x=L.x+x;b.z=L.z+d.sign*(d.cabin?5.7:L.radius);b.y=d.cabin?cabinY:d.y;if(!doorBoxes.includes(b))doorBoxes.push(b);}cabin.updateWorldMatrix(true,true);gates.updateWorldMatrix(true,true);}
 function clear(p,r){if(Math.abs(p.x-L.x)>L.radius+r+1||Math.abs(p.z-L.z)>L.radius+r+1)return true;for(const b of doorBoxes)if(p.y<b.y+b.h&&p.y+2.15>b.y&&Math.hypot(Math.max(0,Math.abs(p.x-b.x)-b.hx),Math.max(0,Math.abs(p.z-b.z)-b.hz))<r)return false;if(p.y<cabinY+4.6&&p.y+2.15>cabinY)for(const b of cabinBoxes){const dx=p.x-b.x,dz=p.z-b.z;if(Math.hypot(Math.max(0,Math.abs(dx*b.c-dz*b.s)-b.hx),Math.max(0,Math.abs(dx*b.s+dz*b.c)-b.hz))<r)return false;}return true;}
 update({y:L.upperY,floor:0,door:1});
 return{solid,surfaces,shell,cabin,gates,deck,update,clear,dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}
