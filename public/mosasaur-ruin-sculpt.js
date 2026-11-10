import * as T from 'three';
import {sculptZooAnimalSteps} from './zoo-sculpt.js';
import {showcaseSurfaceMap} from './showcase-surface-details.js';
// A continuous weathered carving, not a stack of visible primitive stones.
export function* oceanGuardianSteps(){
 const raw=[[[0,3,0],[2.1,3.3,1.9]],[[0,1.1,.35],[1.7,1.3,1.5]],[[0,2.5,1.75],[.43,1.1,.65]],
  [[-.82,3.65,1.55],[.81,.26,.57]],[[.82,3.65,1.55],[.81,.26,.57]],[[0,1.45,1.62],[.75,.14,.35]],
  [[-2,3,0],[.43,.9,.8]],[[2,3,0],[.43,.9,.8]],[[0,.5,.9],[1.05,.6,.8]]];
 const volumes=raw.map(([pos,size])=>({pos,size,color:0x9aa99c,id:0,role:'stone',blend:.15}));
 const geometry=yield* sculptZooAnimalSteps(volumes,{resolution:52,soft:.14,targetTriangles:3500,sockets:[...[-1,1].map(side=>({pos:[side*.82,3.17,1.90],size:[.53,.25,.46]})),{pos:[0,1.29,1.95],size:[.67,.055,.28]}],pigment(p,c){c.multiplyScalar(.87+.10*Math.sin(p[1]*8+p[0]*2)*Math.cos(p[2]*5));if(p[1]<1)c.lerp(new T.Color(0x6f9c87),.35);}});
 for(const name of Object.keys(geometry.attributes))if(!['position','normal','color','uv'].includes(name))geometry.deleteAttribute(name);
 const p=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)*.28,p.getY(i)*.28);
 geometry.computeBoundingBox();geometry.computeBoundingSphere();const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,map:showcaseSurfaceMap('stone'),roughness:.88}),mesh=new T.Mesh(geometry,material);mesh.name='Ancient submerged guardian, eroded face and carved eye sockets';return mesh;
}
