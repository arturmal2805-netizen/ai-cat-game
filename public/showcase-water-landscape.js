import * as T from 'three';
import {shape, line, flowerCluster, lantern,surfaceTexture} from './fantasy-scenery.js';
import {cliffGeometry,boulderGeometry,islandOutline,islandCliffGeometry} from './showcase-geology.js';
import {leafyCanopy,fern,rosette,mossMantle,gardenFlowerCluster,floweringShore,palmFrondGeometry} from './showcase-botany.js';

// Original, static tropical scenery. These meshes are merged with the rest of
// the purchased prefab once; foliage never adds a runtime animation/upload loop.
const leafPaint = [0x209d60, 0x39b768, 0x78cf70].map(color => {
  const m = new T.MeshStandardMaterial({color, roughness:.83, side:T.DoubleSide,map:surfaceTexture('leaf'),vertexColors:true});
  m.roughness=.82;m.userData.sharedScenery = true;m.userData.surfaceKind='leaf'; return m;
});
const mossPaint=new T.MeshStandardMaterial({color:0x79b34b,roughness:.86,map:surfaceTexture('lawn')});
mossPaint.userData.sharedScenery=true;mossPaint.userData.surfaceKind='moss';
const rocks=new Map();
function stonePaint(color){if(!rocks.has(color)){const m=new T.MeshStandardMaterial({color,roughness:.88,map:surfaceTexture('stone'),vertexColors:true});m.userData.sharedScenery=true;m.userData.surfaceKind='stone';rocks.set(color,m);}return rocks.get(color);}
const groundPaint=new T.MeshStandardMaterial({color:0x84c263,roughness:.98,map:surfaceTexture('lawn')});groundPaint.userData.sharedScenery=true;groundPaint.userData.surfaceKind='lawn';
export function dryPlantRoot(spec,x,y,z,radius=1.2){
 if(y>spec.surfaceY+.6)return true;const [cx,cz,rx,rz]=spec.pool,dx=Math.max(0,Math.abs(x-cx)-radius),dz=Math.max(0,Math.abs(z-cz)-radius);return (dx/rx)**2+(dz/rz)**2>=1;
}

export function tropicalPalm(parent, x, y, z, height = 16, turn = 0) {
  const group = new T.Group(); group.position.set(x,y,z); group.rotation.y = turn; parent.add(group);
  const sway = height * .14;
  const trunk = new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(-sway*.2,height*.35,0),new T.Vector3(sway*.4,height*.75,0),new T.Vector3(sway,height,0)]);
  const bark = shape(group,'pole',0xaa7951,0,0,0);
  bark.geometry = new T.TubeGeometry(trunk,14,height*.037,7,false);
  for (let i=0;i<9;i++) {
    const a=i*Math.PI*2/9, leaf=new T.Mesh(palmFrondGeometry(),leafPaint[i%3]);
    leaf.position.set(sway,height,0); leaf.rotation.y=a; leaf.rotation.x=-.10+(i%3)*.07;
    leaf.scale.setScalar(height*(.56+(i%3)*.055)); leaf.castShadow=true; group.add(leaf);
  }
  for(let i=0;i<4;i++) shape(group,'sphere',0xb58450,sway+Math.sin(i*2.4)*.6,height-.6,Math.cos(i*2.4)*.6,.55,.7,.55);
  return group;
}

export function tropicalTree(parent,x,y,z,height=22,pink=false) {
  const trunk=shape(parent,'pole',0x936d4d,x,y+height*.37,z,height*.047,height*.74,height*.047);
  for(let j=0;j<8;j++) {
    const a=j*Math.PI*2/8,dx=Math.sin(a)*height*.24,dz=Math.cos(a)*height*.24;
    line(parent,[x,y+height*.4,z],[x+dx,y+height*.78,z+dz],0x936d4d,height*.023);
    const crown=shape(parent,'sphere',pink?[0xee83b5,0xffacd7,0xdf76b2][j%3]:[0x338d42,0x50a344,0x6fb94c][j%3],x+dx,y+height*(.84+j%2*.08),z+dz,height*.18,height*.13,height*.18);crown.geometry=boulderGeometry(j);
  }
  leafyCanopy(parent,x,y,z,height,pink);
  return trunk;
}

export function flowerBank(parent,x,y,z,color=0xf29cce,scale=1) {
  for(let j=0;j<4;j++) {
    const a=j*2.4,px=x+Math.sin(a)*1.7*scale,pz=z+Math.cos(a)*1.4*scale;
    rosette(parent,px,y+.08*scale,pz,1.5*scale,a);
    gardenFlowerCluster(parent,px,pz,j%3===0?0xffe5ad:color,7*scale,y+.6*scale);
  }
}

export function sandstoneColumn(parent,x,z,height,radius,color=0xc5aa83) {
  const seed=x*.3+z*.7,rock=new T.Mesh(cliffGeometry(height,radius,seed),stonePaint(color));rock.position.set(x,0,z);rock.castShadow=rock.receiveShadow=true;parent.add(rock);
  mossMantle(parent,x,z,height,radius,seed);
  for(let j=0;j<3;j++){const a=j*2.4+seed;fern(parent,x+Math.sin(a)*radius*.48,height+.4,z+Math.cos(a)*radius*.48,2.15,a);}
  for(let j=0;j<5;j++){
   const a=j*Math.PI*2/5+.4,dx=Math.sin(a)*radius*.8,dz=Math.cos(a)*radius*.69,length=Math.min(height*.4,5+j%3);
   const curve=new T.CatmullRomCurve3([new T.Vector3(x+dx,height+.2,z+dz),new T.Vector3(x+dx*1.1,height-length*.5,z+dz*1.1),new T.Vector3(x+dx*1.05,height-length,z+dz*1.05)]);
   parent.add(new T.Mesh(new T.TubeGeometry(curve,8,.09,4,false),mossPaint));
   for(let k=0;k<4;k++){const p=curve.getPoint(k/4),leaf=shape(parent,'petal',0x4ca86b,p.x,p.y,p.z,.5,.20,.75);leaf.rotation.z=(j%2?1:-1)*.4;}
  }
}

