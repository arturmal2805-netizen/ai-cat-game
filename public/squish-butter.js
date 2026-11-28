import * as T from "three";
// A finite rind over a distinct deforming core. Damage comes from the solver's
// measured local strain; neither a click nor a timer can independently fracture it.
export function cageScalar(s, field, x, y, z) {
  const [nx, ny, nz] = s.resolution,
    [sx, sy, sz] = s.size,
    c = T.MathUtils.clamp,
    fx = c((x / sx + 0.5) * (nx - 1), 0, nx - 1 - 1e-8),
    fy = c((y / sy) * (ny - 1), 0, ny - 1 - 1e-8),
    fz = c((z / sz + 0.5) * (nz - 1), 0, nz - 1 - 1e-8),
    ix = Math.floor(fx),
    iy = Math.floor(fy),
    iz = Math.floor(fz),
    tx = fx - ix,
    ty = fy - iy,
    tz = fz - iz;
  let v = 0;
  for (let a = 0; a < 2; a++)
    for (let b = 0; b < 2; b++)
      for (let d = 0; d < 2; d++)
        v +=
          field[((iy + a) * nz + iz + b) * nx + ix + d] *
          (a ? ty : 1 - ty) *
          (b ? tz : 1 - tz) *
          (d ? tx : 1 - tx);
  return v;
}
let crackChart = null,
  chartOwners = 0;
