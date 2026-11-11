import {mallConveyorSteps} from './mall-conveyor.js';
import {mallFitoutSteps} from './mall-fitout.js';
import {mallSurfaceMaps} from './mall-surfaces.js';
import {MALL_PRODUCTS} from './mall-data.js';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeAttraction} from './world-assets.js';
import {courtFood} from './foodcourt-assets.js';
const nativeProps=new Map();
function nativeProp(id){if(!nativeProps.has(id))nativeProps.set(id,makeAttraction(id));return nativeProps.get(id).clone(true);}

// These are actual shop fittings and merchandise. Every category has its own
// working counter, storage, lighting and display arrangement, with the public
// centre aisle and side route kept open for native visitors.
export function mallFixtureLibrary(g,s,h){
  const {cube,orb,disk,tube,ring,mesh,mats,glassMat,chair,plant,getSurface,labelText,motion,clock}=h;
  const colors={ivory:0xe8dcc1,ink:0x172d45,rose:0xbc718d,coral:0xdb695e,fern:0x326953,leather:0x8d5139,
    oak:0xa77b4d,red:0xbe404c,blue:0x498cb6,lilac:0xa78ac1,gold:0xe8bf76,white:0xf5efe6};
  const paints=new Map();
  const paint=key=>{
    if(paints.has(key))return paints.get(key);
    const name=String(key).replace(/^(cloth|leather)-/,''),leather=key==='leather'||String(key).startsWith('leather-');
    const cloth=String(key).startsWith('cloth-')||['rose','fern','lilac'].includes(key);
    const maps=getSurface(leather?'leather':cloth?'fabric':key==='oak'?'warm':'metal');
    const material=new T.MeshStandardMaterial({color:colors[name]||name,roughness:cloth?.95:leather?.65:.53,metalness:key==='gold'?.78:key==='ink'?.42:.04,...maps,normalScale:new T.Vector2(leather?.14:.25,leather?.14:.25)});
    paints.set(key,material);return material;
  };
  const rounded=new RoundedBoxGeometry(1,1,1,2,.1);rounded.userData.sharedScenery=true;
  const soft=(p,m,x,y,z,sx,sy,sz)=>mesh(p,rounded,m,x,y,z,sx,sy,sz);
  function plinth(x,z,width=2){soft(g,paint('ivory'),x,.48,z,width,.8,1.15);cube(g,mats.gold,x,.1,z,width+.08,.035,1.2);}
  function bottle(p,x,y,z,m=paint('rose')){disk(p,m,x,y,z,.13,.34);disk(p,mats.gold,x,y+.2,z,.09,.08);orb(p,mats.white,x-.035,y+.03,z+.12,.025,.12,.01);}
  const bagShapes=new Map();
  function bag(p,x,y,z,scale=1){
    const b=new T.Group(),variant=Math.abs(Math.round(x*3+y*7))%3;
    b.position.set(x,y,z);b.scale.setScalar(scale);p.add(b);
    const tone=s.key==='prada'?'ink':s.key==='gucci'?'fern':s.key==='chanel'?'ivory':'leather';
    const material=paint('leather-'+tone),trim=paint('gold');
    if(!bagShapes.has(variant)){
      const shape=new T.Shape();shape.moveTo(-.34,.05);shape.bezierCurveTo(-.43,.05,-.47,.12,-.43,.28);
      shape.lineTo(variant===1?-.32:-.36,.67);shape.quadraticCurveTo(0,variant===1?.78:.72,variant===1?.32:.36,.67);
      shape.lineTo(.43,.28);shape.bezierCurveTo(.47,.12,.43,.05,.34,.05);shape.closePath();
      const geometry=new T.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:true,bevelThickness:.04,bevelSize:.035,bevelSegments:3,curveSegments:8,steps:1});geometry.translate(0,0,-.16);geometry.userData.sharedScenery=true;bagShapes.set(variant,geometry);
    }
    mesh(b,bagShapes.get(variant),material);
    for(const side of [-1,1]){
      tube(b,[[side*.3,.1,.205],[side*.4,.18,.205],[side*.34,.62,.205],[side*.23,.66,.205]],.005,paint('ivory'));
      for(const front of [-1,1]){
        const clasp=mesh(b,new T.TorusGeometry(.065,.012,6,16),trim,side*.25,.67,front*.16);clasp.rotation.y=.08;
      }
    }
    for(const front of [-1,1])tube(b,[[-.25,.7,front*.14],[-.28,variant===0?1.28:1.04,front*.14],[.28,variant===0?1.28:1.04,front*.14],[.25,.7,front*.14]],.025,material);
    if(variant===1){soft(b,material,0,.59,.20,.61,.21,.045);tube(b,[[-.28,.5,.23],[0,.46,.24],[.28,.5,.23]],.005,paint('ivory'));}
    if(s.key==='chanel')for(let j=-2;j<=2;j++)for(const side of [-1,1]){
      const x1=Math.max(-.3,j*.17-.2),x2=Math.min(.3,j*.17+.2);
      tube(b,[[x1,.2+(x1-j*.17)*side,.207],[x2,.2+(x2-j*.17)*side,.207]],.003,paint('gold'));
    }
    soft(b,trim,0,.42,.235,.13,.11,.035);orb(b,trim,0,.52,.239,.035,.028,.02);
    for(const dx of [-.055,-.02,.02,.055])orb(b,trim,dx,.56+(.055-Math.abs(dx))*.5,.239,.014,.019,.012);
  }
  function garment(p,x,y,z,index=0){
    const group=new T.Group();group.position.set(x,y,z);p.add(group);
    const cloth=paint('cloth-'+['ivory','rose','fern','ink'][index%4]);
    const shape=new T.Shape();shape.moveTo(-.29,-.42);shape.lineTo(.29,-.42);shape.quadraticCurveTo(.32,-.08,.30,.16);
    shape.lineTo(.45,-.09);shape.lineTo(.61,.02);shape.lineTo(.42,.40);shape.lineTo(.18,.48);shape.quadraticCurveTo(0,.25,-.18,.48);
    shape.lineTo(-.42,.40);shape.lineTo(-.61,.02);shape.lineTo(-.45,-.09);shape.lineTo(-.30,.16);shape.quadraticCurveTo(-.32,-.08,-.29,-.42);shape.closePath();
    const geometry=new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSize:.045,bevelThickness:.045,bevelSegments:3,curveSegments:8});geometry.translate(0,0,-.06);mesh(group,geometry,cloth);
    for(const side of [-1,1])tube(group,[[side*.26,-.37,.12],[side*.24,-.08,.12],[side*.27,.13,.12]],.005,paint('ivory'));
    tube(group,[[-.27,-.38,.12],[0,-.39,.12],[.27,-.38,.12]],.006,paint('ivory'));
    cube(group,mats.gold,0,-.01,.12,.012,.65,.016);for(let j=0;j<4;j++)orb(group,paint('gold'),.05,.17-j*.15,.13,.018);
    tube(group,[[-.36,.45,0],[0,.69,0],[.36,.45,0]],.017,paint('gold'));
    tube(group,[[0,.68,0],[0,.8,0],[.065,.85,0],[.10,.79,0]],.016,paint('gold'));
  }
  function rack(x,z){for(const side of [-1,1])cube(g,mats.gold,x+side*1.4,1.6,z,.055,3,.055);cube(g,mats.gold,x,3.1,z,2.9,.055,.055);for(let j=0;j<5;j++)garment(g,x-1+j*.5,2.3,z,j);}
  function upholsteredBench(x,z,material=paint('rose')){soft(g,material,x,.52,z,2.6,.4,1.15);for(const side of [-1,1])cube(g,mats.gold,x+side*.95,.22,z,.06,.55,.6);}
  function touchscreen(p,x,y,z){soft(p,paint('ink'),x,y,z,.75,.9,.1);cube(p,mats.cyan,x,y,z+.06,.64,.72,.012);for(let j=0;j<4;j++)cube(p,j%2?mats.gold:mats.pink,x-.2+(j%2)*.3,y+.2-Math.floor(j/2)*.3,z+.08,.18,.16,.012);}
  function foodOnPlate(p,x,y,z,kind='sushi',scale=1){disk(p,mats.white,x,y-.02,z,.42*scale,.04);const food=courtFood(kind);food.scale.setScalar(scale);food.position.set(x,y,z);p.add(food);}
  function cafeTable(x,z,style=0){disk(g,paint(style?'oak':'ivory'),x,.95,z,1.08,.13);disk(g,mats.gold,x,.48,z,.07,.9);disk(g,paint('ink'),x,.09,z,.52,.08);
    chair(g,x,z+1.6,paint(style?'cloth-fern':'cloth-rose'),.65,Math.PI);bottle(g,x,.98,z,paint('fern'));foodOnPlate(g,x+.36,1.04,z,'sushi',.45);}
  function kitchen(){
    for(const x of [-3.8,3.8]){soft(g,paint('ink'),x,1.05,-3.1,2.2,1.8,1.5);cube(g,mats.white,x,2.03,-3.1,2.3,.12,1.7);}
    for(const x of [-3,-1,1,3]){cube(g,mats.gold,x,1.02,-2.29,1.8,.04,.025);cube(g,mats.gold,x,1.75,-2.29,.5,.04,.025);}
    for(let j=0;j<8;j++)cube(g,paint(j%2?'ivory':'white'),-4+j*1.15,3.3,-4.26,1.1,1.8,.1);
    const hood=soft(g,paint('ink'),0,4.65,-3.25,5,.65,1.9);cube(g,mats.gold,0,4.28,-2.4,4.8,.05,.07);
    for(const x of [-3.8,3.8]){disk(g,paint('ink'),x,2.12,-3,.64,.08);disk(g,paint('ivory'),x,2.4,-3,.53,.5);ring(g,x,2.68,-3,.55,mats.gold,.035);}
    for(const x of [-3.8,3.8]){
      soft(g,paint('ink'),x,1.12,-2.29,1.62,1.08,.06);cube(g,glassMat,x,1.12,-2.25,1.38,.79,.025);cube(g,mats.gold,x,1.68,-2.20,1.1,.045,.04);
      for(let k=0;k<4;k++)disk(g,mats.gold,x-.55+k*.36,1.93,-2.18,.045,.04).rotation.x=Math.PI/2;
      for(let k=0;k<7;k++)cube(g,paint('ink'),x-.65+k*.22,.38,-2.25,.09,.14,.03);
      const handle=mesh(g,new T.TorusGeometry(.18,.035,6,18,Math.PI),mats.gold,x,2.4,-2.5);handle.rotation.y=Math.PI/2;
      disk(g,mats.white,x,2.7,-3,.5,.04);orb(g,mats.gold,x,2.77,-3,.08,.05,.08);
    }
    tube(g,[[-3.6,2.1,-3.55],[-3.6,2.7,-3.55],[-3.2,2.9,-3.55],[-3,2.6,-3.55]],.04,mats.gold);
    for(const x of [-4,4]){soft(g,paint('ivory'),x,2.95,-3.6,1.5,1.55,.7);cube(g,mats.gold,x,2.98,-3.21,.05,1.2,.03);for(let k=0;k<6;k++)cube(g,paint('ink'),x-.5+k*.2,2.3,-3.21,.08,.12,.015);bottle(g,x+.42,3.8,-3.6,paint('fern'));}
  }
  return {paint,soft,plinth,bottle,bag,garment,rack,upholsteredBench,touchscreen,foodOnPlate,cafeTable,kitchen,nativeProp};
}

