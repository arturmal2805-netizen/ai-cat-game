import * as T from 'three';
import {shape,line,lantern} from './fantasy-scenery.js';
import {courtLabel} from './foodcourt-assets.js';
import {zooFacing} from './zoo-data.js';
export function zooGate(exhibit,{opened=false}={}){
 const root=new T.Group(),arch=new T.Group(),gates=[];root.add(arch);
 const facing=zooFacing(exhibit),dx=Math.sin(facing)*4.55,dz=Math.cos(facing)*4.55;
 arch.position.set(dx,0,dz);arch.rotation.y=facing;
 for(const side of [-1,1]){shape(arch,'pole',0xc69462,side*1.3,.95,0,.15,1.9,.15);lantern(arch,side*1.3,1.88,0,.3);const hinge=new T.Group();hinge.position.x=side*1.25;arch.add(hinge);const leaf=new T.Group();leaf.position.x=-side*.62;hinge.add(leaf);shape(leaf,'cube',0xd4aa78,0,.68,0,1.2,.12,.1);shape(leaf,'cube',0xe7c795,0,1.08,0,1.2,.12,.1);for(let i=0;i<5;i++)shape(leaf,'pole',0xbf8a61,(i-2)*.23,.86,0,.045,.7,.045);gates.push({hinge,side});}
 line(arch,[-1.36,2.02,0],[1.36,2.02,0],0xe6be81,.15);
 const name=courtLabel(exhibit.icon+' '+exhibit.name,3.7,.55);name.position.set(0,2.08,.13);arch.add(name);
 let disposed=false,price,open=opened,openedAt=0,start=-1000,key='';
 function label(){const text=open?'Відкрито · завітайте!':exhibit.price.toLocaleString('uk-UA')+' ✦';if(text===key)return;key=text;if(price){price.removeFromParent();price.geometry?.dispose();price.material?.map?.dispose();price.material?.dispose();}price=courtLabel(text,2.4,.45);price.position.set(0,1.5,.13);arch.add(price);}
 root.name=exhibit.name+' · ворота';
 root.userData={id:exhibit.type,foodcourt:true,zooExhibit:exhibit.id,footprint:exhibit.footprint,roof:null,setZooState(state){const receipt=state?.receipts?.[exhibit.id],next=!exhibit.index||!!receipt,at=receipt?.openedAt||0;if(next===open&&at===openedAt)return;if(next!==open||at!==openedAt){open=next;openedAt=at;start=at?performance.now()/1000-Math.max(0,(Date.now()-at)/1000):-1000;}label();},update(time,reduced=false){const u=open?(reduced?1:T.MathUtils.smoothstep(time-start,0,1.35)):0;for(const g of gates)g.hinge.rotation.y=-g.side*u*Math.PI*.55;},disposeStaff(){if(disposed)return;disposed=true;name.material?.map?.dispose();price?.material?.map?.dispose();}};
 label();root.userData.update(10000,true);return root;
}

export function zooPhotoCamera(){
 const g=new T.Group();g.name='Котяча фотокамера';
 shape(g,'cube',0xa88ebd,0,0,0,.72,.43,.28);
 const lens=shape(g,'pole',0x47445b,0,0,.2,.16,.19,.16);lens.rotation.x=Math.PI/2;
 shape(g,'sphere',0xa7eaf4,0,0,.31,.12,.12,.035,true);
 shape(g,'cube',0xffe6ae,.23,.24,.02,.17,.09,.13);
 return g;
}
