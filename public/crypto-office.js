import * as T from "three";
import { batchModelSteps } from "./model-batching.js";
import { courtLabel } from "./foodcourt-assets.js";
import { cryptoDisplays } from "./crypto-displays.js";

// Same footprint, six workplaces, doors and continuous native stairwell.
// Only the existing crypto office is replaced; no new island or cat models.
export function* cryptoOfficeSteps(b,h) {
  const {shape,line,torus,lantern,pot,shelf,sofa,chair,desk,paw}=h;
  const root=new T.Group(),props=new T.Group(),roof=new T.Group(),screens=[];
  const C={green:0x367b67,deep:0x285b51,gold:0xe9bb62,cream:0xffefd2,wall:0xf0daba,wood:0xc58f5d};
  root.name="Криптоофіс · Green Paw Capital";root.userData={id:b.id,jobBusiness:b};root.add(props,roof);
  const labelTemplates=new Map(),labelTextures=new Set();
  const label=(parent,value,x,y,z,w,ht)=>{
    const key=value+":"+w+":"+ht;let template=labelTemplates.get(key);
    if(!template){
      template=courtLabel(value,w,ht);
      if(value==="₿"&&typeof document!=="undefined"){
        template.material.map.dispose();
        const canvas=document.createElement("canvas");canvas.width=canvas.height=256;
        const ctx=canvas.getContext("2d");ctx.fillStyle="#e9bb62";ctx.fillRect(0,0,256,256);ctx.fillStyle="#fff2ce";ctx.font="bold 225px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(value,128,142);
        const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;template.material.map=texture;
      }
      if(template.material?.map)labelTextures.add(template.material.map);
      labelTemplates.set(key,template);
    }
    const m=template.clone();m.position.set(x,y,z);parent.add(m);return m;
  };
  shape(props,"cube",C.cream,0,0,0,26,.32,21);
  shape(props,"cube",C.wall,0,6.8,-10,25,13.6,.35);
  for(const x of [-12.4,12.4])shape(props,"cube",C.wall,x,6.8,-2,.4,13.6,16);
  for(const x of [-12,12]){
    shape(props,"pole",C.cream,x,6.6,8.8,.34,13.2,.34);
    shape(props,"pole",C.gold,x,.35,8.8,.65,.35,.65);
    shape(props,"cube",C.gold,x,13.1,8.8,1.1,.4,1.1);
  }
  for(let floor=0;floor<3;floor++){
    const y=floor*4.6;
    if(floor){shape(props,"cube",C.cream,-2.15,y,0,20.7,.3,20);shape(props,"cube",C.cream,10.4,y,9.1,3.4,.3,1.8);}
    shape(props,"cube",C.wood,0,y+.18,9.5,25,.14,.9);
    for(const [a,z]of [[-11.5,-2.3],[2.3,7.8],[11.5,12]])line(props,[a,y+1,9.7],[z,y+1,9.7],C.gold,.055);
    for(let x=-11;x<=7.8;x+=2.2)if(Math.abs(x)>2.3)line(props,[x,y+.2,9.7],[x,y+1,9.7],C.deep,.04);
    for(const x of [-10.5,6.8]){pot(props,x,y+.2,-7.8,.8);lantern(props,x,y+3.5,5.7,.46);}
    for(const x of [-6,2,7]){shape(props,"cube",0xffd68e,x,y+3.9,-2.5,2.2,.08,.7,true);line(props,[x,y+4.35,-2.5],[x,y+3.9,-2.5],C.gold,.035);}
    // Keep the centre entrance aisle x≈0 clear all the way behind the desks.
    for(const x of [-4,4]){
      desk(props,x,y,6.15);chair(props,x,y+.35,3.8,C.green);
      shape(props,"cube",C.deep,x,y+.75,6.8,3.55,1.2,.22);
      shape(props,"cube",C.gold,x,y+1.36,6.8,3.55,.08,.25);
      shape(props,"cube",0x263d48,x-.75,y+2.03,6.3,1.6,1.15,.18);
      shape(props,"cube",C.gold,x-.75,y+1.54,6.3,.15,.32,.13);
      screens.push({x:x-.75,y:y+2.03,z:6.4,w:1.43,h:.98});
      shape(props,"cube",0xd6e5d9,x+.15,y+1.38,6.1,1.45,.07,.46);
      for(let k=0;k<6;k++)shape(props,"cube",C.cream,x-.42+k*.22,y+1.43,6.13,.14,.025,.3);
      for(const [dx,color]of [[.6,0x81d9a5],[1.28,0xed9ca1]])shape(props,"cube",color,x+dx,y+1.44,6.48,.54,.08,.3);
      paw(props,x+1.12,y+.82,6.95,.32,C.gold);
    }
    if(!floor){
      sofa(props,-5.8,y+.12,-5.8,0xd9bfda,1.18);sofa(props,3.7,y+.12,-6.1,0xc7d9c2,1.05);
      shape(props,"cube",C.wood,-1,y+.65,-5,2.5,.18,1.6);pot(props,-1,y+.75,-5,.45);
      shelf(props,-9,y+.2,-9.4);label(props,"РЕЦЕПЦІЯ · CRYPTO",0,y+3.35,-9.67,10,1);
    }else{
      const width=floor===2?12.4:10.4,height=floor===2?2.65:2.45;
      shape(props,"cube",C.deep,-1,y+2.5,-9.62,width+.35,height+.35,.18);
      screens.push({x:-1,y:y+2.5,z:-9.5,w:width,h:height});
      label(props,floor===2?"₿ BITCOIN · LONG / SHORT":"ETH / BTC · ТОРГОВИЙ ЗАЛ",-1,y+4,-9.46,width,.5);
      shelf(props,-9.5,y+.2,-9.35);
    }
    for(const x of [-10.8,6.6])label(props,"Купити  /  Продати",x,y+2.3,-9.45,2.8,.45);
    yield;
  }
  for(let flight=0;flight<2;flight++)for(let step=0;step<24;step++){
    const t=(step+.5)/24,z=flight?-8+t*16:8-t*16,y=flight*4.6+t*4.6;
    shape(props,"cube",0xe0c9a4,10,y/2+flight*2.3,z,3.3,y-flight*4.6+.14,16/24+.03);
    if(step%6===0)line(props,[11.7,y,z],[11.7,y+.9,z],C.wood,.045);
    if(step%8===0)yield;
  }
  for(let floor=0;floor<3;floor++){
    const y=floor*4.6;
    for(const x of [-10.3,-7.8,7.8]){
      pot(props,x,y+.2,8.5,.65);
      h.flowerCluster(props,x,8.5,0xf1a2b8,.48,y+1.1);
    }
    for(const x of [-11.7,11.7])lantern(props,x,y+2.4,8.6,.65);
  }
  for(const side of [-1,1]){const m=shape(roof,"cube",C.green,side*6.2,14.95,-2.2,13.8,.55,16);m.rotation.z=-side*.17;}
  shape(roof,"cube",C.gold,0,13.9,5.9,27,.38,1);
  shape(roof,"sphere",C.cream,0,15.35,6.12,2.7,2.2,.3);
  const coin=shape(roof,"pole",C.gold,0,15.35,6.43,1.85,.18,1.85);coin.rotation.x=Math.PI/2;
  const rim=torus(roof,C.cream,1.6,.07,0,15.35,6.57);rim.rotation.set(0,0,0);
  label(roof,"₿",0,15.35,6.65,2.25,2.25);
  label(roof,"CRYPTO CAT · GREEN PAW",0,13.85,6.52,14,1.05);
  for(const x of [-10,10])for(let i=0;i<3;i++)pot(roof,x,14.7+i*.17,-7+i*2.4,.6);
  yield;
  const bake=yield*batchModelSteps(props,{combineColors:true});root.remove(props);root.add(bake);
  props.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedScenery)o.geometry.dispose();});
  const roofBake=yield*batchModelSteps(roof,{combineColors:true});root.remove(roof);root.add(roofBake);
  roof.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedScenery)o.geometry.dispose();});
  const displays=cryptoDisplays(screens);root.add(displays.mesh);
  const watchedTextures=new Set();
  root.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m?.map&&labelTextures.has(m.map)&&!watchedTextures.has(m.map)){const texture=m.map;watchedTextures.add(texture);m.addEventListener("dispose",()=>texture.dispose());}});
  root.userData.roof=roofBake;root.userData.setCryptoState=displays.setState;
  root.userData.update=displays.update;root.userData.duration=24;
  root.userData.stats={floors:3,workplaces:6,staticMeshes:bake.children.length+roofBake.children.length,sourceMeshes:bake.userData.sourceMeshes,candlestickScreens:screens.length};
  return root;
}
