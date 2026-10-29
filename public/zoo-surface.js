import {runSceneSteps} from './scene-tasks.js';
import * as T from 'three';
let texture;
export function* zooSurfaceTextureSteps(){
 if(texture)return texture;
 const size=512,data=new Uint8Array(size*size*4),tau=2*Math.PI;
 const random=(x,y)=>{let h=Math.imul((x+256)%256+17,374761393)^Math.imul((y+256)%256+31,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 const noise=(x,y,nx,ny)=>{const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy,a=random(ix%nx,iy%ny),b=random((ix+1)%nx,iy%ny),c=random(ix%nx,(iy+1)%ny),d=random((ix+1)%nx,(iy+1)%ny);return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;};
 for(let y=0;y<size;y++){for(let x=0;x<size;x++){
  const k=(y*size+x)*4,grain=random(x,y),strand=noise(x/2,y/32,128,8),
    pores=noise(x/4,y/4,64,64),fine=noise(x/2,y/2,128,128);
  data[k]=64+grain*128;data[k+1]=35+strand*150+grain*35;data[k+2]=35+pores*150+fine*35;data[k+3]=35+noise(x/18,y/18,29,29)*145+grain*24;
 }if(y%4===0)yield;}
 texture=new T.DataTexture(data,size,size,T.RGBAFormat,T.UnsignedByteType);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;texture.userData.sharedScenery=true;return texture;
}
// Rest-space triplanar coat coordinates stay attached to the sculpted skin.
// One shared immutable texture, no fur shells, scene copies or frame uploads.
export const zooSurfaceDeclarations=`uniform sampler2D uZooSurface;uniform float uZooSkin;uniform float uZooWrinkles;uniform float uZooSpecies;varying vec3 vZooRestNormal;
vec3 zooCoatTex(vec3 p){vec3 w=pow(abs(vZooRestNormal),vec3(4.));w/=max(dot(w,vec3(1.)),.0001);return texture2D(uZooSurface,p.yz*3.).rgb*w.x+texture2D(uZooSurface,p.xz*3.).rgb*w.y+texture2D(uZooSurface,p.xy*3.).rgb*w.z;}
`;
export const zooSurfaceColor=`
vec3 zooGrain=zooCoatTex(vZooRest);float zooFur=1.-uZooSkin;
float zooHeight=mix(zooGrain.b,zooGrain.g*.7+zooGrain.r*.3,zooFur);
float zooTrunk=smoothstep(1.5,1.8,vZooRest.z)*(1.-smoothstep(.22,.45,abs(vZooRest.x)))*(1.-smoothstep(2.7,3.05,vZooRest.y));
float zooDetail=1.-vZooGloss;
float zooMicroRoughness=(zooGrain.r-.5)*mix(.1,.24,zooFur)*zooDetail;
if(uZooSpecies<1.5){
 // Wrinkle fields follow trunk folds, knee creases and thin ear membranes.
 // Unlike a global bump overlay they do not engrave the entire torso.
 float knee=(1.-smoothstep(.24,.43,abs(abs(vZooRest.x)-.62)))*(1.-smoothstep(.28,.48,min(abs(vZooRest.z-.9),abs(vZooRest.z+.96))))*exp(-pow((vZooRest.y-1.02)/.28,2.));
 float ear=smoothstep(.7,.95,abs(vZooRest.x))*(1.-smoothstep(.1,.28,abs(vZooRest.z-.91)))*smoothstep(1.9,2.2,vZooRest.y);
 float earR=length(vec2((abs(vZooRest.x)-.52)*.8,vZooRest.y-2.85));
 float folds=pow(abs(sin(vZooRest.y*32.+sin(vZooRest.z*7.)*.5)),18.)*zooTrunk*.16;
 folds+=knee*pow(abs(sin(vZooRest.y*45.+sin(vZooRest.x*11.)*.4)),14.)*.1;
 folds+=ear*pow(abs(sin(earR*41.+sin(vZooRest.y*7.)*.35)),14.)*.055;
 zooHeight-=folds;
 diffuseColor.rgb*=1.-folds*.28;
}else if(uZooSpecies<2.5){
 // Exposed gorilla face/knuckles have fine skin instead of coat fibres.
 float face=smoothstep(.52,.66,vZooRest.z)*smoothstep(1.68,1.83,vZooRest.y),hand=smoothstep(.85,1.,abs(vZooRest.x))*(1.-smoothstep(.42,.62,vZooRest.y));
 float skin=max(face,hand);zooHeight=mix(zooHeight,zooGrain.b,skin);zooMicroRoughness=mix(zooMicroRoughness,(zooGrain.b-.5)*.1,skin);
}else if(uZooSpecies>5.5){
 // Soft translucent-looking axolotl skin retains its authored pink palette.
 diffuseColor.rgb*=1.+(zooGrain.b-.5)*.025;
}
diffuseColor.rgb*=1.+zooDetail*((zooHeight-.5)*mix(.10,.21,zooFur));
`;
// Filtered derivative relief retains the actual animated skin normal. A single
// immutable texture serves close views and mipmaps, in colour and shadow draws.
export const zooSurfaceNormal=`
vec3 zooDx=dFdx(-vViewPosition),zooDy=dFdy(-vViewPosition);
vec3 zooR1=cross(zooDy,normal),zooR2=cross(normal,zooDx);
float zooDet=dot(zooDx,zooR1),zooBump=mix(.004,.006,1.-uZooSkin)*(1.-vZooGloss);
if(abs(zooDet)>.0000000001)normal=normalize(abs(zooDet)*normal-sign(zooDet)*zooBump*(dFdx(zooHeight)*zooR1+dFdy(zooHeight)*zooR2));
`;

export function zooSurfaceTexture(){return runSceneSteps(zooSurfaceTextureSteps());}
