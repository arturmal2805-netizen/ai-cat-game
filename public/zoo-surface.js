import * as T from 'three';
let texture;
export function zooSurfaceTexture(){
 if(texture)return texture;
 const size=256,data=new Uint8Array(size*size*4),tau=2*Math.PI;
 const random=(x,y)=>{let h=Math.imul((x+256)%256+17,374761393)^Math.imul((y+256)%256+31,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 const noise=(x,y,nx,ny)=>{const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy,a=random(ix%nx,iy%ny),b=random((ix+1)%nx,iy%ny),c=random(ix%nx,(iy+1)%ny),d=random((ix+1)%nx,(iy+1)%ny);return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const k=(y*size+x)*4,grain=random(x,y),strand=noise(x/2,y/32,128,8),
    pores=noise(x/4,y/4,64,64),fine=noise(x/2,y/2,128,128);
  data[k]=64+grain*128;data[k+1]=35+strand*150+grain*35;data[k+2]=35+pores*150+fine*35;data[k+3]=255;
 }
 texture=new T.DataTexture(data,size,size,T.RGBAFormat,T.UnsignedByteType);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;texture.userData.sharedScenery=true;return texture;
}
// Rest-space triplanar coat coordinates stay attached to the sculpted skin.
// One shared immutable texture, no fur shells, scene copies or frame uploads.
export const zooSurfaceDeclarations=`uniform sampler2D uZooSurface;uniform float uZooSkin;uniform float uZooWrinkles;varying vec3 vZooRestNormal;
vec3 zooCoatTex(vec3 p){vec3 w=pow(abs(vZooRestNormal),vec3(4.));w/=max(dot(w,vec3(1.)),.0001);return texture2D(uZooSurface,p.yz*3.).rgb*w.x+texture2D(uZooSurface,p.xz*3.).rgb*w.y+texture2D(uZooSurface,p.xy*3.).rgb*w.z;}
`;
export const zooSurfaceColor=`
vec3 zooGrain=zooCoatTex(vZooRest);float zooFur=1.-uZooSkin;
float zooHeight=mix(zooGrain.b,zooGrain.g*.7+zooGrain.r*.3,zooFur);
zooHeight-=uZooWrinkles*pow(abs(sin(vZooRest.y*32.+sin(vZooRest.z*7.)*.5)),18.)*.13;
float zooDetail=(1.-vZooGloss);diffuseColor.rgb*=1.+zooDetail*((zooHeight-.5)*mix(.085,.14,zooFur));
`;
// Screen-space derivatives produce a genuine normal relief from the filtered
// coat height, retaining the animated base normal and native standard lighting.
export const zooSurfaceNormal=`
vec3 zooDx=dFdx(-vViewPosition),zooDy=dFdy(-vViewPosition);
vec3 zooR1=cross(zooDy,normal),zooR2=cross(normal,zooDx);
float zooDet=dot(zooDx,zooR1),zooBump=mix(.002,.0035,1.-uZooSkin)*(1.-vZooGloss);
if(abs(zooDet)>.0000000001)normal=normalize(abs(zooDet)*normal-sign(zooDet)*zooBump*(dFdx(zooHeight)*zooR1+dFdy(zooHeight)*zooR2));
`;
