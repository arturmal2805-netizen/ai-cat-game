import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { waterMaterial, advanceWater } from "./water-shading.js";
import { waterRideSpec } from "./water-ride-data.js";
import { installRideActing } from "./ride-acting.js";
import { updateSlideVehicles } from "./slide-riders.js";

const UP = new THREE.Vector3(0, 1, 0),
  GRAVITY = 9.81;
export const SLIDE_SPLASH_SLOTS = 4;

// Width is a half-width. UV.y is travelled metres, not a stretched 0..1:
// downhill motion has the same visible speed on short and enormous flumes.
export function slideRibbon({
  curve,
  samples,
  width = 0.4,
  widthStart = width,
  widthEnd = width,
  offset = 0.07,
  crossX = false,
  steps = 128,
  shellDepth = 0,
  colors = [0x8fd8e1],
}) {
  const positions = [],
    normals = [],
    uv = [],
    paint = [],
    indices = [],
    frames = [],
    sides = 8;
  let distance = 0,
    previous;
  const color = new THREE.Color(),
    right = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps,
      sample = samples?.[Math.round(u * (samples.length - 1))];
    const p = sample ? sample.p.clone() : curve.getPoint(u),
      tangent = sample
        ? new THREE.Vector3(0, 0, 1).applyQuaternion(sample.q)
        : curve.getTangent(u).normalize();
    const up = sample ? sample.up : UP;
    if (sample) right.copy(sample.right);
    else if (crossX) right.set(1, 0, 0);
    else {
      right.set(tangent.z, 0, -tangent.x);
      if (right.lengthSq() < 1e-7) right.set(1, 0, 0);
      right.normalize();
    }
    p.addScaledVector(up, offset);
    if (previous) distance += p.distanceTo(previous);
    previous = p.clone();
    frames.push({
      p: p.clone(),
      tangent: tangent.clone(),
      right: right.clone(),
      up: up.clone(),
      distance,
    });
    color.set(
      colors[Math.min(colors.length - 1, Math.floor(u * colors.length))],
    );
    for (let j = 0; j <= sides; j++) {
      const across = (j / sides) * 2 - 1,
        rise = shellDepth
          ? across * across * shellDepth
          : across * across * 0.012;
      const halfWidth =
        THREE.MathUtils.lerp(
          widthStart,
          width,
          THREE.MathUtils.smoothstep(u, 0, 0.22),
        ) +
        (widthEnd - width) * THREE.MathUtils.smoothstep(u, 0.78, 1);
      const v = p
        .clone()
        .addScaledVector(right, across * halfWidth)
        .addScaledVector(up, rise);
      positions.push(v.x, v.y, v.z);
      normals.push(up.x, up.y, up.z);
      uv.push(j / sides, distance);
      paint.push(color.r, color.g, color.b);
      if (i < steps && j < sides) {
        const n = i * (sides + 1) + j;
        indices.push(
          n,
          n + sides + 1,
          n + 1,
          n + 1,
          n + sides + 1,
          n + sides + 2,
        );
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(paint, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.flowFrames = frames;
  return geometry;
}

// Small catch basins need real depth and a rim, without a second reef/fish scene.
export function slideBasin({
  x = 0,
  z = 0,
  rx = 1,
  rz = 0.7,
  surfaceY = 0.155,
  color = 0x28c6df,
}) {
  const g = new THREE.Group(),
    depth = 0.24;
  g.position.set(x, surfaceY - 0.155, z);
  const solid = new THREE.MeshStandardMaterial({
    color: 0xf5dfcb,
    roughness: 0.54,
  });
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).lerp(new THREE.Color(0xffe7c7), 0.37),
      roughness: 0.55,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(rx, rz, 1);
  floor.position.y = 0.155 - depth;
  g.add(floor);
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, depth, 48, 1, true),
    solid,
  );
  wall.scale.set(rx, 1, rz);
  wall.position.y = 0.155 - depth / 2;
  g.add(wall);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 48), solid);
  rim.rotation.x = -Math.PI / 2;
  rim.scale.set(rx, rz, 1);
  rim.position.y = 0.19;
  g.add(rim);
  const water = waterMaterial(color, 0.76),
    surface = new THREE.Mesh(new THREE.CircleGeometry(1, 48), water);
  surface.rotation.x = -Math.PI / 2;
  surface.scale.set(rx, rz, 1);
  surface.position.y = 0.155;
  surface.renderOrder = 3;
  g.add(surface);
  water.uniforms.uLake.value = 1;
  water.uniforms.uScale.value.set(rx * 2, rz * 2);
  let slot = 0,
    last = -100;
  const point = new THREE.Vector3();
  g.userData = {
    water,
    rx,
    rz,
    surfaceY,
    update: (t, reduced) => advanceWater(water, t, reduced),
    disturb: (x, z, t, power = 1) => {
      if (t - last < 0.16) return;
      last = t;
      point.set(x, 0.155, z);
      g.localToWorld(point);
      water.uniforms.uRipples.value[slot++ % 6].set(point.x, point.z, t, power);
      water.uniforms.uRippleCount.value = Math.min(6, slot);
    },
  };
  g.name = "Slide catch basin · real water and depth";
  return g;
}

