// Shared ancestors are evaluated once per frame. A detached/hidden original
// contributes neither colour nor shadows, regardless of its batching mode.
export function createRenderVisibility(scene) {
  const cache = new Map();
  function visible(object) {
    if (object === scene) return scene.visible;
    const known = cache.get(object);
    if (known !== undefined) return known;
    const shown = !!(object.visible && object.parent && visible(object.parent));
    cache.set(object, shown);
    return shown;
  }
  return { visible, reset: () => cache.clear() };
}
