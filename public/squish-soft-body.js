import { squishMaterial } from "./squish-materials.js";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// A small volumetric XPBD cage, six positively oriented tetrahedra per cell.
// Render meshes bind trilinearly; no scene objects or timers in this solver.
export class SquishSoftBody {
  constructor({
    material = "jelly",
    size = [5, 3, 4],
    resolution = [7, 6, 7],
    iterations = 5,
  } = {}) {
    this.profile = squishMaterial(material);
    this.size = size.slice();
    this.resolution = resolution.slice();
    this.iterations = iterations;
    const [nx, ny, nz] = resolution,
      n = nx * ny * nz;
    this.count = n;
    this.position = new Float64Array(n * 3);
    this.previous = new Float64Array(n * 3);
    this.velocity = new Float64Array(n * 3);
    this.rest = new Float64Array(n * 3);
    this.original = new Float64Array(n * 3);
    this.inverseMass = new Float64Array(n);
    this.damage = new Float32Array(n);
    this.plasticAge = new Float32Array(n);
    this.contactField = new Float32Array(n);
    this.contacts = new Map();
    this.time = 0;
    this.accumulator = 0;
    this.steps = 0;
    this.revision = 0;
    this.droppedTime = 0;
    this.faults = 0;
    this.limitedSteps = 0;
    this.lastMs = 0;
    this.maxStrain = 0;
    const id = (x, y, z) => (y * nz + z) * nx + x;
    for (let y = 0; y < ny; y++)
      for (let z = 0; z < nz; z++)
        for (let x = 0; x < nx; x++) {
          const i = id(x, y, z),
            j = i * 3;
          this.rest[j] = (x / (nx - 1) - 0.5) * size[0];
          this.rest[j + 1] = (y / (ny - 1)) * size[1];
          this.rest[j + 2] = (z / (nz - 1) - 0.5) * size[2];
          this.inverseMass[i] = y === 0 ? 0 : n / this.profile.mass;
        }
    this.position.set(this.rest);
    this.previous.set(this.rest);
    this.original.set(this.rest);
    const tets = [],
      edges = new Map();
    const add = (a, b, c, d) => {
      const v = this.volume(a, b, c, d, this.rest);
      if (v < 0) [b, c] = [c, b];
      tets.push(a, b, c, d, Math.abs(v));
      for (const [p, q] of [
        [a, b],
        [a, c],
        [a, d],
        [b, c],
        [b, d],
        [c, d],
      ]) {
        const l = Math.min(p, q),
          h = Math.max(p, q);
        if (!edges.has(l + ":" + h)) {
          const j = l * 3,
            k = h * 3;
          edges.set(l + ":" + h, [
            l,
            h,
            Math.hypot(
              this.rest[j] - this.rest[k],
              this.rest[j + 1] - this.rest[k + 1],
              this.rest[j + 2] - this.rest[k + 2],
            ),
          ]);
        }
      }
    };
    for (let y = 0; y < ny - 1; y++)
      for (let z = 0; z < nz - 1; z++)
        for (let x = 0; x < nx - 1; x++) {
          const a = id(x, y, z),
            b = id(x + 1, y, z),
            c = id(x, y, z + 1),
            d = id(x + 1, y, z + 1),
            e = id(x, y + 1, z),
            f = id(x + 1, y + 1, z),
            g = id(x, y + 1, z + 1),
            h = id(x + 1, y + 1, z + 1);
          for (const t of [
            [a, b, d, h],
            [a, d, c, h],
            [a, c, g, h],
            [a, g, e, h],
            [a, e, f, h],
            [a, f, b, h],
          ])
            add(...t);
        }
    this.edges = new Float64Array([...edges.values()].flat());
    this.edgeRest = new Float64Array(this.edges.length / 3);
    this.sleeping = true;
    this.quietSteps = 0;
    this.tets = new Float64Array(tets);
    this.edgeLambda = new Float64Array(this.edges.length / 3);
    this.volumeLambda = new Float64Array(tets.length / 5);
    this.shapeLambda = new Float64Array(n * 3);
    this.grad = new Float64Array(12);
    this.sampleScratch = new Float64Array(3);
    this.bounds = {
      min: [-size[0] / 2, 0, -size[2] / 2],
      max: [size[0] / 2, size[1], size[2] / 2],
    };
  }
  volume(a, b, c, d, p = this.position) {
    a *= 3;
    b *= 3;
    c *= 3;
    d *= 3;
    const x = p[b] - p[a],
      y = p[b + 1] - p[a + 1],
      z = p[b + 2] - p[a + 2],
      u = p[c] - p[a],
      v = p[c + 1] - p[a + 1],
      w = p[c + 2] - p[a + 2],
      s = p[d] - p[a],
      t = p[d + 1] - p[a + 1],
      r = p[d + 2] - p[a + 2];
    return (
      (x * (v * r - w * t) + y * (w * s - u * r) + z * (u * t - v * s)) / 6
    );
  }
  setContact(
    id,
    {
      point,
      normal = [0, 1, 0],
      displacement = [0, -0.65, 0],
      radius = this.profile.interactionRadius,
      force = 70,
      velocity = [0, 0, 0],
      kind = "press",
    } = {},
  ) {
    if (
      !point ||
      ![...point, ...normal, ...displacement, ...velocity, radius, force].every(
        Number.isFinite,
      )
    )
      return false;
    if (!this.contacts.has(id) && this.contacts.size >= 16) return false;
    const c = this.contacts.get(id) || {
      point: new Float64Array(3),
      normal: new Float64Array(3),
      displacement: new Float64Array(3),
      velocity: new Float64Array(3),
      filtered: new Float64Array(3),
      torn: false,
    };
    c.kind = kind;
    c.point.set(point);
    c.normal.set(normal);
    c.velocity.set(velocity);
    const n = Math.hypot(...displacement),
      s =
        n > this.profile.maximumDeformation
          ? this.profile.maximumDeformation / n
          : 1;
    for (let k = 0; k < 3; k++) c.displacement[k] = displacement[k] * s;
    c.radius = clamp(radius, 0.1, Math.max(...this.size));
    c.force = clamp(force, 0, 600);
    this.contacts.set(id, c);
    this.sleeping = false;
    this.quietSteps = 0;
    return true;
  }
  release(id) {
    this.contacts.delete(id);
  }
  reset() {
    this.position.set(this.original);
    this.previous.set(this.original);
    this.rest.set(this.original);
    this.velocity.fill(0);
    this.damage.fill(0);
    this.plasticAge.fill(0);
    this.contacts.clear();
    this.accumulator = 0;
    this.sleeping = true;
    this.revision++;
  }
  step(dt) {
    if (this.sleeping && !this.contacts.size) {
      this.accumulator = 0;
      this.lastMs = 0;
      return 0;
    }
    if (!Number.isFinite(dt) || dt <= 0) return 0;
    const accepted = Math.min(dt, 0.1);
    this.droppedTime += Math.max(0, dt - accepted);
    this.accumulator += accepted;
    let n = 0;
    const start = globalThis.performance?.now?.() || 0;
    while (this.accumulator + 1e-10 >= 1 / 60 && n < 6) {
      this.fixed(1 / 60);
      this.accumulator -= 1 / 60;
      n++;
    }
    this.lastMs = (globalThis.performance?.now?.() || 0) - start;
    return n;
  }
  fixed(dt) {
    const p = this.position,
      v = this.velocity,
      rest = this.rest,
      o = this.original,
      w = this.inverseMass,
      m = this.profile,
      shapeAlpha = 1 / (Math.max(1, m.elasticity) * dt * dt),
      edgeAlpha = m.compliance / (dt * dt),
      volumeAlpha =
        ((1 - m.volumePreservation) *
          (m.volumePreservation < 0.9 ? 0.25 : 0.001)) /
        (dt * dt);
    this.previous.set(p);
    this.edgeLambda.fill(0);
    this.volumeLambda.fill(0);
    this.shapeLambda.fill(0);
    this.contactField.fill(0);
    this.maxStrain = 0;
    for (const c of this.contacts.values()) {
      const rate =
          m.materialType === "cloud"
            ? 2
            : m.materialType === "foam"
              ? 4
              : m.materialType === "slime"
                ? 8
                : Infinity,
        s = Number.isFinite(rate) ? 1 - Math.exp(-rate * dt) : 1;
      for (let k = 0; k < 3; k++)
        c.filtered[k] += (c.displacement[k] - c.filtered[k]) * s;
    }
    for (let e = 0, t = 0; e < this.edges.length; e += 3, t++) {
      const a = this.edges[e] * 3,
        b = this.edges[e + 1] * 3;
      this.edgeRest[t] = m.plasticity
        ? Math.hypot(
            rest[a] - rest[b],
            rest[a + 1] - rest[b + 1],
            rest[a + 2] - rest[b + 2],
          )
        : this.edges[e + 2];
    }
    for (let i = 0; i < this.count; i++)
      if (w[i]) {
        const j = i * 3;
        for (let k = 0; k < 3; k++) {
          v[j + k] *= Math.exp(-m.damping * dt);
          p[j + k] += v[j + k] * dt;
        }
      }
    for (let it = 0; it < this.iterations; it++) {
      // Stable finite-compliance attachment to original/plastic shape. The lower
      // cage face is the mounted stand boundary, not a globally scaled object.
      for (let i = 0; i < this.count; i++)
        if (w[i]) {
          const j = i * 3;
          for (let k = 0; k < 3; k++) {
            const q = j + k,
              dl =
                (-(p[q] - rest[q]) - shapeAlpha * this.shapeLambda[q]) /
                (w[i] + shapeAlpha);
            this.shapeLambda[q] += dl;
            p[q] += w[i] * dl;
          }
        }
      for (let e = 0, t = 0; e < this.edges.length; e += 3, t++) {
        const a = this.edges[e],
          b = this.edges[e + 1],
          ia = a * 3,
          ib = b * 3,
          dx = p[ia] - p[ib],
          dy = p[ia + 1] - p[ib + 1],
          dz = p[ia + 2] - p[ib + 2],
          l = Math.hypot(dx, dy, dz),
          l0 = this.edgeRest[t];
        if (l < 1e-10) continue;
        const C = l - l0;
        this.maxStrain = Math.max(this.maxStrain, Math.abs(C) / l0);
        const dl =
          (-C - edgeAlpha * this.edgeLambda[t]) / (w[a] + w[b] + edgeAlpha);
        this.edgeLambda[t] += dl;
        const s = dl / l;
        for (let k = 0; k < 3; k++) {
          const d = k === 0 ? dx : k === 1 ? dy : dz;
          p[ia + k] += w[a] * s * d;
          p[ib + k] -= w[b] * s * d;
        }
      }
      for (let t = 0, e = 0; t < this.tets.length; t += 5, e++) {
        const a = this.tets[t],
          b = this.tets[t + 1],
          c = this.tets[t + 2],
          d = this.tets[t + 3],
          ia = a * 3,
          ib = b * 3,
          ic = c * 3,
          idd = d * 3,
          g = this.grad;
        const ax = p[ib] - p[ia],
          ay = p[ib + 1] - p[ia + 1],
          az = p[ib + 2] - p[ia + 2],
          bx = p[ic] - p[ia],
          by = p[ic + 1] - p[ia + 1],
          bz = p[ic + 2] - p[ia + 2],
          cx = p[idd] - p[ia],
          cy = p[idd + 1] - p[ia + 1],
          cz = p[idd + 2] - p[ia + 2];
        g[3] = (by * cz - bz * cy) / 6;
        g[4] = (bz * cx - bx * cz) / 6;
        g[5] = (bx * cy - by * cx) / 6;
        g[6] = (cy * az - cz * ay) / 6;
        g[7] = (cz * ax - cx * az) / 6;
        g[8] = (cx * ay - cy * ax) / 6;
        g[9] = (ay * bz - az * by) / 6;
        g[10] = (az * bx - ax * bz) / 6;
        g[11] = (ax * by - ay * bx) / 6;
        for (let k = 0; k < 3; k++) g[k] = -g[k + 3] - g[k + 6] - g[k + 9];
        let den = volumeAlpha;
        for (let s = 0; s < 4; s++) {
          const i = this.tets[t + s];
          for (let k = 0; k < 3; k++) den += w[i] * g[s * 3 + k] ** 2;
        }
        const V =
            (ax * (by * cz - bz * cy) +
              ay * (bz * cx - bx * cz) +
              az * (bx * cy - by * cx)) /
            6,
          C = V - this.tets[t + 4],
          dl = (-C - volumeAlpha * this.volumeLambda[e]) / Math.max(1e-10, den);
        this.volumeLambda[e] += dl;
        for (let s = 0; s < 4; s++) {
          const i = this.tets[t + s],
            j = i * 3;
          for (let k = 0; k < 3; k++) p[j + k] += w[i] * dl * g[s * 3 + k];
        }
      }
      for (let i = 0; i < this.count; i++)
        if (w[i]) {
          const j = i * 3;
          let gx = 0,
            gy = 0,
            gz = 0,
            total = 0;
          for (const c of this.contacts.values()) {
            if (c.torn) continue;
            const dx = o[j] - c.point[0],
              dy = o[j + 1] - c.point[1],
              dz = o[j + 2] - c.point[2],
              r2 = (dx * dx + dy * dy + dz * dz) / (c.radius * c.radius);
            if (r2 > 9) continue;
            const influence = Math.exp(-r2 * 1.4) * clamp(c.force / 70, 0, 2);
            total += influence;
            gx += c.filtered[0] * influence;
            gy += c.filtered[1] * influence;
            gz += c.filtered[2] * influence;
          }
          this.contactField[i] = Math.max(
            this.contactField[i],
            Math.min(1, total),
          );
          if (total > 1e-5) {
            const s = 1 / Math.max(1, total),
              strength = m.materialType === "slime" ? 0.35 : 0.62;
            p[j] += (o[j] + gx * s - p[j]) * Math.min(1, total) * strength;
            p[j + 1] +=
              (o[j + 1] + gy * s - p[j + 1]) * Math.min(1, total) * strength;
            p[j + 2] +=
              (o[j + 2] + gz * s - p[j + 2]) * Math.min(1, total) * strength;
          }
          p[j + 1] = Math.max(0.001, p[j + 1]);
          const displacement = Math.hypot(
              p[j] - o[j],
              p[j + 1] - o[j + 1],
              p[j + 2] - o[j + 2],
            ),
            limit = m.maximumDeformation;
          if (displacement > limit) {
            const s = limit / displacement;
            for (let k = 0; k < 3; k++)
              p[j + k] = o[j + k] + (p[j + k] - o[j + k]) * s;
          }
        }
    }
    for (let i = 0; i < this.count; i++) {
      const j = i * 3,
        field = this.contactField[i];
      if (field > 0.1) {
        this.plasticAge[i] = 0;
        const strain =
          Math.hypot(p[j] - o[j], p[j + 1] - o[j + 1], p[j + 2] - o[j + 2]) /
          Math.max(0.2, m.interactionRadius);
        this.damage[i] = clamp(
          this.damage[i] + Math.max(0, strain - m.fractureThreshold) * dt * 0.8,
          0,
          1,
        );
        if (m.plasticity)
          for (let k = 0; k < 3; k++)
            rest[j + k] += (p[j + k] - rest[j + k]) * m.plasticity * dt * 2;
      } else {
        this.plasticAge[i] += dt;
        for (let k = 0; k < 3; k++)
          rest[j + k] +=
            (o[j + k] - rest[j + k]) *
            (1 -
              Math.exp(
                -m.recoverySpeed *
                  dt *
                  (m.materialType === "foam"
                    ? this.plasticAge[i] < 2
                      ? 0
                      : 1 - Math.exp(-(this.plasticAge[i] - 2))
                    : 1),
              ));
      }
      for (let k = 0; k < 3; k++) {
        const q = j + k;
        v[q] = w[i] ? clamp((p[q] - this.previous[q]) / dt, -16, 16) : 0;
        if (!Number.isFinite(p[q]) || !Number.isFinite(v[q])) {
          this.faults++;
          this.reset();
          return;
        }
      }
    }
    // A bounded signed-volume barrier protects every tetrahedron after contacts.
    // If an extreme grab would invert a cell, reduce that physical step rather
    // than publish inside-out geometry or reset the entire game scene.
    for (let pass = 0; pass < 6; pass++) {
      let bad = false;
      for (let t = 0; t < this.tets.length; t += 5)
        if (
          this.volume(
            this.tets[t],
            this.tets[t + 1],
            this.tets[t + 2],
            this.tets[t + 3],
          ) <
          this.tets[t + 4] * 0.08
        ) {
          bad = true;
          break;
        }
      if (!bad) break;
      for (let q = 0; q < p.length; q++) {
        p[q] = (p[q] + this.previous[q]) * 0.5;
        v[q] = (p[q] - this.previous[q]) / dt;
      }
    }
    for (let t = 0; t < this.tets.length; t += 5)
      if (
        this.volume(
          this.tets[t],
          this.tets[t + 1],
          this.tets[t + 2],
          this.tets[t + 3],
        ) <
        this.tets[t + 4] * 0.08
      ) {
        p.set(this.previous);
        v.fill(0);
        this.limitedSteps++;
        break;
      }
    let energy = 0,
      error = 0;
    for (let q = 0; q < p.length; q++) {
      energy = Math.max(energy, Math.abs(v[q]));
      error = Math.max(error, Math.abs(p[q] - o[q]), Math.abs(rest[q] - o[q]));
    }
    this.quietSteps =
      !this.contacts.size && energy < 1e-4 && error < 1e-4
        ? this.quietSteps + 1
        : 0;
    if (this.quietSteps > 30) {
      this.sleeping = true;
      p.set(o);
      rest.set(o);
      v.fill(0);
    }
    this.time += dt;
    this.steps++;
    this.revision++;
  }
  // Trilinear skinning from unchanged rest-space coordinates. Both geometry
  // and contact queries use this same mapping, never separate visual squash.
  sample(x, y, z, out = this.sampleScratch) {
    const [nx, ny, nz] = this.resolution,
      [sx, sy, sz] = this.size,
      fx = clamp((x / sx + 0.5) * (nx - 1), 0, nx - 1 - 1e-8),
      fy = clamp((y / sy) * (ny - 1), 0, ny - 1 - 1e-8),
      fz = clamp((z / sz + 0.5) * (nz - 1), 0, nz - 1 - 1e-8),
      ix = Math.floor(fx),
      iy = Math.floor(fy),
      iz = Math.floor(fz),
      tx = fx - ix,
      ty = fy - iy,
      tz = fz - iz;
    out[0] = x;
    out[1] = y;
    out[2] = z;
    for (let dy = 0; dy < 2; dy++)
      for (let dz = 0; dz < 2; dz++)
        for (let dx = 0; dx < 2; dx++) {
          const i = (((iy + dy) * nz + iz + dz) * nx + ix + dx) * 3,
            s = (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty) * (dz ? tz : 1 - tz);
          for (let k = 0; k < 3; k++)
            out[k] += (this.position[i + k] - this.original[i + k]) * s;
        }
    return out;
  }
  diagnostics() {
    let volume = 0,
      restVolume = 0,
      minRatio = Infinity;
    for (let t = 0; t < this.tets.length; t += 5) {
      const v = this.volume(
        this.tets[t],
        this.tets[t + 1],
        this.tets[t + 2],
        this.tets[t + 3],
      );
      volume += v;
      restVolume += this.tets[t + 4];
      minRatio = Math.min(minRatio, v / this.tets[t + 4]);
    }
    let max = 0;
    for (let i = 0; i < this.count; i++) {
      const j = i * 3;
      max = Math.max(
        max,
        Math.hypot(
          this.position[j] - this.original[j],
          this.position[j + 1] - this.original[j + 1],
          this.position[j + 2] - this.original[j + 2],
        ),
      );
    }
    return {
      sleeping: this.sleeping,
      particles: this.count,
      constraints: this.edges.length / 3 + this.tets.length / 5,
      contacts: this.contacts.size,
      steps: this.steps,
      time: this.time,
      volumeRatio: volume / restVolume,
      minTetRatio: minRatio,
      maxDeformation: max,
      maxStrain: this.maxStrain,
      damage: Math.max(...this.damage),
      faults: this.faults,
      limitedSteps: this.limitedSteps,
      lastPhysicsMs: this.lastMs,
      droppedTime: this.droppedTime,
    };
  }
}
