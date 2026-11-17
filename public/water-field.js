import * as THREE from 'three';
import {MOSA_WATER_FIELD} from './mosasaur-water-field-assets.js';
// One prepared data texture for EVERY water surface and underwater material.
// The original 128px generator remains the deterministic offline/failure fallback.
let prepared=null,request;
export function waterFieldTexture(){return prepared||legacyWaterFieldTexture();}
export function prepareWaterField(){
 if(typeof window==='undefined'||typeof createImageBitmap!=='function')return Promise.resolve(false);
 return request??=(async()=>{let bitmap;try{
  const options=typeof AbortSignal?.timeout==='function'?{signal:AbortSignal.timeout(8000)}:{};
  const response=await fetch(MOSA_WATER_FIELD,options);if(!response.ok)throw Error('Shared water field unavailable');
  bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'});
  const texture=new THREE.Texture(bitmap);texture.name='Shared physical water field · all map water';texture.flipY=false;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.NoColorSpace;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
  texture.userData.sharedScenery=true;texture.needsUpdate=true;prepared=texture;return true;
 }catch{bitmap?.close?.();return false;}})();
}
export const WATER_FIELD_SIZE = 128;
let field = null;

// One small, seamless RGBA field for every lagoon, slide and cascade.
// RG: wave slopes, B: caustic ridges, A: flowing surface detail. No image request,
// render target, scene copy or per-frame texture generation is needed.
export function legacyWaterFieldTexture() {
  if (field) return field;
  const size = WATER_FIELD_SIZE,
    cells = 8,
    tau = Math.PI * 2;
  const centers = Array.from({ length: cells * cells }, (_, i) => {
    const hash = (n) => {
      const v = Math.sin(n * 127.1 + 17.7) * 43758.5453;
      return v - Math.floor(v);
    };
    return [0.22 + 0.56 * hash(i + 1), 0.22 + 0.56 * hash(i + 82)];
  });
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size;
      const wx = u * cells + 0.16 * Math.sin(tau * v * 2),
        wy = v * cells + 0.16 * Math.sin(tau * u * 2);
      const cx = Math.floor(wx),
        cy = Math.floor(wy);
      let first = 10,
        second = 10;
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const px = cx + i,
            py = cy + j,
            c =
              centers[
                (((py % cells) + cells) % cells) * cells +
                  (((px % cells) + cells) % cells)
              ];
          const dx = px + c[0] - wx,
            dy = py + c[1] - wy,
            d = dx * dx + dy * dy;
          if (d < first) {
            second = first;
            first = d;
          } else second = Math.min(second, d);
        }
      const a = tau * (3 * u + 2 * v),
        b = tau * (7 * u - 3 * v),
        c = tau * (13 * u + 11 * v);
      const sx = 0.43 * Math.cos(a) + 0.27 * Math.cos(b) + 0.17 * Math.sin(c);
      const sy = 0.35 * Math.cos(a) - 0.28 * Math.cos(b) + 0.22 * Math.cos(c);
      const index = (y * size + x) * 4;
      data[index] = Math.round(127.5 + sx * 117);
      data[index + 1] = Math.round(127.5 + sy * 117);
      data[index + 2] = Math.round(255 * Math.exp(-(second - first) * 28));
      data[index + 3] = Math.round(
        127.5 +
          60 * Math.sin(tau * (5 * u + 3 * v)) +
          45 * Math.cos(tau * (9 * v - 2 * u)),
      );
    }
  field = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  field.name = "Shared lagoon wave and light field";
  field.wrapS = field.wrapT = THREE.RepeatWrapping;
  field.magFilter = THREE.LinearFilter;
  field.minFilter = THREE.LinearMipmapLinearFilter;
  field.generateMipmaps = true;
  field.colorSpace = THREE.NoColorSpace;
  field.userData.sharedScenery = true;
  field.needsUpdate = true;
  return field;
}

