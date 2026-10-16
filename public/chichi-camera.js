import * as THREE from "three";

export function createChichiCamera(
  camera,
  head,
  { reduced = false, onChange = () => {} } = {},
) {
  const face = new THREE.Vector3(),
    eye = new THREE.Vector3(),
    normalEye = new THREE.Vector3(),
    normalLook = new THREE.Vector3(),
    fromEye = new THREE.Vector3(),
    fromLook = new THREE.Vector3(),
    lastLook = new THREE.Vector3(),
    rotation = new THREE.Quaternion(),
    desiredRotation = new THREE.Quaternion(),
    offset = new THREE.Vector3();
  let enabled = false,
    transition = 1,
    zoom = 1;
  function setEnabled(value, look) {
    if (enabled === value) return enabled;
    fromEye.copy(camera.position);
    fromLook.copy(enabled ? lastLook : look);
    head.getWorldQuaternion(rotation);
    enabled = value;
    transition = reduced ? 1 : 0;
    onChange(enabled);
    return enabled;
  }
  return {
    get enabled() {
      return enabled;
    },
    setEnabled,
    zoom(delta) {
      zoom = THREE.MathUtils.clamp(zoom + delta, 0.85, 1.65);
    },
    facePoint(target) {
      head.updateWorldMatrix(true, false);
      return head.localToWorld(target.set(0, 0.035, 0.18));
    },
    update(dt, look) {
      if (!enabled && transition === 1) return false;
      normalEye.copy(camera.position);
      normalLook.copy(look);
      transition = Math.min(1, transition + dt / 0.65);
      const blend = transition * transition * (3 - 2 * transition);
      if (enabled) {
        this.facePoint(face);
        head.getWorldQuaternion(desiredRotation);
        rotation.slerp(desiredRotation, reduced ? 1 : 1 - Math.exp(-dt * 9));
        const distance =
          Math.max(
            2.5,
            1.45 /
              (2 *
                Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
                Math.min(1, camera.aspect)),
          ) * zoom;
        offset.set(0.13, 0.06, 1).normalize().applyQuaternion(rotation);
        eye.copy(face).addScaledVector(offset, distance);
        camera.position.lerpVectors(fromEye, eye, blend);
        lastLook.lerpVectors(fromLook, face, blend);
      } else {
        camera.position.lerpVectors(fromEye, normalEye, blend);
        lastLook.lerpVectors(fromLook, normalLook, blend);
      }
      camera.lookAt(lastLook);
      return true;
    },
  };
}
