import * as T from 'three';
import {sculptZooAnimalSteps} from './zoo-sculpt.js';
import {runSceneSteps} from './scene-tasks.js';
import {MOSA_REEF_FORMS,reefLocalField} from './mosasaur-reef-data.js';
const cache=new Map();
const lodCache=new Map();
export const MOSA_REEF_REVISION='living-eroded-reef-ecosystem-v7';
export function installMosaReefTemplate(kind,g){g.userData.sharedScenery=true;cache.set(kind,g);}
export function installMosaReefLods(kind,geometries){for(const g of geometries)g.userData.sharedScenery=true;lodCache.set(kind,geometries);}
export function mosaReefLods(kind,full){return lodCache.get(kind)||[full,full,full];}
export function* mosaReefTemplateSteps(kind){
 if(cache.has(kind))return cache.get(kind);
 const volumes=MOSA_REEF_FORMS[kind].volumes.map(v=>({pos:v.slice(0,3),size:v.slice(3),id:0,role:'stone',color:0xe0decb,blend:1.25}));
 const g=yield* sculptZooAnimalSteps(volumes,{resolution:104,boundsMargin:1.4,targetTriangles:12000,customField:(p,out)=>reefLocalField(kind,p,out),pigment(p,c){
  const seam=Math.exp(-Math.abs(Math.sin(p[1]*.63+p[0]*.17-p[2]*.11))*12),tone=.86+.09*Math.sin(p[0]*.6+p[2]*.5)-seam*.09;c.multiplyScalar(tone);if(p[1]>32)c.lerp(new T.Color(0x789e88),.17);
 }});
 for(const name of Object.keys(g.attributes))if(!['position','normal','color','uv'].includes(name))g.deleteAttribute(name);
 const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));uv.setXY(i,(nx>ny&&nx>nz?p.getZ(i):p.getX(i))*.22,(ny>nx&&ny>nz?p.getZ(i):p.getY(i))*.22);}
 g.computeBoundingBox();g.computeBoundingSphere();g.userData.sharedScenery=true;cache.set(kind,g);return g;
}
export const mosaReefTemplate=kind=>runSceneSteps(mosaReefTemplateSteps(kind));
