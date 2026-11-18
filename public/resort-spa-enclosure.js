import {RESORT_BRIDGES,RESORT_LOWER_APPROACH,corridorOutline,clipPressureWall} from './resort-spa-corridors.js';
import * as T from 'three';
import {RESORT_SPA as S,RESORT_ZONES} from './resort-spa-data.js';
// Actual segmented pressure walls preserve the same radial door mouths as
// the rendered connecting bridges. Overlapping rooms share their interior.
export function createResortEnclosure(materials){
 const solid=new T.Group(),shell=new T.Group(),geometries=new Map();
 function box(parent,material,x,y,z,w,h,d,level){const key=[w,h,d].map(n=>n.toFixed(5)).join(',');let g=geometries.get(key);if(!g){g=new T.BoxGeometry(w,h,d);geometries.set(key,g);}const m=new T.Mesh(g,material);m.position.set(x,y,z);m.userData.resortFloor=level;m.castShadow=!material.transparent;m.receiveShadow=true;parent.add(m);return m;}
 const ellipse=(x,z,rx,rz,n=96)=>Array.from({length:n},(_,i)=>({x:x+Math.cos(i*Math.PI*2/n)*rx,z:z+Math.sin(i*Math.PI*2/n)*rz})),atrium=ellipse(0,203,35,35,128),footprints=new Map();
 const baseGeometry=new T.CylinderGeometry(35,35,.4,128);geometries.set('sealed-atrium-base',baseGeometry);const base=new T.Mesh(baseGeometry,materials.ivory);base.position.set(0,-.22,203);base.userData.resortFloor=0;solid.add(base);
 for(let level=0;level<3;level++){const entries=RESORT_ZONES.filter(z=>z.level===level&&z.key!=='cafe').map(z=>({id:z.id,poly:ellipse(z.x,z.z,z.rx,z.rz)}));for(const b of RESORT_BRIDGES.filter(b=>b.level===level))entries.push({id:'bridge-'+b.zone.id,poly:b.outline});if(level===0)entries.push({id:'lower-access',poly:corridorOutline(RESORT_LOWER_APPROACH).outline});footprints.set(level,entries);}
 function wall(a,b,lo,hi,level){if(hi-lo<1e-6)return;const m=box(solid,materials.glass,(a.x+b.x)/2,(lo+hi)/2,(a.z+b.z)/2,Math.hypot(b.x-a.x,b.z-a.z)+.012,hi-lo,.07,level);m.rotation.y=Math.atan2(-(b.z-a.z),b.x-a.x);}
 // Real polygon intersections define door widths exactly. The bridge's side
 // walls meet the cut rim; no wider invisible opening leaks around the port.
 for(let level=0;level<3;level++){const lo=level*S.rise,hi=Math.min(19,(level+1)*S.rise);if(hi<=lo)continue;const clips=footprints.get(level).map(p=>p.poly);for(let i=0;i<atrium.length;i++){const a=atrium[i],b=atrium[(i+1)%atrium.length];for(const[u,v]of clipPressureWall(a,b,clips))wall(u,v,lo,Math.min(hi,lo+4),level);wall(a,b,lo+4,hi,level);}}
 for(const zone of RESORT_ZONES){if(zone.key==='cafe')continue;const points=ellipse(zone.x,zone.z,zone.rx,zone.rz),lo=zone.level*S.rise,clips=[atrium,...footprints.get(zone.level).filter(p=>p.id!==zone.id).map(p=>p.poly)];for(let i=0;i<points.length;i++)for(const[a,b]of clipPressureWall(points[i],points[(i+1)%points.length],clips)){
   wall(a,b,lo,lo+4,zone.level);
   // Interior joinery follows the exact clipped pressure-wall segments. Door
   // mouths/overlapping halls remain genuinely open, including Amber/Nap.
   const x=(a.x+b.x)/2,z=(a.z+b.z)/2,length=Math.hypot(b.x-a.x,b.z-a.z)+.012,angle=Math.atan2(-(b.z-a.z),b.x-a.x),night=['vip','nap','amber','midnight'].includes(zone.key);
   const panel=box(solid,night?materials.wood:materials.ivory,x,lo+.31,z,length,.62,.12,zone.level);panel.rotation.y=angle;
   const trim=box(shell,materials.gold,x,lo+.64,z,length,.06,.14,zone.level);trim.rotation.y=angle;
   if(night&&[0,1,10,11].includes(i%12)){const pier=box(solid,materials.wood,x,lo+2.3,z,length,3.4,.12,zone.level);pier.rotation.y=angle;}
   if(i%8===0){box(solid,materials.gold,x,lo+2,z,.1,4,.1,zone.level);box(shell,materials.amber,x,lo+2,z,.045,3.2,.14,zone.level);}
  }}
 for(const bridge of RESORT_BRIDGES){const others=[atrium,...RESORT_BRIDGES.filter(b=>b!==bridge&&b.level===bridge.level).map(b=>b.outline),...footprints.get(bridge.level).filter(p=>!p.id.startsWith('bridge-')).map(p=>p.poly)];
  for(const [i,j]of [[0,1],[2,3]])for(const[a,b]of clipPressureWall(bridge.outline[i],bridge.outline[j],others)){const wall=box(solid,materials.glass,(a.x+b.x)/2,bridge.y+2,(a.z+b.z)/2,.07,4,Math.hypot(b.x-a.x,b.z-a.z),bridge.level);wall.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);}
  const a=bridge.points[0],b=bridge.points[1],roof=box(solid,materials.glass,(a.x+b.x)/2,bridge.y+4,(a.z+b.z)/2,5,.06,Math.hypot(b.x-a.x,b.z-a.z),bridge.level);roof.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
 }
 return{solid,shell,dispose(){for(const g of geometries.values())g.dispose();}};
}
