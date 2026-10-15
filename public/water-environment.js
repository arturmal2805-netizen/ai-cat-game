import * as THREE from "three";

export const WATER_ENV_SIZE = 128;
let environment;

// A shared octahedral sky/shore light probe. Baking the light on the CPU once
// replaces the old per-pixel cloud calculation; it never renders the scene again.
export function waterEnvironmentTexture() {
  if (environment) return environment;
  const size = WATER_ENV_SIZE,
    data = new Uint8Array(size * size * 4);
  for (let v = 0; v < size; v++)
    for (let u = 0; u < size; u++) {
      let x = ((u + 0.5) / size) * 2 - 1,
        z = ((v + 0.5) / size) * 2 - 1;
      const y = 1 - Math.abs(x) - Math.abs(z);
      if (y < 0) {
        const oldX = x;
        x = (1 - Math.abs(z)) * (oldX < 0 ? -1 : 1);
        z = (1 - Math.abs(oldX)) * (z < 0 ? -1 : 1);
      }
      const length = Math.hypot(x, y, z),
        height = y / length,
        dx = x / length,
        dz = z / length,
        angle = Math.atan2(dz, dx);
      const horizon = Math.pow(1 - Math.max(0, height), 3);
      let r = 0.105 + horizon * 0.56,
        g = 0.235 + horizon * 0.48,
        b = 0.47 + horizon * 0.3;
      const cloudNoise =
        Math.sin(dx * 9 + dz * 6) * 0.4 +
        Math.cos(dz * 13 - dx * 7) * 0.25 +
        Math.sin(dx * 24 + dz * 15) * 0.1;
      const cloud =
        Math.max(0, Math.min(1, (cloudNoise - 0.12) * 2.7)) *
        Math.max(0, height) *
        0.8;
      r += (0.94 - r) * cloud;
      g += (0.96 - g) * cloud;
      b += (0.99 - b) * cloud;
      // Soft distant silhouettes give grazing reflections a shore, rather than a
      // uniform sky-blue plate. These are an authored probe, not live object copies.
      const bank =
        0.035 +
        Math.max(0, Math.sin(angle * 7 + 0.6)) * 0.1 +
        Math.max(0, Math.cos(angle * 17)) * 0.055;
      const foliage = Math.max(0, Math.min(1, (bank - height) * 85));
      r += (0.025 - r) * foliage;
      g += (0.09 - g) * foliage;
      b += (0.075 - b) * foliage;
      if (height < -0.18) {
        r = 0.14;
        g = 0.16;
        b = 0.13;
      }
      const i = (v * size + u) * 4;
      data[i] = Math.round(r * 255);
      data[i + 1] = Math.round(g * 255);
      data[i + 2] = Math.round(b * 255);
      data[i + 3] = 255;
    }
  environment = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  environment.name = "Shared water sky and shore light probe";
  environment.colorSpace = THREE.NoColorSpace;
  environment.magFilter = THREE.LinearFilter;
  environment.minFilter = THREE.LinearMipmapLinearFilter;
  environment.generateMipmaps = true;
  environment.userData.sharedScenery = true;
  environment.needsUpdate = true;
  return environment;
}
