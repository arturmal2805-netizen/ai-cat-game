import * as T from 'three';
import {spaPath} from './spa-navigation.js';
import {manualBuildingSupport} from './manual-building-navigation.js';
import {RESORT_SPA as L} from './resort-spa-data.js';
// One source for navigation and camera: exact support triangles + individual
// solid segments. A merged floor's bounding box must never close a basin hole.
export function createResortSpaNavigation(root){
 root.updateWorldMatrix(true,true);const ray=new T.Raycaster(),origin=new T.Vector3(),down=new T.Vector3(0,-1,0),point=new T.Vector3(),surfaces=[root.userData.surfaces,...[...root.userData.zones.values()].map(z=>z.userData.solid).filter(Boolean)];
 function support(p,radius=.571){
  origin.set(p.x+root.position.x,p.y+L.y+.65,p.z+root.position.z);ray.set(origin,down);ray.near=0;ray.far=1.4;
  const hits=ray.intersectObjects(surfaces,true),hit=hits.find(h=>h.face?.normal.y>.6&&!h.object.material?.uniforms?.uWaterField);if(!hit)return null;
  const ground=hit.point.y-L.y+.18;if(Math.abs(ground-p.y)>.65)return null;
  const body=manualBuildingSupport(root.userData.navigation,p,radius,{ground});return body?{x:p.x,y:body.y,z:p.z}:null;
 }
 function segmentClear(a,b,radius=.571){const length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),n=Math.max(1,Math.ceil(length/.12));for(let i=0;i<=n;i++){const u=i/n;point.set(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,a.z+(b.z-a.z)*u);if(!support(point,radius))return false;}return true;}
 function floorPath(a,b,radius=.571){if(Math.abs(a.y-b.y)>.65)return null;const y=a.y,shift=p=>({x:p.x,z:p.z-L.z}),clear=p=>!!support({x:p.x,y,z:p.z+L.z},radius),path=spaPath(shift(a),shift(b),radius,[],clear,{extent:160,cell:.85});if(!path)return null;const out=path.map(p=>({x:p.x,y,z:p.z+L.z}));let previous=a;for(const p of out){if(!segmentClear(previous,p,radius))return null;previous=p;}return out;}
 return{support,segmentClear,floorPath};
}
