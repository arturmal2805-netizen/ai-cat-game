// A bounded secondary surface field resolves a palm and four toe pads which the
// coarse volume cage cannot resolve. It changes actual vertices/picking normals.
// State is transient, driven by contacts, and held independently at each texel.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => {
  x = clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};
export class FoamImprints {
  constructor(size, resolution = 65) {
    this.size = size.slice();
    this.n = resolution;
    this.depth = new Float32Array(resolution ** 2);
    this.velocity = new Float32Array(resolution ** 2);
    this.memory = new Float32Array(resolution ** 2);
    this.hold = new Float32Array(resolution ** 2);
    this.target = new Float32Array(resolution ** 2);
    this.accumulator = 0;
    this.revision = 0;
    this.steps = 0;
    this.sleeping = true;
  }
  reset() {
    for (const a of [
      this.depth,
      this.velocity,
      this.memory,
      this.hold,
      this.target,
    ])
      a.fill(0);
    this.accumulator = 0;
    this.sleeping = true;
    this.revision++;
  }
  step(dt, contacts) {
    if (!(dt > 0)) return;
    if (this.sleeping && !contacts.size) return;
    this.accumulator += Math.min(0.1, dt);
    let count = 0;
    while (this.accumulator + 1e-9 >= 1 / 60 && count++ < 6) {
      this.accumulator -= 1 / 60;
      this.solve(1 / 60, contacts);
    }
  }
  solve(dt, contacts) {
    const n = this.n,
      [sx, sy, sz] = this.size,
      target = this.target;
    target.fill(0);
    for (const c of contacts.values()) {
      if (c.normal[1] < 0.35 || c.point[1] < sy * 0.6 || c.torn) continue;
      const r = clamp(
          c.footprintRadius || (c.kind === "paw" ? 0.2 : c.radius * 0.62),
          0.14,
          0.85,
        ),
        angle = c.orientation || 0,
        cos = Math.cos(angle),
        sin = Math.sin(angle),
        cx = c.point[0],
        cz = c.point[2],
        strength =
          clamp(-c.displacement[1] * 0.7, 0, 0.24) *
          clamp(c.force / 65, 0.25, 1),
        xmin = clamp(
          Math.floor(((cx - r * 1.45 + sx / 2) / sx) * (n - 1)),
          0,
          n - 1,
        ),
        xmax = clamp(
          Math.ceil(((cx + r * 1.45 + sx / 2) / sx) * (n - 1)),
          0,
          n - 1,
        ),
        zmin = clamp(
          Math.floor(((cz - r * 1.45 + sz / 2) / sz) * (n - 1)),
          0,
          n - 1,
        ),
        zmax = clamp(
          Math.ceil(((cz + r * 1.45 + sz / 2) / sz) * (n - 1)),
          0,
          n - 1,
        );
      for (let z = zmin; z <= zmax; z++)
        for (let x = xmin; x <= xmax; x++) {
          const dx = (x / (n - 1) - 0.5) * sx - cx,
            dz = (z / (n - 1) - 0.5) * sz - cz,
            u = (cos * dx - sin * dz) / r,
            v = (sin * dx + cos * dz) / r;
          // Compact C1 pad kernels keep the spaces between all four toes visible.
          const kernel = (u, v, rx, rz) =>
            smooth(1 - (u / rx) ** 2 - (v / rz) ** 2);
          let load =
            c.kind === "body"
              ? kernel(u, v, 0.95, 0.6)
              : kernel(u, v + 0.23, 0.57, 0.49);
          for (let toe = 0; c.kind !== "body" && toe < 4; toe++) {
            const tx = (toe - 1.5) * 0.39,
              tz = 0.45 - Math.abs(toe - 1.5) * 0.12;
            load = Math.max(load, kernel(u - tx, v - tz, 0.235, 0.29));
          }
          const i = z * n + x;
          target[i] = Math.max(target[i], load * strength);
        }
    }
    let energy = 0,
      max = 0;
    for (let i = 0; i < target.length; i++) {
      const t = target[i];
      if (t > 0) {
        this.memory[i] = Math.max(this.memory[i], t);
        this.hold[i] = 2;
      } else if (this.hold[i] > 0)
        this.hold[i] = Math.max(0, this.hold[i] - dt);
      else this.memory[i] *= Math.exp(-0.22 * dt);
      if (this.memory[i] < 0.00005) this.memory[i] = 0;
      const goal = Math.max(t, this.memory[i]),
        v =
          (this.velocity[i] + (goal - this.depth[i]) * 100 * dt) *
          Math.exp(-20 * dt);
      this.velocity[i] = v;
      this.depth[i] = clamp(this.depth[i] + v * dt, 0, 0.27);
      energy = Math.max(energy, Math.abs(v), Math.abs(goal - this.depth[i]));
      max = Math.max(max, this.depth[i], this.memory[i]);
    }
    this.sleeping = !contacts.size && max < 0.0001 && energy < 0.0001;
    this.revision++;
    this.steps++;
  }
  sample(x, z) {
    const n = this.n,
      [sx, , sz] = this.size,
      u = clamp((x / sx + 0.5) * (n - 1), 0, n - 1),
      v = clamp((z / sz + 0.5) * (n - 1), 0, n - 1),
      a = Math.min(n - 2, Math.floor(u)),
      b = Math.min(n - 2, Math.floor(v)),
      tx = u - a,
      tz = v - b,
      d = this.depth;
    const value =
      (d[b * n + a] * (1 - tx) + d[b * n + a + 1] * tx) * (1 - tz) +
      (d[(b + 1) * n + a] * (1 - tx) + d[(b + 1) * n + a + 1] * tx) * tz;
    const edge =
      smooth((1 - Math.abs(x) / (sx / 2)) / 0.16) *
      smooth((1 - Math.abs(z) / (sz / 2)) / 0.16);
    return value * edge;
  }
  get diagnostics() {
    let deepest = 0,
      held = 0;
    for (let i = 0; i < this.depth.length; i++) {
      deepest = Math.max(deepest, this.depth[i]);
      if (this.hold[i] > 0) held++;
    }
    return {
      nodes: this.depth.length,
      deepest,
      held,
      steps: this.steps,
      sleeping: this.sleeping,
    };
  }
}
