// Horizontal rebuild. This module has no renderer/economy dependency: the same
// measured envelope can serve floors, scenery clearance, cameras and vehicles.
export const MALL_LAYOUT=Object.freeze({
  version:2,biome:'autumn',x:0,z:65,y:-165,rise:8.5,radius:60,atriumRadius:22,
  lift:{x:-72,z:110,radius:9.2},gate:{x:-72,y:.35,z:123},
  capacity:4,speed:9,shoreJoin:{x:0,y:.35,z:110},
  wings:[{x:-73,z:65,w:68,d:70,corner:20},{x:73,z:65,w:68,d:70,corner:20}],
  pavilions:[{id:'mall-west-pavilion',x:-128,z:18,radius:18,floor:2,connection:{x:-101,z:42}},{id:'mall-east-pavilion',x:128,z:18,radius:18,floor:6,connection:{x:101,z:42}}],
  room:{w:28,d:24,h:7.4},
});
export function roundedMallRectDistance(x,z,room){
  const qx=Math.abs(x-room.x)-room.w/2+room.corner,qz=Math.abs(z-room.z)-room.d/2+room.corner;
  return Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-room.corner;
}
export function mallBuildingFootprintDistance(x,z){
  let d=Math.hypot(x-MALL_LAYOUT.x,z-MALL_LAYOUT.z)-MALL_LAYOUT.radius;
  for(const wing of MALL_LAYOUT.wings)d=Math.min(d,roundedMallRectDistance(x,z,wing));
  return d;
}
export function mallConstructionFootprintDistance(x,z){
  let d=mallBuildingFootprintDistance(x,z);
  for(const p of MALL_LAYOUT.pavilions)d=Math.min(d,Math.hypot(x-p.x,z-p.z)-p.radius);
  return d;
}
export function mallFloorOutline(samples=512){
  return Array.from({length:samples},(_,i)=>{
    const a=i*Math.PI*2/samples,c=Math.cos(a),s=Math.sin(a);let lo=0,hi=160;
    for(let j=0;j<32;j++){
      const r=(lo+hi)/2;
      if(mallBuildingFootprintDistance(c*r,MALL_LAYOUT.z+s*r)<=0)lo=r;else hi=r;
    }
    return{x:c*lo,z:MALL_LAYOUT.z+s*lo};
  });
}
export function mallUpperFloorOutline(samples=512){
  const halfOpening=28,z=MALL_LAYOUT.z,angle=Math.acos(-halfOpening/MALL_LAYOUT.radius),end=Math.PI-angle+Math.PI*2;
  const points=[];
  for(let i=0;i<=samples;i++){
    const a=angle+(end-angle)*i/samples,c=Math.cos(a),s=Math.sin(a);let lo=0,hi=160;
    for(let j=0;j<32;j++){const r=(lo+hi)/2;if(mallBuildingFootprintDistance(c*r,z+s*r)<=0)lo=r;else hi=r;}
    points.push({x:c*lo,z:z+s*lo});
  }
  points.push({x:halfOpening,z},{x:MALL_LAYOUT.atriumRadius,z});
  for(let i=1;i<=96;i++){const a=-Math.PI*i/96;points.push({x:Math.cos(a)*MALL_LAYOUT.atriumRadius,z:z+Math.sin(a)*MALL_LAYOUT.atriumRadius});}
  points.push({x:-halfOpening,z});
  return points;
}
export function mallAtriumVoidDistance(x,z){
  const qx=Math.abs(x)-28,qz=MALL_LAYOUT.z-z;
  const slot=Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0);
  return Math.min(Math.hypot(x,z-MALL_LAYOUT.z)-MALL_LAYOUT.atriumRadius,slot);
}
export function mallAtriumRail(){
  const z=MALL_LAYOUT.z,end=z+Math.sqrt(MALL_LAYOUT.radius**2-28**2),points=[{x:-28,z:end},{x:-28,z},{x:-MALL_LAYOUT.atriumRadius,z}];
  for(let i=1;i<=96;i++){const a=Math.PI+Math.PI*i/96;points.push({x:Math.cos(a)*MALL_LAYOUT.atriumRadius,z:z+Math.sin(a)*MALL_LAYOUT.atriumRadius});}
  points.push({x:28,z},{x:28,z:end});return points;
}
export function mallPlanArea(){
  const area=p=>{let a=0;for(let i=0;i<p.length;i++){const x=p[i],b=p[(i+1)%p.length];a+=x.x*b.z-b.x*x.z;}return Math.abs(a)/2;};
  const main=area(mallFloorOutline(2048)),upper=area(mallUpperFloorOutline(2048));
  return{floorGross:main,upperUsable:upper,sevenFloors:main+upper*6+MALL_LAYOUT.pavilions.reduce((sum,p)=>sum+Math.PI*p.radius**2,0)};
}

// New rooms keep the original stable venue IDs/floors. Four full shops face
// the broad front galleries of the wings; up to three face the central atrium.
export function mallRoomPlacement(index,count=7){
  if(index<4){
    const x=[-87,-57,57,87][index];
    return{x,z:60,yaw:0,w:28,d:24,zone:x<0?'west':'east'};
  }
  const angles=count===5?[Math.PI*3/2]:count===6?[Math.PI*4/3,Math.PI*5/3]:[Math.PI*7/6,Math.PI*3/2,Math.PI*11/6];
  const angle=angles[index-4],r=47.8;
  if(angle===undefined)throw Error('Mall floor requires another authored room');
  return{x:Math.cos(angle)*r,z:MALL_LAYOUT.z+Math.sin(angle)*r,yaw:-angle-Math.PI/2,w:28,d:20,zone:'atrium'};
}

export function mallRoomContacts(kind,slot=0,radius=.8){
  const side=slot%2?1:-1;
  const cinema=kind==='cinema';
  const customer={x:cinema?9:0,y:.18,z:cinema?9:8.5};
  const vendor={x:cinema?9:0,y:.18,z:cinema?4.4:3.9};
  if(radius<=1.05&&['food','cinema'].includes(kind)){
    return{customer,vendor,seated:true,pose:'sit',
      approach:{x:side*(cinema?2.2:6),y:.18,z:cinema?-3.8:7.8},
      seat:{x:side*(cinema?4.5:8),y:.99,z:cinema?-3.8:7.4}};
  }
  if(kind==='arcade')return{customer,vendor,seated:false,pose:'play',approach:{x:side*9,y:.18,z:1.9},seat:{x:side*9,y:.18,z:1.9}};
  return{customer,vendor,seated:false,pose:'rest',approach:{x:side*8,y:.18,z:14.3},seat:{x:side*8,y:.18,z:14.3}};
}

// The new foundation is an authored excavation in this ocean only. Beyond its
// fourteen-metre shoulder the released seabed remains numerically unchanged.
export function mallFoundationBedY(x,z,natural){
  const d=mallConstructionFootprintDistance(x,z);
  if(d>=14)return natural;
  const t=Math.min(1,Math.max(0,(14-d)/12)),f=t*t*(3-2*t);
  return natural+(Math.min(natural,MALL_LAYOUT.y-2.8)-natural)*f;
}
