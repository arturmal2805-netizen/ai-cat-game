import * as THREE from "three";

const vertex = `
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormal;
void main(){
 vec3 p=position;
 p.z+=sin(p.x*3.0+uTime*.7)*.008+cos(p.y*4.0-uTime*.9)*.006;
 vec4 world=modelMatrix*vec4(p,1.0);vWorld=world.xyz;
 vNormal=normalize(mat3(modelMatrix)*normal);
 gl_Position=projectionMatrix*viewMatrix*world;
}`;
const fragment = `
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
varying vec3 vWorld;
varying vec3 vNormal;
void main(){
 vec2 p=vWorld.xz;
 float ripple=sin(p.x*3.7+uTime*.8)+cos(p.y*4.2-uTime*.7);
 vec3 n=normalize(vNormal+vec3(cos(p.x*3.7+uTime*.8)*.055,0.0,sin(p.y*4.2-uTime*.7)*.045));
 vec3 view=normalize(cameraPosition-vWorld);
 float fresnel=pow(1.0-max(dot(n,view),0.0),3.0);
 vec3 reflected=reflect(-view,n);
 float clouds=smoothstep(.12,.72,sin(reflected.x*7.0+reflected.z*4.0)*.4+cos(reflected.z*8.0)*.3);
 vec3 sky=mix(vec3(.64,.75,.92),vec3(1.0,.91,.79),clouds);
 float sun=pow(max(dot(reflect(normalize(vec3(-.45,-1.0,-.2)),n),view),0.0),120.0);
 float caustic=pow(1.0-abs(sin(p.x*3.1+sin(p.y*2.0)+uTime*.3)*cos(p.y*3.0+uTime*.23)),16.0);
 vec3 color=mix(uColor,sky,.06+fresnel*.45)+vec3(.45,.75,.78)*caustic*.14+sun*vec3(1.0,.92,.7)*1.4;
 color+=ripple*.012;
 gl_FragColor=vec4(color,clamp(uOpacity+fresnel*.22,.0,.85));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export function waterMaterial(color = 0x0b9fcb, opacity = 0.52) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
export function createLagoon({
  x = 0,
  z = 0,
  rx = 3,
  rz = 2,
  fishCount = 24,
  color = 0x0aa8d0,
  seed = 1,
} = {}) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.name = "Lagoon";
  const bedMaterial = new THREE.MeshStandardMaterial({
    color: 0xaacbc2,
    roughness: 0.8,
  });
  bedMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.causticTime = { value: 0 };
    group.userData.bedShader = shader;
    shader.vertexShader =
      "varying vec3 bedPosition;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nbedPosition=position;",
      );
    shader.fragmentShader =
      "uniform float causticTime; varying vec3 bedPosition;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat c=pow(1.0-abs(sin(bedPosition.x*13.0+sin(bedPosition.y*9.0)+causticTime*.3)*cos(bedPosition.y*12.0-causticTime*.2)),18.0); diffuseColor.rgb+=vec3(.18,.32,.28)*c;",
      );
  };
  bedMaterial.customProgramCacheKey = () => "lagoon-caustics-v1";
  const bed = new THREE.Mesh(new THREE.CircleGeometry(1, 64), bedMaterial);
  bed.rotation.x = -Math.PI / 2;
  bed.scale.set(rx, rz, 1);
  bed.position.y = -0.63;
  group.add(bed);
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.76, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xadc8b5,
      roughness: 0.95,
      side: THREE.DoubleSide,
    }),
  );
  wall.scale.set(rx, 1, rz);
  wall.position.y = -0.25;
  group.add(wall);
  const material = waterMaterial(color),
    surface = new THREE.Mesh(new THREE.CircleGeometry(1, 64), material);
  surface.rotation.x = -Math.PI / 2;
  surface.scale.set(rx, rz, 1);
  surface.position.y = 0.155;
  surface.renderOrder = 3;
  group.add(surface);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.025, 6, 64),
    new THREE.MeshBasicMaterial({
      color: 0xc0f0e4,
      transparent: true,
      opacity: 0.7,
    }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(rx, rz, 1);
  rim.position.y = 0.17;
  group.add(rim);
  const colors = [0xff9454, 0xffd75f, 0xf3a2c5, 0x6dbfff, 0x72d6b4, 0xf3d1ff];
  const bodyGeo = new THREE.SphereGeometry(1, 12, 8),
    tailGeo = new THREE.ConeGeometry(1, 1, 3);
  const body = new THREE.InstancedMesh(
    bodyGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
    fishCount,
  );
  const tail = new THREE.InstancedMesh(
    tailGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      side: THREE.DoubleSide,
    }),
    fishCount,
  );
  const eyes = new THREE.InstancedMesh(
    bodyGeo,
    new THREE.MeshBasicMaterial({ color: 0x253850 }),
    fishCount * 2,
  );
  const fins = new THREE.InstancedMesh(
    bodyGeo,
    new THREE.MeshStandardMaterial({ color: 0xfff0cc, roughness: 0.6 }),
    fishCount * 2,
  );
  for (const mesh of [body, tail, eyes, fins]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  for (let i = 0; i < fishCount; i++) {
    body.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    tail.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  }
  const dummy = new THREE.Object3D(),
    local = new THREE.Matrix4(),
    fishTransform = new THREE.Matrix4();
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
    if (group.userData.bedShader)
      group.userData.bedShader.uniforms.causticTime.value = t;
    for (let i = 0; i < states.length; i++) {
      const f = states[i],
        a = f.phase + t * f.speed;
      dummy.position.set(
        Math.cos(a) * rx * f.radius,
        f.depth + Math.sin(a * 2) * 0.025,
        Math.sin(a) * rz * f.radius,
      );
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
  update(0);
  group.userData.update = update;
  group.userData.fishCount = fishCount;
  group.userData.water = material;
  group.userData.rx = rx;
  group.userData.rz = rz;
  return group;
}
export function createWaterfall(x, z, width = 0.8, height = 4) {
  const group = new THREE.Group();
  group.position.set(x, -height / 2 + 0.12, z);
  group.name = "Waterfall";
  const mat = waterMaterial(0x7edced, 0.67);
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height, 6, 18),
    mat,
  );
  group.add(sheet);
  const lines = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.015, 0.025, 0.4, 4),
    new THREE.MeshBasicMaterial({
      color: 0xe7ffff,
      transparent: true,
      opacity: 0.65,
    }),
    18,
  );
  lines.frustumCulled = false;
  group.add(lines);
  const dummy = new THREE.Object3D();
  const mist = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshBasicMaterial({
      color: 0xdaf7ff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  mist.scale.set(width * 1.4, 0.2, 0.45);
  mist.position.y = -height / 2;
  group.add(mist);
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
  group.userData.update(0);
  return group;
}
