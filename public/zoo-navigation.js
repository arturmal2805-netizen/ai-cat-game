import {ZOO_ID,zooObstacles} from './zoo-data.js';
import {courtWalkable,nearestCourtGround} from './foodcourt-navigation.js';
// Only initial restoration: old public ground can become part of an enlarged
// habitat. Keep every still-valid saved position exactly; never rescale saves
// or relocate a living cat when another building is placed.
export function safeZooRestoredPosition(point,radius){
 const obstacles=zooObstacles();if(courtWalkable(point,radius,obstacles,ZOO_ID))return point;
 const clear=nearestCourtGround(point,radius,obstacles,ZOO_ID);return clear?{...point,x:clear.x,y:.16,z:clear.z}:point;
}
