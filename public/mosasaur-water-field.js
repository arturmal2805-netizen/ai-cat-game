import * as T from 'three';
import {waterFieldTexture} from './water-shading.js';
import {MOSA_WATER_FIELD} from './mosasaur-water-field-assets.js';
let field=null,request;
export const mosaWaterField=()=>field||waterFieldTexture();
export function prepareMosaWaterField(){
 if(typeof window==='undefined'||typeof createImageBitmap!=='function')return Promise.resolve(false);
 return request??=(async()=>{let bitmap;try{
  const response=await fetch(MOSA_WATER_FIELD);if(!response.ok)throw Error('Ocean field unavailable');bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'});
  field=new T.Texture(bitmap);field.name='Shared ocean wind slopes and focused light';field.flipY=false;field.wrapS=field.wrapT=T.RepeatWrapping;field.colorSpace=T.NoColorSpace;field.magFilter=T.LinearFilter;field.minFilter=T.LinearMipmapLinearFilter;field.generateMipmaps=true;field.userData.sharedScenery=true;field.needsUpdate=true;return true;
 }catch{bitmap?.close?.();return false;}})();
}
export function useMosasaurWaterField(material){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 // Expose custom sampler textures to the existing cooperative shader warmup.
 // Hiding them only in onBeforeCompile would upload them on the first live draw.
 material.mosaWaterField=mosaWaterField();
 if(material.userData.waterLight)material.userData.waterLight.texture=material.mosaWaterField;
 material.onBeforeCompile=function(shader,...args){previous.call(this,shader,...args);if(shader.uniforms.uWaterField)shader.uniforms.uWaterField.value=material.mosaWaterField;if(shader.uniforms.uWaterScatterTint)shader.uniforms.uWaterScatterTint.value.set(0x126ad2).multiplyScalar(.44);};
 material.customProgramCacheKey=()=>key+'-ocean-wind-field-v2-blue-depth';return material;
}