export function* mallInteriorSteps(g,s,h){
  const {cube,orb,disk,tube,ring,mesh,mats,glassMat,chair,plant,getSurface,labelText,motion,clock}=h;
  const {paint,soft,plinth,bottle,bag,garment,rack,upholsteredBench,touchscreen,foodOnPlate,cafeTable,kitchen,nativeProp}=mallFixtureLibrary(g,s,h);
  yield;
  if(s.kind==='fashion'){
    const luxury=['vuitton','gucci','prada','chanel'].includes(s.key),back=paint(s.key==='gucci'?'fern':s.key==='chanel'?'ink':'ivory');
    cube(g,back,0,.65,-4.13,11.9,1,.17);
    for(let j=0;j<7;j++)cube(g,mats.gold,-5.5+j*1.84,2.7,-4, .035,4.3,.03);
    for(const x of [-4,0,4])for(const y of [1,2.4,3.8]){plinth(x,-3.5,1.5);if(s.key==='nike'){
      const shoe=new T.Group();shoe.position.set(x,y,-3.25);g.add(shoe);soft(shoe,paint('white'),0,.1,0,.9,.25,.45);orb(shoe,paint('rose'),-.25,.23,0,.3,.18,.23);cube(shoe,mats.cyan,.1,.22,.23,.25,.05,.02);for(let k=0;k<3;k++)cube(shoe,mats.gold,-.12+k*.12,.28,0,.04,.02,.3);
    }else if(s.key==='chanel'){
      const bust=orb(g,paint('ivory'),x,y,-3.5,.35,.5,.26);const necklace=mesh(g,new T.TorusGeometry(.3,.025,6,24),mats.gold,x,y+.1,-3.2);necklace.rotation.x=.2;orb(g,mats.pink,x,y-.18,-3.15,.075,.11,.07);
    }else bag(g,x,y-.2,-3.1,.75);}
    yield;
    for(const x of [-3.5,3.5]){plinth(x,.5,2);bag(g,x,1.1,.5,1);if(s.key==='gucci'||s.key==='prada'||s.key==='fashion')rack(x,-2.7);}
    if(luxury){upholsteredBench(-2.5,3);upholsteredBench(2.5,3);}
    for(const x of [-5,5]){const mirror=soft(g,paint('ink'),x,2.65,-1,.9,3.5,.14);cube(g,glassMat,x,2.65,-.91,.82,3.4,.025);}
  }else if(s.kind==='food'){
    kitchen();yield;
    const cafe=['star','cafe','sky-cafe','restaurant'].includes(s.key),accent=paint(cafe?'fern':s.key==='ice'?'lilac':s.key==='bakery'?'rose':'red');
    soft(g,accent,0,.43,.65,4.8,.8,1.25);cube(g,mats.white,0,.88,.65,5,.1,1.4);
    for(const x of [-1.8,1.8]){const terminal=new T.Group();terminal.position.set(x,.98,.45);terminal.scale.setScalar(.55);g.add(terminal);touchscreen(terminal,0,.32,0);}
    const menu=new T.Group();menu.position.set(-5.15,3.45,-.3);menu.rotation.y=.12;g.add(menu);soft(menu,paint('ink'),0,0,0,3.35,2.5,.16);
    labelText(menu,'CAT SAFE MENU',0,.92,.1,3.05,.42);
    const products=MALL_PRODUCTS.filter(p=>p.storeId===s.id);products.slice(0,3).forEach((p,i)=>labelText(menu,`${p.name} · ${p.price}`,0,.34-i*.55,.11,3.08,.45));
    for(const x of [-3.65,3.65])cafeTable(x,1.3,cafe?1:0);
    if(s.key==='sushi'){
      // A real oval conveyor, animated with fixed GPU instances.
      const conveyor=new T.Group();conveyor.position.set(-3.4,.9,-1.4);g.add(conveyor);disk(conveyor,paint('ink'),0,0,0,2.5,.2).scale.z=.48;
      const dishes=yield* mallConveyorSteps(clock);dishes.position.copy(conveyor.position);motion.add(dishes);
      ring(conveyor,0,.25,0,2.5,mats.gold,.025);
    }else if(s.key==='bakery'||s.key==='ice'){
      const display=new T.Group();display.position.set(-3.8,1.9,-1);display.scale.setScalar(.7);g.add(display);cube(display,glassMat,0,.6,0,4.6,1.2,1.2);
      for(let i=0;i<8;i++){const x=-1.7+(i%4)*1.1,z=i<4?-.3:.3;
        if(s.key==='ice'){disk(display,mats.white,x,.1,z,.35,.15);for(const side of [-1,0,1])orb(display,paint(['rose','ivory','lilac'][side+1]),x+side*.12,.42,z,.18);}
        else{foodOnPlate(display,x,.2,z,'cake',.8);for(let j=0;j<4;j++)orb(display,mats.gold,x+(j-1.5)*.08,.65,z+.1,.035);}
      }
    }else if(cafe){
      for(const x of [-1.4,0,1.4]){soft(g,paint('ink'),x,2.65,-3,.75,1,.6);cube(g,mats.gold,x,2.7,-2.66,.5,.3,.06);bottle(g,x,2.1,-2.5,paint('ivory'));}
      for(let i=0;i<12;i++){const x=-4.5+i%6*.55,y=2.5+Math.floor(i/6)*.5;bottle(g,x,y,-3.1,accent);}
    }else{
      for(let i=0;i<6;i++)foodOnPlate(g,-2+i*.8,1.02,.95,s.key==='kfc'?'burger':'burger',.7);
      for(const x of [-2.5,2.5]){disk(g,accent,x,1.22,.9,.19,.42);ring(g,x,1.45,.9,.2,mats.gold,.025);}
    }
    for(let j=0;j<4;j++)cube(g,mats.gold,-4.5+j*3,4.3,-3.9,2.3,.07,.07);
  }else if(s.kind==='home'){
    const room=new T.Group();room.position.set(-2.4,.25,.6);g.add(room);const bed=nativeProp('bed');bed.scale.setScalar(.85);room.add(bed);
    soft(g,paint('fern'),2.7,.75,.3,2.7,.65,1.45);soft(g,paint('fern'),2.7,1.35,-.3,2.7,1.2,.3);
    for(const x of [1.6,3.8])soft(g,paint('ivory'),x,1.15,.15,.6,.35,.6);
    disk(g,paint('oak'),2.7,.7,2,1.05,.16);disk(g,mats.gold,2.7,.38,2,.05,.65);
    for(const x of [-4.3,4.3]){cube(g,paint('oak'),x,1.65,-3.4,2.2,3.2,1.1);for(let j=0;j<5;j++){cube(g,paint('ivory'),x,.5+j*.55,-2.82,2.1,.08,.9);for(let k=0;k<4;k++)cube(g,paint(['rose','fern','ink','gold'][k]),x-.7+k*.45,.7+j*.55,-2.65,.28,.4,.25);}}
    const lamp=mesh(g,new T.ConeGeometry(.7,.8,32,1,true),mats.warm,4.5,3.5,2);disk(g,mats.gold,4.5,1.8,2,.04,3.2);disk(g,paint('ink'),4.5,.22,2,.6,.1);
  }else if(s.kind==='toy'||s.kind==='gadget'||s.kind==='book'){
    const maker=s.key==='lego',tech=s.kind==='gadget';
    for(const x of [-3.5,0,3.5]){plinth(x,.5,2.7);if(tech){for(let j=0;j<3;j++)touchscreen(g,x+(j-1)*.65,1.3,.5);}
      else if(maker){for(let j=0;j<18;j++){const px=x+(j%3-1)*.5,y=1+(Math.floor(j/3)%3)*.3,pz=.2+Math.floor(j/9)*.5;soft(g,paint(['coral','fern','blue','gold','ivory'][j%5]),px,y,pz,.45,.25,.45);for(const dx of [-.1,.1])for(const dz of [-.1,.1])disk(g,paint(['coral','fern','blue','gold','ivory'][j%5]),px+dx,y+.16,pz+dz,.065,.06);}}
      else if(s.kind==='book'){for(let j=0;j<6;j++){const b=soft(g,paint(['ink','rose','fern'][j%3]),x-.8+j*.3,1.15,.5,.23,.75,.65);b.rotation.z=(j-2)*.04;cube(g,mats.gold,x-.8+j*.3,1.2,.84,.13,.04,.02);}}
      else{const toy=nativeProp(x<0?'yarn':x>0?'mouse':'feather');toy.scale.setScalar(.55);toy.position.set(x,.9,.5);g.add(toy);}
    }
    if(s.kind==='book')for(let j=0;j<3;j++){const x=(j-1)*3.8;cube(g,paint('oak'),x,2.4,-3.5,3.2,4.2,.8);for(let row=0;row<5;row++){cube(g,mats.gold,x,.6+row*.85,-3,3.1,.05,.9);for(let k=0;k<9;k++)cube(g,paint(['rose','fern','blue','ivory'][k%4]),x-1.25+k*.3,.95+row*.85,-3.05,.22,.65,.5);}}
    if(tech){cube(g,paint('ink'),0,3,-3.6,10,3,.14);cube(g,mats.cyan,0,3,-3.49,9.7,2.7,.02);for(let j=0;j<5;j++)cube(g,mats.pink,-4+j*2,2.8,-3.46,.7,.7,.02);}
    if(maker){cube(g,mats.gold,0,3.4,-3.65,8,1.6,.3);for(let j=0;j<8;j++)disk(g,paint('coral'),-3.4+j,4.3,-3.65,.2,.2);}
  }else if(s.kind==='cinema'){
    // Upholstered walls, aisle lights and actual ticket/concession fittings.
    for(const x of [-5.6,5.6])for(let j=0;j<6;j++){soft(g,paint(j%2?'ink':'rose'),x,2.5,-3+j*1.3,.3,4.5,1.15);cube(g,mats.gold,x*.97,.3,-3+j*1.3,.045,.04,.9);}
    soft(g,paint('rose'),-4,.8,5,2.6,1.5,1);touchscreen(g,-4,1.9,5);for(let i=0;i<4;i++)bottle(g,-4.8+i*.45,1.75,5.15,paint('ivory'));
  }else if(s.kind==='arcade'||s.kind==='photo'||s.kind==='bowling'){
    for(let j=0;j<4;j++){const x=-4.5+j*3;cube(g,mats.pink,x,3.8,-3.5,.05,2.2,.05);cube(g,mats.cyan,x,4.9,-3.5,1.8,.05,.05);}
    if(s.kind==='photo'){soft(g,paint('rose'),0,2,-1.5,3.2,4,2.7);cube(g,paint('ink'),0,2.3,.01,2.6,3.2,.12);touchscreen(g,0,2.8,.12);chair(g,0,-.3,paint('ivory'),.65,0);}
    else if(s.kind!=='bowling')for(const x of [-4,0,4]){touchscreen(g,x,2.4,1.72);for(let j=0;j<4;j++)orb(g,j%2?mats.pink:mats.gold,x-.35+j*.23,1.4,1.9,.08);}
  }else if(s.kind==='spa'){
    for(const x of [-3.5,3.5]){soft(g,paint('ivory'),x,.7,.8,2.3,1.1,3.4);soft(g,paint('rose'),x,1.3,.8,2.1,.18,3.1);for(let j=0;j<3;j++)bottle(g,x-.5+j*.5,1.6,-2.2,paint('fern'));}
    for(const x of [-4,0,4]){soft(g,paint('oak'),x,2,-3.5,2.2,3.8,.8);for(let j=0;j<5;j++)soft(g,paint('ivory'),x,.5+j*.65,-2.98,1.8,.25,.55);}
    for(let j=0;j<8;j++){const a=j*Math.PI/4;orb(g,mats.gold,Math.cos(a)*2,1.9,Math.sin(a)*1.5,.08);}
  }else{
    // Quiet rooms use curved benches, book ledges and living planting, rather
    // than another bank of identical shop shelves.
    for(const x of [-3.6,3.6]){upholsteredBench(x,1,paint(s.kind==='social'?'rose':'fern'));plant(g,x,-2);disk(g,mats.warm,x,1,2.8,1,.12);}
    for(let j=0;j<6;j++)bottle(g,-2.3+j*.9,1.3,-3.1,paint('fern'));
  }
  yield* mallFitoutSteps(g,s,{...h,soft,paint});
  if(s.kind!=='food'){const p=MALL_PRODUCTS.find(p=>p.storeId===s.id);if(p){const tag=new T.Group();tag.position.set(2.5,1.7,1.8);tag.rotation.x=-.15;g.add(tag);soft(tag,paint('ink'),0,0,0,3,.65,.09);labelText(tag,`${p.name} · ${p.price}`,0,0,.06,2.8,.5);}}
  yield;
}
