import * as T from 'three';
import {MALL_LAYOUT} from './mall-layout.js';
import {batchModelSteps} from './model-batching.js';

// A genuine multi-storey jellyfish tank in the open atrium. Its five authored
// animals use fixed geometry and the mall's shared clock, with no pose uploads.
export function* mallAquariumSteps(kit){
  const {mesh,disk,orb,ring,tube,mats,glassMat,clock}=kit,source=new T.Group(),animals=new T.Group(),radius=6.3,height=MALL_LAYOUT.rise*6+6.4;
  disk(source,mats.navy,0,.3,0,radius+.8,.6);disk(source,mats.white,0,.66,0,radius+.3,.14);
  mesh(source,new T.CylinderGeometry(radius,radius,height,96,1,true),glassMat,0,height/2+.7,0);
  for(let floor=0;floor<=6;floor++){
    yield;const y=floor*MALL_LAYOUT.rise+.85;
    ring(source,0,y,0,radius+.03,floor%2?mats.pink:mats.cyan,.055);
  }
  ring(source,0,height+.7,0,radius+.1,mats.gold,.12);
  for(const side of [-1,1])tube(source,[[side*4.5,.7,side*4.5],[side*4.5,height+.7,side*4.5]],.065,mats.gold);
  const sand=new T.MeshStandardMaterial({color:0xd4ece6,roughness:.85});disk(source,sand,0,.8,0,radius-.08,.12);
  for(let j=0;j<21;j++){
    yield;const a=j*2.399,r=1.1+Math.sqrt(j/21)*4;
    const g=new T.Group();g.position.set(Math.cos(a)*r,.9,Math.sin(a)*r);source.add(g);
    for(let k=0;k<5;k++){const c=a+k*1.256;const p=[[0,0,0],[Math.sin(c)*.25,.6+k*.04,Math.cos(c)*.25],[Math.sin(c)*.6,1.2+k*.07,Math.cos(c)*.6]];tube(g,p,.045,j%3?mats.purple:mats.cyan);orb(g,mats.white,p[2][0],p[2][1],p[2][2],.08);}
  }
  for(let j=0;j<5;j++){
    yield;const g=new T.Group(),a=j*2.399,scale=.85+(j%3)*.15;g.position.set(Math.cos(a)*2.3,7+j*10.6,Math.sin(a)*2.3);g.scale.setScalar(scale);animals.add(g);
    const flesh=new T.MeshStandardMaterial({color:j%2?0xcdb4f5:0x9aebf7,emissive:j%2?0x6d32ad:0x176d9e,emissiveIntensity:.65,roughness:.18,metalness:.1,transparent:true,opacity:.69,depthWrite:false,side:T.DoubleSide});
    const pulse=(material,tentacle=false)=>{
      material.onBeforeCompile=s=>{s.uniforms.uMallJellyClock=clock;s.vertexShader='uniform float uMallJellyClock;\n'+s.vertexShader;
        s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
          float jellyPhase=uMallJellyClock*.85+${(j*1.71).toFixed(3)};
          ${tentacle?'float flex=clamp(-position.y/5.,0.,1.);transformed.x+=sin(jellyPhase+position.y*.55)*flex*.38;transformed.z+=cos(jellyPhase*.8+position.y*.45)*flex*.31;':'transformed.xz*=1.+sin(jellyPhase)*.075;transformed.y*=1.-sin(jellyPhase)*.09;'}
          transformed.y+=sin(jellyPhase*.6)*.32;`);
      };material.customProgramCacheKey=()=>`mall-jelly-${tentacle?'arms':'bell'}-${j}`;return material;
    };
    const bellGeometry=new T.SphereGeometry(1.65,48,24,0,Math.PI*2,0,Math.PI*.56),p=bellGeometry.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),angle=Math.atan2(z,x),edge=Math.max(0,1-y/1.65);p.setY(i,y*.58+Math.sin(angle*12)*edge**3*.09);}
    bellGeometry.computeVertexNormals();mesh(g,bellGeometry,pulse(flesh),0,0,0);
    const organ=orb(g,mats.pink,0,.25,0,.46,.22,.46);organ.material=mats.haloPink;
    const arms=new T.Group(),armMaterial=pulse(new T.MeshStandardMaterial({color:0xb8f4ff,emissive:0x2183b8,emissiveIntensity:.5,roughness:.34}),true);
    for(let i=0;i<18;i++){const angle=i*Math.PI/9,points=[];for(let k=0;k<=16;k++){const t=k/16,r=(1-t*.55)*1.35;points.push([Math.cos(angle+t*.7)*r,-.1-t*(3.5+i%4*.4),Math.sin(angle+t*.7)*r]);}tube(arms,points,.025+i%3*.008,armMaterial);}
    const fixed=yield* batchModelSteps(arms);g.add(fixed);
  }
  const fixed=yield* batchModelSteps(source,{combineColors:true}),root=new T.Group();root.position.set(0,MALL_LAYOUT.y,MALL_LAYOUT.z);root.add(fixed,animals);return root;
}
