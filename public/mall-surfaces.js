import {mallArt} from './mall-art.js';
import * as T from 'three';
import {mosaWaterReflection} from './mosasaur-water-probe.js';

// Small immutable, seamless surface charts. They add material detail rather
// than pretending a flat image is a shop or rebuilding textures during play.
export function mallSurface(kind){
  const maps=mallArt()?.surfaces[kind];if(maps)return maps.color;
  const n=256,data=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=x/n,v=y/n,a=u*Math.PI*2,b=v*Math.PI*2;
    const noise=(Math.sin(a*43+b*17)*Math.cos(b*57-a*11)+Math.sin(a*91+b*29)*.4)*.5;
    let color;
    if(kind==='marble'){
      const vein=Math.pow(Math.max(0,Math.sin(a*3+Math.sin(b*2)*1.8+Math.sin(a*7+b*4)*.22)),20);
      const seam=(x%64===0||y%64===0)?1:0;
      color=[.80-.18*vein-.12*seam,.87-.10*vein-.10*seam,.86-.04*vein-.08*seam];
    }else if(kind==='metal'){
      const seam=(x%64<2||y%128<2)?1:0,circuit=(x%64>48&&y%32<2)?1:0;
      color=[.36-.1*seam+.32*circuit,.48-.13*seam+.24*circuit,.57-.12*seam+.1*circuit];
    }else{
      const grain=Math.sin(a*19+Math.sin(b*3)*.8)*.02; color=[.96+grain,.76+grain,.48+grain];
    }
    const k=(y*n+x)*4;for(let j=0;j<3;j++)data[k+j]=Math.min(255,Math.max(0,Math.round((color[j]+noise*.025)*255)));data[k+3]=255;
  }
  const t=new T.DataTexture(data,n,n,T.RGBAFormat);t.name='Original Cat Mall '+kind;t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
export function mallReflectionMaterial(material,gain=.18){
  const probe=mosaWaterReflection();material.onBeforeCompile=s=>{
    s.uniforms.uMallProbe={value:probe.texture};s.uniforms.uMallProbeGain={value:probe.gain*gain};
    s.vertexShader='varying vec3 vMallDetailPosition;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMallDetailPosition=transformed;');
    s.fragmentShader='varying vec3 vMallDetailPosition;uniform sampler2D uMallProbe;uniform float uMallProbeGain;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 mallR=inverseTransformDirection(reflect(-normalize(vViewPosition),normal),viewMatrix);
      vec2 mallOct=mallR.xz/(abs(mallR.x)+abs(mallR.y)+abs(mallR.z));
      if(mallR.y<0.)mallOct=(1.-abs(mallOct.yx))*sign(mallOct);
      float mallRoom=smoothstep(15.,25.,length(vMallDetailPosition.xz-vec2(0.,55.)));
      outgoingLight+=diffuseColor.rgb*vec3(.70,.31,.12)*(.10+mallRoom*.32);
      outgoingLight+=texture2D(uMallProbe,mallOct*.5+.5).rgb*uMallProbeGain*(.2+.8*pow(1.-abs(dot(normalize(vViewPosition),normal)),3.));
      #include <opaque_fragment>`);
  };material.customProgramCacheKey=()=>`mall-reflection-v2-${gain}`;return material;
}
export function mallHalo(color){return new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  uniforms:{color:{value:new T.Color(color)}},
  vertexShader:'varying vec3 n;varying vec3 e;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);e=-p.xyz;gl_Position=projectionMatrix*p;}',
  fragmentShader:'uniform vec3 color;varying vec3 n;varying vec3 e;void main(){float a=pow(abs(dot(normalize(n),normalize(e))),1.8)*.16;gl_FragColor=vec4(color,a);}',
});}

export function mallSurfaceMaps(kind,repeat=1){const maps=mallArt()?.surfaces[kind];if(!maps)return{map:mallSurface(kind)};const own={};for(const [role,t]of Object.entries(maps)){const copy=t.clone();copy.userData.sharedScenery=false;copy.repeat.set(repeat,repeat);own[role==='color'?'map':role==='normal'?'normalMap':'roughnessMap']=copy;}return own;}
