import {MOSA_SEA} from './mosasaur-data.js';
export const SUBMARINE_AIR_LEVEL=MOSA_SEA.surfaceY+.15;
export const submarineAirborne=state=>state.y>SUBMARINE_AIR_LEVEL;

// The native chase camera looks along +Z, whose screen-left is world +X.
// Keep this keyboard/touch mapping separate from the physics/autopilot yaw API.
export function submarineControlInput(keys,state){
  const axis=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),air=submarineAirborne(state);
  return{forward:air?0:axis,flip:air?axis:0,
    turn:(keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0),
    vertical:(keys.has('Space')?1:0)-(keys.has('ShiftLeft')||keys.has('ShiftRight')?1:0),boost:keys.has('Space')};
}
