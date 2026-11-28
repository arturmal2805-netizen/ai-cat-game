import * as T from "three";
import {
  createExplorerCameraFollower,
  EXPLORER_VIEW,
} from "./explorer-camera.js";
import { createSoftCameraAdjustment } from "./squish-navigation.js";
// Warehouse-only view adapter using the released follower and camera override
// hook. The global manual controller, every other venue and approved rig stay intact.
export function createWarehouseThirdPersonCamera({
  canvas,
  camera,
  look,
  getActor,
  isActive,
  clear,
}) {
  const follow = createExplorerCameraFollower(camera, look),
    anchor = new T.Vector3(),
    adjust = createSoftCameraAdjustment({
      getActor,
      clear,
      targetHeight: EXPLORER_VIEW.targetHeight,
    });
  let distance = 6;
  const wheel = (e) => {
    if (isActive())
      distance = T.MathUtils.clamp(distance + e.deltaY * 0.006, 3, 8);
  };
  canvas.addEventListener("wheel", wheel, { capture: true, passive: true });
  return {
    update(dt, { yaw, pitch }) {
      if (!isActive()) return false;
      const actor = getActor();
      if (!actor) return false;
      const view = adjust({
        yaw,
        pitch: T.MathUtils.clamp(pitch, -0.03, 0.35),
        distance,
      });
      camera.near = 0.12;
      camera.fov = 60;
      camera.updateProjectionMatrix();
      anchor.copy(actor.position);
      anchor.y += EXPLORER_VIEW.targetHeight;
      follow.update(dt, anchor, yaw, view.pitch, view.distance, cameraClear);
      return true;
      function cameraClear(a, b) {
        return clear(a, b);
      }
    },
    reset() {
      distance = 6;
      follow.reset();
    },
    dispose() {
      canvas.removeEventListener("wheel", wheel, true);
      follow.reset();
    },
  };
}
