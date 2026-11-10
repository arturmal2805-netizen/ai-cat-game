import {sculptZooAnimalSteps} from './zoo-sculpt.js';
import * as T from 'three';
const bodyVolumes=[
 [[0,-.12,-.5],[1.94,1.50,3.95],0x244b56],[[0,.16,2.4],[2.13,1.55,2.35],0x2d5360],
 [[0,.17,4.05],[1.72,1.10,1.90],0x547b88],[[0,.28,5.0],[1.68,.96,1.75],0x507582],
 [[0,.21,6.75],[1.28,.66,2.32],0x608491],[[0,.30,8.48],[1.08,.64,.90],0x628692],
 [[-1.36,.93,4.8],[.45,.21,.77],0x476d7a],[[1.36,.93,4.8],[.45,.21,.77],0x476d7a],
 [[0,-.18,-4.6],[1.24,1.05,2.55],0x234a56],[[0,-.20,-6.7],[.80,.72,1.65],0x224955],
 [[0,-.20,-8.2],[.48,.44,1.35],0x214955],[[0,-.15,-9.6],[.24,.26,1.1],0x224a55]
];
const jawVolumes=[[[0,-.12,2.8],[1.48,.34,2.75],0x849995],[[0,-.10,5.1],[.99,.32,.80],0x849995],[[1.15,-.14,.65],[.58,.48,1.0],0x527783],[[-1.15,-.14,.65],[.58,.48,1.0],0x527783]];
export const MOSA_ANATOMY_REVISION='marine-predator-continuous-v5';
export function* sculptMosasaurSteps(kind){
 const bellyTint=new T.Color(0x81978d);
 const jaw=kind==='jaw',volumes=(jaw?jawVolumes:bodyVolumes).map(([pos,size,color])=>({pos,size,color,id:0,role:'body',blend:jaw?.16:.20}));
 const sockets=jaw?[{pos:[0,.45,3.2],size:[1.24,.31,2.65]}]:[
  {pos:[0,-1.15,6.6],size:[3.6,1.0,3.2]},
  ...[-1,1].map(s=>({pos:[s*1.55,.58,4.85],size:[.26,.22,.32]})),
  ...[-1,1].map(s=>({pos:[s*.42,.90,8.4],size:[.15,.18,.26]}))
 ];
 const g=yield* sculptZooAnimalSteps(volumes,{resolution:jaw?72:112,boundsMargin:.65,soft:jaw?.14:.20,sockets,targetTriangles:jaw?5000:14500,pigment(p,c){
  if(!jaw){c.lerp(new T.Color(0x6d929c),.27);const belly=T.MathUtils.smoothstep(-p[1],.20,1.4);c.lerp(bellyTint,belly*.7);const mottles=Math.sin(p[0]*9+p[2]*4)*Math.cos(p[2]*5-p[1]*12);c.multiplyScalar(.88+Math.max(0,mottles)*.24);}
 }});
 // Retopology can leave a zero-thickness folded triangle pair inside a narrow
 // neck. Remove only identical opposing faces, leaving the closed skin intact.
 const index=g.index.array,seen=new Map(),removed=new Set();
 for(let i=0;i<index.length;i+=3){const face=[index[i],index[i+1],index[i+2]],key=face.slice().sort((a,b)=>a-b).join(':');if(seen.has(key)){removed.add(seen.get(key));removed.add(i);}else seen.set(key,i);}
 if(removed.size){const clean=[];for(let i=0;i<index.length;i+=3)if(!removed.has(i))clean.push(index[i],index[i+1],index[i+2]);g.setIndex(clean);}
 for(const name of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(name))g.deleteAttribute(name);
 const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){uv.setXY(i,Math.atan2(p.getY(i),p.getX(i))/(Math.PI*2)*3,p.getZ(i)*.32);}
 g.computeBoundingBox();g.computeBoundingSphere();g.userData.mosasaurRevision=MOSA_ANATOMY_REVISION;return g;
}
