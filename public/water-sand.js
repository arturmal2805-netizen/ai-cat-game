import * as T from 'three';
let texture;
// One immutable 128² grayscale sand field, shared by every real seabed.
// No downloads, geometry rebuilding or texture work occurs in an update loop.
export function waterSandTexture(){
 if(texture)return texture;const size=128,bytes=new Uint8Array(size*size*4);
 const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
 const noise=(x,y,cells)=>{const u=x/size*cells,v=y/size*cells,ix=Math.floor(u),iy=Math.floor(v),a=u-ix,b=v-iy,s=a*a*(3-2*a),t=b*b*(3-2*b),n=(dx,dy)=>hash((ix+dx)%cells,(iy+dy)%cells);return T.MathUtils.lerp(T.MathUtils.lerp(n(0,0),n(1,0),s),T.MathUtils.lerp(n(0,1),n(1,1),s),t);};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const a=x/size*Math.PI*2,b=y/size*Math.PI*2,
   ripple=Math.sin(a*7+Math.sin(b*3)*.65+Math.sin(a*2-b*2)*.45),
   grain=hash(x,y),tone=Math.round((.88+ripple*.012+(grain-.5)*.06+(noise(x,y,8)-.5)*.07+(noise(x,y,32)-.5)*.025)*255),i=(y*size+x)*4;
  bytes.set([tone,tone,tone,255],i);
 }
 texture=new T.DataTexture(bytes,size,size,T.RGBAFormat);texture.name='Shared fine seabed sand';texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(4,4);texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.colorSpace=T.SRGBColorSpace;texture.userData.sharedScenery=true;texture.needsUpdate=true;return texture;
}
