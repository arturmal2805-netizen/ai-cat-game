import * as THREE from "three";

const installed = new WeakSet();
// Keep native transforms and explicit world-space queries. A stationary prop
// need not compose its local matrix and dirty its descendants on every zoom.
export function cacheSceneMatrices(root, control = { enabled: true }) {
  function visit(object) {
    // Approved cat renderers own their complete animated/picking rig.
    if (object.userData.referenceFamily || object.userData.reference) return;
    if (
      !installed.has(object) &&
      object.updateMatrix === THREE.Object3D.prototype.updateMatrix &&
      (object.updateMatrixWorld ===
        THREE.Object3D.prototype.updateMatrixWorld ||
        object.userData.deferredHiddenMatrices)
    ) {
      installed.add(object);
      const native = object.updateMatrixWorld,
        values = new Float64Array(10),
        matrix = new THREE.Matrix4();
      let initialized = false,
        parent;
      object.updateMatrixWorld = function (force) {
        if (!control.enabled) {
          initialized = false;
          return native.call(this, force);
        }
        if (this.userData.deferredHiddenMatrices && !this.visible) {
          initialized = false;
          return native.call(this, force);
        }
        const p = this.position,
          q = this.quaternion,
          s = this.scale,
          automatic = this.matrixAutoUpdate,
          unchanged =
            initialized &&
            parent === this.parent &&
            p.x === values[0] &&
            p.y === values[1] &&
            p.z === values[2] &&
            q.x === values[3] &&
            q.y === values[4] &&
            q.z === values[5] &&
            q.w === values[6] &&
            s.x === values[7] &&
            s.y === values[8] &&
            s.z === values[9] &&
            this.matrix.equals(matrix);
        if (automatic && unchanged) this.matrixAutoUpdate = false;
        else if (automatic) {
          values[0] = p.x;
          values[1] = p.y;
          values[2] = p.z;
          values[3] = q.x;
          values[4] = q.y;
          values[5] = q.z;
          values[6] = q.w;
          values[7] = s.x;
          values[8] = s.y;
          values[9] = s.z;
          parent = this.parent;
        }
        try {
          native.call(this, force);
          if (automatic && !unchanged) {
            matrix.copy(this.matrix);
            initialized = true;
          }
        } finally {
          this.matrixAutoUpdate = automatic;
        }
      };
    }
    for (const child of object.children) visit(child);
  }
  visit(root);
}

export function cacheSceneAdditions(scene) {
  const add = scene.add,
    control = { enabled: true };
  scene.add = function (...objects) {
    for (const object of objects)
      if (object?.isObject3D) cacheSceneMatrices(object, control);
    return add.apply(this, objects);
  };
  return control;
}
