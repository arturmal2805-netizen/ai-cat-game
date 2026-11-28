import * as T from "three";
// Twelve inertial filler clusters carry ninety-six visible beads. No per-bead
// rigid body, per-frame allocation or scene reconstruction; one instanced draw.
export function createCrunchyFiller({ root, solver }) {
  const count = 12,
    p = new Float64Array(count * 3),
    v = new Float64Array(count * 3),
    rest = new Float64Array(count * 3),
    target = new Float64Array(count * 3),
    sample = new Float64Array(3),
    geometry = new T.SphereGeometry(1, 12, 8),
    material = new T.MeshPhysicalMaterial({
      color: 0xffd9f4,
      roughness: 0.18,
      metalness: 0.12,
      clearcoat: 1,
      vertexColors: false,
    }),
    mesh = new T.InstancedMesh(geometry, material, count * 8),
    dummy = new T.Object3D();
  mesh.name = "Crunchy filler · 12 physical clusters / 96 beads";
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.castShadow = true;
  root.add(mesh);
  const [sx, sy, sz] = solver.size;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399963,
      radius = 0.42 + Math.sqrt((i % 5) / 5) * sx * 0.24;
    rest[i * 3] = Math.cos(angle) * radius;
    rest[i * 3 + 1] = 0.5 + ((i % 3) / 3) * sy * 0.46;
    rest[i * 3 + 2] = Math.sin(angle) * radius * 0.65;
  }
  let revision = -1,
    accumulator = 0,
    sleeping = false,
    energy = 0,
    collisions = 0,
    uploads = 0;
  function draw() {
    for (let i = 0; i < count; i++)
      for (let b = 0; b < 8; b++) {
        const a = b * 2.399963,
          r = 0.13 + ((b % 3) / 3) * 0.1;
        dummy.position.set(
          p[i * 3] + Math.cos(a) * r,
          p[i * 3 + 1] + ((b % 3) - 1) * 0.11,
          p[i * 3 + 2] + Math.sin(a) * r,
        );
        dummy.scale.setScalar(0.065 + (b % 3) * 0.018);
        dummy.updateMatrix();
        mesh.setMatrixAt(i * 8 + b, dummy.matrix);
      }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    uploads++;
  }
  function reset() {
    p.set(rest);
    v.fill(0);
    energy = 0;
    collisions = 0;
    accumulator = 0;
    sleeping = true;
    revision = solver.revision;
    draw();
  }
  reset();
  function update(dt) {
    if (sleeping && revision === solver.revision && !solver.contacts.size)
      return;
    const changed = revision !== solver.revision;
    revision = solver.revision;
    if (changed || solver.contacts.size)
      for (let i = 0; i < count; i++) {
        const q = i * 3;
        solver.sample(rest[q], rest[q + 1], rest[q + 2], sample);
        target.set(sample, q);
        for (const c of solver.contacts.values()) {
          const dx = rest[q] - c.point[0],
            dz = rest[q + 2] - c.point[2],
            dy = rest[q + 1] - c.point[1],
            d = Math.hypot(dx, dy, dz),
            w = Math.max(0, 1 - d / (c.radius * 1.8)),
            planar = Math.hypot(dx, dz) || 1;
          target[q] += (dx / planar) * w * 0.3;
          target[q + 2] += (dz / planar) * w * 0.3;
        }
      }
    accumulator += Math.min(0.1, Math.max(0, dt));
    let steps = 0;
    while (accumulator + 1e-9 >= 1 / 60 && steps++ < 6) {
      accumulator -= 1 / 60;
      energy = 0;
      for (let i = 0; i < p.length; i++) {
        v[i] = (v[i] + ((target[i] - p[i]) * 65) / 60) * Math.exp(-9 / 60);
        p[i] += v[i] / 60;
        energy += v[i] * v[i];
      }
      for (let i = 0; i < count; i++)
        for (let j = i + 1; j < count; j++) {
          const a = i * 3,
            b = j * 3,
            dx = p[b] - p[a],
            dy = p[b + 1] - p[a + 1],
            dz = p[b + 2] - p[a + 2],
            d = Math.hypot(dx, dy, dz);
          if (d > 1e-7 && d < 0.36) {
            const push = ((0.36 - d) * 0.5) / d;
            p[a] -= dx * push;
            p[a + 1] -= dy * push;
            p[a + 2] -= dz * push;
            p[b] += dx * push;
            p[b + 1] += dy * push;
            p[b + 2] += dz * push;
            collisions++;
          }
        }
    }
    sleeping = !solver.contacts.size && energy < 1e-6;
    if (steps) draw();
  }
  return {
    update,
    reset,
    get diagnostics() {
      return {
        clusters: count,
        beads: count * 8,
        energy,
        collisions,
        uploads,
        sleeping,
        finite: p.every(Number.isFinite),
      };
    },
    positions: p,
    rest,
    mesh,
    dispose() {
      geometry.dispose();
      material.dispose();
      root.remove(mesh);
    },
  };
}
