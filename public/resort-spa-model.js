import {createResortBasin} from './resort-spa-basin.js';
import * as T from 'three';
import {RESORT_SPA as L,RESORT_ZONES,resortSpaSeat} from './resort-spa-data.js';
import {createResortMassagePavilion} from './resort-spa-massage.js';
import {advanceWater} from './water-shading.js';
import {installManualBuildingNavigation} from './manual-building-navigation.js';
// Construction candidate, deliberately not attached to production until native
// navigation, enclosure, rendering and durable procedure audits are complete.
export function* resortSpaModelSteps(){
 const root=new T.Group(),solid=new T.Group(),shell=new T.Group(),decor=new T.Group(),surfaces=new T.Group(),basins=[],waters=[];root.name='CHICHI CAT SPA & WELLNESS RESORT';root.position.y=L.y;root.add(solid,shell,decor,surfaces);
 const mats={},geos=new Map(),zones=new Map();
 for(const [k,c]of Object.entries(L.palette))mats[k]=new T.MeshStandardMaterial({color:c,roughness:k==='gold'?.24:.55,metalness:k==='gold'?.7:0,...(['amber','pink','lavender'].includes(k)?{emissive:c,emissiveIntensity:.35}:{})});
 mats.glass=new T.MeshStandardMaterial({color:0xb3ebf0,transparent:true,opacity:.11,roughness:.15,depthWrite:false,side:T.DoubleSide,forceSinglePass:true});
 mats.cloth=new T.MeshStandardMaterial({color:0xd5b4cc,roughness:.96});mats.wood=new T.MeshStandardMaterial({color:0x593c32,roughness:.7});
 const geometry=(key,make)=>{if(!geos.has(key))geos.set(key,make());return geos.get(key);};
 function mesh(parent,g,m,x,y,z,sx=1,sy=1,sz=1){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
 function box(parent,m,x,y,z,w,h,d){return mesh(parent,geometry(['box',w,h,d].join(':'),()=>new T.BoxGeometry(w,h,d)),m,x,y,z);}
 function disk(parent,m,x,y,z,rx,rz,h=.3){return mesh(parent,geometry('disk',()=>new T.CylinderGeometry(1,1,1,64)),m,x,y,z,rx,h,rz);}
 function sofa(x,y,z){box(solid,mats.gold,x,y+.38,z,3,.76,1.6);box(solid,mats.cloth,x,y+.82,z,3,.2,1.6);box(solid,mats.cloth,x,y+1.3,z-.7,3,1,.22);}
 function pool(x,y,z,rx,rz){const basin=createResortBasin({rx,rz,depth:1.8},{stone:mats.ivory});basin.position.set(x,y,z);surfaces.add(basin);basins.push(basin);waters.push(basin.userData.surface);return basin;}
 function platform(zone,y,holes){const shape=new T.Shape();shape.absellipse(zone.x,-zone.z,zone.rx,zone.rz,0,Math.PI*2,false);for(const p of holes){const h=new T.Path();h.absellipse(p.x,-p.z,p.rx,p.rz,0,Math.PI*2,true);shape.holes.push(h);}const g=new T.ShapeGeometry(shape,96);g.rotateX(-Math.PI/2);geos.set(zone.id+'-floor',g);mesh(surfaces,g,mats.ivory,0,y,0);}
 function roof(x,y,z,rx,rz,height){mesh(shell,geometry('dome',()=>new T.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2)),mats.glass,x,y,z,rx,height,rz);for(let i=0;i<24;i++){const a=i*Math.PI/12;box(shell,mats.gold,x+Math.cos(a)*rx,y-2,z+Math.sin(a)*rz,.13,4,.13);}}
 // Main cat dome and real three-level public atrium.
 for(let level=0;level<3;level++){
  const y=level*L.rise,shape=new T.Shape();shape.absarc(0,0,34,0,Math.PI*2,false);if(level){const hole=new T.Path();hole.absarc(0,0,12,0,Math.PI*2,true);shape.holes.push(hole);}const g=new T.ShapeGeometry(shape,96);g.rotateX(-Math.PI/2);geos.set('atrium-'+level,g);mesh(surfaces,g,mats.ivory,0,y,203);
  for(const side of [-1,1])for(let i=0;i<4;i++)sofa(side*20,y,187+i*10);
  yield;
 }
 roof(0,4,203,35,35,29);
 for(const side of [-1,1]){const points=[new T.Vector3(side*20,26,191),new T.Vector3(side*29,45,204),new T.Vector3(side*10,29,216),new T.Vector3(side*20,26,191)],curve=new T.CatmullRomCurve3(points);const g=new T.TubeGeometry(curve,48,.13,6,false);geos.set('ear-'+side,g);shell.add(new T.Mesh(g,mats.pink));}
 disk(solid,mats.gold,0,.45,203,7,7,.9);pool(0,.95,203,6.4,6.4);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh(decor,geometry('lotus',()=>new T.SphereGeometry(1,16,8)),mats.pink,Math.cos(a)*1.4,2.2,203+Math.sin(a)*1.4,.6,.3,1.7);}
 box(solid,mats.gold,0,1.2,178,12,2.4,2.2);box(decor,mats.ivory,0,2.46,178,12.4,.12,2.5);
 // Full-sized stairs: .3m risers, .6m treads, 5m clear width.
 for(let level=0;level<2;level++)for(let step=0;step<30;step++){const x=level?-29:29,y=level*9+(step+1)*.3,z=181+step*.6;box(solid,mats.ivory,x,y/2+level*4.5,z,5,(step+1)*.3,.62);}yield;
 for(const zone of RESORT_ZONES){
  const y=zone.level*L.rise;
  if(zone.procedure==='massage'){const p=createResortMassagePavilion(zone,{materials:{marble:mats.ivory,gold:mats.gold,wood:mats.wood,cloth:mats.cloth,pink:mats.pink,glass:mats.glass,amber:mats.amber}});p.position.y=0;root.add(p);zones.set(zone.id,p);yield;continue;}
  const group=new T.Group();group.name=zone.name;root.add(group);zones.set(zone.id,group);const pools=zone.procedure==='swim'?[{x:zone.x,z:zone.z,rx:zone.rx-5,rz:zone.rz-5}]:['jacuzzi','vip'].includes(zone.procedure)?[0,4].filter(i=>i<zone.seats).map(i=>({...resortSpaSeat(zone,i),rx:3.1,rz:3.1})):[];platform(zone,y,pools);for(const p of pools)pool(p.x,y,p.z,p.rx,p.rz);roof(zone.x,y+4,zone.z,zone.rx,zone.rz,6);
  // Bridges to the corresponding public level, using the same real dimensions.
  const dx=zone.x,dz=zone.z-203,len=Math.hypot(dx,dz),a=Math.atan2(dx,dz),reach=len?1/Math.hypot(dx/len/zone.rx,dz/len/zone.rz):0,gap=Math.max(0,len-34-reach+.2);if(gap){const distance=34+gap/2,b=box(solid,mats.ivory,dx/len*distance,y-.15,203+dz/len*distance,5,.3,gap);b.rotation.y=a;}

  for(let i=0;i<zone.seats;i++){
   const s=resortSpaSeat(zone,i),x=s.x,z=s.z;
   if(['swim','jacuzzi','vip'].includes(zone.procedure)){ /* Contacts resolved against separate wet volumes by navigation. */ }
   else if(['sleep','lounge','cabana'].includes(zone.procedure)){sofa(x,y,z);box(decor,mats.ivory,x,y+1,z,1.4,.12,.7);}
   else if(zone.procedure==='sauna'){box(solid,mats.wood,x,y+.4,z,4,.8,1.4);box(solid,mats.wood,x,y+1.15,z-.65,4,1.5,.18);}
   else if(zone.procedure==='eat'){disk(solid,mats.gold,x,y+1.2,z,1.3,1.3,.12);box(solid,mats.gold,x,y+.55,z,.15,1.1,.15);sofa(x,y,z+2.8);}
   else if(zone.procedure==='groom'){sofa(x,y,z);box(solid,mats.gold,x,y+2,z-2.2,2.5,3,.16);box(decor,mats.glass,x,y+2,z-2.08,2.2,2.7,.04);}
   else{disk(decor,mats.cloth,x,y+.04,z,1.5,1.5,.08);}
  }
  if(['amber','midnight','vip','nap'].includes(zone.key)){
   const points=[],colors=[],color=new T.Color(zone.key==='midnight'?0xcadfff:0xffcc70);
   for(let i=0;i<360;i++){const a=i*2.399963,r=Math.sqrt((i+.5)/360)*.9;points.push(zone.x+Math.cos(a)*r*zone.rx,y+7+Math.cos(r*1.5),zone.z+Math.sin(a)*r*zone.rz);colors.push(color.r,color.g,color.b);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));geos.set(zone.id+'-stars',g);const stars=new T.Points(g,new T.PointsMaterial({size:.1,vertexColors:true,sizeAttenuation:true}));group.add(stars);
  }
  yield;
 }
 root.updateMatrixWorld(true);root.userData={zones,solid,shell,decor,surfaces,basins,waters,navigation:installManualBuildingNavigation(root,solid,...[...zones.values()].map(p=>p.userData.solid).filter(Boolean)),update(time,reduced=false){for(const w of waters)advanceWater(w.material,time,reduced);},dispose(){for(const p of zones.values())p.userData.dispose?.();for(const g of geos.values())g.dispose();for(const m of Object.values(mats))m.dispose();for(const p of zones.values())p.traverse(o=>{if(o.isPoints)o.material.dispose();});for(const b of basins)b.userData.dispose();}};
 return root;
}
