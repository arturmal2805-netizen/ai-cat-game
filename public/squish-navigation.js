import * as T from "three";
// Venue-local height queries reuse the actual deformed CPU skin. No proxy floor
// through a toy; blocked support must not fall through into another biome.
export function createSquishNavigation({ getInterior, floor, inside }) {
  const origin = new T.Vector3(),
    point = new T.Vector3(),
    ray = new T.Raycaster(),
    delta = new T.Vector3(),
    box = new T.Box3();
  function query(p, radius = 0.6, from = null, { raw = false } = {}) {
    if (!inside(p, radius)) return null;
    const interior = getInterior();
    if (!interior) return { biome: "autumn", y: floor, toy: null };
    interior.getWorldPosition(origin);
    for (const b of interior.userData.art?.userData.blockers || []) {
      const depth = (q) =>
        Math.min(
          b.w / 2 + radius - Math.abs(q.x - origin.x - b.x),
          b.d / 2 + radius - Math.abs(q.z - origin.z - b.z),
        );
      if (
        p.y < origin.y + b.h &&
        depth(p) > 0 &&
        (!from || depth(from) <= 0 || depth(p) > depth(from) + 1e-8)
      )
        return null;
    }
    let y = floor,
      toy = null,
      edge = 0;
    for (const t of interior.userData.toys) {
      t.getWorldPosition(point);
      const s = t.userData.solver.size;
      if (
        Math.abs(p.x - point.x) > s[0] / 2 + radius ||
        Math.abs(p.z - point.z) > s[2] / 2 + radius
      )
        continue;
      const centre = t.userData.surface(p.x, p.z);
      if (centre !== null && centre > y) {
        y = centre;
        toy = t;
      }
      if (radius > 0)
        for (const [dx, dz] of [
          [radius, 0],
          [-radius, 0],
          [0, radius],
          [0, -radius],
        ]) {
          const h = t.userData.surface(p.x + dx, p.z + dz);
          if (h !== null) edge = Math.max(edge, h);
        }
    }
    // Feet may stand on the top; a capsule at floor level cannot intersect a side.
    if (!raw && edge > Math.max(y, p.y) + 0.65) return null;
    if (!raw && Math.abs(p.y - y) > 0.65) return null;
    return { biome: "autumn", y, toy };
  }
  function cameraClear(a, b) {
    const interior = getInterior();
    if (!interior) return true;
    delta.copy(b).sub(a);
    const length = delta.length();
    if (length < 1e-6) return true;
    ray.set(a, delta.normalize());
    ray.far = length;
    interior.updateWorldMatrix(true, true);
    interior.getWorldPosition(origin);
    for (const block of interior.userData.art?.userData.blockers || []) {
      box.min.set(
        origin.x + block.x - block.w / 2 - 0.2,
        origin.y - 0.36,
        origin.z + block.z - block.d / 2 - 0.2,
      );
      box.max.set(
        origin.x + block.x + block.w / 2 + 0.2,
        origin.y + block.h,
        origin.z + block.z + block.d / 2 + 0.2,
      );
      const hit = ray.ray.intersectBox(box, point);
      if (hit && point.distanceTo(a) < length) return false;
    }
    for (const toy of interior.userData.toys)
      for (const mesh of toy.userData.meshes.slice(
        0,
        toy.userData.material === "foam" ? 1 : 2,
      )) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        box
          .copy(mesh.geometry.boundingBox)
          .applyMatrix4(mesh.matrixWorld)
          .expandByScalar(0.2);
        if (!ray.ray.intersectsBox(box)) continue;
        if (ray.intersectObject(mesh, false).some((h) => h.distance < length))
          return false;
      }
    return true;
  }
  return {
    support: query,
    ground: (p, radius = 0.6) => query(p, radius, null, { raw: true }),
    cameraClear,
  };
}
