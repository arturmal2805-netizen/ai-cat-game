import * as T from 'three';
// Original deterministic SPA material, not a downloaded photographic asset.
// Seamless 3.5m chart; colour is sRGB, GL tangent normals/roughness are linear.
// Created once during SPA construction, never in the animation loop.
export function spaMarbleV8(){
 const n=256,N=n*n,height=new Float32Array(N),color=new Uint8Array(N*4),normal=new Uint8Array(N*4),rough=new Uint8Array(N*4);
 const ease=t=>t*t*(3-2*t),hash=(x,y,p)=>{x=(x%p+p)%p;y=(y%p+p)%p;let k=Math.imul(x+29,374761393)^Math.imul(y+43,668265263);k=Math.imul(k^(k>>>13),1274126177);return(k>>>0)/4294967295;};
 function noise(u,v,p){const x=u*p,y=v*p,a=Math.floor(x),b=Math.floor(y),s=ease(x-a),t=ease(y-b);return(hash(a,b,p)*(1-s)+hash(a+1,b,p)*s)*(1-t)+(hash(a,b+1,p)*(1-s)+hash(a+1,b+1,p)*s)*t;}
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=x/n,v=y/n,j=y*n+x,k=j*4,cloud=noise(u,v,4),warp=(cloud-.5)*.48+(noise(u,v,8)-.5)*.26+(noise(u,v,16)-.5)*.12+(noise(u,v,32)-.5)*.055+(noise(u,v,64)-.5)*.018,vein=Math.exp(-Math.abs(Math.sin(Math.PI*2*(u+v+warp)))*44),thread=Math.exp(-Math.abs(Math.sin(Math.PI*2*(2*u-v+warp*.7)))*95)*.24,fine=noise(u,v,64),shade=vein*.095+thread*.055;
  for(let c=0;c<3;c++){color[k+c]=Math.round(248-c*2-shade*255+(cloud-.5)*7+(fine-.5)*2);rough[k+c]=Math.round(128+vein*29+thread*17+fine*7);}
  height[j]=vein*.0004+(fine-.5)*.00025;color[k+3]=rough[k+3]=normal[k+3]=255;
 }
 const pixelMetres=3.5/n;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const k=(y*n+x)*4,dx=(height[y*n+(x+1)%n]-height[y*n+(x+n-1)%n])/(2*pixelMetres),dy=(height[((y+1)%n)*n+x]-height[((y+n-1)%n)*n+x])/(2*pixelMetres),len=Math.hypot(dx,dy,1);normal[k]=Math.round(127.5-dx/len*127.5);normal[k+1]=Math.round(127.5-dy/len*127.5);normal[k+2]=Math.round(127.5+127.5/len);}
 function chart(data,srgb,label){const t=new T.DataTexture(data,n,n);t.name='SPA V8 original Calacatta-like '+label;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(1/3.5,1/3.5);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.userData={origin:'original deterministic seamless chart',metresPerTile:3.5,normalConvention:srgb?undefined:'GL'};t.needsUpdate=true;return t;}
 return{map:chart(color,true,'colour'),roughnessMap:chart(rough,false,'roughness'),normalMap:chart(normal,false,'normal GL')};
}
