import * as T from 'three';
import {SPA_PALACE as P,spaPalaceOutline,spaPalaceRoofY} from './resort-spa-layout-v7.js';

// Architectural metalwork follows the actual shared pressure skin. Arches use
// individual physical members, never one bounding box across their opening.
export function* resortPalaceFacadeSteps({solid,shell,decor,mats,box,setLevel}){
 const geos=new Set(),materials=new Set(),textures=new Set(),outline=spaPalaceOutline(),report={roofRibs:0,entryArchSegments:0,continuousBands:3,sharedColumns:0,entry:{x:0,z:290,doorWidth:5,doorHeight:4,archHeight:20}};
 const glow=color=>{const m=new T.MeshBasicMaterial({color,toneMapped:false});materials.add(m);return m;},amber=glow(0xffbd65),violet=glow(0xa34dff),pink=glow(0xff2e9a),unit=new T.CylinderGeometry(1,1,1,10);geos.add(unit);
 function beam(a,b,r=.18){const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start),o=new T.Mesh(unit,mats.gold);o.position.copy(start.add(end).multiplyScalar(.5));o.scale.set(r,d.length(),r);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());o.castShadow=o.receiveShadow=true;o.userData.resortFloor=0;solid.add(o);return o;}
 function tube(parent,points,material,r=.1,level=2){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),g=new T.TubeGeometry(curve,Math.max(32,points.length*2),r,6,false);geos.add(g);const o=new T.Mesh(g,material);o.userData.resortFloor=level;o.castShadow=!material.isMeshBasicMaterial;o.receiveShadow=true;parent.add(o);return o;}
 for(let level=0;level<3;level++){
  setLevel(level);const y=level*P.rise;
  tube(decor,[...outline,outline[0]].map(p=>[p.x,y-.08,p.z]),mats.gold,.25,level);
  tube(decor,[...outline,outline[0]].map(p=>[p.x,y-.38,p.z]),level===2?violet:amber,.065,level);
  for(let i=0;i<outline.length;i++){
   const a=outline[i],b=outline[(i+1)%outline.length],length=Math.hypot(b.x-a.x,b.z-a.z),parts=Math.max(1,Math.ceil(length/9));
   for(let j=0;j<parts;j++){
    if(i%4!==0&&parts===1)continue;const t=j/parts,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    // Keep the real central entry mouth open at the lower level.
    if(level===0&&Math.abs(x)<4&&z>289)continue;
    box(solid,mats.gold,x,y+P.rise/2-.1,z,.25,P.rise-.2,.25);report.sharedColumns++;
   }
  }
  yield;
 }
 // Radial structural meridians show the fused dome silhouette in real glass.
 for(let i=0;i<20;i++){
  const angle=i*Math.PI/10,dx=Math.cos(angle),dz=Math.sin(angle);let lo=0,hi=180;
  // Intersect with the measured rounded envelope, not an unrelated ellipse.
  for(let k=0;k<32;k++){const r=(lo+hi)/2,x=dx*r,z=P.atrium.z+dz*r,qx=Math.abs(x)-P.width/2+P.corner,qz=Math.abs(z-P.z)-P.depth/2+P.corner,d=Math.hypot(Math.max(0,qx),Math.max(0,qz))+Math.min(Math.max(qx,qz),0)-P.corner;if(d<=0)lo=r;else hi=r;}
  const points=Array.from({length:49},(_,j)=>{const r=lo*j/48,x=dx*r,z=P.atrium.z+dz*r;return[x,spaPalaceRoofY(x,z)+.12,z];});
  tube(shell,points,mats.gold,.17);if(i%4===0)tube(decor,points.map(([x,y,z])=>[x,y+.07,z]),amber,.035);report.roofRibs++;yield;
 }
 setLevel(0);
 const arch=Array.from({length:41},(_,i)=>{const t=i*Math.PI/40;return[Math.cos(t)*14,1+Math.sin(t)*19,290.2];});
 for(let i=1;i<arch.length;i++){beam(arch[i-1],arch[i],.32);report.entryArchSegments++;}
 tube(decor,arch.map(([x,y,z])=>[x*.975,y,z+.12]),amber,.09,0);
 for(const side of [-1,1]){box(solid,mats.gold,side*14,6,290.2,.8,12,.8);for(let j=0;j<3;j++)box(decor,mats.amber,side*14,2+j*4,290.7,.18,2.2,.08);}
 // Three-dimensional lotus, not a reference image painted on the building.
 for(let petal=0;petal<5;petal++){
  const spread=(petal-2)*1.45,height=petal===2?7:5.5,points=Array.from({length:25},(_,i)=>{const t=i*Math.PI/12;return[spread*(.5-.5*Math.cos(t))+Math.sin(t)*1.35,29+(1-Math.cos(t))*height/2,290.6];});tube(decor,points,pink,.1,2);
 }
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');c.textAlign='center';c.fillStyle='#ffe5a4';c.font='600 76px sans-serif';c.fillText('CHICHI CAT SPA',512,106,1000);c.font='35px sans-serif';c.fillText('& WELLNESS RESORT',512,176,1000);const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;textures.add(t);const m=new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:T.DoubleSide});materials.add(m);const g=new T.PlaneGeometry(35,8.75);geos.add(g);const sign=new T.Mesh(g,m);sign.position.set(0,24,290.6);sign.userData.resortFloor=2;decor.add(sign);
 }
 return{report,dispose(){for(const g of geos)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}
