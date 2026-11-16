import {MOSA_RADIUS,MOSA_SEA,MOSA_HEADLANDS,mosaWaterRadius} from './mosasaur-data.js';
import {meadowCover} from './meadow-patch.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function coastMeadowCover(x,z){
 const water=mosaWaterRadius(x,z),distance=(water-1)*Math.min(MOSA_SEA.rx,MOSA_SEA.rz),outer=MOSA_RADIUS-Math.hypot(x,z);
 if(distance<0||outer<0)return {region:0,soil:1,grass:0};
 const angle=Math.atan2(z/MOSA_SEA.rz,x/MOSA_SEA.rx),path=10.8+Math.sin(angle*9)*.75;
 const worn=1-smooth(.85,2.1,Math.abs(distance-path));
 const shore=1-smooth(3.4,7,distance),edge=1-smooth(1,4,outer);
 const mottled=(.5+.5*Math.sin(x*.11+Math.sin(z*.073)))*(.5+.5*Math.cos(z*.14+Math.sin(x*.06)));
 let soil=Math.max(worn*.94,shore*.8,edge*.42,smooth(.66,.94,mottled)*.65);
 const pier=Math.abs(x)<2.8&&z>18?1-smooth(1.4,2.8,Math.abs(x)):0;soil=Math.max(soil,pier*.96);
 const local=meadowCover(x,z);soil=soil*(1-local.region)+local.soil*local.region;
 let grass=(1-soil)*smooth(4.2,7.2,distance)*smooth(.8,3,outer);
 if(MOSA_HEADLANDS.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius*1.07+.6))grass=0;
 if(Math.abs(x)<2.5&&z>18)grass=0;
 return {region:1,soil,grass};
}
export function coastMeadowCells(eye,{size=7,reach=46,limit=192}={}){
 const height=Math.abs(eye.y-.14);if(height>reach+.4)return [];
 const margin=Math.SQRT2*size*.5+reach,minX=Math.floor((eye.x-margin)/size),maxX=Math.floor((eye.x+margin)/size),minZ=Math.floor((eye.z-margin)/size),maxZ=Math.floor((eye.z+margin)/size),cells=[];
 for(let iz=minZ;iz<=maxZ;iz++)for(let ix=minX;ix<=maxX;ix++){
  const x=(ix+.5)*size,z=(iz+.5)*size,distance=Math.hypot(x-eye.x,height,z-eye.z),halfDiagonal=Math.SQRT2*size*.5;
  if(distance>reach+halfDiagonal+.4||Math.hypot(x,z)>MOSA_RADIUS+halfDiagonal)continue;
  if((mosaWaterRadius(x,z)-1)*Math.min(MOSA_SEA.rx,MOSA_SEA.rz)<-halfDiagonal-1)continue;
  cells.push({key:ix+':'+iz,ix,iz,x:ix*size,z:iz*size,size,distance});
 }
 return cells.sort((a,b)=>a.distance-b.distance||a.iz-b.iz||a.ix-b.ix).slice(0,limit);
}
