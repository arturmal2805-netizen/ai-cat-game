// V12: geography only. Released centres, building coordinates and save IDs stay put.
export const MOSA_EXPANSION=Object.freeze({version:12,x:1250,z:450,rx:1850,rz:750,shoreWidth:30,bedY:-199.845});
export const WAREHOUSE=Object.freeze({id:'chichi-warehouse',x:2200,z:450,y:-177,width:480,depth:240,wallHeight:12,roofHeight:43.2,platformWidth:528,platformDepth:296,exteriorOnly:true});
const TAU=Math.PI*2;
export function expansionRayRadius(dx,dz){
 const {x,z,rx,rz}=MOSA_EXPANSION,a=(dx/rx)**2+(dz/rz)**2,b=-2*(dx*x/rx**2+dz*z/rz**2),c=(x/rx)**2+(z/rz)**2-1;
 return(-b+Math.sqrt(Math.max(0,b*b-4*a*c)))/(2*a);
}
export function expandedCoastPoint(a,sea,coastFactor,margin=0){
 const ox=Math.cos(a)*sea.rx*coastFactor(a),oz=Math.sin(a)*sea.rz*coastFactor(a),r=Math.hypot(ox,oz),dx=ox/r,dz=oz/r;
 const candidate=expansionRayRadius(dx,dz)*(1+.009*Math.sin(a*9)+.006*Math.cos(a*17));
 const blend=Math.max(0,40-Math.abs(r-candidate));const radius=Math.max(r,candidate)+blend*blend/160+margin;return{x:dx*radius,z:dz*radius};
}
export function expandedWaterContains(x,z,sea,coastFactor,margin=0){
 const a=Math.atan2(z/sea.rz,x/sea.rx),p=expandedCoastPoint(a,sea,coastFactor,-margin);return Math.hypot(x,z)<=Math.hypot(p.x,p.z);
}
export function expandedCoastSamples(sea,coastFactor,margin=0,count=384){return Array.from({length:count+1},(_,i)=>expandedCoastPoint(i*TAU/count,sea,coastFactor,margin));}
export function expandedOverview(){return{center:[1250,-55,400],radius:1980};}
export function warehousePlanBounds(){return{min:[WAREHOUSE.x-WAREHOUSE.platformWidth/2-.8,WAREHOUSE.y-1.2,WAREHOUSE.z-WAREHOUSE.platformDepth/2-.8],max:[WAREHOUSE.x+WAREHOUSE.platformWidth/2+.8,WAREHOUSE.y+WAREHOUSE.wallHeight+WAREHOUSE.roofHeight+1,WAREHOUSE.z+WAREHOUSE.platformDepth/2+.8]};}

export const WAREHOUSE_REEFS=Object.freeze([[680,620],[850,90],[1110,100],[1420,260],[1400,550],[1150,640],[580,400],[1540,430]].map(([x,z],i)=>Object.freeze({x:WAREHOUSE.x+(x-1150)*1.5,z:WAREHOUSE.z+(z-350)*1.5,radius:64+i%3*8,top:-72-i%4*11})));
