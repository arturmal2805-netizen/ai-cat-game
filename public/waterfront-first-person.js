import * as T from "three";
// Native eyes, not a second camera avatar. The original head/body/rig/shadows
// remain intact. The eye mount is placed just in front of the corneas.
export function createWaterfrontFirstPerson({
  getCat,
  getActor,
  camera,
  look,
  getFrame = () => null,
}) {
  const left = new T.Vector3(),
    right = new T.Vector3(),
    eye = new T.Vector3(),
    forward = new T.Vector3(),
    aim = new T.Vector3(),
    mount = new T.Vector3();
  let active = false;
  return {
    reset() {
      active = false;
    },
    update(dt, { yaw, pitch }) {
      const cat = getCat(),
        actor = getActor();
      if (!cat || !actor) return false;
      actor.updateWorldMatrix(true, true);
      const eyes = cat.userData.eyes;
      if (eyes?.length >= 2) {
        eyes[0].getWorldPosition(left);
        eyes[1].getWorldPosition(right);
        eye.addVectors(left, right).multiplyScalar(0.5);
      } else {
        cat.userData.head.getWorldPosition(eye);
        eye.y += 0.08;
      }
      const down = T.MathUtils.clamp(pitch - 0.18, -1.15, 1.3),
        cos = Math.cos(down);
      forward.set(Math.sin(yaw) * cos, -Math.sin(down), Math.cos(yaw) * cos);
      // Vertical flight follows the real eyes exactly, avoiding head clipping from
      // a delayed chase spring. Landing vibration is deliberately small and finite.
      const frame = getFrame(),
        impact =
          frame?.phase === "land" || frame?.phase === "player-land"
            ? Math.sin((frame.motion?.age || 0) * 26) *
              Math.exp(-(frame.motion?.age || 0) * 9) *
              0.022
            : 0;
      eye.addScaledVector(mount.set(Math.sin(yaw), 0, Math.cos(yaw)), 0.28);
      eye.y += impact;
      camera.position.copy(eye);
      aim.copy(eye).addScaledVector(forward, 40);
      look.copy(aim);
      camera.up.set(0, 1, 0);
      camera.near = 0.045;
      camera.fov = 70;
      camera.updateProjectionMatrix();
      camera.lookAt(aim);
      active = true;
      return true;
    },
    get active() {
      return active;
    },
  };
}
