import * as T from 'three';
export const ZOO_COAT_ASSET='./art/zoo-coat-ce439863dc570346.webp';
const fallback=new T.DataTexture(new Uint8Array([128,128,128,255]),1,1);fallback.needsUpdate=true;fallback.userData.sharedScenery=true;
export const zooCoatUniforms={uZooCoatAtlas:{value:fallback},uZooCoatReady:{value:0}};
let pending;
// One immutable photographic material sheet, shared by every zoo animal. Only
// selected zoo preparation loads/decodes it; ordinary world/shop use does not.
export function prepareZooCoat(){
 if(typeof window==='undefined'||typeof createImageBitmap!=='function')return Promise.resolve(false);
 return pending||=(async()=>{try{
  const response=await fetch(ZOO_COAT_ASSET);if(!response.ok)throw Error('Zoo coat unavailable');
  const bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'}),texture=new T.Texture(bitmap);
  texture.flipY=false;texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;texture.userData.sharedScenery=true;texture.needsUpdate=true;
  zooCoatUniforms.uZooCoatAtlas.value=texture;zooCoatUniforms.uZooCoatReady.value=1;fallback.dispose();return true;
 }catch{return false;}})();
}
