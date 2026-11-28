import * as T from "three";
// Local XPBD viscous filaments. Endpoints are the actual deforming cage skin and
// the held grip, not independent looping animations. All buffers/pools are fixed.
export class SlimeFilament {
  constructor(n = 9) {
    this.n = n;
    this.position = new Float64Array(n * 3);
    this.previous = new Float64Array(n * 3);
    this.velocity = new Float64Array(n * 3);
    this.lambda = new Float64Array(n - 1);
    this.restLength = 0.4;
    this.radius = 0.06;
    this.active = false;
    this.age = 0;
    this.releasing = false;
    this.id = null;
    this.tear = false;
    this.a = new T.Vector3();
    this.b = new T.Vector3();
  }
  reset(a, b) {
    this.a.copy(a);
    this.b.copy(b);
    this.restLength = Math.max(0.25, a.distanceTo(b));
    this.age = 0;
    this.active = true;
    this.releasing = false;
    this.tear = false;
    for (let i = 0; i < this.n; i++)
      for (let k = 0; k < 3; k++) {
        const u = i / (this.n - 1),
          v = a.getComponent(k) * (1 - u) + b.getComponent(k) * u;
        this.position[i * 3 + k] = this.previous[i * 3 + k] = v;
        this.velocity[i * 3 + k] = 0;
      }
  }
  step(dt, a, b) {
    dt = T.MathUtils.clamp(dt, 0, 1 / 60);
    if (!dt || !this.active) return;
    this.a.copy(a);
    this.b.copy(b);
    const p = this.position,
      w = this.previous,
      v = this.velocity,
      n = this.n,
      length = a.distanceTo(b),
      edgeLength = Math.max(this.restLength, length * 1.055) / (n - 1),
      alpha = 0.000012 / (dt * dt);
    w.set(p);
    this.lambda.fill(0);
    for (let i = 1; i < n - 1; i++) {
      v[i * 3 + 1] -= 9.81 * dt;
      for (let k = 0; k < 3; k++) {
        v[i * 3 + k] *= Math.exp(-9 * dt);
        p[i * 3 + k] += v[i * 3 + k] * dt;
      }
    }
    for (let k = 0; k < 3; k++) {
      p[k] = a.getComponent(k);
      p[(n - 1) * 3 + k] = b.getComponent(k);
    }
    for (let pass = 0; pass < 6; pass++)
      for (let i = 0; i < n - 1; i++) {
        const j = i * 3,
          l = j + 3,
          dx = p[l] - p[j],
          dy = p[l + 1] - p[j + 1],
          dz = p[l + 2] - p[j + 2],
          d = Math.hypot(dx, dy, dz) || 1e-8,
          wa = i === 0 ? 0 : 1,
          wb = i === n - 2 ? 0 : 1,
          dl = (-(d - edgeLength) - alpha * this.lambda[i]) / (wa + wb + alpha);
        this.lambda[i] += dl;
        for (let k = 0; k < 3; k++) {
          const g = (k === 0 ? dx : k === 1 ? dy : dz) / d;
          p[j + k] -= wa * dl * g;
          p[l + k] += wb * dl * g;
        }
      }
    for (let i = 1; i < n - 1; i++)
      for (let k = 0; k < 3; k++) {
        const q = i * 3 + k;
        v[q] = T.MathUtils.clamp((p[q] - w[q]) / dt, -12, 12);
        if (!Number.isFinite(p[q])) {
          this.active = false;
          return;
        }
      }
    this.radius =
      0.06 * Math.sqrt(this.restLength / Math.max(this.restLength, length));
    this.age += dt;
  }
}
export function createSlimeFilaments({ root, solver, material }) {
  const pool = Array.from({ length: 3 }, () => new SlimeFilament()),
    rings = 9,
    sides = 7,
    meshes = [],
    scratch = new Float64Array(3),
    a = new T.Vector3(),
    b = new T.Vector3(),
    t = new T.Vector3(),
    right = new T.Vector3(),
    up = new T.Vector3(),
    axis = new T.Vector3(0, 1, 0);
  let tears = 0,
    clock = 0;
  for (let i = 0; i < pool.length; i++) {
    const g = new T.BufferGeometry(),
      idx = [];
    for (let j = 0; j < rings - 1; j++)
      for (let k = 0; k < sides; k++) {
        const a = j * sides + k,
          b = j * sides + ((k + 1) % sides);
        idx.push(a, b, a + sides, b, b + sides, a + sides);
      }
    g.setAttribute(
      "position",
      new T.BufferAttribute(new Float32Array(rings * sides * 3), 3).setUsage(
        T.DynamicDrawUsage,
      ),
    );
    g.setAttribute(
      "normal",
      new T.BufferAttribute(new Float32Array(rings * sides * 3), 3).setUsage(
        T.DynamicDrawUsage,
      ),
    );
    g.setIndex(idx);
    const m = new T.Mesh(g, material);
    m.name = "Slime physical filament " + i;
    m.visible = false;
    m.castShadow = true;
    root.add(m);
    meshes.push(m);
  }
  function render(i) {
    const f = pool[i],
      m = meshes[i];
    m.visible = f.active;
    if (!f.active) return;
    const g = m.geometry,
      pa = g.attributes.position.array,
      na = g.attributes.normal.array,
      p = f.position;
    for (let j = 0; j < rings; j++) {
      const previous = Math.max(0, j - 1) * 3,
        next = Math.min(rings - 1, j + 1) * 3;
      t.set(
        p[next] - p[previous],
        p[next + 1] - p[previous + 1],
        p[next + 2] - p[previous + 2],
      ).normalize();
      right.crossVectors(t, axis);
      if (right.lengthSq() < 0.001) right.set(1, 0, 0);
      right.normalize();
      up.crossVectors(right, t).normalize();
      const radius =
        f.radius * (0.75 + 0.25 * Math.abs((j / (rings - 1)) * 2 - 1));
      for (let k = 0; k < sides; k++) {
        const angle = (k / sides) * Math.PI * 2,
          c = Math.cos(angle),
          s = Math.sin(angle),
          q = (j * sides + k) * 3;
        for (let d = 0; d < 3; d++) {
          const n = right.getComponent(d) * c + up.getComponent(d) * s;
          pa[q + d] = p[j * 3 + d] + n * radius;
          na[q + d] = n;
        }
      }
    }
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
    g.computeBoundingSphere();
  }
  function update(dt) {
    clock += dt;
    let grip = null;
    for (const [id, c] of solver.contacts)
      if (["stretch", "scoop", "twist"].includes(c.kind) && !c.torn) {
        const distance = Math.hypot(...c.displacement);
        if (distance > 0.3) {
          grip = { id, c };
          break;
        }
      }
    const n = Math.max(1, Math.min(6, Math.ceil(dt * 60))),
      h = dt / n;
    for (let i = 0; i < pool.length; i++) {
      const f = pool[i];
      if (grip) {
        const c = grip.c;
        solver.sample(...c.point, scratch);
        a.set(...scratch);
        b.set(
          c.point[0] + c.displacement[0],
          c.point[1] + c.displacement[1],
          c.point[2] + c.displacement[2],
        );
        a.x += (i - 1) * 0.045;
        b.x += (i - 1) * 0.025;
        const distance = a.distanceTo(b);
        if (!f.active) {
          f.reset(a, b);
          f.id = grip.id;
        }
        if (
          distance / f.restLength > solver.profile.tearResistance ||
          distance > 2.5
        ) {
          c.torn = true;
          f.releasing = true;
          if (!f.tear) {
            f.tear = true;
            tears++;
          }
        }
      } else if (f.active) {
        a.copy(f.a);
        b.copy(f.b);
        f.releasing = true;
      }
      if (f.active) {
        if (f.releasing) {
          b.lerp(a, 1 - Math.exp(-dt * 9));
          if (a.distanceTo(b) < 0.04) {
            f.active = false;
            render(i);
            continue;
          }
        }
        for (let j = 0; j < n; j++) f.step(h, a, b);
        render(i);
      }
    }
  }
  return {
    update,
    get diagnostics() {
      return {
        active: pool.filter((f) => f.active).length,
        tears,
        filaments: pool
          .filter((f) => f.active)
          .map((f) => ({
            length: f.a.distanceTo(f.b),
            radius: f.radius,
            restLength: f.restLength,
            finite: f.position.every(Number.isFinite),
          })),
      };
    },
    reset() {
      for (let i = 0; i < pool.length; i++) {
        pool[i].active = false;
        meshes[i].visible = false;
      }
      tears = 0;
    },
    dispose() {
      for (const m of meshes) {
        m.geometry.dispose();
        m.removeFromParent();
      }
    },
  };
}
