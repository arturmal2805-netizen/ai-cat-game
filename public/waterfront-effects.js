import * as T from "three";
// Fixed pools: no meshes, materials, or arrays are allocated by a splash or RAF.
export function createWaterfrontEffects(root) {
  const count = 320,
    position = new Float32Array(count * 3),
    velocity = new Float32Array(count * 3),
    birth = new Float32Array(count).fill(-100),
    kinds = new Float32Array(count),
    g = new T.BufferGeometry();
  g.setAttribute("position", new T.BufferAttribute(position, 3));
  g.setAttribute("birth", new T.BufferAttribute(birth, 1));
  g.setAttribute("kind", new T.BufferAttribute(kinds, 1));
  const clock = { value: 0 };
  const m = new T.ShaderMaterial({
    uniforms: {
      clock,
      ratio: {
        value: typeof devicePixelRatio === "number" ? devicePixelRatio : 1,
      },
    },
    vertexShader:
      "attribute float birth;attribute float kind;varying float bubble;uniform float clock;uniform float ratio;varying float age;void main(){bubble=kind;age=clock-birth;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=age<0.||age>1.6?0.:clamp(190.*ratio/max(1.,-mv.z),1.,10.);}",
    fragmentShader:
      "varying float age;varying float bubble;void main(){float d=length(gl_PointCoord-.5);if(d>.5||age<0.||age>1.6)discard;float a=bubble>.5?smoothstep(.24,.44,d)*(1.-smoothstep(.44,.5,d))*.55:1.-smoothstep(.2,.5,d);gl_FragColor=vec4(.7,.95,1.,(1.-age/1.6)*a);}",
    transparent: true,
    depthWrite: false,
  });
  const points = new T.Points(g, m);
  points.frustumCulled = false;
  root.add(points);
  const rings = new T.InstancedMesh(
      new T.RingGeometry(0.85, 1, 40),
      new T.MeshBasicMaterial({
        color: 0x9ee9ed,
        transparent: true,
        opacity: 0.45,
        side: T.DoubleSide,
        depthWrite: false,
      }),
      12,
    ),
    events = Array.from({ length: 12 }, () => ({
      x: 0,
      z: 0,
      time: -100,
      strength: 0,
    })),
    dummy = new T.Object3D();
  rings.instanceMatrix.setUsage(T.DynamicDrawUsage);
  rings.frustumCulled = false;
  root.add(rings);
  let cursor = 0,
    event = 0;
  return {
    splash(x, z, time, strength = 1) {
      const e = events[event++ % events.length];
      Object.assign(e, { x, z, time, strength });
      for (let k = 0; k < 64; k++) {
        const i = cursor++ % count,
          a = k * 2.399963,
          s = 1.3 + (k % 7) * 0.4;
        position[i * 3] = x;
        position[i * 3 + 1] = 0.19;
        position[i * 3 + 2] = z;
        velocity[i * 3] = Math.sin(a) * s * strength;
        velocity[i * 3 + 1] = (2 + (k % 5) * 0.6) * strength;
        velocity[i * 3 + 2] = Math.cos(a) * s * strength;
        birth[i] = time;
        kinds[i] = 0;
      }
      g.attributes.birth.needsUpdate = g.attributes.kind.needsUpdate = true;
    },
    bubbles(x, y, z, time) {
      for (let n = 0; n < 16; n++) {
        const i = cursor++ % count,
          a = n * 2.399963;
        position.set(
          [x + Math.sin(a) * 0.35, y - 0.15 * (n % 3), z + Math.cos(a) * 0.35],
          i * 3,
        );
        velocity.set(
          [Math.sin(a) * 0.12, 0.6 + (n % 4) * 0.15, Math.cos(a) * 0.12],
          i * 3,
        );
        birth[i] = time;
        kinds[i] = 1;
      }
      g.attributes.birth.needsUpdate = g.attributes.kind.needsUpdate = true;
    },
    drip(x, y, z, time) {
      for (let n = 0; n < 4; n++) {
        const i = cursor++ % count,
          a = (n * Math.PI) / 2;
        position.set([x + Math.sin(a) * 0.3, y, z + Math.cos(a) * 0.3], i * 3);
        velocity.set([Math.sin(a) * 0.2, -0.3, Math.cos(a) * 0.2], i * 3);
        birth[i] = time;
        kinds[i] = 0;
      }
      g.attributes.birth.needsUpdate = g.attributes.kind.needsUpdate = true;
    },
    update(time, dt, visible) {
      clock.value = time;
      points.visible = rings.visible = visible;
      for (let i = 0; i < count; i++) {
        const age = time - birth[i];
        if (age < 0 || age > 1.6) continue;
        position[i * 3] += velocity[i * 3] * dt;
        position[i * 3 + 1] += velocity[i * 3 + 1] * dt;
        position[i * 3 + 2] += velocity[i * 3 + 2] * dt;
        velocity[i * 3 + 1] += (kinds[i] ? 0.12 : -9.81) * dt;
      }
      g.attributes.position.needsUpdate = true;
      for (let i = 0; i < events.length; i++) {
        const e = events[i],
          a = time - e.time,
          scale = a >= 0 && a < 3.5 ? (1 + a * 3.8) * e.strength : 0;
        dummy.position.set(e.x, 0.18, e.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        rings.setMatrixAt(i, dummy.matrix);
      }
      rings.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      g.dispose();
      m.dispose();
      rings.geometry.dispose();
      rings.material.dispose();
      root.remove(points, rings);
    },
    events,
  };
}
