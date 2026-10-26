import * as THREE from "three";

// Editable scenery stays in its original transparent render order so fading
// never changes overlap. Fully opaque authored paint needs no destination
// colour read/blend, however. Do not apply this to water, glass or cat rigs.
const opaqueMaps = new WeakMap();
function opaqueMap(texture) {
  if (!texture) return true;
  if (!texture.isDataTexture || !texture.userData.sharedScenery ||
      texture.format !== THREE.RGBAFormat || texture.type !== THREE.UnsignedByteType)
    return false;
  const known = opaqueMaps.get(texture);
  if (known?.version === texture.version) return known.opaque;
  const {data,width,height}=texture.image || {};
  let opaque = data instanceof Uint8Array && data.length === width*height*4;
  if (opaque) for (let i=3;i<data.length;i+=4) if (data[i] !== 255) {opaque=false;break;}
  opaqueMaps.set(texture,{version:texture.version,opaque});
  return opaque;
}

export function opaqueSceneryPaint(source, geometry) {
  return !!((source.isMeshStandardMaterial || source.isMeshBasicMaterial) &&
    source.opacity === 1 && source.blending === THREE.NormalBlending &&
    !source.alphaMap && !source.alphaTest && !source.alphaHash && !source.alphaToCoverage &&
    (!source.vertexColors || geometry?.attributes.color?.itemSize === 3) &&
    source.onBeforeCompile === THREE.Material.prototype.onBeforeCompile && opaqueMap(source.map));
}

export function updateSceneryBlend(material, opacity=material.opacity) {
  if (material.userData.opaqueSceneryBlend)
    material.blending = opacity === 1 ? THREE.NoBlending : THREE.NormalBlending;
}
