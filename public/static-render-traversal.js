// Originals remain the collision/picking/save objects. Once their identical
// batch owns both colour and shadow draws, omit CPU-only mesh leaves from
// render traversal and restore their exact arrays before callbacks/on errors.
export function createStaticRenderTraversal(scene, renderer) {
  const native = renderer.render,
    after = scene.onAfterRender;
  const records = new Map(),
    pruned = [];
  let sources = null;
  const restore = () => {
    for (const [parent, children] of pruned) parent.children = children;
    pruned.length = 0;
  };
  function draw(...args) {
    try {
      return native.apply(renderer, args);
    } finally {
      restore();
    }
  }
  function done(...args) {
    restore();
    return after.apply(scene, args);
  }
  if (typeof native === "function") {
    renderer.render = draw;
    scene.onAfterRender = done;
  }
  const control = {
    enabled: true,
    stats: { omitted: 0, parents: 0 },
    prune(entries, worthwhile = true) {
      control.stats.omitted = 0;
      control.stats.parents = 0;
      if (typeof native !== "function" || !control.enabled || !worthwhile)
        return;
      if (sources !== entries) {
        records.clear();
        sources = entries;
        for (const e of entries) {
          const parent = e.mesh.parent;
          if (!parent) continue;
          if (!records.has(parent))
            records.set(parent, {
              entries: new Map(),
              full: null,
              keep: null,
              flags: [],
            });
          records.get(parent).entries.set(e.mesh, e);
        }
      }
      for (const [parent, r] of records) {
        const children = parent.children;
        let changed = r.full !== children || r.flags.length !== children.length;
        let removed = 0;
        for (let i = 0; i < children.length; i++) {
          const child = children[i],
            skip = !!(r.entries.get(child)?.prunable && !child.children.length);
          if (skip) removed++;
          if (r.flags[i]?.child !== child || r.flags[i]?.skip !== skip) {
            changed = true;
            r.flags[i] = { child, skip };
          }
        }
        r.flags.length = children.length;
        if (!removed) continue;
        control.stats.omitted += removed;
        control.stats.parents++;
        if (changed) {
          r.full = children;
          r.keep = children.filter((_, i) => !r.flags[i].skip);
        }
        parent.children = r.keep;
        pruned.push([parent, children]);
      }
    },
    restore,
    dispose() {
      restore();
      records.clear();
      if (renderer.render === draw) renderer.render = native;
      if (scene.onAfterRender === done) scene.onAfterRender = after;
    },
  };
  return control;
}
