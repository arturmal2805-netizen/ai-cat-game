import {collectMallObstacles} from './mall-navigation.js';
import {mallArt,mallSignMaterial} from './mall-art.js';
import {mallInteriorSteps} from './mall-interiors.js';
import {mallSurface,mallSurfaceMaps,mallReflectionMaterial,mallHalo} from './mall-surfaces.js';
import {mallGardenSteps} from './mall-garden.js';
import {mosaWaterReflection} from './mosasaur-water-probe.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {MALL,MALL_FLOORS,MALL_STORES,MALL_PRODUCTS,mallLabel,mallSignTexts} from './mall-data.js';
import {mosaBedY} from './mosasaur-data.js';
import {batchModelSteps} from './model-batching.js';
import {runSceneSteps} from './scene-tasks.js';

// Immutable sources are shared within this one prepared complex. The builder
// yields between shops/props; no geometry or texture is generated in updates.
export function* mallModelSteps({parody=false,includeGarden=true}={}){
  const root=new THREE.Group();root.name='CHICHI UNDERWATER CAT MALL';
  const solids=[],glassGroups=[],floorGroups=new Map(),stores=new Map(),signs=[],obstacles=new Map();
  const surfaceSets=new Map();const getSurface=(kind,repeat=1)=>{const key=kind+":"+repeat;if(!surfaceSets.has(key))surfaceSets.set(key,mallSurfaceMaps(kind,repeat));return surfaceSets.get(key);};
  const mats={
    navy:new THREE.MeshStandardMaterial({color:0x18394e,emissive:0x12344c,emissiveIntensity:.24,roughness:.27,metalness:.65}),
    floor:new THREE.MeshStandardMaterial({color:0xbed2d2,emissive:0x255365,emissiveIntensity:.23,roughness:.23,metalness:.3}),
    warm:new THREE.MeshStandardMaterial({color:0xfff0dc,emissive:0xff9e40,emissiveIntensity:.18,roughness:.38}),
    white:new THREE.MeshStandardMaterial({color:0xe7ecf4,emissive:0x2a5671,emissiveIntensity:.16,roughness:.3,metalness:.12}),
    pink:new THREE.MeshBasicMaterial({color:0xff73dd}),cyan:new THREE.MeshBasicMaterial({color:0x6cffff}),
    gold:new THREE.MeshBasicMaterial({color:0xffd98c}),purple:new THREE.MeshBasicMaterial({color:0xa87bff}),
    green:new THREE.MeshStandardMaterial({color:0x24826f,roughness:.75}),
    red:new THREE.MeshStandardMaterial({color:0x80355e,roughness:.55}),
  };
  Object.assign(mats.floor,getSurface('marble',.2));Object.assign(mats.navy,getSurface('metal'));Object.assign(mats.warm,getSurface('warm'));mats.floor.normalScale=new THREE.Vector2(.2,.2);mats.navy.normalScale=new THREE.Vector2(.35,.35);mats.warm.normalScale=new THREE.Vector2(.35,.35);
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
  function label(parent,index,x,y,z,width,height=1.2,yaw=0){
    const rect=signed?.rects[labels[index]],aspect=rect?.aspect||(textWidths[index]||800)/44,g=new THREE.PlaneGeometry(Math.min(width,height*aspect),height),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++){if(rect){uv.setXY(i,rect.u0+(rect.u1-rect.u0)*uv.getX(i),1-(rect.v0+(rect.v1-rect.v0)*uv.getY(i)));}else{const w=textWidths[index]||800;uv.setX(i,(512-w/2+uv.getX(i)*w)/1024);uv.setY(i,1-(index*44+(1-uv.getY(i))*44)/(atlas?.image?.height||2048));}}
    if(signed){const color=new THREE.Color(index<4?0xffa6e7:0xffdfaa),values=new Float32Array(12);for(let i=0;i<4;i++)values.set(color.toArray(),i*3);g.setAttribute('color',new THREE.BufferAttribute(values,3));}
    const o=mesh(parent,g,signMaterial,x,y,z);o.rotation.y=yaw;o.userData.mallStore=MALL_STORES[index-4]?.id;signs.push(o);return o;
  }
  function pane(parent,x,y,z,r,h){const g=new THREE.CylinderGeometry(r,r,h,64,1,true);return mesh(parent,g,glassMat,x,y,z);}
  function doorwayCylinder(parent,x,y,z,r,h,material){
    // The front/back doors are genuine open apertures in the cylindrical wall.
    const angle=Math.asin(4.25/r);
    for(const start of [angle,Math.PI+angle])mesh(parent,new THREE.CylinderGeometry(r,r,h,32,1,true,start,Math.PI-2*angle),material,x,y,z);
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
  function* shop(source,s,ceilings,kinetics){
    const g=new THREE.Group(),roof=new THREE.Group();g.position.set(s.x,0,s.z);g.rotation.y=-s.angle-Math.PI/2;source.add(g);
    cube(g,mats.navy,0,-.13,0,13,.22,11);cube(g,mats.floor,0,-.025,0,12.5,.05,10.5);
    for(const x of [-6.4,6.4]){cube(g,mats.navy,x,.7,-1,.18,1.3,8);cube(g,glassMat,x,3,-1,.055,3.3,8);cube(g,mats.gold,x,4.6,-1,.07,.08,7.8);}
    cube(g,mats.navy,0,6.2,-3.9,12.8,1.1,.6);cube(g,mats.gold,0,5.62,-3.92,12.5,.08,.7);cube(g,mats.warm,0,2.2,-4,12.7,.18,.9);
    // Recessed glazed showcases have depth, plinths, mullions and gilded trim.
    cube(g,mats.navy,0,.55,-4.45,12.6,.8,.18);
    for(const x of [-6,-2,2,6])cube(g,mats.gold,x,2.45,-4.30,.06,4.1,.06);
    for(const y of [.35,1.8,3.2,4.5])cube(g,mats.gold,0,y,-4.28,12.1,.05,.07);
    if(!['food','cinema'].includes(s.kind)){
      cube(g,mats.warm,0,.43,3.9,3.6,.8,1.1);cube(g,mats.navy,.6,1.02,3.9,.55,.38,.12);
      cube(g,mats.gold,0,.85,4.48,3.3,.045,.05);
    }
    const idx=4+MALL_STORES.indexOf(s);label(g,idx,0,6.2,-3.52,11,1.25);
    label(g,idx,0,6.2,-4.28,11,1.25,Math.PI);
    // Recessed amber ceiling coves, luminous shelving and lit product islands.
    cube(roof,mats.navy,0,6.05,-.2,12.8,.23,9.7);
    for(const x of [-4,0,4])for(const z of [-2,1.7]){cube(roof,mats.warm,x,5.9,z,3.1,.045,2.4);for(const dx of [-1.6,1.6])cube(roof,mats.gold,x+dx,5.84,z,.05,.08,2.5);}

    for(const x of [-5.8,5.8])cube(roof,mats.gold,x,5.87,-.2,.10,.07,9.1);
    for(const z of [-3.4,1.2,3.7])cube(roof,mats.gold,0,5.86,z,11.5,.07,.10);
    for(const x of [-4,0,4]){disk(roof,mats.gold,x,5.6,1.4,.42,.1);cube(roof,mats.navy,x,5.9,1.4,.045,.6,.045);}

    if(s.kind==='cinema'){
      cube(g,mats.navy,0,2.8,-4.1,11,4.8,.35);cube(g,mats.movie,0,3,-3.86,8.9,3.5,.04);
      // Original orbiting-paw story, shared scalar clock. No movie asset/stream.
      const movie=new THREE.Group();movie.position.set(0,3,-3.8);g.add(movie);paw(movie,0,0,0,1.2,mats.pink);movie.userData.movie=true;
      for(const x of [-3.6,3.6])for(const z of [.5,-1.1,-2.7])chair(g,x,z,mats.red,.65,Math.PI);
    }else if(s.kind==='arcade'){
      for(const x of [-4,0,4]){cube(g,mats.navy,x,1.4,1,1.5,2.8,1.3);cube(g,mats.purple,x,2,1.67,1.25,1.1,.04);cube(g,mats.cyan,x,1.25,1.78,1.2,.08,.35);}
    }else if(s.kind==='bowling'){
      for(const x of [-2.7,2.7]){
        cube(g,mats.warm,x,.08,-.2,2.15,.12,7.6);
        for(const side of [-1,1])cube(g,mats.navy,x+side*1.15,.09,-.2,.16,.12,7.7);
        for(let row=0;row<3;row++)for(let k=0;k<=row;k++){
          const px=x+(k-row/2)*.42,z=-2.8-row*.38;
          orb(g,mats.white,px,.52,z,.13,.4,.13);orb(g,mats.white,px,.91,z,.11);
        }
      }
    }else if(s.kind==='dance'){
      for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)cube(g,(x+z)%2?mats.purple:mats.cyan,x*1.5,.4,z*1.5,1.4,.03,1.4);
    }
    const motion=new THREE.Group();motion.position.copy(g.position);motion.rotation.copy(g.rotation);kinetics.add(motion);
    yield* mallInteriorSteps(g,s,{motion,clock:movieClock,cube,orb,disk,tube,ring,mesh,mats,glassMat,chair,plant,getSurface,labelText:(parent,text,x,y,z,w,h,yaw=0)=>label(parent,labels.indexOf(text),x,y,z,w,h,yaw)});
    plant(g,-5.3,5.8,.65);plant(g,5.3,5.8,.65);
    roof.position.copy(g.position);roof.rotation.copy(g.rotation);ceilings.add(roof);
    stores.set(s.id,{...s,group:g});
  }
  for(const f of MALL_FLOORS){
    yield;
    const group=new THREE.Group(),opaque=new THREE.Group(),transparent=new THREE.Group(),ceilings=new THREE.Group(),escalators=new THREE.Group(),kinetics=new THREE.Group();group.name=`F${f.id} ${f.name}`;group.position.y=f.y;floorGroups.set(f.id,group);root.add(group);group.add(transparent,kinetics);
    const outline=new THREE.Shape();outline.absarc(0,0,32,0,Math.PI*2,false);
    if(f.id>1){const hole=new THREE.Path();hole.absarc(0,0,9,0,Math.PI*2,true);outline.holes.push(hole);}
    const plate=new THREE.ExtrudeGeometry(outline,{depth:.45,bevelEnabled:false,curveSegments:64});plate.rotateX(-Math.PI/2);plate.translate(0,-.45,0);
    mesh(opaque,plate,mats.floor,0,0,MALL.z);
    ring(opaque,0,.12,MALL.z,31.8,mats.cyan,.14);ring(opaque,0,-.4,MALL.z,32.1,mats.pink,.11);ring(opaque,0,.15,MALL.z,9.1,mats.gold,.1);
    pane(transparent,0,3.35,MALL.z,31.6,6.5);
    ring(opaque,0,6.55,MALL.z,31.85,mats.cyan,.10);
    ring(opaque,0,.35,MALL.z,29.5,mats.gold,.045);
    for(let k=0;k<12;k++){const a=k*Math.PI/6,x=Math.cos(a)*28,z=MALL.z+Math.sin(a)*28;disk(opaque,mats.gold,x,6.3,z,.4,.08);}
    // Two actual stair/escalator flights sit beside the atrium, away from the
    // reserved inner-ring visitor lane and every storefront entrance.
    if(f.id<7)for(const side of [-1,1]){const x=side*11.3;for(let j=0;j<28;j++)cube(escalators,mats.navy,x,.25+j*MALL.rise/28,MALL.z-6+j*12/28,2.8,.15,.44);
      for(const dx of [-1.55,1.55]){tube(escalators,[[x+dx,.7,MALL.z-6],[x+dx,MALL.rise+.7,MALL.z+6]],.08,mats.gold);tube(escalators,[[x+dx,1.5,MALL.z-6],[x+dx,MALL.rise+1.5,MALL.z+6]],.10,mats.cyan);}
    }
    for(let k=0;k<28;k++){const a=k*Math.PI/14,x=Math.cos(a)*31.8,z=MALL.z+Math.sin(a)*31.8;cube(opaque,mats.navy,x,3.3,z,.24,6.6,.24);
      cube(opaque,mats.navy,x,.3,z,.43,.48,.43);cube(opaque,mats.gold,x,.55,z,.39,.045,.39);
      cube(opaque,mats.navy,x,6.3,z,.43,.4,.43);
    }
    for(let k=0;k<12;k++){const a=k*Math.PI/6,x=Math.cos(a)*10,z=MALL.z+Math.sin(a)*10;cube(opaque,mats.navy,x,.65,z,.08,1.3,.08);}
    ring(opaque,0,1.3,MALL.z,10,mats.gold,.05);
    // The front gap is reserved for the wide landing and corridor.
    cube(opaque,mats.navy,6,-.18,MALL.z+27,22,.3,12);cube(opaque,mats.floor,6,-.025,MALL.z+27,21.6,.05,11.5);
    for(const x of [-5,17]){cube(opaque,glassMat,x,1.2,MALL.z+27,.05,2.3,12);cube(opaque,mats.cyan,x,2.4,MALL.z+27,.07,.09,12);}
    // A real furnished front lounge makes each public gallery feel inhabited.
    for(const side of [-1,1]){const x=side*8,z=MALL.z+23;chair(opaque,x,z,mats.red,.7,-side*.8);plant(opaque,x+side*2,z+1.2);disk(opaque,mats.warm,x-side*1.9,1,z,1,.18);}

    for(const s of MALL_STORES.filter(s=>s.floor===f.id)){yield;yield* shop(opaque,s,ceilings,kinetics);}
    for(let k=0;k<8;k++){yield;const a=k*Math.PI/4;plant(opaque,Math.cos(a)*12.5,MALL.z+Math.sin(a)*12.5);}
    if(f.id===1){
      disk(opaque,mats.navy,0,.4,MALL.z,6,.7);disk(opaque,mats.cyan,0,.8,MALL.z,5.3,.12);
      // Volumetric original cat sculpture: body, ears, head, paws and tail.
      orb(opaque,mats.white,0,2.2,MALL.z,1.5,1.9,1.1);orb(opaque,mats.white,0,4.3,MALL.z+.2,1.55,1.35,1.2);
      for(const x of [-1,1]){const ear=mesh(opaque,new THREE.ConeGeometry(.65,1.3,4),mats.white,x,5.65,MALL.z+.15);ear.rotation.z=-x*.2;orb(opaque,mats.navy,x*.65,4.5,MALL.z+1.25,.15);}
      tube(opaque,[[1,1.6,MALL.z], [2.2,2,MALL.z-1], [2.3,3.4,MALL.z-1],[1.7,3.7,MALL.z-1]],.27,mats.white);
      for(let j=0;j<12;j++){const a=j*Math.PI/6;const x=Math.cos(a)*4,z=MALL.z+Math.sin(a)*4;tube(opaque,[[x,.9,z],[x*.5,3.7,MALL.z+(z-MALL.z)*.5],[x*.25,1.4,MALL.z+(z-MALL.z)*.25]],.04,mats.cyan);}
    }
    if(f.id===6){for(let j=0;j<7;j++){const a=j*Math.PI/3.5,x=Math.cos(a)*7,z=MALL.z+Math.sin(a)*7;orb(opaque,mats.pink,x,2.5+j%2,z,.75,.4,.75);for(let t=0;t<5;t++)tube(opaque,[[x+(t-2)*.15,2.3,z],[x+(t-2)*.22,1.6,z+.2],[x+(t-2)*.3,.8,z]],.025,mats.cyan);}}
    if(f.id===7){disk(opaque,mats.navy,0,.6,MALL.z,5,.7);const globe=orb(transparent,mats.cyan,0,3.4,MALL.z,2.8);globe.material=glassMat;for(let j=0;j<3;j++){const r=mesh(opaque,new THREE.TorusGeometry(3.2,.04,6,48),mats.cyan,0,3.4,MALL.z);r.rotation.x=j*Math.PI/3;r.rotation.y=.7;}for(let j=0;j<4;j++)chair(opaque,-6+j*4,MALL.z+6,mats.red,.6,Math.PI);}
    yield;
    obstacles.set(f.id,collectMallObstacles(opaque,glassMat));
    const batched=yield* batchModelSteps(opaque,{combineColors:true});
    batched.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial)mallReflectionMaterial(o.material,.18);});
    const stair=yield* batchModelSteps(escalators,{combineColors:true});group.userData.escalators=stair;group.add(stair);
    const roof=yield* batchModelSteps(ceilings,{combineColors:true});group.userData.ceiling=roof;group.add(roof);group.add(batched);solids.push(batched);glassGroups.push(transparent);
    // Source buffers are immutable shared primitives or discarded one-offs.
    opaque.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedScenery)o.geometry.dispose();});
  }
  // Four round glass satellites at deliberately different heights, joined by
  // dry, pressurized glazed bridges. Their footprints avoid existing reefs.
  const shell=new THREE.Group();root.add(shell);
  const satellites=[[-55,40,2,14],[55,40,4,14],[-54,60,5,13],[52,66,6,13]];
  for(const [x,z,floor,r]of satellites){yield;const y=MALL_FLOORS[floor-1].y;
    disk(shell,mats.navy,x,y-.5,z,r+1,1);disk(shell,mats.warm,x,y+.05,z,r,.15);ring(shell,x,y+.3,z,r,mats.pink,.15);ring(shell,x,y+5.6,z,r,mats.gold,.1);pane(shell,x,y+2.9,z,r,5.6);disk(shell,glassMat,x,y+5.9,z,r+1,.15);
    mesh(shell,new THREE.SphereGeometry(r,40,12,0,Math.PI*2,0,Math.PI/2),glassMat,x,y+5.9,z,1,.23,1);
    ring(shell,x,y+5.9,z,r+1,mats.cyan,.14);
    for(let j=0;j<12;j++){const a=j*Math.PI/6;cube(shell,mats.navy,x+Math.cos(a)*r,y+2.8,z+Math.sin(a)*r,.15,5.6,.15);}
    for(let j=0;j<6;j++){const a=j*Math.PI/3;const g=new THREE.Group();g.position.y=y;shell.add(g);chair(g,x+Math.cos(a)*8,z+Math.sin(a)*8,mats.red,.6,-a);plant(g,x+Math.cos(a+.25)*10,z+Math.sin(a+.25)*10);}
    const from=new THREE.Vector3(Math.sign(x)*27,y,z),to=new THREE.Vector3(x-Math.sign(x)*r,y,z),len=from.distanceTo(to),mid=from.clone().lerp(to,.5);
    cube(shell,mats.navy,mid.x,y-.1,z,len,.4,6);cube(shell,mats.gold,mid.x,y+.2,z,len,.06,.08);
    for(const side of [-1,1]){cube(shell,glassMat,mid.x,y+2,z+side*3,len,4,.05);cube(shell,mats.cyan,mid.x,y+4,z+side*3,len,.07,.07);}
    const bed=mosaBedY(x,z);disk(shell,mats.navy,x,(y+bed)/2,z,1.2,Math.max(.5,y-bed));
    for(let j=0;j<6;j++){const a=j*Math.PI/3;ring(shell,x,bed+(y-bed)*j/6,z,1.25,mats.purple,.08);}
    const inner=new THREE.Group();inner.position.set(x,y,z);shell.add(inner);
    for(let j=0;j<6;j++){const a=j*Math.PI/3,px=Math.cos(a)*7,pz=Math.sin(a)*7;disk(inner,mats.warm,px,1,pz,1.4,.15);orb(inner,mats.pink,px,1.25,pz,.25);}
    for(let j=0;j<8;j++){const a=j*Math.PI/4;const q=new THREE.Group();q.position.set(Math.cos(a)*(r-.8),0,Math.sin(a)*(r-.8));q.rotation.y=-a-Math.PI/2;inner.add(q);cube(q,mats.gold,0,2.5,0,.10,5,.10);cube(q,mats.warm,0,.5,0,2,.8,.5);}
    label(inner,4+MALL_STORES.findIndex(s=>s.floor===floor),0,5.3,r+.2,Math.min(20,r*1.8),1.6);
    paw(inner,0,3.2,r+.3,1.2,mats.pink);
  }
  const top=MALL_FLOORS[6].y+6.8;
  const dome=mesh(shell,new THREE.SphereGeometry(31.6,64,28,0,Math.PI*2,0,Math.PI/2),glassMat,0,top,MALL.z,1,.59,1);
  dome.name='Transparent cat-head crown';
  for(let j=0;j<16;j++){yield;const a=j*Math.PI/8,points=[];for(let i=0;i<=16;i++){const t=i*Math.PI/32;points.push([Math.cos(a)*Math.sin(t)*31.6,top+Math.cos(t)*18.65,MALL.z+Math.sin(a)*Math.sin(t)*31.6]);}tube(shell,points,.075,mats.navy);}
  for(let j=1;j<5;j++){const t=j*Math.PI/10;ring(shell,0,top+Math.cos(t)*18.65,MALL.z,Math.sin(t)*31.6,mats.navy,.08);}
  for(const side of [-1,1]){
    tube(shell,[[side*18,top+9,MALL.z+3],[side*22,top+23,MALL.z+2],[side*29,top+12,MALL.z+3]],.33,mats.pink);tube(shell,[[side*18,top+9,MALL.z+3],[side*22,top+23,MALL.z+2],[side*29,top+12,MALL.z+3]],1.0,mats.haloPink);
    tube(shell,[[side*18.6,top+9.1,MALL.z+3],[side*22,top+21.8,MALL.z+2.5],[side*28.4,top+11.9,MALL.z+3]],.095,mats.gold);
    const z=MALL.z+27;tube(shell,[[side*5,top+9,z],[side*7.5,top+11,z-1],[side*10,top+9.5,z]],.18,mats.pink);
    for(let i=0;i<3;i++)tube(shell,[[side*4,top+4-i*.7,z+1],[side*(9+i),top+4-i*.9,z]],.095,mats.pink);
  }
  tube(shell,[[-1.5,top+6,MALL.z+30],[0,top+4.5,MALL.z+31],[1.5,top+6,MALL.z+30]],.2,mats.pink);
  const facade=new THREE.Group();facade.position.set(0,top-5,MALL.z);shell.add(facade);
  const bannerRadius=34.05,bannerArc=.72;
  mesh(facade,new THREE.CylinderGeometry(bannerRadius,bannerRadius,7.2,64,1,true,-bannerArc,bannerArc*2),mats.navy);
  label(facade,0,0,1.65,bannerRadius+.14,23,2.6);
  label(facade,1,0,-.85,bannerRadius+.15,40,1.75);
  label(facade,2,0,-2.45,bannerRadius+.15,25,.65);
  for(const y of [-3.45,3.45]){
    const points=Array.from({length:49},(_,i)=>{const a=-bannerArc+i*bannerArc/24;return[Math.sin(a)*bannerRadius,y,Math.cos(a)*bannerRadius];});
    tube(facade,points,.09,mats.pink);tube(facade,points,.27,mats.haloPink);
    tube(facade,points.map(([x,y,z])=>[x,y*.96,z+.03]),.025,mats.gold);
  }
  for(const side of [-1,1]){const ad=new THREE.Group();ad.position.set(side*43,MALL.y+21,MALL.z+32);ad.rotation.y=-side*.12;shell.add(ad);
    cube(ad,mats.navy,0,0,0,8,15,.7);for(const x of [-3.95,3.95])cube(ad,mats.pink,x,0,.45,.14,15,.12);for(const y of [-7.45,7.45])cube(ad,mats.cyan,0,y,.45,8,.1,.12);
    paw(ad,0,1,.5,2.2,mats.pink);label(ad,0,0,-4.2,.5,6.3,1.3);label(ad,2,0,5.7,.5,6.6,.65);
    for(let j=0;j<8;j++)orb(ad,mats.cyan,(j%2?1:-1)*(2+j%3*.3),-6+j*1.5,.5,.08);
  }
  // A glass express shaft connects the original dry pier to all seven levels.
  const lx=MALL.lift.x,lz=MALL.lift.z,r=MALL.lift.radius;
  const shaftTop=MALL_FLOORS[6].y+5.5;
  doorwayCylinder(shell,lx,(MALL.y+shaftTop)/2,lz,r,shaftTop-MALL.y,glassMat);
  for(const floor of MALL_FLOORS){if(floor.id<7)pane(shell,lx,floor.y+6.3,lz,r,2.4);}
  const clearTube=glass();clearTube.fragmentShader=clearTube.fragmentShader.replace('.028+f*.32+glint*.16','(.028+f*.32+glint*.16)*.12');
  mesh(shell,new THREE.CylinderGeometry(r,r,1-shaftTop,64,1,true),clearTube,lx,(shaftTop+1)/2,lz);
  for(let y=MALL.y;y<MALL_FLOORS[6].y+5;y+=7.5)ring(shell,lx,y,lz,r+.1,y< -20?mats.pink:mats.cyan,.12);
  for(const x of [-r,r])cube(shell,mats.navy,lx+x,(MALL.y+shaftTop)/2,lz,.14,shaftTop-MALL.y,.14);
  disk(shell,mats.navy,lx,.14,lz,10,.4);cube(shell,mats.navy,lx,.14,lz+12,11,.4,12);ring(shell,lx,.4,lz,9.5,mats.cyan,.14);
  cube(shell,mats.navy,6,.18,103,19,.32,9).rotation.y=-.72;
  const station=new THREE.Group();station.position.set(lx,0,lz+4);shell.add(station);paw(station,0,4,4,1.4,mats.pink);label(station,3,0,6,4,12,1.3);
  const cabin=new THREE.Group();cabin.position.set(lx,.35,lz);root.add(cabin);disk(cabin,mats.navy,0,-.28,0,r-.35,.2);ring(cabin,0,-.16,0,r-.6,mats.cyan,.12);doorwayCylinder(cabin,0,2.37,0,r-.45,5.1,glassMat);ring(cabin,0,4.98,0,r-.5,mats.pink,.1);
  const doors=[];for(const side of [-1,1])for(const x of [-1,1]){const d=cube(cabin,glassMat,x*2,2.37,side*(r-.5),4,5.1,.06);doors.push({mesh:d,x:d.position.x});}
  for(let j=0;j<4;j++)paw(cabin,(j%2?1:-1)*2.5,.15,(j<2?-1:1)*2.5,.4,mats.gold);
  const frame=yield* batchModelSteps(shell);root.add(frame);shell.removeFromParent();solids.push(frame);
  // batchModelSteps flattens only static architecture, never the moving cabin.
  const garden=includeGarden?yield* mallGardenSteps():new THREE.Group();if(!includeGarden){garden.userData.borrowed=new Set();garden.userData.update=()=>{};}root.add(garden);
  root.userData={borrowed:garden.userData.borrowed,mall:true,built:true,obstacles,floors:floorGroups,stores,cabin,doors,materials:[...Object.values(mats),glassMat,clearTube,signMaterial],atlas,
    focusFloor(id){for(const [n,g]of floorGroups){g.visible=!id||n===id;g.userData.ceiling.visible=!id;g.userData.escalators.visible=!id;}frame.visible=!id;},
    update(time,reduced){movieClock.value=reduced?0:time;garden.userData.update(time,reduced);},
    updateLift(y,opening){cabin.position.y=y;for(const d of doors)d.mesh.position.x=d.x+Math.sign(d.x)*opening*3.8;},
    stats:{floors:7,stores:MALL_STORES.length,products:MALL_PRODUCTS.length},
  };
  root.traverse(o=>{if(o.isMesh){o.userData.mall=true;o.userData.biomeId='autumn';}});
  return root;
}
export const createMallModel=options=>runSceneSteps(mallModelSteps(options));
