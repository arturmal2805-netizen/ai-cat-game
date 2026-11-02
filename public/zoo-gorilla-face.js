import * as T from 'three';

// Original diffuse skin chart. Geometry still supplies the eyes, brow, nose,
// nostril cavities and lips; this shared material supplies their fine creases.
export const GORILLA_FACE_ASSET='./art/gorilla-face-fbe5e60c2d080eee.webp';
const fallback=new T.DataTexture(new Uint8Array([128,128,128,255]),1,1);
fallback.needsUpdate=true;fallback.userData.sharedScenery=true;
export const gorillaFaceUniforms={uZooFace:{value:fallback},uZooFaceReady:{value:0}};
let pending;
export function prepareGorillaFace(){
 if(typeof window==='undefined'||typeof createImageBitmap!=='function')return Promise.resolve(false);
 return pending||=(async()=>{try{
  const response=await fetch(GORILLA_FACE_ASSET);if(!response.ok)throw Error('Gorilla face unavailable');
  const bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'}),texture=new T.Texture(bitmap);
  texture.flipY=false;texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;texture.userData.sharedScenery=true;texture.needsUpdate=true;
  gorillaFaceUniforms.uZooFace.value=texture;gorillaFaceUniforms.uZooFaceReady.value=1;fallback.dispose();return true;
 }catch{return false;}})();
}
