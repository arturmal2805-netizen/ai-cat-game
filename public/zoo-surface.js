import {runSceneSteps} from './scene-tasks.js';
import * as T from 'three';
let texture;
export function* zooSurfaceTextureSteps(){
 if(texture)return texture;
 const width=1024,height=512,data=new Uint8Array(width*height*4);
 const random=(x,y)=>{let h=Math.imul((x+2048)%2048+17,374761393)^Math.imul((y+2048)%2048+31,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 const noise=(x,y,nx,ny)=>{const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);const a=random(ix%nx,iy%ny),b=random((ix+1)%nx,iy%ny),c=random(ix%nx,(iy+1)%ny),d=random((ix+1)%nx,(iy+1)%ny);return(a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;};
 // Two independently useful materials in one immutable mipmapped atlas:
 // R/A are clumped undercoat/tips, G carries curved guard hairs, B soft pores.
 for(let y=0;y<height;y++){for(let x=0;x<width;x++){
  const k=(y*width+x)*4,grain=random(x,y),clump=noise(x/32,y/128,32,4)*.65+noise(x/8,y/64,128,8)*.35,
   pores=noise(x/8,y/8,128,64)*.65+noise(x/4,y/4,256,128)*.35;
  data[k]=40+clump*165;data[k+1]=40+clump*75+grain*14;data[k+2]=40+pores*170+grain*12;data[k+3]=35+noise(x/64,y/64,16,8)*180;
 }if(y%4===0)yield;}
 for(let strand=0;strand<5000;strand++){
  const x0=random(strand,103)*width,y0=random(strand,197)*height,length=14+random(strand,251)*78,bend=(random(strand,307)-.5)*16,w=.65+random(strand,401)*.9;
  for(let y=0;y<length;y++){const t=y/length,x=x0+bend*t*t+Math.sin(t*3.1+strand)*1.2,fade=Math.sin(Math.PI*t)**.45;
   for(let px=Math.floor(x-w-1);px<=Math.ceil(x+w+1);px++){const alpha=Math.max(0,1-Math.abs(px-x)/(w+.6))*fade,k=((Math.floor(y0+y)%height)*width+(px+width)%width)*4;data[k+1]=Math.max(data[k+1],65+alpha*(140+random(strand,511)*50));}
  }if(strand%32===0)yield;
 }
 texture=new T.DataTexture(data,width,height,T.RGBAFormat,T.UnsignedByteType);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;texture.userData.sharedScenery=true;return texture;
}
// Rest-space triplanar coat coordinates stay attached to the sculpted skin.
// One shared immutable texture, no fur shells, scene copies or frame uploads.
export const zooSurfaceDeclarations=`uniform sampler2D uZooSurface;uniform sampler2D uZooCoatAtlas;uniform float uZooCoatReady;float zooAtlasTone=1.;float zooAtlasActive=0.;uniform float uZooSkin;uniform float uZooWrinkles;uniform float uZooSpecies;varying vec3 vZooRestNormal;
float zooGorillaSkin(vec3 p){float face=smoothstep(.45,.6,p.z)*(1.-smoothstep(.90,1.15,length(vec2(p.x/.35,(p.y-2.045)/.30))))*(1.-smoothstep(2.255,2.33,p.y));float hand=smoothstep(.85,1.,abs(p.x))*(1.-smoothstep(.42,.62,p.y));return max(face,hand);}
vec2 zooAtlasUV(vec2 uv,vec2 tile){uv+=vec2(.371,.217);uv=abs(fract(uv*.5)*2.-1.);return tile*.5+mix(vec2(.006),vec2(.494),uv);}
vec4 zooCoatTex(vec3 p){vec3 w=pow(abs(vZooRestNormal),vec3(4.));w/=max(dot(w,vec3(1.)),.0001);
 if(uZooCoatReady>.5&&uZooSpecies<5.5){
  vec2 tile=uZooSpecies<1.5?vec2(1.,1.):uZooSpecies<2.5?vec2(1.,0.):uZooSpecies<4.5?vec2(0.,0.):vec2(0.,1.);
  float mean=uZooSpecies<1.5?.12227:uZooSpecies<2.5?.02627:uZooSpecies<4.5?.05854:.03692;
  float bare=uZooSpecies>1.5&&uZooSpecies<2.5?zooGorillaSkin(p):0.;if(bare>.5){tile=vec2(1.,1.);mean=.12227;}
  float fine=uZooSpecies>3.5&&uZooSpecies<4.5?1.+smoothstep(1.4,1.9,p.z):1.+bare*2.;
  vec3 coat=texture2D(uZooCoatAtlas,zooAtlasUV(vec2(p.z*1.25,-p.y*1.3+p.z*.16)*fine,tile)).rgb*w.x+texture2D(uZooCoatAtlas,zooAtlasUV(vec2(p.x*1.6,-p.z*1.25)*fine,tile)).rgb*w.y+texture2D(uZooCoatAtlas,zooAtlasUV(vec2(p.x*1.6,-p.y*1.3)*fine,tile)).rgb*w.z;
  float light=dot(coat,vec3(.2126,.7152,.0722));zooAtlasTone=clamp(light/mean,.24,2.2);zooAtlasActive=1.;float height=clamp(.5+(sqrt(max(.01,light/mean))-1.)*.4,.08,.92);return vec4(height);
 }
 return texture2D(uZooSurface,vec2(p.z*2.1,-p.y*1.8+p.z*.25))*w.x+texture2D(uZooSurface,vec2(p.x*2.8,-p.z*1.8))*w.y+texture2D(uZooSurface,vec2(p.x*2.8,-p.y*2.))*w.z;}

`;
export const zooSurfaceColor=`
vec4 zooGrain=zooCoatTex(vZooRest);float zooFur=1.-uZooSkin;
float zooHeight=mix(zooGrain.b,zooGrain.g*.75+zooGrain.r*.25,zooFur);
float zooTrunk=smoothstep(1.5,1.8,vZooRest.z)*(1.-smoothstep(.22,.45,abs(vZooRest.x)))*(1.-smoothstep(2.7,3.05,vZooRest.y));
float zooDetail=1.-vZooGloss;
float zooMicroRoughness=(zooGrain.r-.5)*mix(.1,.24,zooFur)*zooDetail;
if(uZooSpecies<1.5){
 // Wrinkle fields follow trunk folds, knee creases and thin ear membranes.
 // Unlike a global bump overlay they do not engrave the entire torso.
 float knee=(1.-smoothstep(.24,.43,abs(abs(vZooRest.x)-.62)))*(1.-smoothstep(.28,.48,min(abs(vZooRest.z-.9),abs(vZooRest.z+.96))))*exp(-pow((vZooRest.y-1.02)/.28,2.));
 float ear=smoothstep(.7,.95,abs(vZooRest.x))*(1.-smoothstep(.1,.28,abs(vZooRest.z-.91)))*smoothstep(1.9,2.2,vZooRest.y);
 float earR=length(vec2((abs(vZooRest.x)-.52)*.8,vZooRest.y-2.85));
 float folds=pow(abs(sin(vZooRest.y*27.+vZooRest.z*8.+sin(vZooRest.z*12.)*.7+(zooGrain.r-.5)*1.2)),18.)*zooTrunk*.16;
 folds+=knee*pow(abs(sin(vZooRest.y*45.+sin(vZooRest.x*11.)*.4)),14.)*.1;
 folds+=ear*pow(abs(sin(earR*24.+sin(vZooRest.y*3.)*1.1+(zooGrain.a-.5)*2.)),12.)*.012;
 zooHeight-=folds;
 diffuseColor.rgb*=1.-folds*.28;
}else if(uZooSpecies<2.5){
 // Exposed gorilla face/knuckles have fine skin instead of coat fibres.
 float skin=zooGorillaSkin(vZooRest);zooHeight=mix(zooHeight,zooGrain.b,skin);zooMicroRoughness=mix(zooMicroRoughness,(zooGrain.b-.5)*.1,skin);
}else if(uZooSpecies>5.5){
 // Soft translucent-looking axolotl skin retains its authored pink palette.
 diffuseColor.rgb*=1.+(zooGrain.b-.5)*.025;
}
// Broad clumps and visible guard-hair tips replace uniform dotted plastic.
float zooCoatTone=(zooGrain.a-.5)*.16+(zooGrain.r-.5)*.12;
float zooBareFace=uZooSpecies>1.5&&uZooSpecies<2.5?zooGorillaSkin(vZooRest):0.;
diffuseColor.rgb*=mix(1.,zooAtlasTone,zooAtlasActive*zooDetail*(1.-zooBareFace)*(uZooSpecies<1.5?.34:uZooSpecies<2.5?.48:.68));
diffuseColor.rgb*=1.+zooDetail*((zooHeight-.5)*mix(.07,.24,zooFur)+zooCoatTone*zooFur);
if(uZooSpecies>3.5&&uZooSpecies<4.5){float mane=smoothstep(.6,1.6,vZooRest.y)*(1.-smoothstep(.6,1.1,abs(vZooRest.x)));diffuseColor.rgb*=1.+mane*(zooGrain.g-.4)*.13;}

`;
// Filtered derivative relief retains the actual animated skin normal. A single
// immutable texture serves close views and mipmaps, in colour and shadow draws.
export const zooSurfaceNormal=`
vec3 zooDx=dFdx(-vViewPosition),zooDy=dFdy(-vViewPosition);
vec3 zooR1=cross(zooDy,normal),zooR2=cross(normal,zooDx);
float zooDet=dot(zooDx,zooR1),zooBump=(uZooSpecies>5.5?.00065:mix(.0028,.0032,1.-uZooSkin))*(1.-vZooGloss);
if(abs(zooDet)>.0000000001)normal=normalize(abs(zooDet)*normal-sign(zooDet)*zooBump*(dFdx(zooHeight)*zooR1+dFdy(zooHeight)*zooR2));
`;

export function zooSurfaceTexture(){return runSceneSteps(zooSurfaceTextureSteps());}
