import {sculptMosasaurSteps} from './mosasaur-anatomy.js';
import {runSceneSteps} from './scene-tasks.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from "three";

// Cross-sections of a muscular marine reptile. Width, dorsal and ventral
// surfaces are independent, so the skull is broad and flat rather than a cone.
const BODY = [
  [-10.6, 0.015, -0.08, -0.13],
  [-9.6, 0.22, 0.12, -0.35],
  [-8, 0.48, 0.4, -0.65],
  [-6, 0.9, 0.75, -0.92],
  [-4, 1.38, 1.22, -1.35],
  [-1.8, 1.75, 1.45, -1.55],
  [0, 1.85, 1.36, -1.5],
  [1.7, 1.64, 1.3, -1.4],
  [2.9, 1.32, 1.09, -0.91],
  [3.8, 1.12, 0.92, -0.65],
  [4.35, 0.65, 0.6, -0.4],
];
const SKULL = [
  [2.95, 0.75, 0.85, -0.65],
  [3.65, 1.24, 1.15, -0.67],
  [4.3, 1.43, 1.19, -0.24],
  [5.1, 1.26, 1.02, -0.1],
  [6.5, 1.03, 0.87, 0.03],
  [8, 0.83, 0.73, 0.15],
  [9, 0.67, 0.68, 0.22],
  [9.4,.76,.68,.22],
  [9.7,.62,.65,.26],
  [9.9,.20,.55,.34],
  [10,.02,.48,.4],
];
// Jaw coordinates are relative to the actual hinge at z=3.35, y=-.32.
const JAW = [
  [0, 0.85, 0.06, -0.48],
  [0.7, 1.23, 0.15, -0.46],
  [2, 1.15, 0.25, -0.48],
  [3.8, 0.9, 0.34, -0.25],
  [5.1,.72,.43,-.02],
  [5.8,.58,.43,.10],
  [6.25,.035,.39,.32],
];
for(const row of SKULL){row[1]*=1.32;row[2]*=1.16;row[3]*=1.10;}
for(const row of JAW){row[1]*=1.32;row[2]*=1.16;row[3]*=1.10;}
const cache = new Map();
function slope(a, b) {
  return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
}
function section(rows, z, c) {
  let i = 1;
  while (i < rows.length - 1 && rows[i][0] < z) i++;
  const a = rows[i - 1],
    b = rows[i],
    d = b[0] - a[0],
    u = THREE.MathUtils.clamp((z - a[0]) / d, 0, 1),
    v = (b[c] - a[c]) / d,
    before = rows[Math.max(0, i - 2)],
    after = rows[Math.min(rows.length - 1, i + 1)],
    m0 = i === 1 ? v : slope((a[c] - before[c]) / (a[0] - before[0]), v),
    m1 =
      i === rows.length - 1
        ? v
        : slope(v, (after[c] - b[c]) / (after[0] - b[0]));
  return (
    (2 * u ** 3 - 3 * u * u + 1) * a[c] +
    (u ** 3 - 2 * u * u + u) * d * m0 +
    (-2 * u ** 3 + 3 * u * u) * b[c] +
    (u ** 3 - u * u) * d * m1
  );
}
function surface(
  rows,
  { rings = 96, sides = 36, skull = false, jaw = false } = {},
) {
  const positions = [],
    colors = [],
    uv = [],
    indices = [],
    blue = new THREE.Color(jaw ? 0x637e7c : 0x28505d),
    light = new THREE.Color(0x93aba3),
    dark = new THREE.Color(0x112d3b),
    color = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const z = THREE.MathUtils.lerp(rows[0][0], rows.at(-1)[0], i / rings),
      width = section(rows, z, 1),
      top = section(rows, z, 2),
      bottom = section(rows, z, 3),
      middle = (top + bottom) / 2,
      height = (top - bottom) / 2;
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2,
        sn = Math.sin(a),
        cs = Math.cos(a),
        x = Math.sign(cs) * Math.abs(cs) ** (skull ? 0.73 : 0.94) * width,
        y =
          middle +
          Math.sign(sn) * Math.abs(sn) ** (skull ? 0.72 : 0.93) * height,
        belly = THREE.MathUtils.smoothstep(-sn, 0.05, 0.72),
        patches = Math.sin(z * 3.8 + cs * 9) * Math.cos(a * 8 - z * 2.4),
        speckle = THREE.MathUtils.smoothstep(patches, 0.35, 0.95) * 0.28;
      color
        .copy(blue)
        .lerp(dark, Math.max(0, sn) * 0.24 + speckle * (1 - belly));
      color.lerp(light, jaw ? 0.32 + belly * 0.6 : belly * 0.96);
      color.multiplyScalar(0.96 + Math.sin(z * 17 + a * 21) * 0.025);
      const relief=skull? .012*Math.sin(z*17+a*4)*Math.cos(a*27)+.008*Math.sin(z*31-a*19):.006*Math.sin(z*12+a*13);
      positions.push(x+cs*relief,y+sn*relief,z);
      colors.push(color.r, color.g, color.b);
      uv.push((j / sides) * 3, z * 0.24);
      if (i < rings && j < sides) {
        const n = i * (sides + 1) + j;
        indices.push(
          n,
          n + 1,
          n + sides + 1,
          n + 1,
          n + sides + 2,
          n + sides + 1,
        );
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function paddle() {
  const positions = [],
    colors = [],
    uv = [],
    indices = [],
    rings = 28,
    sides = 20,
    top = new THREE.Color(0x367c9e),
    bottom = new THREE.Color(0xb8d5d4),
    color = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings,
      x = t * 3.6,
      centerZ = -0.1 - t * 1.65,
      centerY = -t * t * 0.26,
      width = 0.04 + Math.sin(Math.PI * t) ** 0.7 * (0.8 - t * 0.18),
      thick = 0.015 + 0.23 * (1 - t) * Math.sin(Math.PI * (t * 0.8 + 0.1));
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      positions.push(
        x,
        centerY + Math.sin(a) * thick,
        centerZ + Math.cos(a) * width,
      );
      color
        .copy(top)
        .lerp(bottom, THREE.MathUtils.smoothstep(-Math.sin(a), 0, 0.8));
      colors.push(color.r, color.g, color.b);
      uv.push(t * 2, j / sides);
      if (i < rings && j < sides) {
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
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function* mosasaurGeometrySteps(kind) {
  if (cache.has(kind)) return cache.get(kind);
  let g;
  if (kind === "body") g = yield* sculptMosasaurSteps("body");
  else if (kind === "skull") g = yield* sculptMosasaurSteps("body");
  else if (kind === "jaw")
    g = yield* sculptMosasaurSteps("jaw");
  else if (kind === "paddle") g = paddle();
  else throw new RangeError("Unknown mosasaur surface");
  if(kind==='body'){
    const parts=[g];
    const ray=new THREE.Raycaster(),probe=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
    // Real overlapping osteoderms, anchored to the continuous skin. They share
    // its material and tail deformation instead of becoming separate objects.
    for(let row=-3;row<=3;row++)for(let j=0;j<49;j++){
      const z=-8.6+j*.35+(Math.abs(row)%2)*.17,x=row*.36*(z< -3?Math.max(.25,1+(z+3)*.12):1);
      ray.set(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(probe,false)[0];if(!hit||hit.point.y<.15&&z>3)continue;
      const n=hit.face.normal.clone(),center=hit.point.clone().addScaledVector(n,-.018),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),n),vertices=[],uv=[],colors=[],indices=[],tint=new THREE.Color((j+row)%3?0x527987:0x6b9097),size=z>5?.115:.16,height=(row===0?.14:.065)*(z>5?.7:1);
      for(let k=0;k<7;k++){const a=k*Math.PI/3,v=k===6?new THREE.Vector3(0,height,-.035):new THREE.Vector3(Math.cos(a)*size,0,Math.sin(a)*size*1.3);v.applyQuaternion(q).add(center);vertices.push(v.x,v.y,v.z);uv.push(k%2,z*.32);colors.push(tint.r,tint.g,tint.b);if(k<6)indices.push(k,(k+1)%6,6);}
      const plate=new THREE.BufferGeometry();plate.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));plate.setAttribute('normal',new THREE.Float32BufferAttribute(Array(7).fill(n.toArray()).flat(),3));plate.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));plate.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));plate.setIndex(indices);parts.push(plate);
    }
    probe.material.dispose();
    g=mergeGeometries(parts);for(const p of parts)p.dispose();
  }
  g.userData.sharedScenery = true;
  cache.set(kind, g);
  return g;
}
export function mosasaurGeometry(kind){return runSceneSteps(mosasaurGeometrySteps(kind));}
let tooth;
export function mosasaurToothGeometry(){
 if(tooth)return tooth;const p=[],n=[],uv=[],colors=[],indices=[];
 for(let j=0;j<=7;j++)for(let k=0;k<=12;k++){
  const t=j/7,a=k/12*Math.PI*2,r=Math.pow(1-t,.85),bend=.23*t*t,tint=new THREE.Color(0xf6e8c5).lerp(new THREE.Color(0xb7a87f),Math.pow(1-t,5)*.42);
  p.push(Math.cos(a)*r,bend+Math.sin(a)*r*.9,t-.5);uv.push(k/12,t);colors.push(tint.r,tint.g,tint.b);
  if(j<7&&k<12){const q=j*13+k;indices.push(q,q+13,q+1,q+1,q+13,q+14);}
 }
 tooth=new THREE.BufferGeometry();tooth.setAttribute('position',new THREE.Float32BufferAttribute(p,3));tooth.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));tooth.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));tooth.setIndex(indices);tooth.rotateX(-Math.PI/2);tooth.computeVertexNormals();tooth.userData.sharedScenery=true;return tooth;
}
export function installMosasaurGeometry(kind,geometry){geometry.userData.sharedScenery=true;cache.set(kind,geometry);}
export function mosasaurDentalAnchors(kind,geometry=mosasaurGeometry(kind)){
 if(geometry.userData.dentalAnchors)return geometry.userData.dentalAnchors;
 const upper=kind==='body',probe=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster(),p=geometry.attributes.position,anchors=[];
 const count=upper?20:18,start=upper?4.5:1.05,step=upper?.226:.263;
 for(const side of [-1,1])for(let j=0;j<count;j++){
  const z=start+j*step;let width=0;
  for(let k=0;k<p.count;k++)if(Math.abs(p.getZ(k)-z)<.18)width=Math.max(width,Math.abs(p.getX(k)));
  for(const row of [0,1]){
   const x=side*width*(row?.62:.86);ray.set(new THREE.Vector3(x,upper?-5:4,z),new THREE.Vector3(0,upper?1:-1,0));
   const hit=ray.intersectObject(probe,false)[0];if(hit)anchors.push({side,j,row,point:hit.point.toArray()});
  }
 }
 probe.material.dispose();geometry.userData.dentalAnchors=anchors;return anchors;
}
let scales;
export const mosasaurSkullWidth=z=>section(SKULL,z,1);
export const mosasaurJawWidth=z=>section(JAW,z,1);
export function mosasaurScales() {
  if (scales) return scales;
  const n = 256,
    data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const row = Math.floor(y / 16),
        u = (((x + (row % 2) * 8) % 16) - 8) / 8,
        v = ((y % 16) - 8) / 8,
        r = Math.hypot(u, v * 0.85),
        seam = THREE.MathUtils.smoothstep(r, 0.65, 0.95),
        value = Math.round(190 - seam * 38 + Math.sin(x * 2.1 + y * 1.8) * 3),
        i = (y * n + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  scales = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  scales.name = "Shared small reptile scale relief";
  scales.wrapS = scales.wrapT = THREE.RepeatWrapping;
  scales.repeat.set(2,2);
  scales.generateMipmaps = true;
  scales.minFilter = THREE.LinearMipmapLinearFilter;
  scales.magFilter = THREE.LinearFilter;
  scales.needsUpdate = true;
  scales.userData.sharedScenery = true;
  return scales;
}
