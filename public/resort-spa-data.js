import {resortPoolContact} from './resort-spa-pool-data.js';
// Ocean-local metres. Separate destination: never replaces the old Cat SPA
// island or the Mall's existing spa, save identities, rooms or purchases.
export const RESORT_SPA=Object.freeze({id:'chichi-underwater-spa',biome:'autumn',x:0,z:225,offsetZ:-20,y:-165,width:248,depth:144,rise:9,levels:3,gate:{x:0,z:153,y:-164.82},palette:{water:0x00cfef,deep:0x0a1e3d,amber:0xffb347,gold:0xffcc70,pink:0xff2e9a,lavender:0xb86bff,ivory:0xffe5c4,coral:0xf34dce}});
const rows=[
 ['thermal','Grand Thermal Lagoon','swim',150,0,266,0,50,24,16],
 ['jacuzzi','Luxury Jacuzzi Terraces','jacuzzi',150,-65,265,1,23,21,8],
 ['massage','Massage Palace','massage',300,-88,219,0,25,24,6],
 ['aroma','Aroma Therapy Garden','aroma',180,87,263,0,24,22,6],
 ['sauna','Sauna & Steam Palace','sauna',120,87,219,1,25,24,8],
 ['cabana','Floating Glass Cabanas','cabana',200,-82,177,1,28,18,6],
 ['beauty','Beauty & Grooming','groom',180,82,177,0,28,18,6],
 ['vip','Golden Galaxy VIP Suite','vip',700,43,208,2,20,19,8],
 ['meditation','Ocean Meditation Dome','meditate',100,87,263,2,24,22,8],
 ['nap','Cat Nap Galaxy','sleep',100,-43,208,2,20,19,8],
 ['cafe','Wellness Café','eat',100,0,203,1,30,24,8],
 ['waterfall','Waterfall Relaxation Garden','garden',100,0,266,2,46,24,8],
 ['amber','Amber Star Lounge','lounge',100,-88,219,2,25,24,8],
 ['midnight','Midnight Blue Relaxation Room','sleep',100,82,177,2,28,18,8],
];
export const RESORT_ZONES=Object.freeze(rows.map(([key,name,procedure,price,x,z,level,rx,rz,seats])=>Object.freeze({id:'resort-'+key,key,name,procedure,price,x,z,level,y:RESORT_SPA.y+level*RESORT_SPA.rise,rx,rz,seats,biome:'autumn',resort:true,kind:procedure==='eat'?'food':'spa',action:procedure==='eat'?'eat':procedure==='swim'?'swim':'rest'})));
export const resortZone=id=>RESORT_ZONES.find(z=>z.id===id);
export const RESORT_PROCEDURE_PRICE=Object.freeze({entry:100,thermal:150,massage:300,aroma:180,sauna:120,vip:700});
export function resortSpaFootprint(x,z,margin=0){return Math.hypot(x/(RESORT_SPA.width/2+margin),(z-RESORT_SPA.z)/(RESORT_SPA.depth/2+margin))<=1;}
// Room contacts are actual local positions shared by furniture and simulation.
export function resortSpaSeat(zone,index){
 if(zone.key==='vip'&&index>=4){const [dx,dz]=[[-9,-9],[-9,4],[-2,12],[9,10]][(index-4)%4],x=zone.x+dx,z=zone.z+dz,y=zone.y+.012;return{x,y,z,yaw:0,seat:{x,y:y+.92,z},approach:{x,y,z:z+3.6},staff:null,exit:{x,y,z:z+5}};}
 const wet=resortPoolContact(zone,index);if(wet)return{...wet,staff:null,exit:{...wet.approach}};
 if(zone.procedure==='eat'){const a=index*Math.PI*2/zone.seats,x=Math.sin(a)*20,z=203+Math.cos(a)*20,y=zone.y+.012;return{x,y,z,yaw:Math.PI,seat:{x,y:y+.92,z:z+2.8},approach:{x:x+3.6,y,z:z+3.6},staff:{x:x+2.2,y,z},exit:{x:x+4.5,y,z:z+3.6}};}
 const columns=zone.procedure==='massage'?3:4,rows=Math.ceil(zone.seats/columns),spacing=zone.procedure==='massage'?9:7;
 const column=index%columns,row=Math.floor(index/columns),x=zone.x+(column-(columns-1)/2)*spacing,z=zone.z+(row-(rows-1)/2)*(zone.procedure==='massage'?11:8.6);
 return {x,y:zone.y+.012,z,yaw:['massage','groom'].includes(zone.procedure)?Math.PI:0,...(zone.procedure==='aroma'?{seat:{x,y:zone.y+.812,z}}:{}),approach:{x,y:zone.y+.012,z:z+3.6},staff:{x:x+2.2,y:zone.y+.012,z},exit:{x,y:zone.y+.012,z:z+5}};
}

// Services share the existing cat-wallet product ledger. Stable addresses do
// not depend on a pavilion's display name or future architectural placement.
export const RESORT_PRODUCTS=Object.freeze(RESORT_ZONES.map(z=>Object.freeze({id:z.id+'-session',storeId:z.id,name:z.name,brand:'CHICHI CAT SPA',category:'mall',kind:z.kind,use:z.procedure==='eat'?'eat':'spa',icon:'🪷',price:z.price,stock:100000,unique:false,resort:true})));
export const resortProduct=id=>RESORT_PRODUCTS.find(p=>p.id===id);
export function resortOffers(game){return game.unlocked?.includes('autumn')?RESORT_ZONES.map(z=>({id:z.id,type:z.id,biome:'autumn',name:'SPA · '+z.key,action:z.action})):[];}

export const resortSpaOrigin=centre=>[centre[0],centre[1]+RESORT_SPA.offsetZ];

export const RESORT_FOOT_OFFSET=.012; // native happy rest minimumY=-.00942545m
export const RESORT_STAIRS=Object.freeze([0,1].map(level=>Object.freeze({level,x:level?-25:25,z:187,count:30,rise:.3,run:1.1,width:5,landingZ:222})));
