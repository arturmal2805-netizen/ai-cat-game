import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mallArt,mallSignMaterial} from './mall-art.js';
import {mallSurfaceMaps,mallReflectionMaterial,mallHalo} from './mall-surfaces.js';
import {mosaWaterReflection} from './mosasaur-water-probe.js';
import {MALL_STORES,MALL_PRODUCTS,mallSignTexts} from './mall-data.js';

// Shared immutable fittings for the horizontal rebuild. All detailed authoring
// stays cooperative; neither inspection nor ordinary animation rebuilds it.
export function* mallKitSteps({parody=false}={}){
  const signs=[];
  const surfaceSets=new Map();const getSurface=(kind,repeat=1)=>{const key=kind+":"+repeat;if(!surfaceSets.has(key))surfaceSets.set(key,mallSurfaceMaps(kind,repeat));return surfaceSets.get(key);};
  const mats={
    navy:new THREE.MeshStandardMaterial({color:0x28516b,emissive:0x286781,emissiveIntensity:.08,roughness:.23,metalness:.65}),
    floor:new THREE.MeshStandardMaterial({color:0xd4edff,emissive:0x0c5980,emissiveIntensity:.13,roughness:.14,metalness:.18}),
    warm:new THREE.MeshStandardMaterial({color:0xfff0dc,emissive:0xff9e40,emissiveIntensity:.18,roughness:.38}),
    white:new THREE.MeshStandardMaterial({color:0xe7ecf4,emissive:0x2a5671,emissiveIntensity:.16,roughness:.3,metalness:.12}),
    pink:new THREE.MeshBasicMaterial({color:0xff73dd}),cyan:new THREE.MeshBasicMaterial({color:0x6cffff}),
    gold:new THREE.MeshBasicMaterial({color:0xffd98c}),purple:new THREE.MeshBasicMaterial({color:0xa87bff}),
    green:new THREE.MeshStandardMaterial({color:0x24826f,roughness:.75}),
    red:new THREE.MeshStandardMaterial({color:0x80355e,roughness:.55}),
  };
  Object.assign(mats.floor,getSurface('marble',.2));Object.assign(mats.navy,getSurface('metal'));Object.assign(mats.warm,getSurface('warm'));mats.floor.normalScale=new THREE.Vector2(.2,.2);mats.navy.normalScale=new THREE.Vector2(.055,.055);mats.warm.normalScale=new THREE.Vector2(.1,.1);
  for(const m of [mats.floor,mats.navy,mats.white])mallReflectionMaterial(m,.16);
  mats.haloPink=mallHalo(0xff52d9);mats.haloCyan=mallHalo(0x51e7ff);
  const box=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,16,10),cylinder=new THREE.CylinderGeometry(1,1,1,32);
  for(const g of [box,sphere,cylinder])g.userData.sharedScenery=true;
  function mesh(parent,geometry,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=!material.transparent&&!material.isMeshBasicMaterial;o.receiveShadow=o.castShadow;parent.add(o);return o;}
  const cube=(p,m,x,y,z,sx,sy,sz)=>mesh(p,box,m,x,y,z,sx,sy,sz);
  const orb=(p,m,x,y,z,sx,sy=sx,sz=sx)=>mesh(p,sphere,m,x,y,z,sx,sy,sz);
  const disk=(p,m,x,y,z,r,h=.2)=>mesh(p,cylinder,m,x,y,z,r,h,r);
  function tube(p,points,r,m,closed=false){const curve=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)),closed,'centripetal');return mesh(p,new THREE.TubeGeometry(curve,Math.max(8,Math.min(256,Math.ceil(curve.getLength()*5))),r,8,closed),m);}
  function ring(p,x,y,z,r,m,width=.075){const pts=Array.from({length:65},(_,i)=>[x+Math.cos(i*Math.PI/32)*r,y,z+Math.sin(i*Math.PI/32)*r]);tube(p,pts,width,m);if(m===mats.pink||m===mats.cyan)tube(p,pts,width*4,m===mats.pink?mats.haloPink:mats.haloCyan);}
  function glass(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:true,
    uniforms:{...THREE.UniformsLib.fog,uProbe:{value:mosaWaterReflection().texture},uProbeGain:{value:mosaWaterReflection().gain},uTint:{value:new THREE.Color(0x62d9eb)}},
    vertexShader:`varying vec3 vEye;varying vec3 vNormalView;varying vec3 vWorld;\n#include <fog_pars_vertex>\nvoid main(){vec4 mvPosition=modelViewMatrix*vec4(position,1.);vEye=-mvPosition.xyz;vNormalView=normalize(normalMatrix*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}`,
    fragmentShader:`uniform sampler2D uProbe;uniform float uProbeGain;
#include <common>
uniform vec3 uTint;varying vec3 vEye;varying vec3 vNormalView;varying vec3 vWorld;\n#include <fog_pars_fragment>\nvoid main(){float f=pow(1.-abs(dot(normalize(vEye),normalize(vNormalView))),3.);float glint=pow(max(0.,dot(reflect(-normalize(vEye),normalize(vNormalView)),normalize(vec3(-.4,.8,.5)))),42.);vec3 ray=inverseTransformDirection(reflect(-normalize(vEye),normalize(vNormalView)),viewMatrix);vec2 oct=ray.xz/(abs(ray.x)+abs(ray.y)+abs(ray.z));if(ray.y<0.)oct=(1.-abs(oct.yx))*sign(oct);vec3 reflection=texture2D(uProbe,oct*.5+.5).rgb*uProbeGain;vec3 c=mix(uTint*.65,reflection*.6+vec3(.1,.3,.45),f*.8)+glint*.7;gl_FragColor=vec4(c,.028+f*.32+glint*.16);\n#include <fog_fragment>\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});}
  const glassMat=glass(),movieClock={value:0};
  mats.movie=new THREE.ShaderMaterial({uniforms:{uTime:movieClock},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 v;uniform float uTime;void main(){vec2 p=(v-.5)*vec2(2.6,1.5);vec3 c=mix(vec3(.025,.05,.18),vec3(.12,.35,.52),v.y);for(int i=0;i<6;i++){float a=float(i)*1.7+uTime*.14;vec2 q=p-vec2(sin(a)*1.1,cos(a*.7)*.5);c+=vec3(.1,.4,.5)*pow(max(0.,1.-length(q)*5.),4.);}vec2 cat=p-vec2(sin(uTime*.45)*.45,-.04);float head=1.-smoothstep(.25,.27,length(cat));float ears=max(1.-smoothstep(.1,.12,length(cat-vec2(-.16,.22))),1.-smoothstep(.1,.12,length(cat-vec2(.16,.22))));c=mix(c,vec3(.95,.85,.69),max(head,ears));for(int side=-1;side<=1;side+=2){float eye=1.-smoothstep(.025,.035,length(cat-vec2(float(side)*.09,.04)));c=mix(c,vec3(.04,.1,.15),eye);}float nose=1.-smoothstep(.025,.035,length(cat-vec2(0.,-.03)));c=mix(c,vec3(1.,.3,.6),nose);gl_FragColor=vec4(c,1.);}`});
  // One text atlas, independent of native cat textures and any external font.
  const labels=mallSignTexts(parody);
  const signed=mallArt()?.signs;let atlas=signed?.texture?.clone();if(atlas)atlas.userData.sharedScenery=false;const textWidths=[];
  if(!signed&&typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.ceil(labels.length*44/512)*512;const c=canvas.getContext('2d');
    labels.forEach((t,i)=>{c.shadowColor=i<4?'#ff43e0':'#ffb960';c.shadowBlur=i<4?7:3;c.fillStyle=i<4?'#fff1fc':'#fff4d3';c.font=`700 ${i<4?36:28}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(t,512,i*44+22,1000);textWidths[i]=Math.min(1000,c.measureText(t).width+20);});
    atlas=new THREE.CanvasTexture(canvas);atlas.colorSpace=THREE.SRGBColorSpace;atlas.generateMipmaps=true;atlas.minFilter=THREE.LinearMipmapLinearFilter;
  }
  yield;
  const signMaterial=signed?mallSignMaterial(atlas):new THREE.MeshBasicMaterial({map:atlas||null,color:0xffffff,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  signMaterial.side=THREE.FrontSide;
  function label(parent,index,x,y,z,width,height=1.2,yaw=0){
    const rect=signed?.rects[labels[index]],aspect=rect?.aspect||(textWidths[index]||800)/44,g=new THREE.PlaneGeometry(Math.min(width,height*aspect),height),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++){if(rect){uv.setXY(i,rect.u0+(rect.u1-rect.u0)*uv.getX(i),1-(rect.v0+(rect.v1-rect.v0)*uv.getY(i)));}else{const w=textWidths[index]||800;uv.setX(i,(512-w/2+uv.getX(i)*w)/1024);uv.setY(i,1-(index*44+(1-uv.getY(i))*44)/(atlas?.image?.height||2048));}}
    if(signed){const color=new THREE.Color(index<4?0xffa6e7:0xffdfaa),values=new Float32Array(12);for(let i=0;i<4;i++)values.set(color.toArray(),i*3);g.setAttribute('color',new THREE.BufferAttribute(values,3));}
    const o=mesh(parent,g,signMaterial,x,y,z);o.rotation.y=yaw;o.userData.mallStore=MALL_STORES[index-4]?.id;signs.push(o);return o;
  }
  function pane(parent,x,y,z,r,h){const g=new THREE.CylinderGeometry(r,r,h,64,1,true);return mesh(parent,g,glassMat,x,y,z);}
  function doorwayCylinder(parent,x,y,z,r,h,material,doors=2){
    // The front/back doors are genuine open apertures in the cylindrical wall.
    const angle=Math.asin(4.25/r);
    for(let i=0;i<doors;i++)mesh(parent,new THREE.CylinderGeometry(r,r,h,32,1,true,i*Math.PI*2/doors+angle,Math.PI*2/doors-2*angle),material,x,y,z);
  }
  function paw(parent,x,y,z,r,m){orb(parent,m,x,y,z,r*.52,r*.42,.1);for(let j=0;j<4;j++){const a=(j-1.5)*.58;orb(parent,m,x+Math.sin(a)*r*.77,y+Math.cos(a)*r*.85,z,r*.21,r*.27,.11);}}
  const chairGeometry=new RoundedBoxGeometry(1,1,1,2,.12);chairGeometry.userData.sharedScenery=true;Object.assign(mats.red,getSurface('fabric'));
  function chair(p,x,z,m=mats.red,y=.6,yaw=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;p.add(g);
    mesh(g,chairGeometry,m,0,0,0,1.6,.32,1.45);mesh(g,chairGeometry,m,0,.65,-.58,1.65,1.05,.35).rotation.x=-.07;
    for(const side of [-1,1]){mesh(g,chairGeometry,m,side*.77,.25,0,.18,.5,1.28);for(const front of [-1,1]){const leg=mesh(g,cylinder,mats.gold,side*.59,-.42,front*.48,.05,.7,.05);leg.rotation.z=-side*.06;}}
    for(const side of [-1,1])tube(g,[[side*.62,.17,.56],[side*.63,.17,-.38],[side*.63,.92,-.42]],.012,mats.gold);
    return g;
  }
  const leafGeometry=new THREE.BufferGeometry(),leafP=[],leafUV=[],leafC=[],leafI=[];
  for(let row=0;row<=12;row++)for(let col=0;col<=6;col++){
    const t=row/12,q=col/3-1,width=Math.sin(Math.PI*t)**.7*.28*(.98+.025*Math.sin(t*36));
    leafP.push(q*width,Math.sin(t*Math.PI)*.24+Math.abs(q)*.08,t*1.25);
    leafUV.push(col/6,t);const vein=Math.abs(q)<.06?.12:0;leafC.push(.7+vein,.88+vein,.72+vein);
    if(row<12&&col<6){const k=row*7+col;leafI.push(k,k+1,k+7,k+1,k+8,k+7);}
  }
  leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute(leafP,3));leafGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(leafUV,2));leafGeometry.setAttribute('color',new THREE.Float32BufferAttribute(leafC,3));leafGeometry.setIndex(leafI);leafGeometry.computeVertexNormals();leafGeometry.userData.sharedScenery=true;mats.green.vertexColors=true;mats.green.side=THREE.DoubleSide;mats.green.roughness=.52;
  function plant(parent,x,z,scale=1){
    const p=new THREE.Group();p.position.set(x,0,z);p.scale.setScalar(scale);parent.add(p);x=z=0;
    disk(p,mats.navy,x,.4,z,.66,.8);ring(p,x,.81,z,.65,mats.gold,.035);
    for(let j=0;j<9;j++){
      const a=j*2.399,h=1.15+j%3*.24,leaf=mesh(p,leafGeometry,mats.green,x,.75,z,.9,1.1,h);
      leaf.rotation.y=a;leaf.rotation.x=-.65-j%3*.22;
      tube(p,[[x,.8,z],[x+Math.sin(a)*.3,1.2,z+Math.cos(a)*.3],[x+Math.sin(a)*.7,1.65,z+Math.cos(a)*.7]],.018,mats.gold);
    }
  }
  function goods(p,s){const products=MALL_PRODUCTS.filter(x=>x.storeId===s.id);for(let j=0;j<9;j++){
    const x=(j%3-1)*2.4,y=.7+Math.floor(j/3)*1.4,z=-3.2,kind=products[j%Math.max(1,products.length)]?.use||s.kind;
    if(kind==='wear'){const t=mesh(p,new THREE.TorusGeometry(.48,.12,6,20),mats.gold,x,y,z);t.rotation.x=Math.PI/2;orb(p,mats.pink,x,y+.15,z+.45,.15);}
    else if(kind==='carry'){cube(p,mats.red,x,y,z,.8,.7,.45);tube(p,[[x-.27,y+.3,z],[x-.3,y+.8,z],[x+.3,y+.8,z],[x+.27,y+.3,z]],.045,mats.gold);}
    else if(kind==='rest'){orb(p,mats.red,x,y,z,.85,.23,.6);}
    else if(kind==='read'){const o=cube(p,mats.purple,x,y,z,.75,.12,.9);o.rotation.y=j*.4;}
    else if(kind==='eat'){disk(p,mats.white,x,y,z,.5,.12);orb(p,mats.gold,x,y+.2,z,.3,.2,.3);}
    else{orb(p,j%2?mats.cyan:mats.pink,x,y,z,.36);}
  }}
  return {fittingGeometry:new Map(),frontMaterials:new Map(),signatureMaterials:new Map(),storefrontGeometry:new Map(),storeIds:MALL_STORES.map(s=>s.id),borrowedTextures:new Set([mosaWaterReflection().texture]),mats,mesh,cube,orb,disk,tube,ring,glassMat,pane,doorwayCylinder,paw,chair,plant,label,labels,atlas,getSurface,clock:movieClock,signMaterial,signs};
}
