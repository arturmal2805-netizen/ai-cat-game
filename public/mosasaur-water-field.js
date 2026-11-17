import {waterFieldTexture,prepareWaterField} from './water-field.js';
// Legacy ocean entry points share the exact provider used by the WHOLE map.
export const mosaWaterField=waterFieldTexture;
export const prepareMosaWaterField=prepareWaterField;
export function useMosasaurWaterField(material){
 material.mosaWaterField=waterFieldTexture();
 if(material.userData.waterLight)material.userData.waterLight.texture=material.mosaWaterField;
 return material;
}
