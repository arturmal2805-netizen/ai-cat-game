import * as T from 'three';
let texture;
// Authored centimetre relief, NOT a downloaded scan or a reconstruction of d6.
// RGB = OpenGL tangent normal, A = linear roughness. One immutable 2m tile.
export function sandDetailTexture(){
 if(texture)return texture;const size=256,data=new Uint8Array(size*size*4),tau=Math.PI*2;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,phase=tau*(6*v+.08*Math.sin(tau*u));
  const dx=-.011*Math.sin(phase)*tau*.08*tau*Math.cos(tau*u)+.0007*tau*29*Math.cos(tau*(29*u+17*v));
  const dz=-.011*Math.sin(phase)*tau*6+.0007*tau*17*Math.cos(tau*(29*u+17*v));
  const nx=-dx*.5,ny=-dz*.5,length=Math.hypot(nx,ny,1),k=(y*size+x)*4;
  data[k]=Math.round(127.5+127.5*nx/length);data[k+1]=Math.round(127.5+127.5*ny/length);data[k+2]=Math.round(127.5+127.5/length);
  data[k+3]=Math.round(228+11*Math.sin(tau*(13*u-9*v))*Math.cos(tau*(7*v+3*u)));
 }
 texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.name='Authored marine sand normal and roughness · 2m';texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.NoColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.userData.sharedScenery=true;texture.needsUpdate=true;return texture;
}
