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
        new URL(`./art/${name}.png`, document.baseURI).href,
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

// Camera-facing, depth-tested illustrations enrich the 3D landscape using one
// draw call per island. Water, cats, terrain and moving rides remain geometry.
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
    uniforms: { atlas: { value: atlas }, recolor: { value: trees ? 0 : 1 } },
    side: THREE.DoubleSide,
    vertexShader: `
      attribute float artCell;
      attribute vec3 leafTint;
      varying vec2 artUv;
      varying vec3 artTint;
      varying float cellNumber;
      void main() {
        vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float width = length(instanceMatrix[0].xyz);
        float height = length(instanceMatrix[1].xyz);
        center.xy += position.xy * vec2(width, height);
        gl_Position = projectionMatrix * center;
        // The painterly branches approach cell boundaries. Insets prevent
        // adjacent blossoms from leaking into another billboard or its mipmaps.
        vec2 inset = vec2(artCell == 2.0 ? 0.075 : 0.035, 0.015);
        vec2 localUv = mix(inset, vec2(1.0) - vec2(0.035, 0.015), uv);
        artUv = localUv / vec2(3.0, 2.0) + vec2(mod(artCell, 3.0) / 3.0, 0.5 - floor(artCell / 3.0) * 0.5);
        artTint = leafTint;
        cellNumber = artCell;
      }`,
    fragmentShader: `
      uniform sampler2D atlas;
      uniform float recolor;
      varying vec2 artUv;
      varying vec3 artTint;
      varying float cellNumber;
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
        gl_FragColor = vec4(painted.rgb, 1.0);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
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
  return mesh;
}
