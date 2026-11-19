import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {SPA_PALACE as P} from './resort-spa-layout-v7.js';
import {SPA_V7_ZONES,spaV7Seat} from './resort-spa-services-v7.js';
// Furniture supports use the SAME immutable physical contacts as booking.
// No circular pavilion floors or low substitute roofs are added to the palace.
export function* resortPalaceInteriorsSteps({solid,decor,shell,mats,geometry,mesh,box,setLevel}){
 const report={rooms:{},minimumRoomCeiling:P.ceilingMinimum},cube=geometry('palace-upholstery',()=>new RoundedBoxGeometry(1,1,1,3,.1)),unit=geometry('palace-table-leg',()=>new T.CylinderGeometry(1,1,1,24));
 const pad=(parent,mat,x,y,z,w,h,d)=>mesh(parent,cube,mat,x,y,z,w,h,d);
 const disk=(parent,mat,x,y,z,rx,rz,h)=>mesh(parent,unit,mat,x,y,z,rx,h,rz);
 function sofa(c,y){
  const sx=c.x,sz=c.seat?.z??c.z;pad(solid,mats.gold,sx,y+.65,sz,3.12,.14,1.75);pad(solid,mats.cloth,sx,y+.82,sz,3,.2,1.6);
  pad(solid,mats.cloth,sx,y+1.35,sz-.78,3,1,.24);for(const side of [-1,1]){pad(solid,mats.cloth,sx+side*1.45,y+1.05,sz,.25,.65,1.55);for(const z of [-.6,.6])box(solid,mats.gold,sx+side*1.2,y+.3,sz+z,.12,.6,.12);}pad(solid,mats.cloth,sx,y+.39,sz+1.05,2.6,.16,.8);
 }
 for(const zone of SPA_V7_ZONES){setLevel(zone.level);const y=zone.level*P.rise;report.rooms[zone.id]={contacts:zone.seats,level:zone.level,supported:0};
  for(let i=0;i<zone.seats;i++){
   const c=spaV7Seat(zone,i),x=c.x,z=c.z;
   if(c.pool){
    if(zone.key==='cafe'){const t=c.table;disk(solid,mats.gold,t.x,y+.54,t.z,1.25,1.25,.12);box(solid,mats.gold,t.x,y-.6,t.z,.16,2.2,.16);pad(solid,mats.ivory,x,y-1.06,z,1.7,.3,1.7);}
   }else if(zone.key==='massage'){
    pad(solid,mats.cloth,x,y+.9,z,1.65,.24,3.6);for(const a of [-1,1])for(const b of [-1,1])box(solid,mats.gold,x+a*.6,y+.42,z+b*1.35,.12,.84,.12);pad(decor,mats.cloth,x,y+1.09,z-1.2,1.5,.14,.6);
    // Full-height cabins, real 4m opening, retained therapist space.
    for(const side of [-1,1]){box(solid,mats.glass,x+side*4.5,y+5.4,z,.08,10.8,9);box(solid,mats.gold,x+side*4.5,y+5.4,z-4.5,.13,10.8,.13);box(solid,mats.gold,x+side*4.5,y+5.4,z+4.5,.13,10.8,.13);}
    box(solid,mats.glass,x,y+5.4,z-4.5,9,10.8,.08);box(solid,mats.gold,x,y+10.85,z+4.5,9,.1,.16);
    for(const side of [-1,1])box(solid,mats.glass,x+side*3.25,y+5.4,z+4.5,2.5,10.8,.08);
    box(solid,mats.wood,x+3,y+1,z-3,1.2,2,.6);
   }else if(zone.key==='midnight'&&i>=14){
    disk(solid,mats.gold,x,y+.65,z,2.25,2.25,.14);disk(solid,mats.cloth,x,y+.82,z,2.2,2.2,.2);
    for(let j=0;j<12;j++){const a=Math.PI+j*Math.PI/11,o=pad(solid,mats.cloth,x+Math.cos(a)*2,y+1.3,z+Math.sin(a)*2,.7,1,.35);o.rotation.y=-a-Math.PI/2;}
   }else if(['vip','midnight','cabana','cafe'].includes(zone.key))sofa(c,y);
   else if(zone.key==='aroma'){
    pad(solid,mats.gold,x,y+.45,z,3.08,.1,2.14);pad(solid,mats.cloth,x,y+.65,z,3,.3,2.1);pad(solid,mats.cloth,x,y+1.3,z-.95,3,1.3,.36);for(const side of [-1,1])pad(solid,mats.cloth,x+side*1.5,y+1,z,.28,.6,2.1);
   }else disk(decor,mats.cloth,x,y+.04,z,1.5,1.5,.08);
   if(zone.key==='cabana'){
    for(const side of [-1,1]){box(solid,mats.glass,x+side*3.7,y+5.4,z,.08,10.8,7);box(solid,mats.gold,x+side*3.7,y+5.4,z-3.5,.1,10.8,.1);box(solid,mats.glass,x+side*2.65,y+5.4,z+3.5,2.1,10.8,.08);}
    box(solid,mats.glass,x,y+5.4,z-3.5,7.4,10.8,.08);box(decor,mats.gold,x,y+10.85,z+3.5,7.4,.1,.16);
   }
   if(!c.pool&&zone.key==='cafe'){disk(solid,mats.gold,x,y+1.2,z,1.3,1.3,.12);disk(solid,mats.gold,x,y+.55,z,.12,.12,1.1);}
   report.rooms[zone.id].supported++;
  }
  // The upper night suites share the common exterior and full-height shell.
  // Internal glass partitions retain an actual 8m entry from the public hall.
  if(['vip','midnight'].includes(zone.key)){
   const side=zone.key==='vip'?-1:1,doorX=zone.x+side*zone.rx;
   for(const direction of [-1,1]){const length=zone.rz-4;box(solid,mats.glass,doorX,y+5.4,zone.z+direction*(4+length/2),.09,10.8,length);box(solid,mats.gold,doorX,y+5.4,zone.z+direction*4,.16,10.8,.16);}
   box(solid,mats.glass,doorX,y+11.05,zone.z,.09,.5,8);box(decor,mats.gold,doorX,y+10.8,zone.z,.18,.12,8);
  }
  yield;
 }
 return{report};
}
