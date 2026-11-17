import * as T from 'three';
let texture;
// Authored centimetre relief, NOT a downloaded scan or a reconstruction of d6.
// RGB = OpenGL tangent normal, A = linear roughness. One immutable 2m tile.
export function sandDetailTexture(){
 if(texture)return texture;const size=256,data=new Uint8Array(size*size*4),tau=Math.PI*2;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,warpA=tau*(u-v),warpB=tau*(u+v),phaseA=tau*(4*u+3*v+.30*Math.sin(warpA)),phaseB=tau*(-2*u+5*v+.22*Math.cos(warpB)),grain=tau*(29*u+17*v);
  // Two curved, crossing ripple families; periodic at the 2m tile edges.
  // Analytic derivatives preserve the GL normal direction and linear channels.
  const dx=-.0045*Math.sin(phaseA)*tau*(4+.30*tau*Math.cos(warpA))-.0025*Math.sin(phaseB)*tau*(-2-.22*tau*Math.sin(warpB))+.0007*tau*29*Math.cos(grain);
  const dz=-.0045*Math.sin(phaseA)*tau*(3-.30*tau*Math.cos(warpA))-.0025*Math.sin(phaseB)*tau*(5-.22*tau*Math.sin(warpB))+.0007*tau*17*Math.cos(grain);
  const nx=-dx*.5,ny=-dz*.5,length=Math.hypot(nx,ny,1),k=(y*size+x)*4;
  data[k]=Math.round(127.5+127.5*nx/length);data[k+1]=Math.round(127.5+127.5*ny/length);data[k+2]=Math.round(127.5+127.5/length);
  data[k+3]=Math.round(228+11*Math.sin(tau*(13*u-9*v))*Math.cos(tau*(7*v+3*u)));
 }
 texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.name='Authored marine sand normal and roughness · 2m';texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.NoColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.userData.sharedScenery=true;texture.needsUpdate=true;return texture;
}
