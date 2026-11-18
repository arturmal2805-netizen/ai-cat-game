import * as T from 'three';
import {spaPath} from './spa-navigation.js';
import {manualBuildingSupport} from './manual-building-navigation.js';
import {RESORT_SPA as L,RESORT_FOOT_OFFSET as F,RESORT_STAIRS} from './resort-spa-data.js';
// One source for navigation and camera: exact support triangles + individual
// solid segments. A merged floor's bounding box must never close a basin hole.
export function createResortSpaNavigation(root){
 root.updateWorldMatrix(true,true);const ray=new T.Raycaster(),origin=new T.Vector3(),down=new T.Vector3(0,-1,0),point=new T.Vector3(),surfaces=[root.userData.surfaces,root.userData.solid,...[...root.userData.zones.values()].map(z=>z.userData.solid).filter(Boolean)];
 // Broad phase only: final support still comes from the exact source triangle.
 // Do not raycast every table, stair and pavilion for each 12cm walking step.
 const cells=new Map(),inverse=root.matrixWorld.clone().invert(),matrix=new T.Matrix4();
 for(const group of surfaces)group.traverse(o=>{if(!o.isMesh||o.material?.uniforms?.uWaterField)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();matrix.multiplyMatrices(inverse,o.matrixWorld);const bounds=o.geometry.boundingBox.clone().applyMatrix4(matrix),entry={mesh:o,minY:bounds.min.y,maxY:bounds.max.y};for(let x=Math.floor(bounds.min.x/8);x<=Math.floor(bounds.max.x/8);x++)for(let z=Math.floor(bounds.min.z/8);z<=Math.floor(bounds.max.z/8);z++){const key=x+','+z;let row=cells.get(key);if(!row)cells.set(key,row=[]);row.push(entry);}});
 function support(p,radius=.571){
  origin.set(p.x+root.position.x,p.y+L.y+.65,p.z+root.position.z);ray.set(origin,down);ray.near=0;ray.far=1.4;
  const candidates=(cells.get(Math.floor(p.x/8)+','+Math.floor(p.z/8))||[]).filter(e=>e.maxY>=p.y-.75&&e.minY<=p.y+.65).map(e=>e.mesh);for(const d of root.userData.dynamicSurfaces||[]){d.updateWorldMatrix(true,false);candidates.push(d);}const hits=ray.intersectObjects(candidates,false),hit=hits.find(h=>h.face?.normal.y>.6&&!h.object.material?.uniforms?.uWaterField);if(!hit)return null;
  const ground=hit.point.y-L.y+F;if(Math.abs(ground-p.y)>.65)return null;
  const body=manualBuildingSupport(root.userData.navigation,p,radius,{ground,footOffset:F});return body&&(!root.userData.accessGeometry||root.userData.accessGeometry.clear(p,radius))?{x:p.x,y:body.y,z:p.z}:null;
 }
 function segmentClear(a,b,radius=.571){const length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),n=Math.max(1,Math.ceil(length/.12));for(let i=0;i<=n;i++){const u=i/n;point.set(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,a.z+(b.z-a.z)*u);if(!support(point,radius))return false;}return true;}
 function floorPath(a,b,radius=.571){if(Math.abs(a.y-b.y)>.65)return null;const y=a.y,shift=p=>({x:p.x,z:p.z-L.z}),clear=p=>!!support({x:p.x,y,z:p.z+L.z},radius),path=spaPath(shift(a),shift(b),radius,[],clear,{extent:160,cell:.85});if(!path)return null;const out=path.map(p=>({x:p.x,y,z:p.z+L.z}));let previous=a;for(const p of out){if(!segmentClear(previous,p,radius))return null;previous=p;}return out;}
 function path(a,b,radius=.571){const from=Math.round(a.y/L.rise),to=Math.round(b.y/L.rise);if(from===to)return floorPath(a,b,radius);if(from<0||from>2||to<0||to>2)return null;const out=[],append=p=>{if(!p)return false;out.push(...p);return true;};let current=a;
  for(let level=from;level!==to;level+=Math.sign(to-from)){const up=to>from,s=RESORT_STAIRS[up?level:level-1],base=s.level*L.rise,points=[{x:s.x,y:base+F,z:185.5}];for(let i=0;i<s.count;i++){const edge=s.z-s.run/2+i*s.run,z=edge-radius-.02,y=base+(i+1)*s.rise+F;points.push({x:s.x,y:i?y-s.rise:base+F,z},{x:s.x,y,z},{x:s.x,y,z:z+s.run});}points.push({x:s.x,y:base+L.rise+F,z:s.landingZ});if(!up)points.reverse();if(!append(floorPath(current,points[0],radius)))return null;let previous=points[0];for(const p of points){if(!segmentClear(previous,p,radius))return null;previous=p;}out.push(...points);current=points.at(-1);}
  return append(floorPath(current,b,radius))?out:null;
 }
 return{support,segmentClear,floorPath,path};
}
