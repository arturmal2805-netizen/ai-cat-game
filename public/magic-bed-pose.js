import * as T from 'three';
// A short planar two-joint reach on the approved rig. Native animateCat resets
// both X hinges every frame, including cancellation; never alter rest anatomy,
// shoulder bones, other Euler axes, sculpt buffers or the persistent cat cache.
const target=new T.Vector3(),tip=new T.Vector3(),from=new T.Vector3(),to=new T.Vector3(),inverse=new T.Matrix4();
export function applyMagicBedReach(model,root,plan,reduced=false){
 const weight=plan?.reach||0;if(reduced||weight<.001)return;
 const d=model.userData,index=d.legs.findIndex(l=>l.position.z>0&&l.position.x>0),leg=d.legs[index],j=d.legJoints?.[index];if(!leg||!j)return;
 root.updateWorldMatrix(true,false);target.fromArray(plan.reachPoint).applyMatrix4(root.matrixWorld);
 for(let pass=0;pass<4;pass++)for(const joint of [j.knee,leg]){
   leg.updateWorldMatrix(true,true);j.ankle.getWorldPosition(tip);inverse.copy(joint.parent.matrixWorld).invert();from.copy(tip).applyMatrix4(inverse).sub(joint.position);to.copy(target).applyMatrix4(inverse).sub(joint.position);
   const angle=Math.atan2(from.y*to.z-from.z*to.y,from.y*to.y+from.z*to.z);joint.rotation.x+=T.MathUtils.clamp(angle,-.7,.7)*weight*.8;
 }
}
