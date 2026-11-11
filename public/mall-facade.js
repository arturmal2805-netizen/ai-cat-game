import * as T from 'three';
import {MALL_LAYOUT} from './mall-layout.js';

// The mascot is volumetric architecture: bevelled ears, reflective inner ear
// glass and layered neon on the actual curved dome, with no decal backdrop.
export function* mallMascotSteps(parent,kit,top){
  const {mesh,tube,orb,mats,glassMat}=kit,z=MALL_LAYOUT.z,r=59.6,height=28;
  const pearl=new T.MeshStandardMaterial({color:0xbdeff4,roughness:.18,metalness:.5,emissive:0x22649a,emissiveIntensity:.25});
  const front=(x,y,extra=.8)=>z+r*Math.sqrt(Math.max(.01,1-(x/r)**2-((y-top)/height)**2))+extra;
  for(const side of [-1,1]){
    yield;
    const outer=new T.Shape();outer.moveTo(24,14);outer.bezierCurveTo(25,22,30,34,34.7,37);outer.bezierCurveTo(40,35.5,49,24,53,16);outer.quadraticCurveTo(38,13,24,14);outer.closePath();
    const shell=new T.ExtrudeGeometry(outer,{depth:2.0,bevelEnabled:true,bevelSize:1.1,bevelThickness:.65,bevelSegments:5,curveSegments:32});
    const ear=mesh(parent,shell,pearl,0,top,z+4);ear.scale.x=side;
    const inner=new T.Shape();inner.moveTo(28,17);inner.bezierCurveTo(29,23,32,30,35,32.5);inner.bezierCurveTo(39,30,44,23,47,18);inner.quadraticCurveTo(37,16,28,17);inner.closePath();
    const inlay=new T.ExtrudeGeometry(inner,{depth:.2,bevelEnabled:true,bevelSize:.2,bevelThickness:.2,bevelSegments:3,curveSegments:24});
    const inset=mesh(parent,inlay,glassMat,0,top,z+6.8);inset.scale.x=side;
    const points=inner.getPoints(64).slice(0,-1).map(p=>[side*p.x,top+p.y,z+7.2]);
    tube(parent,points,.19,mats.pink,true);tube(parent,points,.7,mats.haloPink,true);
    // Smiling closed eyes follow the dome's ellipsoid, rather than hanging
    // behind its glazing as thin straight segments.
    const eye=[];
    for(let i=0;i<=32;i++){const t=i/32,x=side*(6.5+t*14),y=top+13.5+Math.sin(t*Math.PI)*3.7;eye.push([x,y,front(x,y)]);}
    tube(parent,eye,.26,mats.pink);tube(parent,eye.map(([x,y,z])=>[x,y,z+.28]),.20,mats.pink);tube(parent,eye.map(([x,y,z])=>[x,y,z+.29]),.85,mats.haloPink);
    for(let j=0;j<3;j++){
      const whisker=[];for(let i=0;i<=16;i++){const t=i/16,x=side*(9+t*(13+j)),y=top+9.3-j*2+(t-.5)*(j-1)*1.5;whisker.push([x,y,front(x,y,1.0)]);}
      tube(parent,whisker,.11,mats.pink);tube(parent,whisker,.46,mats.haloPink);
    }
    const mouth=[];for(let i=0;i<=24;i++){const t=i/24,x=side*t*5.2,y=top+8.8-Math.sin(t*Math.PI)*2;mouth.push([x,y,front(x,y,1.1)]);}
    tube(parent,mouth,.17,mats.pink);tube(parent,mouth,.63,mats.haloPink);
  }
  const nose=new T.Shape();nose.moveTo(-1.5,.6);nose.quadraticCurveTo(0,1.3,1.5,.6);nose.quadraticCurveTo(1.2,-.2,0,-1.2);nose.quadraticCurveTo(-1.2,-.2,-1.5,.6);nose.closePath();
  mesh(parent,new T.ExtrudeGeometry(nose,{depth:.32,bevelEnabled:true,bevelSegments:4,bevelSize:.15,bevelThickness:.15,curveSegments:24}),mats.pink,0,top+10,front(0,top+10,1.25));
}

