// Three normally walks even invisible subtrees to update world matrices.
// Keep hidden island detail / distant cat rigs asleep until they are shown.
// Explicit updateWorldMatrix/localToWorld calls (picking and face cameras)
// remain available. Showing the branch forces a complete, correct refresh.
export function pauseHiddenMatrixUpdates(branch) {
  if (!branch || branch.userData.deferredHiddenMatrices) return;
  branch.userData.deferredHiddenMatrices = true;
  const update = branch.updateMatrixWorld;
  branch.updateMatrixWorld = function (force) {
    if (!this.visible) {
      this.matrixWorldNeedsUpdate = true;
      return;
    }
    update.call(this, force);
  };
}

export function prepareIslandMatrices(island) {
  pauseHiddenMatrixUpdates(island.userData.detail);
  pauseHiddenMatrixUpdates(island.userData.lowDetail);
  island.updateMatrix();
  island.matrixAutoUpdate = false;
}

// Non-hero reference rigs retain old hidden construction/picking surfaces.
// A hidden mesh leaf has no child bones or visible descendants to update.
// Keep explicit world-space/picking queries current, including attached skin
// inverses, and resume native updates immediately when it becomes visible.
export function deferHiddenLeafMatrices(root, control = { enabled: true }) {
  root.traverse((object) => {
    // GPU draw batches decide their visibility after rig matrix traversal.
    // They must always receive the current carrier matrix before that decision.
    if (!object.isMesh || object.children.length || object.userData.rigSources)
      return;
    const update = object.updateMatrixWorld,
      query = object.updateWorldMatrix;
    object.updateMatrixWorld = function (force) {
      if (control.enabled && !this.visible && !this.children.length) {
        this.matrixWorldNeedsUpdate = true;
        return;
      }
      return update.call(this, force);
    };
    object.updateWorldMatrix = function (...args) {
      const value = query.apply(this, args);
      if (
        control.enabled &&
        !this.visible &&
        !this.children.length &&
        this.isSkinnedMesh
      )
        update.call(this, true);
      return value;
    };
  });
  return control;
}
