import * as THREE from "three";

// The approved face rig supplies the lip position AFTER this frame's head/paw
// animation. A fixed distance from the carrier put cups inside larger heads.
const lip = new THREE.Vector3(),
  forward = new THREE.Vector3(),
  rim = new THREE.Vector3(),
  scale = new THREE.Vector3(),
  orientation = new THREE.Quaternion(),
  tilt = new THREE.Quaternion();
const axis = new THREE.Vector3(1, 0, 0);
export function placeCourtFood(
  food,
  model,
  carrier,
  { kind, drinking = false, time = 0 } = {},
) {
  const d = model.userData;
  d.head.updateWorldMatrix(true, false);
  scale.setFromMatrixScale(model.matrixWorld);
  const size = THREE.MathUtils.clamp(scale.x * 0.82, 0.37, 1.3),
    sip = drinking ? (Math.sin(time * 3) + 1) * 0.5 : 0,
    drink = kind === "coffee" || kind === "boba";
  carrier.getWorldQuaternion(orientation);
  forward.set(0, 0, 1).applyQuaternion(orientation);
  lip.copy(d.mouth.position).applyMatrix4(d.head.matrixWorld);
  food.scale.setScalar(size);
  food.quaternion.copy(orientation);
  if (drink) {
    tilt.setFromAxisAngle(axis, -0.1 - sip * 0.32);
    food.quaternion.multiply(tilt);
    // Coffee touches the near rim; bubble tea touches the actual straw tip.
    rim
      .set(
        kind === "boba" ? 0.16 : 0,
        kind === "boba" ? 1 : 0.55,
        kind === "boba" ? 0 : -0.23,
      )
      .multiplyScalar(size)
      .applyQuaternion(food.quaternion);
    food.position
      .copy(lip)
      .addScaledVector(forward, 0.025 * scale.x + (1 - sip) * 0.12 * scale.x)
      .sub(rim);
    food.position.y -= (drinking ? (1 - sip) * 0.14 : 0.25) * scale.x;
  } else {
    food.position.copy(lip).addScaledVector(forward, 0.25 * scale.x);
    food.position.y -= 0.3 * scale.x;
  }
  food.updateMatrixWorld(true);
  return food;
}
