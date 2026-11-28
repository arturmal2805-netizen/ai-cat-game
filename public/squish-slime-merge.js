import * as T from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
// Bounded implicit-surface coalescence for TWO exhibit masses. The centres use
// overdamped material motion; the shared isosurface truly joins/splits. This is
// a volumetric rendering approximation, not a claim of a Navier–Stokes solver.
export function createSlimeCoalescence({ root, material, resolution = 32 }) {
  const mesh = new MarchingCubes(resolution, material, false, false, 5000);
  mesh.name = "Slime Lab · continuous two-mass coalescence";
  mesh.scale.setScalar(2);
  mesh.position.set(-3.7, 0.9, 2.9);
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
  const centres = new Float64Array([0.32, 0.68]),
    velocity = new Float64Array(2),
    targets = new Float64Array([0.32, 0.68]),
    visited = new Int32Array(resolution ** 3),
    queue = new Int32Array(resolution ** 3);
  let accumulator = 0,
    phase = "rest",
    targetVolume = 0,
    currentVolume = 0,
    dirty = true,
    updates = 0,
    stamp = 0;
  const count = (iso) => {
    let n = 0;
    for (let i = 0; i < mesh.field.length; i++) if (mesh.field[i] >= iso) n++;
    return n;
  };
  function rebuild() {
    mesh.reset();
    for (const x of centres) mesh.addBall(x, 0.5, 0.5, 1.1, 12);
    if (!targetVolume) targetVolume = count(80);
    let lo = 12,
      hi = 260;
    for (let j = 0; j < 7; j++) {
      const iso = (lo + hi) * 0.5;
      if (count(iso) > targetVolume) lo = iso;
      else hi = iso;
    }
    mesh.isolation = (lo + hi) * 0.5;
    currentVolume = count(mesh.isolation);
    mesh.update();
    dirty = false;
    updates++;
  }
  rebuild();
  function update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (phase === "merge" || phase === "split") {
      accumulator += Math.min(dt, 0.1);
      let n = 0;
      while (accumulator >= 1 / 60 && n < 6) {
        for (let i = 0; i < 2; i++) {
          velocity[i] += ((targets[i] - centres[i]) * 18) / 60;
          velocity[i] *= Math.exp(-10 / 60);
          centres[i] += velocity[i] / 60;
        }
        accumulator -= 1 / 60;
        n++;
      }
      if (n) dirty = true;
      if (
        Math.max(
          Math.abs(centres[0] - targets[0]),
          Math.abs(centres[1] - targets[1]),
          Math.abs(velocity[0]),
          Math.abs(velocity[1]),
        ) < 0.003
      ) {
        centres.set(targets);
        velocity.fill(0);
        phase = phase === "merge" ? "merged" : "rest";
        dirty = true;
      }
    }
    if (dirty) rebuild();
  }
  function components() {
    stamp++;
    let groups = 0;
    const N = resolution,
      NN = N * N;
    for (let i = 0; i < mesh.field.length; i++)
      if (mesh.field[i] >= mesh.isolation && visited[i] !== stamp) {
        groups++;
        let head = 0,
          tail = 0;
        queue[tail++] = i;
        visited[i] = stamp;
        while (head < tail) {
          const q = queue[head++],
            x = q % N,
            y = Math.floor(q / N) % N,
            z = Math.floor(q / NN);
          for (const next of [
            x > 0 ? q - 1 : -1,
            x < N - 1 ? q + 1 : -1,
            y > 0 ? q - N : -1,
            y < N - 1 ? q + N : -1,
            z > 0 ? q - NN : -1,
            z < N - 1 ? q + NN : -1,
          ])
            if (
              next >= 0 &&
              mesh.field[next] >= mesh.isolation &&
              visited[next] !== stamp
            ) {
              visited[next] = stamp;
              queue[tail++] = next;
            }
        }
      }
    return groups;
  }
  return {
    mesh,
    update,
    merge() {
      targets.set([0.495, 0.505]);
      phase = "merge";
    },
    split() {
      targets.set([0.32, 0.68]);
      phase = "split";
    },
    reset() {
      centres.set([0.32, 0.68]);
      targets.set(centres);
      velocity.fill(0);
      phase = "rest";
      dirty = true;
      rebuild();
    },
    get diagnostics() {
      return {
        phase,
        centres: Array.from(centres),
        components: components(),
        volumeProxyRatio: currentVolume / targetVolume,
        isolation: mesh.isolation,
        vertices: mesh.geometry.drawRange.count,
        updates,
        approximation:
          "Two overdamped centres with volume-normalized implicit surface; not full fluid simulation.",
      };
    },
    dispose() {
      mesh.geometry.dispose();
      mesh.removeFromParent();
    },
  };
}
