import * as T from 'three';
import {shape, line, flowerCluster, lantern,surfaceTexture} from './fantasy-scenery.js';

// Original, static tropical scenery. These meshes are merged with the rest of
// the purchased prefab once; foliage never adds a runtime animation/upload loop.
const frondGeometry = (() => {
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, width = Math.sin(Math.PI * t) ** .65 * .17;
    for (const side of [-1, 0, 1]) {
      positions.push(side * width, Math.sin(t * Math.PI) * .2 - t * t * .27 + (side === 0 ? .025 : 0), t);
      uvs.push(side * .5 + .5, t);
    }
    if (i) for (let j = 0; j < 2; j++) {
      const k = i * 3 + j;
      indices.push(k - 3, k, k - 2, k, k + 1, k - 2);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.userData.sharedScenery = true;
  return geometry;
})();
const leafPaint = [0x209d60, 0x39b768, 0x78cf70].map(color => {
  const m = new T.MeshStandardMaterial({color, roughness:.83, side:T.DoubleSide});
  m.userData.sharedScenery = true; return m;
});
const mossPaint=new T.MeshStandardMaterial({color:0x47a358,roughness:.24,map:surfaceTexture('leaf')});
mossPaint.userData.sharedScenery=true;mossPaint.userData.surfaceKind='moss';
const rocks=new Map();
function stonePaint(color){if(!rocks.has(color)){const m=new T.MeshStandardMaterial({color,roughness:.78,map:surfaceTexture('stone')});m.userData.sharedScenery=true;m.userData.surfaceKind='stone';rocks.set(color,m);}return rocks.get(color);}
const groundPaint=new T.MeshStandardMaterial({color:0x8fc57f,roughness:.92,map:surfaceTexture('lawn')});groundPaint.userData.sharedScenery=true;groundPaint.userData.surfaceKind='lawn';

export function tropicalPalm(parent, x, y, z, height = 16, turn = 0) {
  const group = new T.Group(); group.position.set(x,y,z); group.rotation.y = turn; parent.add(group);
  const sway = height * .14;
  const trunk = new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(-sway*.2,height*.35,0),new T.Vector3(sway*.4,height*.75,0),new T.Vector3(sway,height,0)]);
  const bark = shape(group,'pole',0xaa7951,0,0,0);
  bark.geometry = new T.TubeGeometry(trunk,14,height*.037,7,false);
  for (let i=0;i<9;i++) {
    const a=i*Math.PI*2/9, leaf=new T.Mesh(frondGeometry,leafPaint[i%3]);
    leaf.position.set(sway,height,0); leaf.rotation.y=a; leaf.rotation.x=-.10+(i%3)*.07;
    leaf.scale.setScalar(height*(.56+(i%3)*.055)); leaf.castShadow=true; group.add(leaf);
  }
  for(let i=0;i<4;i++) shape(group,'sphere',0xb58450,sway+Math.sin(i*2.4)*.6,height-.6,Math.cos(i*2.4)*.6,.55,.7,.55);
  return group;
}

export function tropicalTree(parent,x,y,z,height=22,pink=false) {
  const trunk=shape(parent,'pole',0x936d4d,x,y+height*.37,z,height*.047,height*.74,height*.047);
  for(let j=0;j<7;j++) {
    const a=j*Math.PI*2/7,dx=Math.sin(a)*height*.22,dz=Math.cos(a)*height*.22;
    line(parent,[x,y+height*.4,z],[x+dx,y+height*.78,z+dz],0x936d4d,height*.023);
    shape(parent,'sphere',pink?[0xf79fc4,0xffc3dc,0xee83b5][j%3]:[0x2c9857,0x4cad59,0x7ac965][j%3],x+dx,y+height*(.79+j%2*.08),z+dz,height*.29,height*.16,height*.27);
  }
  shape(parent,'sphere',pink?0xf6b1d2:0x69bd5c,x,y+height,z,height*.28,height*.17,height*.26);
  return trunk;
}

export function flowerBank(parent,x,y,z,color=0xf29cce,scale=1) {
  for(let j=0;j<4;j++) {
    const a=j*2.4,px=x+Math.sin(a)*1.7*scale,pz=z+Math.cos(a)*1.4*scale;
    shape(parent,'sphere',j%2?0x43a564:0x72bd69,px,y+.6*scale,pz,2*scale,.8*scale,1.8*scale);
    flowerCluster(parent,px,pz,j%3===0?0xffe5ad:color,7*scale,y+.6*scale);
  }
}