function outletFor(channel, pool) {
  const end = channel.geometry.userData.flowFrames.at(-1),
    from = end.p.clone(),
    p = pool.position;
  const plane = p.y + 0.155,
    rx = pool.userData.rx,
    rz = pool.userData.rz;
  let dx = from.x - p.x,
    dz = from.z - p.z;
  const radius = Math.hypot(dx / rx, dz / rz);
  if (radius > 0.72) {
    dx *= 0.68 / radius;
    dz *= 0.68 / radius;
  }
  const to = channel.outletPoint
    ? new THREE.Vector3(...channel.outletPoint)
    : new THREE.Vector3(p.x + dx, plane + 0.006, p.z + dz);
  if (from.y < to.y + 0.012) from.y = to.y + 0.012;
  let vy = THREE.MathUtils.clamp(end.tangent.y * 5, -0.5, 3);
  const duration = Math.max(
    0.15,
    (vy + Math.sqrt(vy * vy + 2 * GRAVITY * (from.y - to.y))) / GRAVITY,
  );
  vy = (to.y - from.y + 0.5 * GRAVITY * duration * duration) / duration;
  const velocity = new THREE.Vector3(
    (to.x - from.x) / duration,
    vy,
    (to.z - from.z) / duration,
  );
  class Jet extends THREE.Curve {
    getPoint(u, target = new THREE.Vector3()) {
      const t = u * duration;
      return target
        .copy(from)
        .addScaledVector(velocity, t)
        .addScaledVector(UP, -0.5 * GRAVITY * t * t);
    }
  }
  const geometry = slideRibbon({
    curve: new Jet(),
    width: Math.min(0.7, (channel.widthEnd ?? channel.width) * 0.78),
    offset: 0,
    steps: 24,
  });
  return {
    geometry,
    from,
    to,
    velocity,
    duration,
    width: Math.min(0.7, (channel.widthEnd ?? channel.width) * 0.78),
    surface: channel.outletPoint ? "transfer" : "pool",
    normal: channel.outletNormal ?? [0, 1, 0],
  };
}

