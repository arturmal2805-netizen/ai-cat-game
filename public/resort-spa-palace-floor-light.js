import * as T from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
// Refine ONLY the temporary render copy. Physics keeps its small original
// floor mesh and exact holes; no extra ray triangles or per-frame work.
export function* palaceFloorLightSteps(source,matrix,zones,lamps){
 if(!/^SPA (continuous sealed floor|preserved |continuous middle service ceiling)/.test(source.name))return null;
 yield;const g=new TessellateModifier(5,8).modify(source.geometry),positions=g.attributes.position,ids=new Uint8Array(positions.count),p=new T.Vector3(),q=new T.Vector3();
 for(let i=0;i<positions.count;i+=3){if((i%3072)===0)yield;p.set(0,0,0);for(let j=0;j<3;j++)p.add(q.fromBufferAttribute(positions,i+j));p.multiplyScalar(1/3).applyMatrix4(matrix);
  const zone=zones.reduce((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)<Math.hypot(p.x-b.x,p.z-b.z)?a:b),light=lamps.get(zone.id).reduce((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)<Math.hypot(p.x-b.x,p.z-b.z)?a:b);ids.fill(light.id,i,i+3);
 }g.setAttribute('aMallRoom',new T.Uint8BufferAttribute(ids,1));g.setAttribute('aMallCutaway',new T.Uint8BufferAttribute(new Uint8Array(positions.count).fill(source.geometry.attributes.aMallCutaway?.getX(0)||0),1));return g;
}
