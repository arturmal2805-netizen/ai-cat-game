import * as T from 'three';
// Small seamless SPA-only PBR charts. One preparation, metre UVs supplied by
// the existing immutable room batch. Never modifies the Mall's shared maps.
export function resortSurfaceMaps(kind='marble'){
 const size=128,color=new Uint8Array(size*size*4),rough=new Uint8Array(color.length),normal=new Uint8Array(color.length);
 const smooth=t=>t*t*(3-2*t),hash=(x,y,period)=>{x=(x%period+period)%period;y=(y%period+period)%period;let n=Math.imul(x+13,374761393)^Math.imul(y+71,668265263);n=Math.imul(n^(n>>>13),1274126177);return(n>>>0)/4294967295;};
 function noise(u,v,n){const x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y),a=smooth(x-ix),b=smooth(y-iy),low=hash(ix,iy,n)*(1-a)+hash(ix+1,iy,n)*a,high=hash(ix,iy+1,n)*(1-a)+hash(ix+1,iy+1,n)*a;return low*(1-b)+high*b;}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*Math.PI*2,v=y/size*Math.PI*2,k=(y*size+x)*4;
  const coarse=noise(x/size,y/size,4)*.58+noise(x/size,y/size,8)*.28+noise(x/size,y/size,16)*.14,vein=Math.exp(-Math.abs(coarse-.49)*105),fine=noise(x/size,y/size,32),grain=Math.sin(u*37)*Math.sin(v*43);
  const fabric=kind==='fabric',shade=fabric?(.96+grain*.025):(.97-vein*.16+(fine-.5)*.025);
  for(let c=0;c<3;c++){color[k+c]=Math.round(Math.max(0,Math.min(1,shade-(fabric?0:c*vein*.009)))*255);rough[k+c]=fabric?235:Math.round(110+vein*25+fine*15);}
  color[k+3]=rough[k+3]=normal[k+3]=255;normal[k]=Math.round(128+(fabric?Math.cos(u*37)*Math.sin(v*43)*7:Math.cos(u*4+Math.sin(v)*1.3)*vein*3));normal[k+1]=Math.round(128+(fabric?Math.sin(u*37)*Math.cos(v*43)*7:Math.sin(v)*vein*3));normal[k+2]=255;
 }
 const texture=(data,srgb=false)=>{const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.userData.mallSurfaceKind=kind;t.name='SPA V6 '+kind+(srgb?' color sRGB':' data');t.needsUpdate=true;return t;};
 return{map:texture(color,true),roughnessMap:texture(rough),normalMap:texture(normal)};
}
