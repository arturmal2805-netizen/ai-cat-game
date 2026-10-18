import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createLagoon, createWaterfall } from "../public/lagoon.js";
import { createReef } from "../public/reef.js";
import { disposeBiome } from "../public/biome-scenes.js";
import { makeAttraction, animateAttraction } from "../public/world-assets.js";
import { waterEnvironmentTexture } from "../public/water-environment.js";
import {
  waterMaterial,
  waterFieldTexture,
  advanceWater,
} from "../public/water-shading.js";

test("all water shares one small mipmapped field, including pink rivers and falls", () => {
  const materials = [
    waterMaterial(),
    waterMaterial(0xf49cc8),
    waterMaterial(0x68dbe4, 0.67, { waterfall: true }),
  ];
  const field = waterFieldTexture();
  assert.equal(field.image.data.byteLength, 65536);
  assert.equal(field.image.width, 128);
  assert.equal(field.wrapS, THREE.RepeatWrapping);
  assert.equal(field.wrapT, THREE.RepeatWrapping);
  assert.equal(field.generateMipmaps, true);
  assert.equal(field.minFilter, THREE.LinearMipmapLinearFilter);
  assert.equal(field.colorSpace, THREE.NoColorSpace);
  for (const material of materials) {
    assert.equal(material.uniforms.uWaterField.value, field);
    assert.equal(material.forceSinglePass, true);
    assert.equal(material.depthWrite, false);
    material.dispose();
  }
  // Each packed channel has real variation; the flow field is periodic at the
  // tile boundary instead of introducing a large seam when it repeats.
  for (let channel = 0; channel < 4; channel++) {
    const values = new Set();
    let boundaryDifference = 0,
      interiorDifference = 0;
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        values.add(field.image.data[(y * 128 + x) * 4 + channel]);
        if (x)
          interiorDifference += Math.abs(
            field.image.data[(y * 128 + x) * 4 + channel] -
              field.image.data[(y * 128 + x - 1) * 4 + channel],
          );
      }
      boundaryDifference += Math.abs(
        field.image.data[y * 128 * 4 + channel] -
          field.image.data[(y * 128 + 127) * 4 + channel],
      );
    }
    assert.ok(values.size > 100);
    assert.ok(
      boundaryDifference / 128 < (2 * interiorDifference) / (128 * 127),
    );
  }
});

test("a moved, scaled and rotated pool receives ripples at the swimmer's world position", () => {
  const parent = new THREE.Group(),
    lake = createLagoon({ x: 2, z: -3 });
  parent.position.set(9, 2, 7);
  parent.rotation.y = 0.8;
  parent.scale.set(1.3, 1, 0.9);
  parent.add(lake);
  const expected = new THREE.Vector3(0.6, 0.155, -0.2);
  lake.localToWorld(expected);
  lake.userData.disturb(0.6, -0.2, 10, 1);
  const hit = lake.userData.water.uniforms.uRipples.value[0];
  assert.ok(Math.abs(hit.x - expected.x) < 1e-8);
  assert.ok(Math.abs(hit.y - expected.z) < 1e-8);
  assert.equal(hit.z, 10);
  assert.equal(hit.w, 1);
  disposeBiome(lake);
});

test("swim wakes stay bounded, expire, and freeze cleanly with reduced motion", () => {
  const lake = createLagoon(),
    material = lake.userData.water;
  lake.userData.disturb(0, 0, 1, 1);
  lake.userData.disturb(0, 0, 1.01, 1);
  assert.equal(
    material.uniforms.uRipples.value.filter((r) => r.w > 0).length,
    1,
  );
  lake.userData.disturb(NaN, 0, 2, 1);
  for (let i = 1; i < 20; i++)
    lake.userData.disturb(0.1, 0.2, 1 + i * 0.12, 100);
  lake.userData.update(3.3);
  assert.equal(material.uniforms.uRipples.value.length, 6);
  assert.equal(material.uniforms.uRippleCount.value, 6);
  assert.ok(material.uniforms.uRipples.value.every((r) => r.w <= 1.8));
  advanceWater(material, 10);
  assert.equal(material.uniforms.uRippleCount.value, 0);
  lake.userData.disturb(0, 0, 11, 1);
  lake.userData.update(12, true);
  assert.equal(material.uniforms.uTime.value, 0);
  assert.equal(material.uniforms.uRippleCount.value, 0);
  disposeBiome(lake);
});

test("idle lakes do not draw or upload invisible splash particles", () => {
  const lake = createLagoon({ fishCount: 12 });
  const splash = lake.children.find((m) => m.isInstancedMesh && m.count === 30);
  const version = splash.instanceMatrix.version;
  lake.userData.update(1);
  lake.userData.update(2);
  assert.equal(splash.visible, false);
  assert.equal(splash.instanceMatrix.version, version);
  lake.userData.disturb(0.1, 0.2, 2, 1);
  lake.userData.update(2.3);
  assert.equal(splash.visible, true);
  assert.ok(splash.instanceMatrix.version > version);
  const activeVersion = splash.instanceMatrix.version;
  lake.userData.update(3.1);
  assert.equal(splash.visible, false);
  assert.equal(splash.instanceMatrix.version, activeVersion);
  disposeBiome(lake);
});