export function sandstoneColumn(parent,x,z,height,radius,color=0xc5aa83) {
  for(let tier=0;tier<4;tier++) {
    const top=height*(tier+1)/4,rx=radius*(1-.07*tier),offset=Math.sin(tier*1.9)*radius*.16;
    const boulder=shape(parent,'cube',tier%2?0xdac39e:color,x+offset,top-height/8,z,rx*2,height/4+.5,rx*1.7);
    boulder.material=stonePaint(tier%2?0xdac39e:color);
    boulder.rotation.y=Math.sin(tier*2.2)*.14;
    // Cream ledges and turf stop a tall rock becoming a plain extruded pillar.
    shape(parent,'stone',0xead8b8,x+offset,top+.1,z,rx*1.04,.8,rx*.91);
    if(tier>0)for(let j=0;j<5;j++){
      const a=j*1.256+tier*.7,moss=shape(parent,'sphere',0x47a358,x+offset+Math.sin(a)*rx*.78,top+.50,z+Math.cos(a)*rx*.66,rx*.42,.48,rx*.29);
      moss.material=mossPaint;
    }
  }
  shape(parent,'sphere',0x67b868,x,height+.5,z,radius,.8,radius*.85).material=mossPaint;
}

export function* tropicalShore(parent,spec,canPlace,obstacles) {
  // Irregular scalloped sandstone, warm sand, plant banks and a clear entrance.
  shape(parent,'pole',0xb7a383,0,-2.6,0,55,4.8,53).material=stonePaint(0xb7a383);
  shape(parent,'pole',0xe7d3a6,0,-.04,0,54,.45,52).material=stonePaint(0xe7d3a6);
  shape(parent,'pole',0x8fc57f,0,.06,spec.kind==='barrel-wave'?-14:-3,spec.kind==='barrel-wave'?43:48,.28,spec.kind==='barrel-wave'?34:43).material=groundPaint;
  for(let i=0;i<38;i++) {
    const a=i*Math.PI*2/38,x=Math.sin(a)*52,z=Math.cos(a)*49,r=3.2+(i%3)*.7;
    const shore=shape(parent,'cube',i%3===0?0xe8d4ae:0xc7af8a,x,-1.6,z,r*2,3.8+(i%4),r*1.6);shore.rotation.y=-a;shore.material=stonePaint(i%3===0?0xe8d4ae:0xc7af8a);
    shape(parent,'stone',0xeedcba,x,.08,z,r*1.12,.75,r*.95);
    if(i%3===0 && canPlace(x,.8,z,3,2,3)) flowerBank(parent,x,.2,z,i%2?0xffb3d7:0xe1a5ed,.8);
    if(i%6===0)yield;
  }
  // Background cliffs frame each ride without hiding its central silhouette.
  const garden=spec.kind==='fountain-carousel',heightScale=({'fountain-carousel':.42,'lazy-river':.58,'lagoon-launch':.4,'surf-halfpipe':.55,'pool-pendulum':.5})[spec.kind]||1;
  for(const [i,[x,z,rawHeight,r]]of [[-28,-44,29,7.3],[0,-46,37,7.2],[28,-42,33,7.1],[46,-22,21,6.5],[-47,7,18,6],[44,19,15,6]].entries()) {
    const h=rawHeight*heightScale;
    if(!canPlace(x,h/2,z,r,h/2,r))continue;
    sandstoneColumn(parent,x,z,h,r,spec.kind==='canyon-rafting'?0xbd8061:0xc5aa83);
    obstacles.push({x,z,radius:r*1.16});
    if(garden)tropicalTree(parent,x,h+.5,z,12+(i%2)*2,true);else tropicalPalm(parent,x,h+.5,z,12+(i%2)*3,i);
    flowerBank(parent,x+1,h+.5,z+1,spec.accent,.6);
    yield;
  }
  for(let i=0;i<18;i++) {
    const a=.20+i*Math.PI*2/18,x=Math.sin(a)*43,z=Math.cos(a)*40;
    if(!canPlace(x,9,z,4,9,4))continue;
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
}
