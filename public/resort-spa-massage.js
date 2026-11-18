import * as T from 'three';
import {resortSpaSeat} from './resort-spa-data.js';
import {installManualBuildingNavigation} from './manual-building-navigation.js';
// Real six-cabin module. Contacts are shared with booking/procedure playback;
// the shell, furniture and navigation are constructed from the same segments.
export function createResortMassagePavilion(zone,{materials={}}={}){
 const root=new T.Group(),solid=new T.Group(),decor=new T.Group(),shell=new T.Group();root.name=zone.name;root.add(solid,decor,shell);
 const ownMaterials=new Set(),geometries=new Map();
 const mat=(key,opts)=>materials[key]||(()=>{const m=new T.MeshStandardMaterial(opts);ownMaterials.add(m);return m;})();
 const marble=mat('marble',{color:0xffe5c4,roughness:.3}),gold=mat('gold',{color:0xffcc70,metalness:.78,roughness:.24}),wood=mat('wood',{color:0x56342c,roughness:.65}),cloth=mat('cloth',{color:0xe9d0e3,roughness:.94}),pink=mat('pink',{color:0xff2e9a,emissive:0xff2e9a,emissiveIntensity:.3}),glass=mat('glass',{color:0x8de5ed,transparent:true,opacity:.14,roughness:.17,depthWrite:false,side:T.DoubleSide,forceSinglePass:true}),amber=mat('amber',{color:0xffb347,emissive:0xffb347,emissiveIntensity:.7});
 function box(parent,m,x,y,z,w,h,d){const key=[w,h,d].join(',');let geo=geometries.get(key);if(!geo){geo=new T.BoxGeometry(w,h,d);geometries.set(key,geo);}const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
 root.position.y=zone.y;
 const floor=0,contacts=[];
 const outline=new T.Shape();outline.absellipse(zone.x,zone.z,zone.rx,zone.rz,0,Math.PI*2,false);const floorGeometry=new T.ExtrudeGeometry(outline,{depth:.4,bevelEnabled:false,curveSegments:96});floorGeometry.rotateX(Math.PI/2);geometries.set('elliptical-pavilion-floor',floorGeometry);const floorMesh=new T.Mesh(floorGeometry,marble);floorMesh.receiveShadow=true;solid.add(floorMesh);
 for(let i=0;i<6;i++){
  const seat=resortSpaSeat(zone,i),x=seat.x,z=seat.z,y=floor;contacts.push({...seat,seat:{x,y:zone.y+1.02,z},table:{x,y:zone.y+1,z,w:1.65,d:3.6},cabinet:i});
  // Individual rooms retain a 3.2m front opening; no merged collider seals it.
  box(solid,wood,x-3.7,y+2.5,z,.18,5,7.2);box(solid,wood,x+3.7,y+2.5,z,.18,5,7.2);
  box(solid,wood,x,y+2.5,z-3.6,7.4,5,.18);
  for(const side of [-1,1])box(solid,gold,x+side*2.65,y+2.1,z+3.6,2.1,4.2,.18);
  box(solid,gold,x,y+4.8,z+3.6,7.4,.4,.18);
  box(solid,cloth,x,y+.9,z,1.65,.24,3.6);
  for(const a of [-1,1])for(const b of [-1,1])box(solid,gold,x+a*.6,y+.42,z+b*1.35,.12,.84,.12);
  box(decor,marble,x,y+1.07,z-1.15,1.5,.12,.65); // folded towel/head support
  box(solid,wood,x+2.7,y+1.0,z-2.75,1.35,2,.55);
  for(let j=0;j<6;j++)box(decor,j%2?pink:gold,x+2.27+(j%3)*.38,y+1.2+Math.floor(j/3)*.5,z-2.75,.15,.28,.16);
  box(decor,amber,x-3.53,y+3,z-1,.1,.8,1.2);
  box(shell,glass,x,y+5,z,7.4,.08,7.2);
 }
 // Shared public aisle, reception and waiting seats outside the actual cabins.
 for(const side of [-1,1]){
  box(solid,wood,zone.x+side*16,floor+.5,zone.z+13,4,1,2);
  box(solid,cloth,zone.x+side*16,floor+1.1,zone.z+13,4,.3,2);
  box(solid,wood,zone.x+side*18.5,floor+1.2,zone.z+13,.5,2.4,2);
 }
 box(solid,marble,zone.x,floor+1.15,zone.z+18,7,2.3,1.6);
 box(decor,gold,zone.x,floor+2.35,zone.z+18,7.3,.12,1.8);
 root.updateMatrixWorld(true);const navigation=installManualBuildingNavigation(root,solid);
 root.userData={...root.userData,resortZone:zone.id,contacts,navigation,solid,decor,shell,
  dispose(){for(const g of geometries.values())g.dispose();for(const m of ownMaterials)m.dispose();}};
 return root;
}
