// SPA-only architecture and compatibility plan. Activation belongs to the
// existing SPA builder; this module never mutates a world, wallet or scene.
export const SPA_LAYOUT_VERSION=7;
export const SPA_PALACE=Object.freeze({x:0,z:224,width:300,depth:132,corner:60,
  rise:12,levels:3,ceilingMinimum:10.8,atrium:{x:0,z:203,rx:40,rz:36},
  baseY:-165,offsetZ:-20});

const oldRows=[
 ['thermal',0,266,0,50,24,150],['jacuzzi',-65,265,1,23,21,150],
 ['massage',-88,219,0,25,24,300],['aroma',87,263,0,24,22,180],
 ['sauna',87,219,1,25,24,120],['cabana',-82,177,1,28,18,200],
 ['beauty',82,177,0,28,18,180],['vip',43,208,2,20,19,700],
 ['meditation',87,263,2,24,22,100],['nap',-43,208,2,20,19,100],
 ['cafe',0,203,1,30,24,100],['waterfall',0,266,2,46,24,100],
 ['amber',-88,219,2,25,24,100],['midnight',82,177,2,28,18,100],
];
export const SPA_V6_ROOMS=Object.freeze(oldRows.map(([key,x,z,level,rx,rz,price])=>
 Object.freeze({id:'resort-'+key,key,x,z,level,rx,rz,price,y:-165+level*9})));

const rooms=[
 ['thermal','Grand Thermal Lagoon',0,266,0,54,24,8],
 ['vip','Golden Galaxy Jacuzzi & VIP Lounge',82,230,2,46,32,12],
 ['midnight','Midnight Blue Grand Relaxation Lounge',-82,230,2,43,21,12],
 ['massage','Massage Palace',-88,225,1,28,25,8],
 ['aroma','Aroma Therapy Garden',87,262,1,27,24,8],
 ['cabana','Floating Glass Cabanas',-82,180,1,31,21,8],
 ['cafe','Wellness Café',0,203,0,34,29,8],
 ['waterfall','Waterfall Relaxation Garden',94,231,0,35,39,12],
];
export const SPA_V7_ROOMS=Object.freeze(rooms.map(([key,name,x,z,level,rx,rz,corner])=>
 Object.freeze({id:'resort-'+key,key,name,x,z,level,rx,rz,corner,
  y:SPA_PALACE.baseY+level*SPA_PALACE.rise,ceilingMinimum:SPA_PALACE.ceilingMinimum})));
export const SPA_PALACE_STAIRS=Object.freeze([0,1].map(level=>Object.freeze({
 level,x:level?-25:25,z:187,count:40,rise:.3,run:1.1,width:5,landingZ:234})));
export function spaPalacePools(){
 const all=[{id:'thermal-main',room:'resort-thermal',x:0,z:266,level:0,rx:45,rz:19,capacity:12},
  {id:'thermal-sky',room:'resort-thermal',x:0,z:203,level:2,rx:18,rz:18,capacity:4,sky:true}];
 const v=SPA_V7_ROOMS.find(z=>z.key==='vip');
 for(const side of [-1,1]){
  all.push({id:'vip-group-'+side,room:v.id,x:v.x+18,z:v.z+side*17,level:2,rx:8,rz:7,capacity:4,jacuzzi:true,size:'group'});
  for(const dx of [2,34])all.push({id:'vip-medium-'+side+'-'+dx,room:v.id,x:v.x+dx,z:v.z+side*17,level:2,rx:5,rz:5,capacity:2,jacuzzi:true,size:'medium'});
 }
 for(const dx of [18,34])all.push({id:'vip-private-'+dx,room:v.id,x:v.x+dx,z:v.z,level:2,rx:4,rz:4,capacity:1,jacuzzi:true,size:'private'});
 for(const slot of [1,3,5,7]){const a=slot*Math.PI/4;all.push({id:'cafe-wet-'+slot,room:'resort-cafe',x:Math.sin(a)*20,z:203+Math.cos(a)*20,level:0,rx:5.6,rz:5.6,cafeSlot:slot,capacity:1});}
 return all.map(p=>({...p,y:SPA_PALACE.baseY+p.level*SPA_PALACE.rise,depth:1.8}));
}

export const SPA_ROOM_REDIRECTS=Object.freeze({'resort-amber':'resort-midnight','resort-jacuzzi':'resort-vip'});
export const SPA_RETIRED_ROOMS=Object.freeze(['resort-nap','resort-meditation','resort-beauty','resort-sauna']);
// Retained ledger records remain keyed by their original service/product IDs.
// A room destination is separate from the historical product being redeemed.
export function spaRoomDestination(id){
 if(SPA_RETIRED_ROOMS.includes(id))return null;
 return SPA_ROOM_REDIRECTS[id]|| (SPA_V7_ROOMS.some(z=>z.id===id)?id:null);
}
export const spaTicketDestination=id=>spaRoomDestination(id)||
 (SPA_RETIRED_ROOMS.includes(id)?'resort-midnight':null);

export function spaRoundedDistance(x,z,{x:cx=0,z:cz=0,width,depth,corner}){
 const qx=Math.abs(x-cx)-width/2+corner,qz=Math.abs(z-cz)-depth/2+corner;
 return Math.hypot(Math.max(0,qx),Math.max(0,qz))+Math.min(Math.max(qx,qz),0)-corner;
}
export const spaPalaceContains=(x,z,margin=0)=>spaRoundedDistance(x,z,SPA_PALACE)<=-margin;
export function spaPalaceOutline(samples=24){
 const s=SPA_PALACE,hx=s.width/2,hz=s.depth/2,r=s.corner,out=[];
 for(let corner=0;corner<4;corner++){
  const a=corner*Math.PI/2,cx=s.x+(corner===0||corner===3?1:-1)*(hx-r),cz=s.z+(corner<2?1:-1)*(hz-r);
  for(let i=0;i<=samples;i++){const t=a+i*Math.PI/(2*samples);out.push({x:cx+Math.cos(t)*r,z:cz+Math.sin(t)*r});}
 }
 return out;
}
export function spaPalaceRoofY(x,z){
 const dome=(cx,cz,rx,rz,height)=>height*Math.sqrt(Math.max(0,1-((x-cx)/rx)**2-((z-cz)/rz)**2));
 return SPA_PALACE.rise*2+SPA_PALACE.ceilingMinimum+.4+
  Math.max(dome(0,203,43,37,20),dome(-82,230,43,21,7.5),dome(82,230,46,32,7.5));
}
export const spaRoomArea=zone=>zone.rx*zone.rz*4-(4-Math.PI)*zone.corner**2;
export const spaRoomMeasurement=key=>{
 const before=SPA_V6_ROOMS.find(z=>z.key===key),after=SPA_V7_ROOMS.find(z=>z.key===key);
 if(!before||!after)return null;
 return{key,before:{width:before.rx*2,depth:before.rz*2,area:Math.PI*before.rx*before.rz,minimumCeiling:4},
  after:{width:after.rx*2,depth:after.rz*2,area:spaRoomArea(after),minimumCeiling:after.ceilingMinimum},
  areaRatio:spaRoomArea(after)/(Math.PI*before.rx*before.rz)};
};
