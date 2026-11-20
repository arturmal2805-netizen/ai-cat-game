// V12: geography only. Released centres, building coordinates and save IDs stay put.
export const MOSA_EXPANSION=Object.freeze({version:12,x:650,z:350,rx:1050,rz:500,shoreWidth:30,bedY:-199.845});
export const WAREHOUSE=Object.freeze({id:'chichi-warehouse',x:1150,z:350,y:-177,width:240,depth:120,wallHeight:12,roofHeight:43.2,platformWidth:264,platformDepth:148,exteriorOnly:true});
const TAU=Math.PI*2;
export function expansionRayRadius(dx,dz){
 const {x,z,rx,rz}=MOSA_EXPANSION,a=(dx/rx)**2+(dz/rz)**2,b=-2*(dx*x/rx**2+dz*z/rz**2),c=(x/rx)**2+(z/rz)**2-1;
 return(-b+Math.sqrt(Math.max(0,b*b-4*a*c)))/(2*a);
}
export function expandedCoastPoint(a,sea,coastFactor,margin=0){
 const ox=Math.cos(a)*sea.rx*coastFactor(a),oz=Math.sin(a)*sea.rz*coastFactor(a),r=Math.hypot(ox,oz),dx=ox/r,dz=oz/r;
 const candidate=expansionRayRadius(dx,dz)*(1+.009*Math.sin(a*9)+.006*Math.cos(a*17));
 const radius=Math.max(r,candidate)+margin;return{x:dx*radius,z:dz*radius};
}
export function expandedWaterContains(x,z,sea,coastFactor,margin=0){
 const a=Math.atan2(z/sea.rz,x/sea.rx),p=expandedCoastPoint(a,sea,coastFactor,-margin);return Math.hypot(x,z)<=Math.hypot(p.x,p.z);
}
export function expandedCoastSamples(sea,coastFactor,margin=0,count=384){return Array.from({length:count+1},(_,i)=>expandedCoastPoint(i*TAU/count,sea,coastFactor,margin));}
export function expandedOverview(){return{center:[650,-55,320],radius:1160};}
export function warehousePlanBounds(){return{min:[WAREHOUSE.x-132,WAREHOUSE.y-1.2,WAREHOUSE.z-74],max:[WAREHOUSE.x+132,WAREHOUSE.y+56,WAREHOUSE.z+74]};}