// Distinct public fronts for each use. These are actual walkable-floor fittings
// outside the reserved gallery lanes, not seven recoloured copies of one room.
export function* mallGalleryIdentitySteps(parent,floor,kit){
  const {cube,disk,orb,tube,ring,mesh,mats,glassMat,chair,plant}=kit;
  const galleryRoot=parent;
  for(const side of [-1,1]){
    yield;parent=new T.Group();parent.position.z=side<0?-3:0;galleryRoot.add(parent);
    const slots=side<0?[52,94]:[65,82];
    if(floor.id===2){
      // Luxury avenue: floral urns, polished arches and lounge islands.
      for(const x of slots){
        const g=new T.Group();g.position.set(side*x,0,96);parent.add(g);
        disk(g,mats.white,0,.48,0,.72,.9);ring(g,0,.96,0,.74,mats.gold,.06);
        for(let j=0;j<13;j++){const a=j*2.399,r=.2+Math.sqrt(j/13)*.65;orb(g,j%3?mats.haloPink:mats.white,Math.cos(a)*r,1.5+j%3*.18,Math.sin(a)*r,.24);}
      }
      const a=side*(side<0?94:73);
      tube(parent,[[a-5,.15,97.5],[a-5,4,97.5],[a,6.3,97.5],[a+5,4,97.5],[a+5,.15,97.5]],.13,mats.white).userData.mallCollisionHandledByPosts=true;
      for(const x of [a-5,a+5])cube(parent,mats.white,x,2,97.5,.35,4,.35);
      tube(parent,[[a-4.8,.15,97.6],[a-4.8,4,97.6],[a,6.1,97.6],[a+4.8,4,97.6],[a+4.8,.15,97.6]],.045,mats.gold);
    }else if(floor.id===3){
      // Restaurant terraces: parasols and little dining courts.
      for(const x of slots){
        disk(parent,mats.white,side*x,.95,96,1.15,.12);disk(parent,mats.gold,side*x,.48,96,.065,.9);
        chair(parent,side*x-1.6,96,mats.red,.65,Math.PI/2);chair(parent,side*x+1.6,96,mats.red,.65,-Math.PI/2);
        const parasol=mesh(parent,new T.ConeGeometry(2.3,.9,12,1,true),mats.warm,side*x,4.3,96);parasol.rotation.y=x*.1;
        disk(parent,mats.gold,side*x,2.15,96,.04,4.3);ring(parent,side*x,3.85,96,2.3,mats.gold,.035);
      }
    }else if(floor.id===4){
      // The cinema's bulb-lined marquee and arcade light sculptures.
      const x=side*(side<0?94:73);
      cube(parent,mats.navy,x,6.1,96,18,.7,2.2);
      for(let i=0;i<28;i++)orb(parent,i%2?mats.gold:mats.pink,x-8.3+i*.615,5.75,97.15,.12);
      for(const px of [x-6,x+6]){
        disk(parent,mats.navy,px,.9,96,.9,1.7);
        const g=new T.Group();g.position.set(px,2.2,96);parent.add(g);
        orb(g,mats.purple,0,0,0,.95,.4,.43);for(const dx of [-.4,.4])orb(g,mats.white,dx,.15,.35,.10);
        cube(g,mats.cyan,-.38,.02,.45,.42,.08,.025);cube(g,mats.cyan,-.38,.02,.45,.08,.42,.025);
      }
    }else if(floor.id===5){
      // A timber book-and-home promenade, with open reading niches.
      for(const x of slots){
        const g=new T.Group();g.position.set(side*x,0,96.6);parent.add(g);
        cube(g,mats.warm,0,1.55,0,3.4,3.0,.9);
        for(let row=0;row<4;row++){
          cube(g,mats.gold,0,.35+row*.72,.47,3.3,.07,.05);
          for(let j=0;j<7;j++)cube(g,[mats.red,mats.white,mats.green][j%3],-1.2+j*.4,.64+row*.72,.2,.25,.52,.5);
        }
      }
    }else if(floor.id===6){
      // Hanging ocean garden: layered curved planters, vines and jelly lanterns.
      for(const x of slots){
        const g=new T.Group();g.position.set(side*x,0,96);parent.add(g);plant(g,0,0,1.05);
        for(let j=0;j<7;j++){
          const a=j*2.399,px=Math.cos(a)*1.4,pz=Math.sin(a)*1.0;
          tube(g,[[px,6.9,pz],[px*.9,5.3,pz],[px+.35,3.8,pz+.18]],.045,mats.green);
          for(let k=0;k<4;k++)orb(g,mats.green,px+Math.sin(k)*.13,4.1+k*.5,pz,.17,.28,.09);
        }
        const bell=mesh(g,new T.SphereGeometry(.8,24,12,0,Math.PI*2,0,Math.PI/2),glassMat,0,5.7,0,1,.6,1);
        ring(g,0,5.7,0,.8,mats.pink,.04);
        for(let j=0;j<8;j++){const a=j*Math.PI/4;tube(g,[[Math.cos(a)*.6,5.7,Math.sin(a)*.6],[Math.cos(a+.3)*.45,5.0,Math.sin(a+.3)*.45],[Math.cos(a-.2)*.3,4.4,Math.sin(a-.2)*.3]],.025,mats.cyan);}
      }
    }else if(floor.id===7){
      // Observatory instruments and luminous orbital sculptures.
      for(const x of slots){
        const g=new T.Group();g.position.set(side*x,0,96);parent.add(g);disk(g,mats.navy,0,.15,0,1.25,.25);
        for(const a of [0,Math.PI*2/3,Math.PI*4/3])tube(g,[[0,2.5,0],[Math.sin(a)*1.1,.2,Math.cos(a)*1.1]],.06,mats.gold);
        const scope=new T.Group();scope.position.y=2.5;scope.rotation.z=.7;g.add(scope);
        const lens=mesh(scope,new T.CylinderGeometry(.38,.5,2.4,32),mats.white);lens.rotation.x=Math.PI/2;
        const glass=mesh(scope,new T.CircleGeometry(.36,32),glassMat,0,0,1.21);ring(g,0,4.6,0,1.3,mats.cyan,.045);
      }
    }
  }
}
