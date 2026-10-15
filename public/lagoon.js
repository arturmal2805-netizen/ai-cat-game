import { runSceneSteps } from "./scene-tasks.js";
import * as THREE from "three";
import { createReef, reefSteps } from "./reef.js";

// Moving cellular caustics keep their organic shape at different lake sizes.
const caustics = `
vec2 causticHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
float causticNet(vec2 p,float time){
 p+=vec2(sin(p.y*.82+time*.23),cos(p.x*.71-time*.17))*.20;
 vec2 cell=floor(p),uv=fract(p);float first=10.0,second=10.0;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 neighbor=vec2(float(x),float(y));
  vec2 offset=neighbor+.5+.26*sin(time*.25+6.2831*causticHash(cell+neighbor))-uv;
  float d=dot(offset,offset);
  if(d<first){second=first;first=d;}else{second=min(second,d);}
 }
 return 1.0-smoothstep(.012,.085,second-first);
}`;

const vertex = `
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 lakeUv;
void main(){
 vec3 p=position;
 p.z+=sin(p.x*3.0+uTime*.7)*.008+cos(p.y*4.0-uTime*.9)*.006;
 vec4 world=modelMatrix*vec4(p,1.0);vWorld=world.xyz;
 vNormal=normalize(mat3(modelMatrix)*normal);
 lakeUv=uv;
 gl_Position=projectionMatrix*viewMatrix*world;
}`;
const fragment = `
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uLake;
uniform vec3 uShoreColor;
uniform vec4 uRipples[6];
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 lakeUv;
${caustics}
void main(){
 vec2 p=vWorld.xz;
 float ripple=sin(p.x*3.7+uTime*.8)+cos(p.y*4.2-uTime*.7);
 float wake=0.0;
 for(int i=0;i<6;i++){float age=uTime-uRipples[i].z;float d=length(p-uRipples[i].xy);float live=step(0.0,age)*(1.0-smoothstep(0.0,3.5,age));wake+=sin(d*12.0-age*9.0)*exp(-d*1.1)*live*uRipples[i].w;}
 ripple+=wake*3.0;
 vec3 n=normalize(vNormal+vec3(cos(p.x*3.7+uTime*.8)*.055+wake*.07,0.0,sin(p.y*4.2-uTime*.7)*.045+wake*.04));
 vec3 view=normalize(cameraPosition-vWorld);
 float fresnel=pow(1.0-max(dot(n,view),0.0),3.0);
 vec3 reflected=reflect(-view,n);
 float clouds=smoothstep(.12,.72,sin(reflected.x*7.0+reflected.z*4.0)*.4+cos(reflected.z*8.0)*.3);
 vec3 sky=mix(vec3(.64,.75,.92),vec3(1.0,.91,.79),clouds);
 float sun=pow(max(dot(reflect(normalize(vec3(-.45,-1.0,-.2)),n),view),0.0),120.0);
 float caustic=causticNet(p*1.12,uTime);
 float edge=length((lakeUv-.5)*2.0);
 float shallow=smoothstep(.55,1.0,edge)*uLake;
 vec3 body=mix(uColor,uShoreColor,shallow*.68);
 vec3 color=mix(body,sky,.035+fresnel*.45)+vec3(.45,.75,.78)*caustic*.26+sun*vec3(1.0,.92,.7)*1.15;
 float foam=smoothstep(.91,.99,edge)*(.45+.35*sin(p.x*5.0+p.y*3.0-uTime*.6))*uLake;
 color=mix(color,vec3(.72,.97,.88),foam*.56);
 color+=ripple*.012+vec3(.65,.9,1.0)*abs(wake)*.12;
 gl_FragColor=vec4(color,clamp(uOpacity+fresnel*.18-shallow*.15,.0,.85));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export function waterMaterial(color = 0x08b5d0, opacity = 0.62) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uRipples: {
        value: Array.from(
          { length: 6 },
          () => new THREE.Vector4(0, 0, -100, 0),
        ),
      },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uLake: { value: 0 },
      uShoreColor: { value: new THREE.Color(0x73e4c5) },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
export function* lagoonSteps({
  x = 0,
  z = 0,
  rx = 3,
  rz = 2,
  fishCount = 24,
  color = 0x08b5d0,
  seed = 1,
  bedColor = 0x83ccc1,
  wallColor = 0xadc8b5,
  shoreColor = 0x73e4c5,
} = {}) {
  yield;
  const group = new THREE.Group();
  yield;
  group.position.set(x, 0, z);
  yield;
  group.name = "Lagoon";
  yield;
  const bedMaterial = new THREE.MeshStandardMaterial({
    color: bedColor,
    roughness: 0.8,
  });
  yield;
  bedMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.causticTime = { value: 0 };
    shader.uniforms.bedScale = { value: new THREE.Vector2(rx, rz) };
    group.userData.bedShader = shader;
    shader.vertexShader =
      "varying vec3 bedPosition;uniform vec2 bedScale;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nbedPosition=vec3(position.xy*bedScale,position.z);",
      );
    shader.fragmentShader =
      "uniform float causticTime; varying vec3 bedPosition;\n" +
      caustics +
      "\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat c=causticNet(bedPosition.xy*1.12,causticTime); diffuseColor.rgb+=vec3(.24,.40,.31)*c;",
      );
  };
  yield;
  bedMaterial.customProgramCacheKey = () => "lagoon-caustics-v2";
  yield;
  const bed = new THREE.Mesh(new THREE.CircleGeometry(1, 64), bedMaterial);
  yield;
  bed.rotation.x = -Math.PI / 2;
  yield;
  bed.scale.set(rx, rz, 1);
  yield;
  bed.position.y = -0.63;
  yield;
  group.add(bed);
  yield;
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.76, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.95,
      side: THREE.DoubleSide,
    }),
  );
  yield;
  wall.scale.set(rx, 1, rz);
  yield;
  wall.position.y = -0.25;
  yield;
  group.add(wall);
  yield;
  const material = waterMaterial(color),
    surface = new THREE.Mesh(new THREE.CircleGeometry(1, 64), material);
  yield;
  surface.rotation.x = -Math.PI / 2;
  yield;
  surface.scale.set(rx, rz, 1);
  yield;
  surface.position.y = 0.155;
  yield;
  surface.renderOrder = 3;
  yield;
  material.uniforms.uLake.value = 1;
  yield;
  material.uniforms.uShoreColor.value.set(shoreColor);
  yield;
  group.add(surface);
  yield;
  const reef = yield* reefSteps({
    rx,
    rz,
    seed,
    count: Math.min(18, Math.max(8, Math.round(rx * rz))),
  });
  yield;
  group.add(reef);
  yield;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.025, 6, 64),
    new THREE.MeshBasicMaterial({
      color: 0xc0f0e4,
      transparent: true,
      opacity: 0.7,
    }),
  );
  yield;
  rim.rotation.x = Math.PI / 2;
  yield;
  rim.scale.set(rx, rz, 1);
  yield;
  rim.position.y = 0.17;
  yield;
  group.add(rim);
  yield;
  const colors = [0xff9454, 0xffd75f, 0xf3a2c5, 0x6dbfff, 0x72d6b4, 0xf3d1ff];
  yield;
  const bodyGeo = new THREE.SphereGeometry(1, 12, 8),
    tailGeo = new THREE.ConeGeometry(1, 1, 3);
  yield;
  const body = new THREE.InstancedMesh(
    bodyGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
    fishCount,
  );
  yield;
  const tail = new THREE.InstancedMesh(
    tailGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      side: THREE.DoubleSide,
    }),
    fishCount,
  );
  yield;
  const eyes = new THREE.InstancedMesh(
    bodyGeo,
    new THREE.MeshBasicMaterial({ color: 0x253850 }),
    fishCount * 2,
  );
  yield;
  const fins = new THREE.InstancedMesh(
    bodyGeo,
    new THREE.MeshStandardMaterial({ color: 0xfff0cc, roughness: 0.6 }),
    fishCount * 2,
  );
  yield;
  for (const mesh of [body, tail, eyes, fins]) {
    yield;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    yield;
    mesh.frustumCulled = false;
    yield;
    group.add(mesh);
  }
  yield;
  for (let i = 0; i < fishCount; i++) {
    yield;
    body.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    yield;
    tail.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  }
  yield;
  const impacts = [],
    origin = new THREE.Vector3();
  yield;
  let impactIndex = 0;
  yield;
  const splash = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.035, 5, 4),
    new THREE.MeshBasicMaterial({
      color: 0xc9ffff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    }),
    30,
  );
  yield;
  splash.frustumCulled = false;
  yield;
  group.add(splash);
  yield;
  group.userData.disturb = (x, z, time, force = 0.6) => {
    if (!Number.isFinite(x + z + time + force)) return;
    if (impacts.length && time - impacts.at(-1).time < 0.11) return;
    group.getWorldPosition(origin);
    material.uniforms.uRipples.value[impactIndex % 6].set(
      x + origin.x,
      z + origin.z,
      time,
      force,
    );
    impactIndex++;
    impacts.push({ x, z, time, force });
    if (impacts.length > 6) impacts.shift();
  };
  yield;
  const dummy = new THREE.Object3D(),
    local = new THREE.Matrix4(),
    fishTransform = new THREE.Matrix4();
  yield;
  const states = Array.from({ length: fishCount }, (_, i) => ({
    phase: i * 2.399 + seed,
    radius: 0.25 + (i % 6) * 0.11,
    speed: 0.16 + (i % 5) * 0.025,
    depth: -0.19 - (i % 4) * 0.075,
    scale: 0.8 + (i % 3) * 0.12,
  }));
  function part(mesh, index, position, scale, rotation = [0, 0, 0]) {
    dummy.position.set(...position);
    dummy.rotation.set(...rotation);
    dummy.scale.set(...scale);
    dummy.updateMatrix();
    local.multiplyMatrices(fishTransform, dummy.matrix);
    mesh.setMatrixAt(index, local);
  }
  function update(time, reduced = false) {
    const t = reduced ? 0 : time;
    material.uniforms.uTime.value = t;
    reef.userData.update(t, reduced);
    if (group.userData.bedShader)
      group.userData.bedShader.uniforms.causticTime.value = t;
    for (let i = 0; i < 30; i++) {
      const impact = impacts[Math.floor(i / 5) % Math.max(1, impacts.length)],
        age = impact ? t - impact.time : 10;
      const active = !reduced && age >= 0 && age < 0.9;
      const a = i * 2.399;
      dummy.position.set(
        active ? impact.x + Math.sin(a) * age * 0.5 : 0,
        active
          ? 0.2 + Math.sin((age / 0.9) * Math.PI) * 0.28 * impact.force
          : -2,
        active ? impact.z + Math.cos(a) * age * 0.5 : 0,
      );
      dummy.scale.setScalar(active ? 1 : 0);
      dummy.updateMatrix();
      splash.setMatrixAt(i, dummy.matrix);
    }
    splash.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < states.length; i++) {
      const f = states[i],
        a = f.phase + t * f.speed;
      dummy.position.set(
        Math.cos(a) * rx * f.radius,
        f.depth + Math.sin(a * 2) * 0.025,
        Math.sin(a) * rz * f.radius,
      );
      for (const hit of impacts) {
        const age = t - hit.time,
          dx = dummy.position.x - hit.x,
          dz = dummy.position.z - hit.z,
          d = Math.hypot(dx, dz);
        if (age >= 0 && age < 2 && d < 1.1) {
          const push = (1.1 - d) * 0.22 * (1 - age / 2);
          dummy.position.x += (dx / (d || 1)) * push;
          dummy.position.z += (dz / (d || 1)) * push;
        }
      }
      dummy.rotation.set(0, Math.atan2(-Math.sin(a) * rx, Math.cos(a) * rz), 0);
      dummy.scale.setScalar(f.scale);
      dummy.updateMatrix();
      fishTransform.copy(dummy.matrix);
      part(body, i, [0, 0, 0], [0.11, 0.075, 0.26]);
      part(
        tail,
        i,
        [Math.sin(t * 5 + i) * 0.035, 0, -0.29],
        [0.14, 0.16, 0.035],
        [Math.PI / 2, 0, Math.sin(t * 5 + i) * 0.2],
      );
      for (let s = 0; s < 2; s++) {
        const sign = s ? 1 : -1;
        part(
          eyes,
          i * 2 + s,
          [sign * 0.093, 0.025, 0.14],
          [0.018, 0.022, 0.019],
        );
        part(
          fins,
          i * 2 + s,
          [sign * 0.1, -0.025, 0],
          [0.09, 0.025, 0.065],
          [0, sign * 0.45, Math.sin(t * 4 + i) * 0.15],
        );
      }
    }
    for (const mesh of [body, tail, eyes, fins])
      mesh.instanceMatrix.needsUpdate = true;
  }
  yield;
  update(0);
  yield;
  group.userData.update = update;
  yield;
  group.userData.fishCount = fishCount;
  yield;
  group.userData.water = material;
  yield;
  group.userData.rx = rx;
  yield;
  group.userData.rz = rz;
  yield;
  return group;
}
export function* waterfallSteps(
  x,
  z,
  width = 0.8,
  height = 4,
  { color = 0x7edced, foam = 0xe7ffff } = {},
) {
  yield;
  const group = new THREE.Group();
  yield;
  group.position.set(x, -height / 2 + 0.12, z);
  yield;
  group.name = "Waterfall";
  yield;
  const mat = waterMaterial(color, 0.67);
  yield;
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height, 6, 18),
    mat,
  );
  yield;
  group.add(sheet);
  yield;
  const lines = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.015, 0.025, 0.4, 4),
    new THREE.MeshBasicMaterial({
      color: foam,
      transparent: true,
      opacity: 0.65,
    }),
    18,
  );
  yield;
  lines.frustumCulled = false;
  yield;
  group.add(lines);
  yield;
  const dummy = new THREE.Object3D();
  yield;
  const mist = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshBasicMaterial({
      color: foam,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  yield;
  mist.scale.set(width * 1.4, 0.2, 0.45);
  yield;
  mist.position.y = -height / 2;
  yield;
  group.add(mist);
  yield;
  group.userData.update = (time, reduced = false) => {
    const t = reduced ? 0 : time;
    mat.uniforms.uTime.value = t;
    for (let i = 0; i < 18; i++) {
      dummy.position.set(
        Math.sin(i * 2.4) * width * 0.4,
        height / 2 - ((t * 0.7 + i * 0.24) % height),
        0.025,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      lines.setMatrixAt(i, dummy.matrix);
    }
    lines.instanceMatrix.needsUpdate = true;
  };
  yield;
  group.userData.update(0);
  yield;
  return group;
}

export function createLagoon(...args) {
  return runSceneSteps(lagoonSteps(...args));
}

export function createWaterfall(...args) {
  return runSceneSteps(waterfallSteps(...args));
}
