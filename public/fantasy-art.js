import * as THREE from "three";

let texture;
let treeTexture;
let loading;
export const fantasyArtVersion = () =>
  (texture ? 1 : 0) + (treeTexture ? 2 : 0);
export const hasFantasyArt = (trees = false) =>
  Boolean(trees ? treeTexture : texture);

// One original transparent illustration atlas. Loading never blocks the game:
// the geometric scenery remains available if an image cannot be downloaded.
export function loadFantasyArt() {
  if (loading) return loading;
  const load = (name, accept) =>
    new Promise((resolve) => {
      new THREE.TextureLoader().load(
        new URL(`./art/${name}.png?v=soft-gardens-20261014`, document.baseURI)
          .href,
        (image) => {
          image.colorSpace = THREE.SRGBColorSpace;
          image.minFilter = THREE.LinearMipmapLinearFilter;
          image.magFilter = THREE.LinearFilter;
          image.generateMipmaps = true;
          accept(image);
          resolve(true);
        },
        undefined,
        () => resolve(false),
      );
    });
  loading = Promise.all([
    load("fantasy-atlas", (image) => {
      texture = image;
    }),
    load("tree-varieties", (image) => {
      treeTexture = image;
    }),
  ]).then((results) => results.some(Boolean));
  return loading;
}

export function treeCell(kind) {
  return kind === "palm"
    ? 2
    : kind === "sakura"
      ? 1
      : ["snow", "pine"].includes(kind)
        ? 3
        : 0;
}

// Upright illustrations stay rooted in the terrain as the camera tilts. Both
// atlases share the scene's tone mapping and fog instead of glowing over it.
export function illustratedScenery(entries, { trees = false } = {}) {
  const atlas = trees ? treeTexture : texture;
  if (!atlas || !entries.length) return null;
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.setAttribute(
    "artCell",
    new THREE.InstancedBufferAttribute(
      new Float32Array(entries.map((e) => e.cell)),
      1,
    ),
  );
  geometry.setAttribute(
    "leafTint",
    new THREE.InstancedBufferAttribute(
      new Float32Array(
        entries.flatMap((e) => new THREE.Color(e.tint || 0xffffff).toArray()),
      ),
      3,
    ),
  );
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        atlas: { value: atlas },
        recolor: { value: trees ? 0 : 1 },
        treeAtlas: { value: trees ? 1 : 0 },
        gardenTime: { value: 0 },
        gardenMotion: { value: 0 },
      },
    ]),
    side: THREE.DoubleSide,
    fog: true,
    vertexShader: `
      #include <fog_pars_vertex>
      attribute float artCell;
      attribute vec3 leafTint;
      uniform float treeAtlas;
      uniform float gardenTime;
      uniform float gardenMotion;
      varying vec2 artUv;
      varying vec3 artTint;
      varying float cellNumber;
      varying float heightShade;
      void main() {
        vec4 center = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float width = length(instanceMatrix[0].xyz);
        float height = length(instanceMatrix[1].xyz);
        vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
        bool foliage = treeAtlas > 0.5 || artCell < 3.5;
        float sway = foliage ? sin(gardenTime * 0.85 + center.x * 0.31 + center.z * 0.17)
          * gardenMotion * height * 0.007 * uv.y * uv.y : 0.0;
        center.xyz += right * (position.x * width + sway);
        center.y += position.y * height;
        vec4 mvPosition = viewMatrix * center;
        gl_Position = projectionMatrix * mvPosition;
        heightShade = mix(0.88, 1.0, smoothstep(0.0, 0.38, uv.y));
        #include <fog_vertex>
        // The painterly branches approach cell boundaries. Insets prevent
        // adjacent blossoms from leaking into another billboard or its mipmaps.
        vec2 inset = vec2(artCell == 2.0 ? 0.075 : 0.035, 0.015);
        vec2 localUv = mix(inset, vec2(1.0) - vec2(0.035, 0.015), uv);
        artUv = localUv / vec2(3.0, 2.0) + vec2(mod(artCell, 3.0) / 3.0, 0.5 - floor(artCell / 3.0) * 0.5);
        artTint = leafTint;
        cellNumber = artCell;
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform sampler2D atlas;
      uniform float recolor;
      varying vec2 artUv;
      varying vec3 artTint;
      varying float cellNumber;
      varying float heightShade;
      void main() {
        vec4 painted = texture2D(atlas, artUv);
        if (painted.a < 0.28) discard;
        // Recolor purple foliage for each habitat, preserving warm trunks,
        // lanterns and cottage windows. The other original illustrations retain
        // their painted palette.
        if (recolor > 0.5 && cellNumber < 0.5 && painted.b > painted.r * 0.68 && painted.b > painted.g * 1.20) {
          float luminance = dot(painted.rgb, vec3(0.2126, 0.7152, 0.0722));
          painted.rgb = mix(painted.rgb, artTint * luminance * 2.8, 0.95);
        }
        gl_FragColor = vec4(painted.rgb * heightShade, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  // Uniform merging clones textures; all islands must keep one shared atlas.
  material.uniforms.atlas.value = atlas;
  const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
  const dummy = new THREE.Object3D();
  entries.forEach((entry, i) => {
    dummy.position.set(entry.x, (entry.y ?? 0.14) + entry.height / 2, entry.z);
    dummy.scale.set(entry.width || entry.height, entry.height, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.name = "Illustrated fantasy gardens";
  mesh.frustumCulled = false;
  mesh.userData.update = (time, reduced = false) => {
    material.uniforms.gardenTime.value = time;
    material.uniforms.gardenMotion.value = reduced ? 0 : 1;
  };
  // One inexpensive batch of soft contact shadows also works on phones where
  // real-time shadow maps are disabled. Never bake a dark disk into the art.
  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  shadowGeometry.rotateX(-Math.PI / 2);
  const shadows = new THREE.InstancedMesh(
    shadowGeometry,
    new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { shadowColor: { value: new THREE.Color(0x454151) } },
      ]),
      transparent: true,
      depthWrite: false,
      fog: true,
      vertexShader: `
        #include <fog_pars_vertex>
        varying vec2 shadowUv;
        void main() {
          shadowUv = uv;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        #include <fog_pars_fragment>
        uniform vec3 shadowColor;
        varying vec2 shadowUv;
        void main() {
          float opacity = (1.0 - smoothstep(0.08, 0.5, length(shadowUv - 0.5))) * 0.23;
          if (opacity < 0.002) discard;
          gl_FragColor = vec4(shadowColor, opacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    }),
    entries.length,
  );
  entries.forEach((entry, i) => {
    const width = entry.width || entry.height;
    dummy.position.set(entry.x, entry.y ?? 0.15, entry.z);
    dummy.scale.set(width * 0.62, 1, width * 0.44);
    dummy.updateMatrix();
    shadows.setMatrixAt(i, dummy.matrix);
  });
  shadows.name = "Soft garden contact shadows";
  shadows.frustumCulled = false;
  mesh.add(shadows);
  return mesh;
}