function retainCrackChart() {
  chartOwners++;
  if (crackChart) return crackChart;
  const width = 256,
    height = 256,
    cells = 9,
    data = new Uint8Array(width * height * 4),
    hash = (x, y, k) => {
      const n =
        Math.sin(
          (((x % cells) + cells) % cells) * 127.1 +
            (((y % cells) + cells) % cells) * 311.7 +
            k * 74.7,
        ) * 43758.5453;
      return n - Math.floor(n);
    };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const px = (x / width) * cells,
        py = (y / height) * cells,
        bx = Math.floor(px),
        by = Math.floor(py),
        fx = px - bx,
        fy = py - by;
      let first = 10,
        second = 10,
        id = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const d = Math.hypot(
            dx + hash(bx + dx, by + dy, 0) - fx,
            dy + hash(bx + dx, by + dy, 1) - fy,
          );
          if (d < first) {
            second = first;
            first = d;
            id = hash(bx + dx, by + dy, 2);
          } else second = Math.min(second, d);
        }
      const i = (y * width + x) * 4;
      data[i] = Math.round(
        (1 - T.MathUtils.smoothstep(second - first, 0.035, 0.11)) * 255,
      );
      data[i + 1] = Math.round(id * 255);
      data[i + 2] = Math.round(first * 180);
      data[i + 3] = 255;
    }
  const texture = new T.DataTexture(data, width, height);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.magFilter = T.LinearFilter;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  crackChart = texture;
  return texture;
}
function releaseCrackChart() {
  if (--chartOwners <= 0) {
    crackChart?.dispose();
    crackChart = null;
    chartOwners = 0;
  }
}
const crackGLSL = `varying float vButterDamage; varying vec2 vButterUV;uniform sampler2D uButterCracks;`;
export function createButterShell({ root, solver, body, attach }) {
  const g = body.geometry.clone(),
    pos = g.attributes.position,
    normal = g.attributes.normal,
    rest = pos.array.slice(),
    damage = new Float32Array(pos.count),
    consumed = new Uint8Array(pos.count);
  g.setAttribute("butterRest", new T.BufferAttribute(rest, 3));
  g.setAttribute("squishDamage", new T.BufferAttribute(damage, 1));
  for (let i = 0; i < pos.count; i++)
    for (let k = 0; k < 3; k++)
      pos.array[i * 3 + k] += normal.array[i * 3 + k] * 0.018;
  const chart = retainCrackChart();
  const material = new T.MeshPhysicalMaterial({
    color: 0xffd78c,
    roughness: 0.31,
    clearcoat: 0.34,
    clearcoatRoughness: 0.25,
    emissive: 0xe5a84d,
    emissiveIntensity: 0.1,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uButterCracks = { value: chart };
    shader.vertexShader =
      "attribute float squishDamage;varying float vButterDamage;varying vec2 vButterUV;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvButterDamage=squishDamage;vButterUV=uv;",
    );
    shader.fragmentShader = crackGLSL + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
 vec2 cell=texture2D(uButterCracks,vButterUV*vec2(3.,2.)).rg;float crack=cell.x*smoothstep(.12,.42,vButterDamage);if(vButterDamage>.8&&cell.y>.36&&cell.x<.45)discard;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.40,.19,.052),crack*.83);
 `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+crack*.35,0.,1.);",
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <fog_fragment>",
      T.ShaderChunk.fog_fragment.replace(
        "fogFactor );",
        "min(fogFactor,.08) );",
      ),
    );
  };
  material.customProgramCacheKey = () => "warehouse-strain-butter-shell-v1";
  const shell = attach(
    g,
    material,
    "Butter rind · strain cracks and actual exposed core",
  );
  body.material.color.setHex(0xf3bd68);
  body.material.roughness = 0.54;
  const shape = new T.Shape();
  shape.moveTo(-0.1, -0.055);
  shape.lineTo(0.075, -0.08);
  shape.lineTo(0.12, 0.035);
  shape.lineTo(-0.025, 0.1);
  shape.closePath();
  const fg = new T.ExtrudeGeometry(shape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelSize: 0.008,
      bevelThickness: 0.006,
      bevelSegments: 1,
    }),
    fm = new T.MeshStandardMaterial({ color: 0xffda92, roughness: 0.4 });
  const fragments = new T.InstancedMesh(fg, fm, 24);
  fragments.name = "Butter physical rind fragment pool";
  fragments.castShadow = fragments.receiveShadow = true;
  fragments.count = 0;
  root.add(fragments);
  const pool = Array.from({ length: 24 }, () => ({
      active: false,
      position: new T.Vector3(),
      previous: new T.Vector3(),
      velocity: new T.Vector3(),
      rotation: new T.Euler(),
      spin: new T.Vector3(),
      age: 0,
    })),
    matrix = new T.Matrix4(),
    quat = new T.Quaternion(),
    scale = new T.Vector3(),
    from = new T.Vector3(),
    to = new T.Vector3(),
    delta = new T.Vector3(),
    ray = new T.Raycaster();
  const patchPoints = new Float32Array(24 * 3);
  let last = -1,
    clock = 0,
    detached = 0,
    cracked = 0;
  function spawn(i) {
    if (detached >= 24) return false;
    const source = shell.geometry.attributes.position,
      x = source.getX(i),
      y = source.getY(i),
      z = source.getZ(i);
    for (let k = 0; k < detached; k++)
      if (
        Math.hypot(
          x - patchPoints[k * 3],
          y - patchPoints[k * 3 + 1],
          z - patchPoints[k * 3 + 2],
        ) < 0.18
      )
        return false;
    const f = pool.find((f) => !f.active);
    if (!f) return false;
    f.active = true;
    f.age = 0;
    f.position.fromBufferAttribute(shell.geometry.attributes.position, i);
    const n = delta.fromBufferAttribute(shell.geometry.attributes.normal, i);
    f.position.addScaledVector(n, 0.035);
    f.velocity
      .copy(n)
      .multiplyScalar(0.4)
      .add(
        new T.Vector3(Math.sin(i * 1.7) * 0.2, 0.45, Math.cos(i * 2.3) * 0.2),
      );
    f.rotation.set(i * 0.3, i * 0.13, i * 0.7);
    f.spin.set(Math.sin(i) * 3, Math.cos(i) * 2, 0.4);
    patchPoints[detached * 3] = x;
    patchPoints[detached * 3 + 1] = y;
    patchPoints[detached * 3 + 2] = z;
    detached++;
    return true;
  }
  function update(dt) {
    clock += dt;
    cracked = 0;
    if (last !== solver.revision) {
      last = solver.revision;
      for (let i = 0; i < pos.count; i++) {
        const d = cageScalar(
          solver,
          solver.damage,
          rest[i * 3],
          rest[i * 3 + 1],
          rest[i * 3 + 2],
        );
        damage[i] = d;
        if (d > 0.2) cracked++;
        if (d > 0.83 && !consumed[i]) {
          if (spawn(i)) consumed[i] = 1;
        }
        if (d < 0.1) consumed[i] = 0;
      }
      g.attributes.squishDamage.needsUpdate = true;
    }
    let changed = false,
      max = 0;
    for (let i = 0; i < pool.length; i++) {
      const f = pool[i];
      if (f.active) {
        changed = true;
        f.age += Math.min(dt, 0.05);
        if (f.age > 3) {
          f.active = false;
          scale.setScalar(0);
        } else {
          const h = Math.min(dt, 0.05);
          f.previous.copy(f.position);
          f.velocity.y -= 9.81 * h;
          f.position.addScaledVector(f.velocity, h);
          from.copy(f.previous);
          root.localToWorld(from);
          to.copy(f.position);
          root.localToWorld(to);
          delta.copy(to).sub(from);
          const distance = delta.length();
          if (distance > 1e-7) {
            ray.set(from, delta.divideScalar(distance));
            ray.far = distance + 0.025;
            const hit = ray.intersectObject(body, false)[0];
            if (hit) {
              f.position
                .copy(root.worldToLocal(hit.point))
                .addScaledVector(hit.face.normal, 0.025);
              f.velocity.reflect(hit.face.normal).multiplyScalar(0.25);
            }
          }
          if (f.position.y < 0.025) {
            f.position.y = 0.025;
            f.velocity.y = Math.abs(f.velocity.y) * 0.18;
            f.velocity.x *= 0.7;
            f.velocity.z *= 0.7;
          }
          f.rotation.x += f.spin.x * h;
          f.rotation.y += f.spin.y * h;
          f.rotation.z += f.spin.z * h;
          scale.setScalar(f.age > 2.5 ? (3 - f.age) * 2 : 1);
        }
        quat.setFromEuler(f.rotation);
        matrix.compose(f.position, quat, scale);
        fragments.setMatrixAt(i, matrix);
      }
      if (f.active) max = i + 1;
    }
    if (changed) {
      fragments.count = Math.max(max, fragments.count);
      fragments.instanceMatrix.needsUpdate = true;
    }
    return {
      damageVertices: cracked,
      detached,
      activeFragments: pool.filter((f) => f.active).length,
    };
  }
  return {
    update,
    reset() {
      consumed.fill(0);
      for (const f of pool) f.active = false;
      fragments.count = 0;
      last = -1;
      cracked = detached = 0;
    },
    get diagnostics() {
      return {
        crackedVertices: cracked,
        maxSurfaceDamage: Math.max(...damage),
        detached,
        activeFragments: pool.filter((f) => f.active).length,
      };
    },
    dispose() {
      releaseCrackChart();
      fg.dispose();
      fm.dispose();
      fragments.removeFromParent();
    },
  };
}
