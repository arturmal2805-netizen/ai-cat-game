import * as T from 'three';
import {WAREHOUSE_ACCESS as A} from './warehouse-access-data.js';
import {expansionBedY} from './mosasaur-expansion.js';
import {oceanWaterContains} from './ocean-water-domain.js';
import {mallPressureDistance} from './mall-pressure.js';
import {mosaActiveReefClearance} from './mosasaur-reef-data.js';
import {waterfrontOceanClear} from './waterfront-navigation.js';
const vector=p=>new T.Vector3(p.x,p.y,p.z);
// Shared arc-length samples: construction and clearance once, interpolation
// only during the bounded shuttle simulation. Both directions use one route.
export function createWarehouseShuttleRoute(samples=1024){
 const depart=vector(A.departure),clear=new T.Vector3(250,-8,110),dock=vector(A.dock);
 const segments=[new T.CubicBezierCurve3(depart,new T.Vector3(35,-2,94),new T.Vector3(170,-6,104),clear),new T.CubicBezierCurve3(clear,new T.Vector3(1050,-90,180),new T.Vector3(dock.x,dock.y,dock.z+120),dock)],path=new T.CurvePath();segments.forEach(s=>path.add(s));
 const points=path.getSpacedPoints(samples),distances=new Float64Array(points.length);
 for(let i=1;i<points.length;i++)distances[i]=distances[i-1]+points[i].distanceTo(points[i-1]);
 const length=distances.at(-1),position=new T.Vector3(),tangent=new T.Vector3();
 return{length,points,distances,sample(distance,reverse=false,out={}){
  const d=T.MathUtils.clamp(reverse?length-distance:distance,0,length);let lo=0,hi=distances.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(distances[mid]<d)lo=mid;else hi=mid;}
  const u=(d-distances[lo])/Math.max(1e-9,distances[hi]-distances[lo]);position.copy(points[lo]).lerp(points[hi],u);tangent.copy(points[hi]).sub(points[lo]).normalize();if(reverse)tangent.negate();
  out.x=position.x;out.y=position.y;out.z=position.z;out.yaw=Math.atan2(tangent.x,tangent.z);out.pitch=Math.atan2(tangent.y,Math.hypot(tangent.x,tangent.z));return out;
 }};
}
export function warehouseShuttleClear(p,radius=1.6){
 if(!oceanWaterContains(p.x,p.z,radius+2)||p.y<expansionBedY(p.x,p.z)+radius||mallPressureDistance(p.x,p.y,p.z)<radius||mosaActiveReefClearance(p.x,p.y,p.z)<radius||!waterfrontOceanClear(p,radius))return false;
 // Keep the short departure corridor north of the unchanged SPA; the long
 // descent is already east of its complete structural extent.
 if(p.x<170+radius&&p.x> -170-radius&&p.z>137-radius&&p.z<300+radius&&p.y> -170-radius&&p.y<8+radius)return false;
 return true;
}
