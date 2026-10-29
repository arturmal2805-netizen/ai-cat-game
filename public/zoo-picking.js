import {ZOO_BIOME,ZOO_EXHIBITS} from './zoo-data.js';
// Pick the actual habitat volume, before unrelated buildings behind its grass.
// No visible proxy, skinning, scene traversal or new mesh/buffer is needed.
export function pickZooExhibit(ray,origin=ZOO_BIOME.center){
 let best=null;
 for(const e of ZOO_EXHIBITS){
  const x=ray.origin.x-origin[0]-e.x,z=ray.origin.z-origin[1]-e.z,dx=ray.direction.x,dz=ray.direction.z,dy=ray.direction.y,r=e.radius+.2,h=e.species==='gorilla'?7:e.species==='elephant'?5:4.5;
  const accept=t=>{if(t<0||!Number.isFinite(t)||best&&t>=best.distance)return;const y=ray.origin.y+dy*t;if(y<0||y>h)return;best={id:e.id,distance:t};};
  const a=dx*dx+dz*dz,b=2*(x*dx+z*dz),c=x*x+z*z-r*r,d=b*b-4*a*c;
  if(a>1e-12&&d>=0){const s=Math.sqrt(d);accept((-b-s)/(2*a));accept((-b+s)/(2*a));}
  if(Math.abs(dy)>1e-12)for(const y of [0,h]){const t=(y-ray.origin.y)/dy;if((x+dx*t)**2+(z+dz*t)**2<=r*r)accept(t);}
 }
 return best;
}
