import {runSceneSteps} from './scene-tasks.js';
import * as T from 'three';
let texture;
const rand=n=>{let h=Math.imul(n+17,374761393);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
// Four filtered fields: branching flank stripes, legs, facial marks and tail.
// Drawn once as pigment, not raised black geometry or full-width sine bands.
export function* zooTigerCoatSteps(){
 if(texture)return texture;const n=512,data=new Uint8Array(n*n*4);
 const stroke=(channel,points,width)=>{
  for(let k=1;k<points.length;k++){const a=points[k-1],b=points[k],dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy,w=Math.max(a[2]||width,b[2]||width),
   x0=Math.max(0,Math.floor((Math.min(a[0],b[0])-w)*n)),x1=Math.min(n-1,Math.ceil((Math.max(a[0],b[0])+w)*n)),y0=Math.max(0,Math.floor((Math.min(a[1],b[1])-w)*n)),y1=Math.min(n-1,Math.ceil((Math.max(a[1],b[1])+w)*n));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const q=d?Math.max(0,Math.min(1,((x/n-a[0])*dx+(y/n-a[1])*dy)/d)):0,r=Math.hypot(x/n-a[0]-dx*q,y/n-a[1]-dy*q),radius=(a[2]||width)*(1-q)+(b[2]||width)*q,
    alpha=Math.max(0,Math.min(1,(radius-r)*n+.5)),i=(y*n+x)*4+channel;data[i]=Math.max(data[i],alpha*255);}
  }
 };
 for(const side of [0,1])for(let band=0;band<15;band++){
  const start=(band+.3+rand(band+side*99)*.3)/15,reach=.31+rand(band+77)*.14,points=[];
  // Keep the opposite dorsal seam at 1, not modulo 0: connecting 0 to .99
  // painted a full-height band on the first segment of every flank stripe.
  for(let k=0;k<=24;k++){const t=k/24,v=reach*t,u=start+Math.sin(t*4.4+band*1.7)*.013+t*t*(rand(band+111)-.5)*.06;points.push([u,side?1-v:v,.015*(1-t*.87)]);}
  stroke(0,points,.014);
  if(band%3!==1){const at=points[11],end=points[20];stroke(0,[at,[at[0]+.035,side?at[1]-.045:at[1]+.045,.008],[end[0]+.05,side?end[1]+.025:end[1]-.025,.001]],.009);}
  yield;
 }
 // The curve centres depend on only one coordinate. Keep their exact Float64
 // values instead of recomputing millions of identical sines on island entry.
 const legLines=new Float64Array(n*7),tailLines=new Float64Array(n*10);
 for(let x=0;x<n;x++)for(let k=0;k<7;k++)legLines[x*7+k]=(k+.5)/7+.014*Math.sin(x/n*Math.PI*4+k*2.3);
 for(let y=0;y<n;y++)for(let k=0;k<10;k++)tailLines[y*10+k]=(k+.35)/10+.011*Math.sin(y/n*Math.PI*2+k);
 for(let y=0;y<n;y++){for(let x=0;x<n;x++){
  const u=x/n,v=y/n;let leg=0,tail=0;
  for(let k=0;k<7;k++){const line=legLines[x*7+k],w=.014+(k%3)*.003;leg=Math.max(leg,Math.max(0,Math.min(1,(w-Math.abs(v-line))*n+.5)));}
  for(let k=0;k<10;k++){const line=tailLines[y*10+k],w=.019;tail=Math.max(tail,Math.max(0,Math.min(1,(w-Math.abs(u-line))*n+.5)));}
  data[(y*n+x)*4+1]=leg*255;data[(y*n+x)*4+3]=tail*255;
 }if(y%8===0)yield;}
 // Forehead chevrons and broken cheek stripes leave the muzzle and eyes clear.
 for(const side of [-1,1]){
  for(let row=0;row<3;row++){const y=.69+row*.105;stroke(2,[[.5,y,.014],[.5+side*.13,y+.022,.012],[.5+side*.28,y-.023,.003]],.013);}
  for(let row=0;row<3;row++){const y=.12+row*.13;stroke(2,[[.5+side*.28,y,.005],[.5+side*.4,y+.025,.012],[.5+side*.48,y+.1,.004]],.012);}
 }
 texture=new T.DataTexture(data,n,n,T.RGBAFormat,T.UnsignedByteType);texture.wrapS=T.RepeatWrapping;texture.wrapT=T.ClampToEdgeWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;texture.userData.sharedScenery=true;return texture;
}

export function zooTigerCoat(){return runSceneSteps(zooTigerCoatSteps());}
