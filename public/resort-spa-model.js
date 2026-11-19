import {createResortInteriors} from './resort-spa-interiors.js';
import {resortPalaceStructureSteps} from './resort-spa-palace-structure.js';
import {resortLuxurySteps} from './resort-spa-luxury.js';
import {resortSurfaceMaps} from './resort-spa-surfaces.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {resortPools,resortSkyPool} from './resort-spa-pool-data.js';
import {resortGallerySteps} from './resort-spa-galleries.js';
import {resortGardenSteps} from './resort-spa-gardens.js';
import {createResortPoolEffects} from './resort-spa-pool-effects.js';
import {createResortEnclosure} from './resort-spa-enclosure.js';
import {createResortSpaAccess} from './resort-spa-access.js';
import {finishResortSpaSteps} from './resort-spa-finishes.js';
import {mallArt} from './mall-art.js';
import {mallSurfaceMaps} from './mall-surfaces.js';
import {createResortBasin} from './resort-spa-basin.js';
import * as T from 'three';
import {RESORT_SPA as L,RESORT_ZONES,resortSpaSeat,RESORT_STAIRS} from './resort-spa-data.js';
import {createResortMassagePavilion} from './resort-spa-massage.js';
import {advanceWater} from './water-shading.js';
import {installManualBuildingNavigation} from './manual-building-navigation.js';
// Construction candidate, deliberately not attached to production until native
// navigation, enclosure, rendering and durable procedure audits are complete.
export function* resortSpaModelSteps({layoutVersion=6}={}){
 const root=new T.Group(),solid=new T.Group(),shell=new T.Group(),decor=new T.Group(),surfaces=new T.Group(),basins=[],waters=[];root.name='CHICHI CAT SPA & WELLNESS RESORT';root.position.y=L.y;root.add(solid,shell,decor,surfaces);
 const mats={},geos=new Map(),zones=new Map();let authoredLevel=0;
 for(const [k,c]of Object.entries(L.palette))mats[k]=new T.MeshStandardMaterial({color:c,roughness:k==='gold'?.24:.55,metalness:k==='gold'?.7:0,...(['amber','pink','lavender'].includes(k)?{emissive:c,emissiveIntensity:.35}:{})});
 Object.assign(mats.ivory,resortSurfaceMaps('marble'));mats.ivory.roughness=.7;
 mats.gold.color.setHex(0xd6a34a);mats.gold.roughness=.24;
 mats.glass=new T.MeshStandardMaterial({color:0xb3ebf0,transparent:true,opacity:.11,roughness:.15,depthWrite:false,side:T.DoubleSide,forceSinglePass:true});
 mats.cloth=new T.MeshStandardMaterial({color:0xffeedc,roughness:.96,...resortSurfaceMaps('fabric')});if(mallArt()){const maps=mallSurfaceMaps('fabric');maps.map?.dispose();mats.cloth.normalMap.dispose();mats.cloth.roughnessMap.dispose();mats.cloth.normalMap=maps.normalMap;mats.cloth.roughnessMap=maps.roughnessMap;mats.cloth.normalScale.set(.32,.32);}
 const roomFloors=new Map();function floorFor(zone){if(roomFloors.has(zone.key))return roomFloors.get(zone.key);const m=mats.ivory.clone(),dark={vip:0x504455,nap:0x393b52,midnight:0x293e57,amber:0x63504b};m.color.setHex(dark[zone.key]??0xf2e8df);m.roughness=dark[zone.key] ? .24 : .38;m.metalness=.035;mats['floor-'+zone.key]=m;roomFloors.set(zone.key,m);return m;}
 mats.wood=new T.MeshStandardMaterial({color:0x593c32,roughness:.7});if(mallArt())Object.assign(mats.wood,mallSurfaceMaps('warm'));
 const geometry=(key,make)=>{if(!geos.has(key))geos.set(key,make());return geos.get(key);};
 function mesh(parent,g,m,x,y,z,sx=1,sy=1,sz=1){const o=new T.Mesh(g,m);o.userData.resortFloor=authoredLevel;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
 function box(parent,m,x,y,z,w,h,d){return mesh(parent,geometry(['box',w,h,d].join(':'),()=>new T.BoxGeometry(w,h,d)),m,x,y,z);}
 function disk(parent,m,x,y,z,rx,rz,h=.3){return mesh(parent,geometry('disk',()=>new T.CylinderGeometry(1,1,1,64)),m,x,y,z,rx,h,rz);}
 function backGeometry(index){return geometry('wraparound-upholstery-segment-'+index,()=>{const a=index*Math.PI/12,b=(index+1)*Math.PI/12,s=new T.Shape();s.absellipse(0,0,1.55,.85,a,b,false);s.lineTo(Math.cos(b)*1.3,Math.sin(b)*.69);s.absellipse(0,0,1.3,.69,b,a,true);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:.82,bevelEnabled:true,bevelThickness:.055,bevelSize:.045,bevelSegments:3,steps:1,curveSegments:4});g.rotateX(-Math.PI/2);return g;});}
 function sofa(x,y,z,yaw=0){const group=new T.Group();group.position.set(x,y,z);group.rotation.y=yaw;solid.add(group);const g=geometry('rounded-sofa',()=>new RoundedBoxGeometry(1,1,1,3,.1));mesh(group,g,mats.gold,0,.68,0,3,.12,1.6);for(const a of [-1,1])for(const b of [-1,1])box(group,mats.gold,a*1.2,.31,b*.55,.12,.62,.12);mesh(group,g,mats.cloth,0,.82,0,3,.2,1.6);for(let i=0;i<12;i++)mesh(group,backGeometry(i),mats.cloth,0,.93,0);mesh(group,g,mats.cloth,0,.38,1.05,2.6,.16,.8);for(const side of [-1,1])box(group,mats.gold,side*.95,.15,1.05,.1,.3,.5);}
 function pool(x,y,z,rx,rz,probeLayer=10,{sky=false}={}){if(sky&&!mats.skyGlass){mats.skyGlass=mats.glass.clone();mats.skyGlass.opacity=.2;mats.skyGlass.roughness=.09;}const basin=createResortBasin({rx,rz,depth:1.8,probeLayer,sky},{stone:mats.ivory,...(sky?{liner:mats.skyGlass}:{})});basin.position.set(x,y,z);if(sky){basin.userData.bed.name='Glass Sky Pool transparent bottom';basin.userData.bed.renderOrder=1;basin.userData.surface.renderOrder=2;}surfaces.add(basin);basins.push(basin);waters.push(basin.userData.surface);return basin;}
 function platform(zone,y,holes){const shape=new T.Shape();shape.absellipse(zone.x,-zone.z,zone.rx,zone.rz,0,Math.PI*2,false);for(const p of holes){const h=new T.Path();h.absellipse(p.x,-p.z,p.rx,p.rz,0,Math.PI*2,true);shape.holes.push(h);}const g=new T.ShapeGeometry(shape,96);g.rotateX(-Math.PI/2);geos.set(zone.id+'-floor',g);mesh(surfaces,g,floorFor(zone),0,y,0).name='resort-room-floor-'+zone.key;}
 function roof(x,y,z,rx,rz,height,wallHeight=4){mesh(shell,geometry('dome',()=>new T.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2)),mats.glass,x,y,z,rx,height,rz);for(let i=0;i<24;i++){const a=i*Math.PI/12;box(shell,mats.gold,x+Math.cos(a)*rx,y-wallHeight/2,z+Math.sin(a)*rz,.13,wallHeight,.13);}}
 if(layoutVersion===7){
  const palace=yield* resortPalaceStructureSteps({solid,shell,decor,surfaces,mats,geometry,mesh,box,pool,setLevel:level=>{authoredLevel=level;}});
  for(const [id,g]of palace.zones){zones.set(id,g);root.add(g);}
  const accessGeometry=createResortSpaAccess(mats);for(const g of [accessGeometry.solid,accessGeometry.surfaces,accessGeometry.shell])g.traverse(o=>{if(o.isMesh)o.userData.resortFloor=0;});solid.add(accessGeometry.solid);surfaces.add(accessGeometry.surfaces);shell.add(accessGeometry.shell);
  root.updateMatrixWorld(true);root.userData={layoutVersion:7,phase:'architecture-mass',palace:palace.report,id:L.id,accessGeometry,dynamicSurfaces:[accessGeometry.deck],zones,solid,shell,decor,surfaces,basins,waters,navigation:installManualBuildingNavigation(root,solid),update(time,reduced=false){for(const w of waters)advanceWater(w.material,time,reduced);},dispose(){palace.dispose();accessGeometry.dispose();for(const b of basins)b.userData.dispose();for(const g of geos.values())g.dispose();const textures=new Set();for(const m of Object.values(mats)){for(const key of ['map','normalMap','roughnessMap'])if(m[key])textures.add(m[key]);m.dispose();}for(const t of textures)t.dispose();}};
  yield* finishResortSpaSteps(root);root.add(accessGeometry.cabin,accessGeometry.gates);return root;
 }
 // Main cat dome and real three-level public atrium.
 for(let level=0;level<3;level++){
  authoredLevel=level;const y=level*L.rise,shape=new T.Shape();shape.absarc(0,0,34,0,Math.PI*2,false);if(level){const hole=new T.Path();hole.absarc(0,0,level===2?resortSkyPool().rx:12,0,Math.PI*2,true);shape.holes.push(hole);const stair=RESORT_STAIRS[level-1],opening=new T.Path();opening.moveTo(stair.x-3.5,-185);opening.lineTo(stair.x+3.5,-185);opening.lineTo(stair.x+3.5,-221.5);opening.lineTo(stair.x-3.5,-221.5);opening.closePath();shape.holes.push(opening);}if(level===1)for(const pool of resortPools(RESORT_ZONES.find(z=>z.key==='cafe'))){const hole=new T.Path();hole.absellipse(pool.x,-(pool.z-203),pool.rx,pool.rz,0,Math.PI*2,true);shape.holes.push(hole);}const g=new T.ShapeGeometry(shape,96);g.rotateX(-Math.PI/2);geos.set('atrium-'+level,g);mesh(surfaces,g,mats.ivory,0,y,203).name='resort-atrium-floor-'+level;
  for(const side of [-1,1])for(let i=0;i<4;i++)if(level===1)sofa(-12+i*8,y,203+side*26,side<0?Math.PI:0);else sofa(side*20,y,187+i*10);
  yield;
 }
 roof(0,19,203,35,35,18,19);

 authoredLevel=0;disk(solid,mats.gold,0,.45,203,7,7,.9);pool(0,.95,203,6.4,6.4);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh(decor,geometry('lotus',()=>new T.SphereGeometry(1,16,8)),mats.pink,Math.cos(a)*1.4,2.2,203+Math.sin(a)*1.4,.6,.3,1.7);}
 box(solid,mats.gold,0,1.2,178,12,2.4,2.2);box(decor,mats.ivory,0,2.46,178,12.4,.12,2.5);
 // Shared authored stair dimensions and real openings in the floor above.
 for(const stair of RESORT_STAIRS){authoredLevel=stair.level;const base=stair.level*L.rise;for(let i=0;i<stair.count;i++){const h=(i+1)*stair.rise;box(solid,mats.ivory,stair.x,base+h/2,stair.z+i*stair.run,stair.width,h,stair.run+.02);}box(solid,mats.ivory,stair.x,base+L.rise-.15,220.2,stair.width,.3,3.4);}yield;
 for(const zone of RESORT_ZONES){
  authoredLevel=zone.level;const y=zone.level*L.rise;
  // Bridges to the corresponding public level, using the same real dimensions.
  // Overlap both real floor edges: a tangent-ended rectangular bridge leaves
  // unsupported slivers at its corners against a curved atrium/pavilion rim.
  const dx=zone.x,dz=zone.z-203,len=Math.hypot(dx,dz),a=Math.atan2(dx,dz),reach=len?1/Math.hypot(dx/len/zone.rx,dz/len/zone.rz):0,gap=Math.max(0,len-34-reach+.2);if(gap){const distance=34+gap/2,b=box(solid,mats.ivory,dx/len*distance,y-.15,203+dz/len*distance,5,.3,gap+2.4);b.rotation.y=a;}
  if(zone.procedure==='massage'){const p=createResortMassagePavilion(zone,{materials:{marble:mats.ivory,gold:mats.gold,wood:mats.wood,cloth:mats.cloth,pink:mats.pink,glass:mats.glass,amber:mats.amber}});p.position.y=0;p.traverse(o=>{if(o.isMesh)o.userData.resortFloor=zone.level;});root.add(p);roof(zone.x,y+4,zone.z,zone.rx,zone.rz,6);zones.set(zone.id,p);yield;continue;}
  const group=new T.Group();group.name=zone.name;root.add(group);zones.set(zone.id,group);const pools=zone.key==='cabana'?[{x:zone.x,z:zone.z,rx:zone.rx-3,rz:zone.rz-3}]:resortPools(zone).filter(p=>Math.abs(p.y-zone.y)<.01);if(zone.key!=='cafe'){platform(zone,y,pools);roof(zone.x,y+4,zone.z,zone.rx,zone.rz,6);}for(const p of pools)pool(p.x,y,p.z,p.rx,p.rz,RESORT_ZONES.indexOf(zone));
  if(zone.key==='cabana'){
   box(solid,mats.ivory,zone.x,y-.08,zone.z,52,.16,2.4);box(solid,mats.ivory,zone.x,y-.08,zone.z+12,36,.16,3);
   // Public connection between the two real crosswalks. Front private pods
   // have rear glass walls; guests must reach their front doors around them.
   box(solid,mats.ivory,zone.x+18,y-.08,zone.z+6,2.6,.16,14.4).name='Cabana public east connector';
   for(const side of [-1,1])box(solid,mats.glass,zone.x+18+side*1.25,y+.55,zone.z+6,.06,1.1,9);
   for(let i=0;i<zone.seats;i++){const s=resortSpaSeat(zone,i),end=s.z<zone.z?zone.z:zone.z+12;disk(surfaces,mats.ivory,s.x,y-.04,s.z,3.2,3.2,.08);box(solid,mats.ivory,s.x,y-.08,(s.z+end)/2,2.2,.16,Math.abs(end-s.z)+.2);if(s.z>zone.z)for(const side of [-1,1])box(solid,mats.glass,s.x+side*1.08,y+.6,zone.z+9,.06,1.2,3);}
  }

  for(let i=0;i<zone.seats;i++){
   const s=resortSpaSeat(zone,i),x=s.x,z=s.z;
   if(zone.procedure==='vip'&&!s.pool){sofa(x,y,z);}
   else if(['swim','jacuzzi','vip'].includes(zone.procedure)){ /* Contacts resolved against separate wet volumes by navigation. */ }
   else if(['sleep','lounge','cabana'].includes(zone.procedure)){sofa(x,y,z);box(decor,mats.ivory,x,y+1,z,1.4,.12,.7);}
   else if(zone.procedure==='sauna'){box(solid,mats.wood,x,y+.4,z,4,.8,1.4);box(solid,mats.wood,x,y+1.15,z-.65,4,1.5,.18);}
   else if(zone.procedure==='eat'){
    if(s.pool){const t=s.table;disk(solid,mats.ivory,t.x,y+.52,t.z,1.2,1.2,.12);disk(decor,mats.gold,t.x,y+.58,t.z,1.22,1.22,.045);box(solid,mats.gold,t.x,y-.68,t.z,.16,2.28,.16);box(solid,mats.ivory,s.x,y-1.06,s.z,1.7,.3,1.7);box(solid,mats.gold,s.x,y-1.45,s.z,.14,.48,.14);}
    else{disk(solid,mats.gold,x,y+1.2,z,1.3,1.3,.12);box(solid,mats.gold,x,y+.55,z,.15,1.1,.15);sofa(x,y,z+2.8,Math.PI);}
   }
   else if(zone.procedure==='groom'){sofa(x,y,z);box(solid,mats.gold,x,y+2,z-2.2,2.5,3,.16);box(decor,mats.glass,x,y+2,z-2.08,2.2,2.7,.04);}
   else if(zone.procedure==='aroma'){
    const cushion=geometry('aroma-cushion',()=>new RoundedBoxGeometry(1,1,1,3,.11));mesh(solid,cushion,mats.cloth,x,y+.65,z,3,.3,2.1);const back=mesh(solid,cushion,mats.cloth,x,y+1.3,z-.95,3,1.3,.36);back.rotation.x=-.1;for(const side of [-1,1])mesh(solid,cushion,mats.cloth,x+side*1.5,y+1,z,.28,.6,2.1);
    mesh(solid,cushion,mats.gold,x,y+.45,z,3.08,.1,2.14);for(const a of [-1,1])for(const b of [-1,1])box(solid,mats.gold,x+a*1.24,y+.2,z+b*.8,.1,.4,.1);
   }else{disk(decor,mats.cloth,x,y+.04,z,1.5,1.5,.08);}
  }
  yield;
 }
 const luxury=yield* resortLuxurySteps({solid,decor,shell,surfaces,basins,waters,mats});
 const interiors=createResortInteriors({solid,decor,shell,surfaces,basins,waters,mats,flora:luxury.flora});
 const galleries=yield* resortGallerySteps({solid,decor,mats,flora:luxury.flora});
 const gardens=yield* resortGardenSteps({solid,decor,surfaces,waters,mats});
 const enclosure=createResortEnclosure(mats);solid.add(enclosure.solid);shell.add(enclosure.shell);
 const accessGeometry=createResortSpaAccess(mats);for(const group of [accessGeometry.solid,accessGeometry.surfaces,accessGeometry.shell])group.traverse(o=>{if(o.isMesh)o.userData.resortFloor=0;});solid.add(accessGeometry.solid);surfaces.add(accessGeometry.surfaces);shell.add(accessGeometry.shell);
 root.updateMatrixWorld(true);root.userData={accessGeometry,dynamicSurfaces:[accessGeometry.deck],zones,solid,shell,decor,surfaces,basins,waters,navigation:installManualBuildingNavigation(root,solid,...[...zones.values()].map(p=>p.userData.solid).filter(Boolean)),update(time,reduced=false){for(const w of waters)advanceWater(w.material,time,reduced);},dispose(){for(const p of zones.values())p.userData.dispose?.();for(const g of geos.values())g.dispose();const textures=new Set();for(const m of Object.values(mats)){for(const key of ['map','normalMap','roughnessMap'])if(m[key])textures.add(m[key]);m.dispose();}for(const t of textures)t.dispose();for(const p of zones.values())p.traverse(o=>{if(o.isPoints)o.material.dispose();});for(const b of basins)b.userData.dispose();accessGeometry.dispose();enclosure.dispose();interiors.dispose();galleries.dispose();}};
 root.userData.luxury=luxury;root.userData.galleries=galleries.report;root.userData.gardens=gardens.report;root.userData.gardenFeatures=gardens.features;yield* finishResortSpaSteps(root);root.add(accessGeometry.cabin,accessGeometry.gates,luxury.dynamic,galleries.fixed,gardens.fixed);
 const poolEffects=createResortPoolEffects();root.add(poolEffects.root);const inspect=root.userData.setInspectionLevel;root.userData.setInspectionLevel=level=>{inspect(level);for(const group of poolEffects.root.children)group.visible=level==null||group.userData.resortFloor<=level;};const update=root.userData.update,dispose=root.userData.dispose;root.userData.update=(time,reduced)=>{update(time,reduced);poolEffects.update(time,reduced);};root.userData.dispose=()=>{poolEffects.dispose();dispose();};
 const updateLuxury=root.userData.update,disposeLuxury=root.userData.dispose,inspectLuxury=root.userData.setInspectionLevel;root.userData.update=(time,reduced)=>{updateLuxury(time,reduced);luxury.update(time,reduced);gardens.update(time,reduced,root.position);};root.userData.setInspectionLevel=level=>{inspectLuxury(level);luxury.inspect(level);galleries.inspect(level);gardens.inspect(level);};root.userData.dispose=()=>{gardens.dispose();luxury.dispose();disposeLuxury();};
 return root;
}
