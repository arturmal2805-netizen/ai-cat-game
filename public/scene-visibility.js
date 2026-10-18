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
