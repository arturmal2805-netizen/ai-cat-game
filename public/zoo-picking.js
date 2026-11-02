import * as T from 'three';
import {zooJointPoint} from './zoo-animals.js';
import {zooAnimalId} from './zoo-guest-data.js';
import {zooGuestResidents} from './zoo-guest-visits.js';
import {HOUSING_CENTER,housingPlot} from './housing-data.js';
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

// Individual heads/bodies use the current baked joint pose, not every vertex.
// The native geometry remains the exact skin; these bounds are input-only.
export function pickZooAnimal(ray,actors,time){
 let best=null;
 for(const [exhibitId,mesh]of actors||[]){
  const e=ZOO_EXHIBITS.find(e=>e.id===exhibitId);if(!mesh.visible||!e)continue;
  mesh.updateWorldMatrix(true,false);
  for(let i=0;i<mesh.userData.actors.length;i++){
   const actor=mesh.userData.actors[i];if(actor.away)continue;
   const head=zooJointPoint(mesh,'head',i,mesh.userData.uniforms.uZooTime.value).applyMatrix4(mesh.matrixWorld),body=zooJointPoint(mesh,'body',i,mesh.userData.uniforms.uZooTime.value).applyMatrix4(mesh.matrixWorld);
   for(const [center,radius]of [[head,Math.max(.27,actor.scale*(e.species==='elephant'?.95:e.species==='gorilla'?.65:.58))],[body,actor.scale*(e.species==='elephant'?1.25:e.species==='gorilla'?.9:.6)]]){
    const hit=ray.intersectSphere(new T.Sphere(center,radius),new T.Vector3());if(!hit)continue;const distance=hit.distanceTo(ray.origin);if(!best||distance<best.distance)best={animalId:zooAnimalId(e.species,i),exhibitId,index:i,mesh,distance};
   }
  }
 }
 return best;
}
export function pickZooGuestHouse(point,game){
 let best=null;
 for(const h of Object.values(game.housing?.homes||{})){
  if(!zooGuestResidents(game,h.id).length)continue;const p=housingPlot(h.plot),x=point.x-HOUSING_CENTER[0]-p.x,z=point.z-HOUSING_CENTER[1]-p.z;
  if(Math.abs(x)<=5.5&&z>=-3.5&&z<=4.4){const d=x*x+z*z;if(!best||d<best.distance)best={houseId:h.id,distance:d};}
 }
 return best?.houseId||null;
}
