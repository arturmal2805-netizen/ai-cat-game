import {RESORT_ZONES,RESORT_SPA} from './resort-spa-data.js';
export const RESORT_UPPER_APPROACH=Object.freeze([{x:0,z:309},{x:20,z:309},{x:20,z:300}]);
export const RESORT_LOWER_APPROACH=Object.freeze([{x:20,z:293.2},{x:20,z:289},{x:55,z:289},{x:55,z:247},{x:26,z:223}]);
export function corridorOutline(points,width=5){
 const half=width/2,normal=(a,b)=>{const l=Math.hypot(b.x-a.x,b.z-a.z);return{x:-(b.z-a.z)/l,z:(b.x-a.x)/l};},left=[],right=[];
 for(let i=0;i<points.length;i++){const p=points[i],a=normal(points[Math.max(0,i-1)],points[i===0?1:i]),b=normal(points[i===points.length-1?i-1:i],points[Math.min(points.length-1,i+1)]);let nx=a.x+b.x,nz=a.z+b.z,l=Math.hypot(nx,nz);nx/=l;nz/=l;const scale=half/(nx*b.x+nz*b.z);left.push({x:p.x+nx*scale,z:p.z+nz*scale});right.push({x:p.x-nx*scale,z:p.z-nz*scale});}
 return{outline:[...left,...right.reverse()],openEdges:new Set([points.length-1,points.length*2-1])};
}
export const RESORT_BRIDGES=Object.freeze(RESORT_ZONES.flatMap(zone=>{const dx=zone.x,dz=zone.z-203,len=Math.hypot(dx,dz),reach=len?1/Math.hypot(dx/len/zone.rx,dz/len/zone.rz):0,gap=Math.max(0,len-34-reach+.2);if(!gap||!len)return[];const points=[34-1.2,34+gap+1.2].map(r=>({x:dx/len*r,z:203+dz/len*r}));return[{zone,level:zone.level,y:zone.level*RESORT_SPA.rise,points,outline:corridorOutline(points).outline}];}));
const pointInside=(p,poly)=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[j],b=poly[i],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));if(Math.hypot(p.x-a.x-dx*u,p.z-a.z-dz*u)<1e-6)return false;if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;};
// Split only at real polygon intersections. The outer walls stay solid;
// interior fragments at a T/Y junction are removed from render AND physics.
export function clipPressureWall(a,b,polygons){const ts=[0,1],dx=b.x-a.x,dz=b.z-a.z;for(const poly of polygons)for(let i=0;i<poly.length;i++){const c=poly[i],d=poly[(i+1)%poly.length],ex=d.x-c.x,ez=d.z-c.z,den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const px=c.x-a.x,pz=c.z-a.z,t=(px*ez-pz*ex)/den,u=(px*dz-pz*dx)/den;if(t>0&&t<1&&u>=0&&u<=1)ts.push(t);}ts.sort((a,b)=>a-b);const out=[];for(let i=1;i<ts.length;i++){const lo=ts[i-1],hi=ts[i];if(hi-lo<1e-7)continue;const m=(lo+hi)/2;if(polygons.some(poly=>pointInside({x:a.x+dx*m,z:a.z+dz*m},poly)))continue;out.push([{x:a.x+dx*lo,z:a.z+dz*lo},{x:a.x+dx*hi,z:a.z+dz*hi}]);}return out;}
