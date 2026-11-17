// Compatibility authoring hook. All bottom lighting now uses the same field,
// extinction and caustic code as every other island. Raised troughs carry their
// real .23m optical layer rather than pretending the ocean surface is above them.
export function polishShowcaseBottom(material){
 if(material.userData.showcaseBottomLight)return material;
 material.userData.waterLayerDepth=material.userData.showcaseRiverBed ? .23 : -1;
 material.userData.showcaseBottomLight=true;material.needsUpdate=true;return material;
}
