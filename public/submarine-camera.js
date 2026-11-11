import * as T from 'three';

// The world computes its ordinary orbit earlier in the same frame. Retain the
// submarine's own smoothed position instead of interpolating from that orbit
// again every frame, which otherwise keeps the boat at the edge of the view.
export function createSubmarineCameraFollower(camera,look){
 const position=new T.Vector3(),target=new T.Vector3();let active=false;
 return {reset(){active=false;},update(dt,eye,aim,velocity=null){
  if(!active){position.copy(camera.position);target.copy(look);active=true;}
  if(velocity){position.addScaledVector(velocity,Math.max(0,dt));target.addScaledVector(velocity,Math.max(0,dt));}
  const ease=1-Math.exp(-Math.max(0,dt)*8);position.lerp(eye,ease);target.lerp(aim,ease);
  camera.position.copy(position);look.copy(target);camera.up.set(0,1,0);camera.lookAt(look);
 }};
}
