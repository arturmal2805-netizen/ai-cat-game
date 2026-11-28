import * as T from 'three';
import { SQUISH_SECTORS } from './squish-interior-layout.js';

// Static additions to the existing shelf/podium batches. The caller owns every
// geometry/material via g()/mat(); there are no lights, textures or animations.
// Hook before the owner's mergedByMaterial finalization:
// yield* decorateSquishInterior({batch,g,mat,gold,cream,pink,violet,white,warm,box});
export function* decorateSquishInterior({batch,g,mat,gold,cream,pink,violet,white,warm,box}) {
  const jade=mat({color:0x568d80,roughness:.4,clearcoat:.35}),
    rose=mat({color:0xe879b0,roughness:.3,clearcoat:.7,sheen:.5,sheenColor:new T.Color(0xffc6de)}),
    jar=mat({color:0xbde9ef,roughness:.14,metalness:.05,clearcoat:1,transparent:true,opacity:.26,depthWrite:false});
  const bead=g(new T.SphereGeometry(1,8,4)),
    pot=g(new T.CylinderGeometry(1,.78,1,12)),
    straight=g(new T.CylinderGeometry(1,1,1,12)),
    leaf=g(new T.SphereGeometry(1,8,4)),
    trim=g(new T.TorusGeometry(1,.055,4,16));
  const glyphs={C:['111','100','100','100','111'],H:['101','101','111','101','101'],I:['111','010','010','010','111']};
  function paw(x,y,z,size,material){
    batch(bead,material,[x,y,z],[size*.58,size*.45,.035]);
    for(let i=0;i<4;i++){
      const a=(i-1.5)*.5;
      batch(bead,material,[x+Math.sin(a)*size*.7,y+Math.cos(a)*size*.63,z],[size*.22,size*.25,.035],[0,0,-a*.4]);
    }
  }
  function banner(x,y,z,side){
    batch(straight,gold,[x+side*1.45,6.85,z],[.045,13.7,.045]);
    batch(box,gold,[x,13.7,z],[2.95,.065,.065]);
    batch(box,gold,[x,y+1.65,z],[2.75,.1,.12]);
    batch(box,cream,[x,y,z],[2.55,3.15,.08]);
    for(const side of [-1,1]){
      batch(box,gold,[x+side*1.22,y,z+.055],[.035,3.07,.025]);
      batch(straight,gold,[x+side*.95,y+2.4,z],[.022,1.4,.022]);
      batch(bead,pink,[x+side*1.22,y-1.68,z],[.075,.18,.075]);
    }
    batch(box,gold,[x,y-1.5,z+.055],[2.45,.04,.025]);
    // Reusable real geometry spells CHICHI, avoiding twenty canvas textures.
    for(let letter=0;letter<6;letter++){
      const glyph=glyphs['CHICHI'[letter]];
      for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(glyph[row][col]==='1')
        batch(box,gold,[x+(letter-2.5)*.35+(col-1)*.085,y+.77-row*.085,z+.064],[.078,.078,.025]);
    }
    paw(x,y-.55,z+.075,.72,rose);
  }
  function gift(x,y,z,material){
    batch(box,material,[x,y,z],[.72,.62,.55]);
    batch(box,cream,[x,y+.33,z],[.77,.075,.59]);
    batch(box,gold,[x,y,z+.285],[.07,.63,.025]);
    batch(box,gold,[x,y+.375,z],[.075,.025,.6]);
    batch(box,gold,[x,y+.375,z],[.77,.025,.065]);
    for(const side of [-1,1])
      batch(trim,gold,[x+side*.12,y+.44,z],[.16,.09,.12],[Math.PI/2,0,side*.3]);
  }
  function rareJar(x,y,z,material){
    batch(straight,jar,[x,y,z],[.27,.67,.27]);
    batch(straight,gold,[x,y-.35,z],[.29,.045,.29]);
    batch(straight,gold,[x,y+.36,z],[.29,.07,.29]);
    batch(bead,material,[x,y-.06,z],[.19,.22,.19]);
    batch(bead,gold,[x,y+.46,z],[.075,.09,.075]);
  }
  function planter(x,z){
    batch(pot,cream,[x,.58,z],[.7,1.25,.7]);
    batch(straight,gold,[x,.02,z],[.58,.09,.58]);
    batch(trim,gold,[x,1.18,z],[.7,.7,.7],[Math.PI/2,0,0]);
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7;
      batch(leaf,jade,[x+Math.cos(a)*.36,1.68+(i%2)*.22,z+Math.sin(a)*.36],[.16,.76,.065],[Math.sin(a)*.65,0,-Math.cos(a)*.65]);
    }
    for(let flower=0;flower<3;flower++){
      const a=flower*Math.PI*2/3,fx=x+Math.cos(a)*.3,fz=z+Math.sin(a)*.3,fy=2.15+flower*.18;
      batch(straight,jade,[fx,(1.2+fy)/2,fz],[.025,fy-1.2,.025]);
      for(let petal=0;petal<5;petal++){
        const p=petal*Math.PI*2/5;
        batch(bead,flower===1?pink:rose,[fx+Math.cos(p)*.18,fy,fz+Math.sin(p)*.18],[.16,.09,.16]);
      }
      batch(bead,warm,[fx,fy+.035,fz],[.08,.07,.08]);
    }
  }
  for(const sector of SQUISH_SECTORS){
    const {x,z}=sector;
    // Rear riser ledges sit above, and behind, the two existing toy rows.
    // Neither the 2220 toy instances nor their shelf transforms are touched.
    for(let tier=0;tier<3;tier++){
      const y=3.25+tier*2.4;
      batch(box,cream,[x,y,z-8.76],[13.4,.11,.55]);
      batch(box,gold,[x,y-.09,z-8.46],[13.4,.055,.035]);
      for(const side of [-1,1]){
        gift(x+side*4.9,y+.38,z-8.73,tier===1?violet:pink);
        rareJar(x+side*1.65,y+.42,z-8.73,tier===1?white:rose);
      }
    }
    for(const side of [-1,1]){
      // Shelf endpoints and existing side podiums, outside the live toy approach.
      planter(x+side*8.9,z-7.9);
      banner(x+side*11,10.6,z-9.65,side);
      const px=x+side*7.1,pz=z+1.45;
      batch(straight,gold,[px,2.155,pz],[.32,.04,.32]);
      for(let towel=0;towel<2;towel++)
        batch(straight,towel?pink:white,[px,2.28+towel*.17,pz],[.105,.45,.105],[0,0,Math.PI/2]);
      batch(box,gold,[x+side*6.5,2.37,z+2.92],[.65,.4,.04]);
      paw(x+side*6.5,2.36,z+2.96,.12,rose);
    }
    yield;
  }
  return {sectors:SQUISH_SECTORS.length,gifts:60,rareJars:60,planters:20,banners:20,static:true};
}