export function* tropicalShore(parent,spec,canPlace,obstacles) {
  const cascades=[];
  // Irregular scalloped sandstone, warm sand, plant banks and a clear entrance.
  const outline=islandOutline(spec.kind),plate=new T.Shape(outline.map(p=>new T.Vector2(p.x,-p.y))),cap=new T.Mesh(new T.ShapeGeometry(plate),stonePaint(0xe7d3a6));cap.rotation.x=-Math.PI/2;cap.position.y=.02;cap.receiveShadow=true;parent.add(cap);
  const cliff=new T.Mesh(islandCliffGeometry(spec.kind),stonePaint(spec.kind==='canyon-rafting'?0xbf8f72:0xc4b195));cliff.castShadow=cliff.receiveShadow=true;parent.add(cliff);
  const lawn=new T.Mesh(new T.ShapeGeometry(new T.Shape(outline.map(p=>new T.Vector2(p.x*.91,-p.y*.91)))),groundPaint);lawn.rotation.x=-Math.PI/2;lawn.position.y=.05;parent.add(lawn);
  yield*floweringShore(parent,outline);
  for(let i=0;i<38;i++) {
    const a=i*Math.PI*2/38,x=Math.sin(a)*52,z=Math.cos(a)*49,r=3.2+(i%3)*.7;
    const shore=shape(parent,'stone',i%3===0?0xe8d4ae:0xc7af8a,x,-1.6,z,r,2.8+(i%4)*.6,r*.8);shore.geometry=boulderGeometry(i);shore.rotation.y=-a;shore.material=stonePaint(i%3===0?0xe8d4ae:0xc7af8a);
    if(i%3===0 && canPlace(x,.8,z,3,2,3)) flowerBank(parent,x,.2,z,i%2?0xffb3d7:0xe1a5ed,.8);
    if(i%6===0)yield;
  }
  // Background cliffs frame each ride without hiding its central silhouette.
  const garden=spec.kind==='fountain-carousel',heightScale=({'fountain-carousel':.42,'lazy-river':.58,'lagoon-launch':.4,'surf-halfpipe':.55,'pool-pendulum':.5})[spec.kind]||1;
  for(const [i,[x,z,rawHeight,r]]of [[-28,-44,29,7.3],[0,-46,37,7.2],[28,-42,33,7.1],[46,-22,21,6.5],[-47,7,18,6],[44,19,15,6]].entries()) {
    const h=rawHeight*heightScale;
    if(!canPlace(x,h/2,z,r,h/2,r))continue;
    sandstoneColumn(parent,x,z,h,r,spec.kind==='canyon-rafting'?0xbd8061:0xc5aa83);
    const length=Math.hypot(x,z),nx=-x/length,nz=-z/length,fx=x+nx*r*1.12,fz=z+nz*r*1.12;
    if(cascades.length<2&&canPlace(fx,.4,fz,4.2,1,3.4)){
     const ledge=shape(parent,'stone',0xd4c1a3,x+nx*r*.2,h-.5,z+nz*r*.2,r,.5,r*.9);ledge.geometry=boulderGeometry(i);ledge.material=stonePaint(0xd4c1a3);
     cascades.push({x:fx,z:fz,y:h,width:r*.72,angle:Math.atan2(nx,nz),spring:[x+nx*r*.35,z+nz*r*.35],radius:r*.8});
    }
    obstacles.push({x,z,radius:r*1.16});
    if(garden)tropicalTree(parent,x,h+.5,z,12+(i%2)*2,true);
    else if((i===0||i===2)&&canPlace(x,h+12,z,7.2,5,7.2))tropicalTree(parent,x,h+.5,z,14,false);
    else tropicalPalm(parent,x,h+.5,z,12+(i%2)*3,i);
    flowerBank(parent,x+1,h+.5,z+1,spec.accent,.6);
    yield;
  }
  for(let i=0;i<18;i++) {
    const a=.20+i*Math.PI*2/18,x=Math.sin(a)*43,z=Math.cos(a)*40;
    if(!dryPlantRoot(spec,x,0,z)||!canPlace(x,9,z,4,9,4))continue;
    if(garden)tropicalTree(parent,x,0,z,13+(i%3)*2,true);else tropicalPalm(parent,x,0,z,13+(i%4)*2,a);
    obstacles.push({x,z,radius:1.5});
    if(canPlace(x+3,.8,z+2,4,2,4))flowerBank(parent,x+3,.2,z+2,i%2?0xf394be:0xb69ded,.85);
    if(i%4===0)yield;
  }
  for(const side of [-1,1]) {
    const x=side*32,z=40;
    if(canPlace(x,1,z,5,3,5))flowerBank(parent,x,.3,z,0xffa1c8,1.1);
    if(canPlace(x,4,z,1,4,1))lantern(parent,x,1,z,2.3,0xffd982);
  }
  return cascades;
}