// The two effect batches are animated on the GPU. Their instance buffers never
// change during a frame. Four bounded uniforms suffice for real rider impacts.
function impactEffects(outlets, clock) {
  const points = Array.from(
      { length: SLIDE_SPLASH_SLOTS },
      () => new THREE.Vector4(0, 0, 0, -100),
    ),
    power = new Float32Array(SLIDE_SPLASH_SLOTS);
  const uniforms = {
    uTime: clock,
    uReduced: { value: 0 },
    uBursts: { value: points },
    uPower: { value: power },
  };
  const prelude = `uniform float uTime;uniform float uReduced;uniform vec4 uBursts[4];uniform float uPower[4];attribute vec3 aOrigin;attribute vec4 aLife;varying float vAlpha;`;
  const sprayGeo = new THREE.InstancedBufferGeometry().copy(
    new THREE.PlaneGeometry(1, 1),
  );
  const origins = [],
    velocities = [],
    life = [],
    radii = [];
  const addDrops = (origin, slot, count, width) => {
    for (let i = 0; i < count; i++) {
      const a = i * 2.399963,
        period = 0.65 + (i % 7) * 0.065,
        speed = (0.5 + (i % 5) * 0.17) * Math.max(0.5, width);
      origins.push(...origin);
      velocities.push(
        Math.cos(a) * speed,
        1.55 + (i % 9) * 0.17,
        Math.sin(a) * speed,
      );
      life.push(period, (i * 0.137) % period, period, slot);
      radii.push(0.028 + (i % 4) * 0.012);
    }
  };
  outlets.forEach((o) => addDrops(o.to.toArray(), -1, 24, o.width));
  for (let i = 0; i < SLIDE_SPLASH_SLOTS; i++) addDrops([0, 0, 0], i, 32, 1.25);
  for (const [key, values, size] of [
    ["aOrigin", origins, 3],
    ["aVelocity", velocities, 3],
    ["aLife", life, 4],
    ["aRadius", radii, 1],
  ])
    sprayGeo.setAttribute(
      key,
      new THREE.InstancedBufferAttribute(new Float32Array(values), size),
    );
  sprayGeo.instanceCount = radii.length;
  const spray = new THREE.Mesh(
    sprayGeo,
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      forceSinglePass: true,
      vertexShader:
        prelude +
        `attribute vec3 aVelocity;attribute float aRadius;varying vec2 vUv;
void main(){float age=mod(uTime+aLife.y,aLife.x);vec3 origin=aOrigin;float strength=1.;
if(aLife.w>=0.){int slot=int(aLife.w);vec4 hit=uBursts[slot];age=uTime-hit.w;origin=hit.xyz;strength=uPower[slot];}
float live=step(0.,age)*(1.-step(aLife.z,age))*(1.-uReduced);vec3 p=origin+aVelocity*strength*age+vec3(0.,-4.905*age*age,0.);live*=step(origin.y,p.y);
vec4 mv=viewMatrix*modelMatrix*vec4(p,1.);float scale=length(modelMatrix[0].xyz);mv.xy+=position.xy*aRadius*scale*(1.+strength*.45)*live;gl_Position=projectionMatrix*mv;vAlpha=live*(1.-max(0.,age)/aLife.z)*.72;vUv=uv;}`,
      fragmentShader:
        `varying vec2 vUv;varying float vAlpha;void main(){float d=length((vUv-.5)*2.);float a=(1.-smoothstep(.35,1.,d))*vAlpha;gl_FragColor=vec4(.77,.96,1.,a);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(
          ";#include",
          ";\n#include",
        ),
    }),
  );
  spray.name = "GPU ballistic slide droplets";
  // The basin water is transparent and draws at order 3. Composite droplets
  // after it so the sheet cannot paint over airborne spray; opaque walls still
  // occlude it through the normal depth test.
  spray.renderOrder = 5;
  spray.frustumCulled = false;
  spray.raycast = () => {};
  const foamGeo = new THREE.InstancedBufferGeometry().copy(
    new THREE.RingGeometry(0.72, 1, 32),
  );
  const foamOrigins = [],
    foamLife = [],
    foamNormals = [];
  outlets.forEach((o) => {
    for (let i = 0; i < 2; i++) {
      foamOrigins.push(...o.to.toArray());
      foamLife.push(1.5, i * 0.75, Math.max(0.22, o.width), -1);
      foamNormals.push(...o.normal);
    }
  });
  for (let slot = 0; slot < SLIDE_SPLASH_SLOTS; slot++)
    for (let i = 0; i < 2; i++) {
      foamOrigins.push(0, 0, 0);
      foamLife.push(1.6, i * 0.22, 1, slot);
      foamNormals.push(0, 1, 0);
    }
  foamGeo.setAttribute(
    "aOrigin",
    new THREE.InstancedBufferAttribute(new Float32Array(foamOrigins), 3),
  );
  foamGeo.setAttribute(
    "aLife",
    new THREE.InstancedBufferAttribute(new Float32Array(foamLife), 4),
  );
  foamGeo.instanceCount = foamLife.length / 4;
  foamGeo.setAttribute(
    "aNormal",
    new THREE.InstancedBufferAttribute(new Float32Array(foamNormals), 3),
  );
  const foam = new THREE.Mesh(
    foamGeo,
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
      vertexShader:
        prelude +
        `attribute vec3 aNormal;varying vec2 vUv;void main(){float age=mod(uTime+aLife.y,aLife.x);vec3 origin=aOrigin;float strength=aLife.z;float live=1.;
if(aLife.w>=0.){int slot=int(aLife.w);vec4 hit=uBursts[slot];age=uTime-hit.w-aLife.y;origin=hit.xyz;strength*=uPower[slot];live=step(0.,age)*(1.-step(aLife.x,age))*(1.-uReduced);}
float u=clamp(age/aLife.x,0.,1.);float r=(.22+u*.9)*strength;vec3 right=normalize(vec3(aNormal.y,-aNormal.x,0.));vec3 along=cross(right,aNormal);vec3 p=origin+right*position.x*r+along*position.y*r+aNormal*.012;gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(p,1.);vAlpha=live*sin(u*3.14159265)*.34;vUv=uv;}`,
      fragmentShader: `varying vec2 vUv;varying float vAlpha;void main(){float radial=length((vUv-.5)*2.);float alpha=smoothstep(.70,.78,radial)*(1.-smoothstep(.91,1.,radial))*vAlpha;gl_FragColor=vec4(.78,.98,.98,alpha);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
    }),
  );
  foam.name = "Expanding outlet foam and rider rings";
  foam.renderOrder = 4;
  foam.frustumCulled = false;
  foam.raycast = () => {};
  let slot = 0;
  return {
    spray,
    foam,
    points,
    power,
    uniforms,
    burst: (point, time, strength = 1) => {
      const index = slot++ % SLIDE_SPLASH_SLOTS;
      points[index].set(point.x, point.y, point.z, time);
      power[index] = strength;
      return index;
    },
  };
}

