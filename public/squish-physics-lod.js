import { SquishSoftBody } from "./squish-soft-body.js";

// Nested lattices: 4 -> 7 and 6x5x6 -> 11x9x11 reproduce the entire old
// trilinear field exactly when promoted. Demotion is allowed only at true rest.
export function createSquishPhysicsLOD(solver) {
  const hero = solver.resolution.slice();
  const active = hero.map((n) => Math.ceil((n + 1) / 2));
  let level = "HERO",
    changes = 0;
  const interpolate = (old, array, components, x, y, z, out) => {
    const [nx, ny, nz] = old.resolution,
      [sx, sy, sz] = old.size;
    const coords = [
      (x / sx + 0.5) * (nx - 1),
      (y / sy) * (ny - 1),
      (z / sz + 0.5) * (nz - 1),
    ];
    const cells = coords.map((v, k) =>
      Math.min(old.resolution[k] - 2, Math.max(0, Math.floor(v))),
    );
    const t = coords.map((v, k) => Math.max(0, Math.min(1, v - cells[k])));
    out.fill(0);
    for (let yy = 0; yy < 2; yy++)
      for (let zz = 0; zz < 2; zz++)
        for (let xx = 0; xx < 2; xx++) {
          const weight =
            (xx ? t[0] : 1 - t[0]) *
            (yy ? t[1] : 1 - t[1]) *
            (zz ? t[2] : 1 - t[2]);
          const i = ((cells[1] + yy) * nz + cells[2] + zz) * nx + cells[0] + xx;
          for (let k = 0; k < components; k++)
            out[k] += array[i * components + k] * weight;
        }
    return out;
  };
  function change(resolution) {
    if (resolution.every((n, k) => n === solver.resolution[k])) return;
    const old = Object.assign(
      Object.create(Object.getPrototypeOf(solver)),
      solver,
    );
    const next = new SquishSoftBody({
      material: solver.profile.materialType,
      size: solver.size,
      resolution,
      iterations: 5,
    });
    const scratch = new Float64Array(3);
    for (let i = 0; i < next.count; i++) {
      const j = i * 3,
        x = next.original[j],
        y = next.original[j + 1],
        z = next.original[j + 2];
      old.sample(x, y, z, scratch);
      next.position.set(scratch, j);
      interpolate(old, old.rest, 3, x, y, z, scratch);
      next.rest.set(scratch, j);
      interpolate(old, old.velocity, 3, x, y, z, scratch);
      next.velocity.set(scratch, j);
      next.damage[i] = interpolate(old, old.damage, 1, x, y, z, scratch)[0];
      next.plasticAge[i] = interpolate(
        old,
        old.plasticAge,
        1,
        x,
        y,
        z,
        scratch,
      )[0];
    }
    next.previous.set(next.position);
    next.contacts = old.contacts;
    for (const key of [
      "time",
      "steps",
      "accumulator",
      "droppedTime",
      "faults",
      "limitedSteps",
      "sleeping",
      "quietSteps",
    ])
      next[key] = old[key];
    next.revision = old.revision + 1;
    Object.assign(solver, next);
    changes++;
  }
  function promote() {
    change(hero);
    level = "HERO";
    solver.iterations = 5;
  }
  // Called before a contact is inserted; original solver/map identity survives.
  solver.onBeforeContact = promote;
  return {
    promote,
    prepare({ distance = 0, selected = false, visible = true } = {}) {
      if (solver.contacts.size || selected) {
        promote();
        return;
      }
      if (!solver.sleeping) {
        level = "ACTIVE";
        solver.iterations = 3;
        return;
      }
      // Memory/plastic damage are never discarded for a cheap LOD switch.
      if (solver.damage.some((d) => d > 0.0001)) return;
      change(active);
      solver.iterations = 3;
      level = visible && distance < 100 ? "ACTIVE" : "STATIC";
    },
    get level() {
      return level;
    },
    get diagnostics() {
      return {
        level,
        changes,
        particles: solver.count,
        heroResolution: hero,
        activeResolution: active,
        nestedPromotion: true,
      };
    },
  };
}
