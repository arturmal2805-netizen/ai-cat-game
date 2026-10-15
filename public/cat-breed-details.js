import * as THREE from "three";

// Crowd-only refinements of the reference-family sculpt. Eyes and the hero's
// geometry/material path never enter these functions.
export function sculptBreedDetails(geometry, appearance, region) {
  if (
    !(region === "face" && appearance.squareMuzzle) &&
    !(region === "body" && ["giant", "colossal"].includes(appearance.build)) &&
    !(appearance.fur === "bare" && ["body", "face", "paw"].includes(region))
  )
    return geometry;
  const p = geometry.attributes.position,
    n = geometry.attributes.normal,
    bare = appearance.fur === "bare";
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    if (region === "face" && appearance.squareMuzzle) {
      const muzzle =
        Math.exp(-(((y + 0.18) / 0.12) ** 2)) *
        THREE.MathUtils.smoothstep(z, 0.3, 0.44);
      x *= 1 + muzzle * appearance.squareMuzzle;
    }
    if (region === "body" && ["giant", "colossal"].includes(appearance.build)) {
      // Round the lower flanks into one continuous belly, without extra balls.
      const lower = 1 - THREE.MathUtils.smoothstep(y, -0.7, 0.1);
      x *= 1 + lower * 0.08;
      y -= lower * 0.055 * Math.exp(-(z * z));
    }
    if (bare && ["body", "face", "paw"].includes(region)) {
      let band, phase;
      if (region === "face") {
        band =
          THREE.MathUtils.smoothstep(y, 0.12, 0.25) *
          THREE.MathUtils.smoothstep(z, -0.08, 0.19);
        phase = y * 78 + Math.sin(x * 10) * 0.7;
      } else if (region === "paw") {
        band = Math.exp(-(((y + 0.17) / 0.12) ** 2));
        phase = y * 95 + Math.sin(x * 24) * 0.7;
      } else {
        band = 0.35 + 0.65 * THREE.MathUtils.smoothstep(z, 0.03, 0.65);
        phase = y * 19 + Math.sin(z * 5) * 1.8 + x * 2;
      }
      const fold = Math.cos(phase) * band * (region === "body" ? 0.012 : 0.004);
      x += n.getX(i) * fold;
      y += n.getY(i) * fold;
      z += n.getZ(i) * fold;
    }
    p.setXYZ(i, x, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function curlEar(geometry, amount) {
  if (!amount) return geometry;
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const turn = THREE.MathUtils.smoothstep(p.getY(i), 0.21, 0.46);
    p.setY(i, p.getY(i) - turn * turn * 0.085 * amount);
    p.setZ(i, p.getZ(i) - turn * turn * 0.16 * amount);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function lynxTuft(side, length) {
  const vertices = [],
    indices = [];
  for (let blade = 0; blade < 4; blade++) {
    const x = side * 0.028 + (blade - 1.5) * 0.009,
      y = 0.438 - Math.abs(blade - 1.5) * 0.006,
      z = -0.028 + blade * 0.002,
      tip = [
        x + side * length * 0.21,
        y + length * (1 - blade * 0.08),
        z - 0.025,
      ],
      start = vertices.length / 3;
    vertices.push(x - 0.012, y, z, x + 0.012, y, z, ...tip, x, y, z - 0.014);
    indices.push(
      start,
      start + 1,
      start + 2,
      start + 1,
      start + 3,
      start + 2,
      start + 3,
      start,
      start + 2,
      start,
      start + 3,
      start + 1,
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function ruffGeometry() {
  const g = new THREE.SphereGeometry(1, 20, 14),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      angle = Math.atan2(x, z),
      fringe = (1 - y * y) * (0.045 + 0.045 * Math.cos(angle * 9 + y * 4));
    p.setXYZ(i, x * (1 + fringe), y - fringe * 0.8, z * (1 + fringe));
  }
  g.computeVertexNormals();
  return g;
}

export function bareSkin(material, region = "body") {
  material.sheen = 0;
  material.roughness = 0.68;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec3 kittenSkin;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nkittenSkin=position;",
      );
    const bands =
      region === "face"
        ? "float mask=smoothstep(.12,.25,kittenSkin.y)*smoothstep(-.08,.19,kittenSkin.z); float phase=kittenSkin.y*82.0+sin(kittenSkin.x*11.0)*.9;"
        : region === "ear"
          ? "float mask=smoothstep(.03,.13,kittenSkin.y)*(1.0-smoothstep(.23,.38,kittenSkin.y));float phase=kittenSkin.y*105.0+sin(kittenSkin.x*19.0);"
          : "float neck=smoothstep(.08,.65,kittenSkin.z);float mask=.24+.76*neck;float phase=kittenSkin.y*29.0+sin(kittenSkin.z*6.0)*2.0+kittenSkin.x*3.0;";
    shader.fragmentShader =
      "varying vec3 kittenSkin;\n" +
      shader.fragmentShader
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          ${bands}
          float foldFade=1.0-smoothstep(.9,3.5,fwidth(phase));
          float fold=cos(phase)*mask*foldFade;
          float skinHeight=fold*.004;
          diffuseColor.rgb*=1.0+fold*.055;
        `,
        )
        .replace(
          "#include <normal_fragment_begin>",
          `#include <normal_fragment_begin>
          vec3 sx=dFdx(-vViewPosition), sy=dFdy(-vViewPosition);
          vec3 rx=cross(sy,normal), ry=cross(normal,sx);
          float det=dot(sx,rx);
          vec3 gradient=dFdx(skinHeight)*rx+dFdy(skinHeight)*ry;
          if(abs(det)>1e-8) normal=normalize(abs(det)*normal-sign(det)*gradient);
        `,
        );
  };
  material.customProgramCacheKey = () => "sphynx-folded-skin-v2-" + region;
  material.userData.skinRegion = region;
  return material;
}