test("underwater lighting composes with reef motion and survives disposal of another island", () => {
  const reef = createReef(),
    mesh = reef.children.find((m) => m.material.isMeshStandardMaterial);
  const shader = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  };
  mesh.material.onBeforeCompile(shader);
  assert.ok(shader.vertexShader.includes("reefTime"));
  assert.ok(shader.vertexShader.includes("instanceMatrix*waterPoint"));
  assert.ok(shader.fragmentShader.includes("\n#define STANDARD"));
  assert.equal(shader.uniforms.uWaterField.value, waterFieldTexture());
  reef.userData.update(7);
  assert.equal(shader.uniforms.uWaterLightTime.value, 7);
  let disposed = false;
  const onDispose = () => {
    disposed = true;
  };
  waterFieldTexture().addEventListener("dispose", onDispose);
  disposeBiome(reef);
  assert.equal(disposed, false);
  waterFieldTexture().removeEventListener("dispose", onDispose);
});

test("waterfalls flow down their own UV plane and preserve geometry and palette", () => {
  const fall = createWaterfall(1, 2, 2.3, 5, { color: 0xf49cc8 });
  const surface = fall.children.find((m) => m.material?.uniforms?.uFall);
  assert.equal(surface.material.uniforms.uFall.value, 1);
  assert.deepEqual(surface.material.uniforms.uScale.value.toArray(), [2.3, 5]);
  assert.equal(surface.material.uniforms.uColor.value.getHex(), 0xf49cc8);
  assert.equal(surface.geometry.getAttribute("position").count, 7 * 19);
  fall.userData.update(3);
  assert.equal(surface.material.uniforms.uTime.value, 3);
  fall.userData.update(50, true);
  assert.equal(surface.material.uniforms.uTime.value, 0);
  disposeBiome(fall);
});

test("legacy pond, boat, slide basin and fountain animate real water on their existing meshes", () => {
  for (const [id, count] of [
    ["pond", 1],
    ["boat", 1],
    ["waterslide", 2],
    ["fountain", 6],
  ]) {
    const root = makeAttraction(id);
    const water = root.userData.waterSurfaces;
    assert.equal(water.length, count, id);
    for (const material of water)
      assert.equal(material.uniforms.uWaterField.value, waterFieldTexture());
    const geometry = [];
    root.traverse((m) => {
      if (m.isMesh && water.includes(m.material)) geometry.push(m.geometry);
    });
    assert.equal(geometry.length, count);
    animateAttraction(root, 12);
    assert.ok(water.every((m) => m.uniforms.uTime.value === 12));
    assert.ok(geometry.every((g) => g.getAttribute("position").count > 0));
    disposeBiome(root);
  }
});

test("reflections share one bounded mipmapped light probe, without a render target", () => {
  const probe = waterEnvironmentTexture(),
    a = waterMaterial(),
    b = waterMaterial(0xf49cc8);
  assert.equal(probe.image.data.byteLength, 65536);
  assert.equal(probe.isRenderTargetTexture, false);
  assert.equal(probe.generateMipmaps, true);
  assert.equal(probe.wrapS, THREE.ClampToEdgeWrapping);
  assert.equal(a.uniforms.uWaterEnvironment.value, probe);
  assert.equal(b.uniforms.uWaterEnvironment.value, probe);
  const triples = new Set();
  for (let i = 0; i < probe.image.data.length; i += 4)
    triples.add(probe.image.data.slice(i, i + 3).join(","));
  assert.ok(triples.size > 500);
  a.dispose();
  b.dispose();
});

test("refraction follows a raised pool and moves eyes with the fish, while leaving its dark eye shading intact", () => {
  const parent = new THREE.Group(),
    lake = createLagoon({ fishCount: 12 });
  parent.position.y = 3;
  parent.scale.y = 1.2;
  lake.position.y = 2;
  parent.add(lake);
  lake.userData.update(4);
  let materials = 0,
    eyes = 0,
    reefs = 0;
  lake.traverse((mesh) => {
    const optical = mesh.material?.userData.waterLight;
    if (!optical) return;
    materials++;
    assert.ok(Math.abs(optical.level.value - (3 + 1.2 * (2 + 0.155))) < 1e-8);
    const base = mesh.material.isMeshBasicMaterial
      ? THREE.ShaderLib.basic
      : THREE.ShaderLib.standard;
    const shader = {
      uniforms: {},
      vertexShader: base.vertexShader,
      fragmentShader: base.fragmentShader,
    };
    mesh.material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.uWaterLevel, optical.level);
    if (optical.refract)
      assert.ok(shader.vertexShader.includes("waterPoint.xz+=bend"));
    if (mesh.material.isMeshBasicMaterial) {
      eyes++;
      assert.equal(optical.refract, true);
      assert.equal(optical.light, false);
      assert.ok(!shader.fragmentShader.includes("waterCaustic"));
    }
    if (shader.uniforms.reefTime) reefs++;
  });
  assert.ok(materials >= 6);
  assert.equal(eyes, 1);
  assert.ok(reefs > 0);
  parent.position.y = 7;
  lake.userData.update(5);
  lake.traverse((mesh) => {
    const optical = mesh.material?.userData.waterLight;
    if (optical)
      assert.ok(Math.abs(optical.level.value - (7 + 1.2 * (2 + 0.155))) < 1e-8);
  });
  disposeBiome(lake);
});
