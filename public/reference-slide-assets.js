import * as THREE from "three";
import { referenceSlide } from "./reference-slide-data.js";
import {
  createReferenceRoute,
  DREAM_RADIUS,
  DREAM_WATER,
  bowlHeight,
} from "./reference-slide-motion.js";
import { referenceProps } from "./reference-slide-props.js";
import { flume, crystalGlass } from "./mega-ride-assets.js";
import { shape, torus } from "./fantasy-scenery.js";
import { batchModelGeometry, batchModelSteps } from "./model-batching.js";
import { runSceneSteps } from "./scene-tasks.js";
import {
  waterMaterial,
  advanceWater,
  applyUnderwaterLighting,
} from "./water-shading.js";
import { installSlideWater } from "./slide-water.js";
import { sampleRideActing, rideActingFrame } from "./ride-acting.js";
import { atollProps } from "./atoll-slide-props.js";
import { atollRideReaction } from "./atoll-slide-acting.js";
import { slideRibbon } from "./slide-water.js";
import {atollApproach} from './atoll-slide-navigation.js';
const atollActingCache=new Map();

function receivingPool(spec) {
  const g = new THREE.Group(),
    star = spec.kind === "cloud-star",
    rx = spec.premiumWater ? spec.pool[2] : star ? 8 : 7.2,
    rz = spec.premiumWater ? spec.pool[3] : star ? 6.5 : 4.5,
    outline = new THREE.Shape(),
    points = [];
  for (let i = 0; i <= 100; i++) {
    const a = (i / 100) * Math.PI * 2,
      r = star ? 0.81 + 0.19 * Math.cos(a * 5) : 1,
      x = Math.sin(a) * rx * r,
      z = Math.cos(a) * rz * r;
    if (i) outline.lineTo(x, z);
    else outline.moveTo(x, z);
    points.push(new THREE.Vector3(x, 0.24, -z));
  }
  outline.closePath();
  g.position.set(spec.premiumWater ? spec.pool[0] : 3, spec.surfaceY - 0.155, spec.premiumWater ? spec.pool[1] : 12);
  g.name = star
    ? "Deep star-shaped receiving pool"
    : "Deep pearl receiving pool";
  const outside = new THREE.Shape(),
    hole = new THREE.Path();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i) outside.lineTo(p.x * 1.055, -p.z * 1.055);
    else outside.moveTo(p.x * 1.055, -p.z * 1.055);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    if (i === points.length - 1) hole.moveTo(p.x, -p.z);
    else hole.lineTo(p.x, -p.z);
  }
  outside.closePath();
  hole.closePath();
  outside.holes.push(hole);
  const wallGeo = new THREE.ExtrudeGeometry(outside, {
    depth: 1.2,
    bevelEnabled: false,
    steps: 1,
  });
  wallGeo.rotateX(-Math.PI / 2);
  wallGeo.translate(0, -1.2, 0);
  const wall = new THREE.Mesh(
    wallGeo,
    new THREE.MeshStandardMaterial({ color: 0x91d4d3, roughness: 0.6 }),
  );
  wall.position.y = 0.155;
  g.add(wall);
  const clock = { value: 0 },
    bedGeo = new THREE.ShapeGeometry(outline, 32);
  bedGeo.rotateX(-Math.PI / 2);
  const bed = new THREE.Mesh(
    bedGeo,
    applyUnderwaterLighting(
      new THREE.MeshStandardMaterial({ color: spec.premiumWater ? 0x289dab : 0x80d7df, roughness: 0.75 }),
      clock,
      0x22bed8,
    ),
  );
  bed.position.y = -1.035;
  bed.name = "Real receiving pool floor";
  g.add(bed);
  const material = waterMaterial(spec.premiumWater ? 0x09c5df : 0x2bbfdc, spec.premiumWater ? .92 : 0.8),
    waterGeo = new THREE.ShapeGeometry(outline, 32);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, material);
  water.position.y = 0.155;
  water.renderOrder = 3;
  g.add(water);
  material.uniforms.uLake.value = 1;
  material.uniforms.uScale.value.set(rx * 2, rz * 2);
  const rim = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points, true),
      150,
      0.26,
      8,
      true,
    ),
    new THREE.MeshStandardMaterial({
      color: 0xffdfad,
      metalness: 0.16,
      roughness: 0.5,
    }),
  );
  g.add(rim);
  let ripple = 0;
  const p = new THREE.Vector3();
  g.userData = {
    rx,
    rz,
    depth: 1.2,
    water: material,
    bed,
    disturb(x, z, time, force = 1) {
      g.updateWorldMatrix(true, false);
      p.set(x, 0.155, z).applyMatrix4(g.matrixWorld);
      material.uniforms.uRipples.value[ripple++ % 6].set(
        p.x,
        p.z,
        time,
        Math.min(force, 1.8),
      );
      material.uniforms.uRippleCount.value = Math.min(6, ripple);
    },
    update(time, reduced) {
      clock.value = reduced ? 0 : time;
      advanceWater(material, time, reduced);
    },
  };
  return g;
}
function vortexBowl(b, spec, props, root) {
  const profile = Array.from({ length: 33 }, (_, i) => {
      const inner = spec.premiumWater ? 6 : 0,
        r = inner + ((b.radius - inner) * i) / 32;
      return new THREE.Vector2(r, bowlHeight(b, r));
    }),
    floorGeo = new THREE.LatheGeometry(profile, 72),
    floor = new THREE.Mesh(
      floorGeo,
      new THREE.MeshStandardMaterial({
        color: spec.kind === "blue-whirlpool" ? 0x8bb5ac : spec.accent,
        roughness: 0.32,
        metalness: 0.12,
        side: THREE.DoubleSide,
      }),
    );
  floor.position.set(b.x, 0, b.z);
  props.add(floor);
  const surfaceGeo = floorGeo.clone();
  surfaceGeo.translate(0, spec.premiumWater ? .12 : 0.07, 0);
  const uv = surfaceGeo.attributes.uv,
    pos = surfaceGeo.attributes.position;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i,
      spec.premiumWater ? Math.atan2(pos.getZ(i),pos.getX(i))/(Math.PI*2)+.5 : 0.5 + pos.getX(i) / (b.radius * 2),
      spec.premiumWater ? Math.hypot(pos.getX(i),pos.getZ(i))/b.radius : 0.5 + pos.getZ(i) / (b.radius * 2));
  const material = waterMaterial(0x3cbde5, 0.85, {
      flow: {
        speed: 6,
        width: b.radius * 2,
        length: b.radius * 2,
        vortex: true,
      },
    }),
    surface = new THREE.Mesh(surfaceGeo, material);
  surface.position.set(b.x, 0, b.z);
  surface.renderOrder = 2;
  root.add(surface);
  // Entry/exit openings stay free; no closed solid collar across the raft.
  const rim = torus(
    props,
    spec.color,
    b.radius,
    spec.kind === "blue-whirlpool" ? 0.09 : 0.2,
    b.x,
    b.base + b.depth + 0.16,
    b.z,
    false,
    Math.PI * 1.45,
  );
  rim.rotation.x = Math.PI / 2;
  rim.rotation.z = 0.5;
  for (const side of spec.premiumWater ? [] : [-1, 1])
    shape(
      props,
      "pole",
      0xe7ceaa,
      b.x + side * (b.radius + 1.6),
      Math.max(0.5, b.base / 2),
      b.z,
      0.28,
      Math.max(1, b.base),
      0.28,
    );
  return material;
}
function gallery(root, props, spec) {
  const g = new THREE.Group();
  g.name = "Visible underwater gallery and aquarium fish";
  g.position.set(0, 0, -1);
  root.add(g);
  const glass = crystalGlass(0x8ae2f1);
  glass.opacity = 0.08;
  const box = new THREE.Mesh(new THREE.BoxGeometry(25, 11, 17), glass);
  box.position.y = 6.2;
  g.add(box);
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(25, 17),
    waterMaterial(0x56d4e4, 0.22),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 11.7;
  surface.renderOrder = 3;
  g.add(surface);
  shape(props, "cube", 0x8dc7bb, 0, 0.5, -1, 25, 0.4, 17);
  const fishProps = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const x = -10 + (i % 5) * 5,
      z = -7 + Math.floor(i / 5) * 12;
    shape(props, "stone", 0xb8d7c8, x, 1.1, z, 0.9, 0.5, 0.7);
    for (let j = 0; j < 3; j++)
      shape(
        props,
        "petal",
        j % 2 ? 0xc0a7e8 : 0xf2afc2,
        x + (j - 1) * 0.4,
        1.7,
        z,
        0.3,
        1.2,
        0.3,
      );
    const fish = new THREE.Group();
    fish.position.set(x, 3 + (i % 3) * 2, z);
    fishProps.add(fish);
    shape(
      fish,
      "sphere",
      [0xffce83, 0xeeb1ec, 0x9fbff3][i % 3],
      0,
      0,
      0,
      0.55,
      0.35,
      0.85,
    );
    shape(fish, "petal", spec.accent, 0, 0, -0.9, 0.45, 0.45, 0.12);
    for (const side of [-1, 1]) {
      shape(fish, "sphere", 0xffffff, side * 0.34, 0.1, 0.46, 0.16, 0.16, 0.12);
      shape(fish, "sphere", 0x364b63, side * 0.35, 0.1, 0.55, 0.07, 0.08, 0.05);
    }
  }
  g.add(batchModelGeometry(fishProps, { combineColors: true }));
  return surface.material;
}
function bubbles(root, lift) {
  const geometry = new THREE.BufferGeometry(),
    positions = new Float32Array(48 * 3);
  for (let i = 0; i < 48; i++)
    positions.set(
      lift
        ? [-9 + Math.sin(i * 2.4) * 1.25, 0, -11 + Math.cos(i * 2.4) * 1.25]
        : [Math.sin(i * 2.4) * 10, 0, -1 + Math.cos(i * 2.4) * 6],
      i * 3,
    );
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute(
    "aSeed",
    new THREE.Float32BufferAttribute(
      Array.from({ length: 48 }, (_, i) => i * 0.371),
      1,
    ),
  );
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uHeight: { value: lift ? 32 : 10 } },
    vertexShader: `attribute float aSeed;uniform float uTime;uniform float uHeight;varying float vAlpha;void main(){float a=fract(aSeed+uTime*.14);vec3 p=position;p.y=1.+a*uHeight;p.x+=sin(uTime+aSeed*12.)*.11;vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(42./max(1.,-v.z),1.,7.);vAlpha=sin(a*3.14159)*.4;}`,
    fragmentShader: `varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.85,1.,r))*smoothstep(.45,.75,r);gl_FragColor=vec4(.8,1.,1.,a*vAlpha);}`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.raycast = () => {};
  root.add(points);
  return { points, material };
}
export function referenceSlideAttraction(id) {
  if (!referenceSlide(id)) return null;
  return runSceneSteps(referenceSlideSteps(id));
}
export function* referenceSlideSteps(id) {
  const spec = referenceSlide(id);
  if (!spec) return null;
  const root = new THREE.Group(),
    props = new THREE.Group(),
    moving = new THREE.Group(),
    route = createReferenceRoute(spec),
    channels = [],
    water = [],
    shells = new Map();
  root.name = spec.name;
  moving.name = "Pearl guest raft";
  root.add(moving);
  // No change to approved cat geometry. The whole raft follows the cat seat.
  torus(moving, spec.accent, 1.45, 0.18, 0, -0.04, 0).rotation.x = Math.PI / 2;
  const seat = new THREE.Mesh(
    new THREE.CircleGeometry(1.34, 28),
    new THREE.MeshStandardMaterial({ color: 0xffe9cb, roughness: 0.65 }),
  );
  seat.rotation.x = -Math.PI / 2;
  seat.position.y = -0.16;
  moving.add(seat);
  for (const side of [-1, 1])
    torus(moving, 0xffd798, 0.16, 0.05, side * 1.35, 0.1, 0.4).rotation.y =
      Math.PI / 2;
  yield;
  const raft = yield* batchModelSteps(moving, { combineColors: true });
  moving.clear();
  moving.add(raft);
  const scenic = spec.premiumWater
    ? yield* atollProps(props, root, spec, route, receivingPool)
    : (yield* referenceProps(props, spec, route), null);
  for (const [i, data] of route.geometry.entries()) {
    yield;
    if(spec.premiumWater)data.flumeSteps=360;
    data.openEnd = !!data.receiver;
    data.openStart = !!route.bowls.length;
    const laneColors = spec.kind === "rainbow-race" ? [0xff809a,0xffb66b,0xffdf68,0x8ceaa0,0x71c9fc,0xc6a0fa] : [spec.color,spec.accent],
      color = data.laneColor !== undefined ? laneColors[data.laneColor % laneColors.length] : [spec.color, spec.accent, 0xbcb4f7][i % 3],
      key = data.full ? "glass" : "open";
    if (!shells.has(key + color))
      shells.set(
        key + color,
        data.full
          ? crystalGlass(color)
          : new THREE.MeshStandardMaterial({
              color,
              roughness: 0.32,
              metalness: 0.16,
              side: THREE.DoubleSide,
            }),
      );
    const track = new THREE.Mesh(
      data.wave || data.halfpipe ? slideRibbon({samples:data.samples,width:data.wave?8:5,offset:-2.5,shellDepth:1.8,steps:360,colors:[color]}) : flume(data, DREAM_RADIUS, { full: data.full }),
      shells.get(key + color),
    );
    track.name = "Authored wet flume " + (i + 1);
    props.add(track);
    if (data.full)
      props.add(
        new THREE.Mesh(
          flume(data, DREAM_RADIUS + 0.045),
          new THREE.MeshStandardMaterial({
            color,
            roughness: 0.28,
            metalness: 0.2,
            side: THREE.DoubleSide,
          }),
        ),
      );
    // Both tube edges and regularly spaced transparent ribs stay outside paws.
    for (const side of [-1, 1]) {
      const edge = data.samples
        .filter((_, j) => j % 3 === 0)
        .map((s) => s.p.clone().addScaledVector(s.right, side * (data.wave?8:data.halfpipe?5:DREAM_RADIUS)));
      const geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(edge),
        spec.premiumWater ? 320 : 160,
        0.055,
        5,
        false,
      );
      if(data.coloredLoops){
        const uv=geometry.attributes.uv,colors=new Float32Array(uv.count*3),palette=[0x79deff,0xf2a1d7,0xc39ff8,0xffd18a].map(c=>new THREE.Color(c));
        for(let j=0;j<uv.count;j++){const c=palette[Math.min(3,Math.floor(uv.getX(j)*4))];colors.set([c.r,c.g,c.b],j*3);}
        geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
      }
      props.add(
        new THREE.Mesh(
          geometry,
          spec.premiumWater ? new THREE.MeshBasicMaterial({color:data.coloredLoops?0xffffff:color,vertexColors:!!data.coloredLoops}) : new THREE.MeshStandardMaterial({
            color: i % 2 ? spec.accent : 0xffdc93,
            metalness: 0.22,
            roughness: 0.38,
          }),
        ),
      );
    }
    if (data.full)
      for (let j = 45; j < 600; j += 90) {
        yield;
        const s = data.samples[j],
          ring = torus(
            props,
            i % 2 ? spec.accent : 0xf5daa1,
            DREAM_RADIUS + 0.015,
            0.047,
            ...s.p.toArray(),
          );
        ring.quaternion.copy(s.q);
      }
    if (data.rainbow) {
      for (let band = 0; band < 7; band++) {
        yield;
        const pts = data.samples
          .filter((_, j) => j % 3 === 0)
          .map((s) =>
            s.p
              .clone()
              .addScaledVector(s.up, -2.48)
              .addScaledVector(s.right, (band - 3) * 0.52),
          );
        const geo = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts),
          180,
          0.23,
          6,
          false,
        );
        props.add(
          new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({
              color: [
                0xf888a9, 0xffbb73, 0xffe58d, 0x87dbae, 0x80deee, 0xa7bbf2,
                0xd4a2ed,
              ][band],
              roughness: 0.4,
            }),
          ),
        );
      }
    }
    const lastOfPiece = data.k === data.pieces - 1,
      later = route.geometry
        .slice(i + 1)
        .some((next) => next.part === data.part),
      lane = route.lanes.find((l) => l.geometry.includes(data)),
      finalInLane = lane.geometry.at(-1) === data,
      next = lane.parts[lane.parts.indexOf(data.part) + 1],
      landing = lane.parts[lane.parts.indexOf(data.part) + 2],
      receiver = data.receiver
        ? data.samples
            .at(-1)
            .p.clone()
            .addScaledVector(data.samples.at(-1).up, DREAM_WATER)
            .toArray()
        : next?.flight && landing?.points
          ? V(landing.points[0])
              .add(new THREE.Vector3(0, DREAM_WATER, 0))
              .toArray()
          : null;
    channels.push({
      samples: data.samples,
      width: data.wave ? 7.6 : data.halfpipe ? 4.6 : 1.4,
      offset: DREAM_WATER,
      steps: spec.premiumWater ? 360 : 180,
      colors: [0x88ecf7, 0x45cae4],
      outlet:
        lastOfPiece &&
        !later &&
        (finalInLane || !!data.receiver || !!next?.flight),
      ...(receiver ? { outletPoint: receiver } : {}),
    });
  }
  for (const b of route.bowls) {
    yield;
    water.push(vortexBowl(b, spec, props, root));
  }
  let galleryWater;
  if (spec.kind === "ocean-tunnel") galleryWater = gallery(root, props, spec);
  const bubbleFX = ["ocean-tunnel", "water-lift"].includes(spec.kind)
    ? bubbles(root, spec.kind === "water-lift")
    : null;
  // Flight rings lie on the real ballistic seat, with clear space for giants.
  for (const u of route.rings) {
    const f = route.flights.at(-1),
      t = f.duration * u,
      p = [
        f.from[0] + f.vx * t,
        f.from[1] + f.vy * t - 0.5 * f.gravity * t * t,
        f.from[2] + f.vz * t,
      ],
      ring = torus(props, 0xffdb79, 3, 0.16, ...p, true);
    ring.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(f.vx, f.vy - f.gravity * t, f.vz).normalize(),
    );
  }
  const pool = receivingPool(spec);
  root.add(pool);
  // Exit stairs span the real raised basin down to dry ground.
  for (let i = 0; i < 7; i++)
    shape(
      props,
      "cube",
      0xffe3b6,
      spec.premiumWater ? spec.pool[0] : 3,
      1.45 - i * 0.19,
      (spec.premiumWater ? spec.pool[1] + spec.pool[3] : 16.7) + i * 0.36,
      3.8,
      0.22,
      0.48,
    );
  const staticModel = yield* batchModelSteps(props, { combineColors: true });
  staticModel.name = "Batched reference complex " + spec.referenceCell.index;
  root.add(staticModel);
  props.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  root.userData = {
    id,
    referenceSlide: true,
    premiumWater: !!spec.premiumWater,
    ...(scenic?.portals?.length?{landmarkPortals:scenic.portals}:{}),
    ...(scenic?.floatingIslets?.length?{floatingIslets:scenic.floatingIslets}:{}),
    mega: true,
    handpainted: true,
    moving,
    pool,
    route,
    footprint: spec.footprint,
    duration: route.duration,
    rideFrame: route.frame,
    seatHeight: 0,
    approachOffset: route.entry,
    dismount: route.entry,
    stats: {
      sourceMeshes: staticModel.userData.sourceMeshes,
      staticMeshes: staticModel.children.length,
      waterDraws: 1 + water.length + (scenic?.surfaceDraws||0),
    },
  };
  root.userData.update = (time, reduced = false) => {
    pool.userData.update(time, reduced);
    scenic?.update(time, reduced);
    for (const m of water) advanceWater(m, time, reduced);
    if (galleryWater) advanceWater(galleryWater, time, reduced);
    if (bubbleFX) {
      bubbleFX.material.uniforms.uTime.value = reduced ? 0 : time;
      bubbleFX.points.visible = !reduced;
    }
    moving.visible = Number.isFinite(root.userData.rideElapsed);
    if (moving.visible) {
      const f = route.frame(root.userData.rideElapsed, reduced);
      moving.position.set(...f.position);
      if (f.quaternion) moving.quaternion.fromArray(f.quaternion);
      else moving.rotation.set(0, f.yaw || 0, 0);
    }
  };
  if(spec.premiumWater){const approach=atollApproach(spec,scenic.groundObstacles);root.userData.approachFrame=approach.frame;root.userData.approachDuration=approach.duration;root.userData.approachYaw=approach.yaw;}
  installSlideWater(root, {
    channels,
    pool,
    extraSurfaces: water,
    color: 0x3bd2ee,
    speed: 7,
  });
  yield;
  const profiles = (spec.premiumWater && atollActingCache.get(spec.id)) || route.lanes.map((l) =>
      sampleRideActing(l.frame, route.duration, l.impacts),
    ),
    scratch = profiles.map(() => ({}));
  if(spec.premiumWater)atollActingCache.set(spec.id,profiles);
  root.userData.rideReaction = (time, reduced = false, lane = 0) => {
    const reaction = rideActingFrame(
      profiles[lane % profiles.length],
      time,
      reduced,
      scratch[lane % scratch.length],
    );
    return spec.premiumWater ? atollRideReaction(spec,route.lanes[lane % route.lanes.length],time,reaction,reduced) : reaction;
  };
  root.userData.update(0, true);
  return root;
}
const V = (a) => new THREE.Vector3(...a);
