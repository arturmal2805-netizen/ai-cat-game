import * as T from "three";
// Contact markers are sampled from the approved SKINNED paw vertices. Original
// vertex buffers/anatomy are never edited. Native animateCat resets the small
// leg-height correction on the next frame and on cancellation.
const markers = new WeakMap();
function refresh(model) {
  model.updateWorldMatrix(true, false);
  model.updateMatrixWorld(true);
}
function pawMarkers(model) {
  if (markers.has(model)) return markers.get(model);
  const list = [];
  for (const [index, leg] of (model.userData.legs || []).entries()) {
    let mesh,
      vertex = 0,
      min = Infinity;
    leg.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++)
        if (p.getY(i) < min) {
          min = p.getY(i);
          mesh = o;
          vertex = i;
        }
    });
    if (mesh)
      list.push({
        index,
        leg,
        mesh,
        vertex,
        point: new T.Vector3(),
        previous: new T.Vector3(),
        initialized: false,
      });
  }
  markers.set(model, list);
  return list;
}
export function createSquishCatContacts() {
  const pending = [],
    activeKeys = new Map(),
    diagnostic = [];
  const measure = (p) => {
    p.mesh.getVertexPosition(p.vertex, p.point);
    p.mesh.localToWorld(p.point);
    return p.point;
  };
  function collect(id, model, carrier, toy, age, reduced = false) {
    if (pending.length >= 8) return;
    const paws = pawMarkers(model);
    if (!paws.length) return;
    for (const p of paws) {
      p.swing =
        p.leg.position.z > 0 && !reduced
          ? Math.max(
              0,
              Math.sin(age * 4 + (p.leg.position.x < 0 ? 0 : Math.PI)),
            ) * 0.1
          : 0;
      p.leg.position.y += p.swing;
    }
    refresh(model);
    pending.push({ id, model, carrier, toy, age, paws });
  }
  function flush(dt, toys) {
    diagnostic.length = 0;
    for (const [solver, keys] of activeKeys)
      for (const key of keys) solver.release(key);
    activeKeys.clear();
    for (const v of pending) {
      const solver = v.toy.userData.solver,
        keys = activeKeys.get(solver) || [];
      activeKeys.set(solver, keys);
      for (const p of v.paws) {
        if (p.swing > 0.04) continue;
        measure(p);
        const target = v.toy.userData.surface(p.point.x, p.point.z);
        if (target === null || p.point.y - target > 0.13) continue;
        const local = v.toy.worldToLocal(p.point.clone()),
          [sx, sy, sz] = solver.size,
          y = v.toy.userData.restSurfaceHeight(local.x, local.z),
          velocity = p.initialized
            ? p.point
                .clone()
                .sub(p.previous)
                .multiplyScalar(1 / Math.max(dt, 1 / 120))
            : new T.Vector3();
        p.previous.copy(p.point);
        p.initialized = true;
        const force = T.MathUtils.clamp(
            22 + Math.max(0, -velocity.y) * 10,
            15,
            160,
          ),
          key = v.id + ":paw:" + p.index,
          twist = Math.sin(v.age * 0.7) * 0.025;
        solver.setContact(key, {
          point: [local.x, y, local.z],
          displacement: [-local.z * twist, -0.45, local.x * twist],
          radius: 0.65,
          force,
          velocity: velocity.toArray(),
        });
        keys.push(key);
      }
    }
    for (const toy of toys) {
      toy.userData.solver.step(dt);
      toy.userData.update(dt);
    }
    for (const v of pending) {
      let sum = 0,
        n = 0;
      for (const p of v.paws) {
        if (p.swing > 0.04) continue;
        measure(p);
        const y = v.toy.userData.surface(p.point.x, p.point.z);
        if (y !== null) {
          sum += y - p.point.y;
          n++;
        }
      }
      if (n) v.carrier.position.y += T.MathUtils.clamp(sum / n, -0.16, 0.16);
      refresh(v.model);
      for (const p of v.paws) {
        if (p.swing > 0.04) continue;
        measure(p);
        const y = v.toy.userData.surface(p.point.x, p.point.z);
        if (y === null) continue;
        const correction = T.MathUtils.clamp(y - p.point.y, -0.14, 0.14);
        p.leg.position.y +=
          correction / Math.max(0.1, v.model.getWorldScale(new T.Vector3()).y);
        refresh(v.model);
        measure(p);
        diagnostic.push({
          id: v.id,
          paw: p.index,
          point: p.point.toArray(),
          surface: y,
          error: p.point.y - y,
          contact: Math.abs(p.point.y - y) < 0.13,
          force: 22,
          area: 0.035,
          material: v.toy.userData.material,
        });
      }
    }
    pending.length = 0;
  }
  return {
    collect,
    flush,
    get diagnostics() {
      return diagnostic;
    },
    clear() {
      for (const [s, keys] of activeKeys)
        for (const key of keys) s.release(key);
      activeKeys.clear();
      pending.length = 0;
      diagnostic.length = 0;
    },
  };
}