export function installSlideWater(
  root,
  {
    channels = [],
    pool,
    color = 0x33c9e3,
    impacts = null,
    speed = 5,
    extraSurfaces = [],
    simpleRide = false,
  } = {},
) {
  const spec = waterRideSpec(root.userData.id);
  if (!spec)
    throw Error("A water attraction must be registered in water-ride-data.js");
  if (root.userData.slideWater)
    throw Error("Duplicate slide water installation: " + spec.id);
  const group = new THREE.Group();
  group.name = "Living slide flow · " + spec.id;
  root.add(group);
  const basin = pool?.isObject3D ? pool : slideBasin({ ...pool, color });
  if (!basin.parent) root.add(basin);
  const clock = { value: 0 },
    wet = [],
    shells = [],
    channelInfo = [];
  for (const input of channels) {
    const geometry = slideRibbon(input),
      info = { ...input, width: input.width ?? 0.4, geometry };
    wet.push(geometry);
    channelInfo.push(info);
    if (input.shell) {
      const depth = input.shell.depth ?? 0.37;
      shells.push(
        slideRibbon({
          ...input,
          offset: (input.offset ?? 0.07) - depth * 0.85,
          width: (input.width ?? 0.4) * 1.13,
          shellDepth: depth,
          colors: input.shell.colors ?? [input.shell.color ?? 0x9fd9de],
        }),
      );
    }
  }
  const outlets = channelInfo
    .filter((c) => c.outlet !== false)
    .map((c) => outletFor(c, basin));
  wet.push(...outlets.map((o) => o.geometry));
  const materials = [];
  if (wet.length) {
    const material = waterMaterial(color, 0.79, {
      flow: { speed, width: (channels[0]?.width ?? 0.4) * 2 },
    });
    const merged = mergeGeometries(wet);
    wet.forEach((g) => g.dispose());
    const sheet = new THREE.Mesh(merged, material);
    sheet.name = "Continuous reflected downhill flow and outlet jets";
    group.add(sheet);
    materials.push(material);
  }
  if (shells.length) {
    const geometry = mergeGeometries(shells);
    shells.forEach((g) => g.dispose());
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.24,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(geometry, material));
  }
  materials.push(...extraSurfaces);
  if (simpleRide) {
    const duration = root.userData.duration || 8,
      curve = root.userData.curve,
      seat = root.userData.seatHeight ?? 0.5;
    const last = curve.getPoint(1),
      landing = outlets.at(-1).to.clone();
    landing.y += seat;
    root.userData.duration = duration;
    root.userData.handpainted = true;
    root.userData.rideFrame = (elapsed, reduced = false) => {
      const u = reduced ? 0 : THREE.MathUtils.clamp(elapsed / duration, 0, 1),
        t = Math.min(1, u / 0.88),
        p = curve.getPoint(t),
        dir = curve.getTangent(t);
      p.y += seat;
      if (u >= 0.88) p.lerp(landing, THREE.MathUtils.smoothstep(u, 0.88, 1));
      return {
        position: p.toArray(),
        yaw: Math.atan2(dir.x, dir.z),
        phase: u >= 0.88 ? "splash" : "ride",
        paw: u >= 0.88 ? 0.3 : 0.16,
        pitch: THREE.MathUtils.clamp(-dir.y * 0.3, -0.3, 0.3),
      };
    };
    impacts = [{ time: duration * 0.88, point: landing.toArray(), power: 1.1 }];
  }
  const effects = impactEffects(outlets, clock);
  group.add(effects.spray, effects.foam);
  const previous = root.userData.update;
  let lastTime = -1,
    lastElapsed = null,
    lastReduced = null;
  const events = impacts || root.userData.route?.impacts || [];
  const update = (time, reduced = false) => {
    const elapsed = root.userData.rideElapsed;
    previous?.(time, reduced);
    if (!root.userData.slideRiders?.size && time === lastTime && elapsed === lastElapsed && reduced === lastReduced)
      return;
    clock.value = reduced ? 0 : time;
    effects.uniforms.uReduced.value = reduced ? 1 : 0;
    if (!pool?.isObject3D) basin.userData.update?.(time, reduced);
    for (const material of materials) advanceWater(material, time, reduced);
    if (simpleRide && root.userData.moving) {
      const frame = root.userData.rideFrame(
          Number.isFinite(elapsed) ? elapsed : time % root.userData.duration,
          reduced,
        ),
        moving = root.userData.moving;
      moving.visible = Number.isFinite(elapsed);
      moving.position.set(...frame.position);
      moving.position.y -= root.userData.seatHeight ?? 0.5;
      moving.rotation.y = frame.yaw;
    }
    updateSlideVehicles(root, reduced);
    const clocks = root.userData.slideRiders
      ? [...root.userData.slideRiders.values()]
      : [{ elapsed, waterElapsed: lastElapsed }];
    for (const rider of clocks) if (Number.isFinite(rider.elapsed) && !reduced) {
      const elapsed = rider.elapsed;
      const start =
        rider.waterElapsed !== null && elapsed >= rider.waterElapsed ? rider.waterElapsed : -0.001;
      for (const event of (root.userData.route?.lanes?.[rider.lane || 0]?.impacts || events))
        if (event.time > start && event.time <= elapsed) {
          const point = new THREE.Vector3(...event.point);
          point.y = basin.position.y + 0.161;
          effects.burst(point, time, event.power ?? 1.8);
          basin.userData.disturb?.(
            point.x - basin.position.x,
            point.z - basin.position.z,
            time,
            event.power ?? 1.5,
          );
          root.userData.onWaterImpact?.(event.power ?? 1.5);
        }
      rider.waterElapsed = elapsed;
    }
    const activeBurst = effects.points.some(
      (p) => time - p.w >= 0 && time - p.w < 1.8,
    );
    effects.spray.visible = !reduced && (outlets.length > 0 || activeBurst);
    effects.foam.visible = outlets.length > 0 || (!reduced && activeBurst);
    lastTime = time;
    lastElapsed = Number.isFinite(elapsed) ? elapsed : null;
    lastReduced = reduced;
  };
  root.userData.slideWater = {
    version: spec.version,
    channels: channelInfo,
    outlets,
    pool: basin,
    materials,
    effects,
    group,
    update,
    events,
  };
  root.userData.update = update;
  installRideActing(root);
  update(0, true);
  return root;
}
