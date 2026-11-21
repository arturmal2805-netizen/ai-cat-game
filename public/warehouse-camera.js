import {attractionCameraView} from './camera-views.js';
import {Box3} from 'three';
const boundsCache=new WeakMap();
// The exterior is immutable. Keep its exact native vertex bound across toolbar
// visits, with a fresh bound if its world transform or model identity changes.
export function warehouseCameraBounds(model){
 model.updateWorldMatrix(true,true);
 let entry=boundsCache.get(model);
 if(!entry||!entry.matrix.equals(model.matrixWorld)){
  entry={matrix:model.matrixWorld.clone(),bounds:new Box3().setFromObject(model,true)};
  boundsCache.set(model,entry);
 }
 return entry.bounds.clone();
}
// Look along the long open-water axis. Keep the eye underwater on portrait
// screens while fitting the actual shell, not only its purchase footprint.
export function warehouseCameraView(bounds,fov,aspect){let elevation=.12,view;for(let i=0;i<3;i++){view=attractionCameraView(bounds,fov,aspect,-Math.PI/2-.16,elevation);elevation=Math.min(.12,Math.asin(Math.min(.999,80/view.distance)));}return attractionCameraView(bounds,fov,aspect,-Math.PI/2-.16,elevation);}
