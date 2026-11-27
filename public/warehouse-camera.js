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
// The wider building needs a steep oblique overview. A distant underwater
// end-on fit hides its proportions and lets the bank occlude its lower facade.
export function warehouseCameraView(bounds,fov,aspect){return attractionCameraView(bounds,fov,aspect,.38,.92);}
