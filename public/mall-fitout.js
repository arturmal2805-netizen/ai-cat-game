import * as T from 'three';
import {MALL_PRODUCTS} from './mall-data.js';

// Built fixtures, never a picture of an interior. The same authored fittings
// are baked into each floor's static colour batches after this generator ends.
export function* mallFitoutSteps(g,s,h){
  const {cube,orb,disk,tube,mesh,mats,glassMat,soft,paint,labelText,plant}=h;
  const luxury=s.kind==='fashion',food=s.kind==='food',quiet=['rest','spa','social'].includes(s.kind);
  const accent=paint(luxury?(s.key==='gucci'?'fern':s.key==='chanel'?'ink':'rose'):food?'coral':quiet?'fern':'blue');
  const products=MALL_PRODUCTS.filter(p=>p.storeId===s.id);
  // Continuous skirting, recessed portal jambs, fine metal inlay and actual
  // bevelled wall panels break up the previously flat shelving silhouette.
  for(const side of [-1,1]){
    soft(g,paint('ink'),side*6.22,2.55,-.2,.32,5.1,8.6);
    for(const z of [-3.8,-.1,3.4]){
      soft(g,accent,side*6.02,2.6,z,.2,4.55,2.75);
      cube(g,mats.gold,side*5.89,.4,z,.04,.07,2.65);
      cube(g,mats.gold,side*5.89,4.82,z,.04,.055,2.65);
      for(const y of [.58,4.63])orb(g,mats.gold,side*5.84,y,z,.035);
    }
    cube(g,paint('ink'),side*6.05,.14,-.1,.38,.25,8.9);
    cube(g,mats.gold,side*5.84,.29,-.1,.025,.025,8.9);
    // Fluted portal columns and warm suspended pearl luminaires.
    soft(g,paint('ivory'),side*6,2.7,4.3,.6,5.4,.6);
    for(let j=0;j<5;j++)cube(g,mats.gold,side*6-.2+j*.1,2.7,4.625,.022,4.9,.025);
    cube(g,mats.cyan,side*6.34,2.7,4.3,.045,4.7,.09);
    tube(g,[[side*4.6,6.55,2.3],[side*4.6,5.5,2.3],[side*4.6,5.25,2.3]],.018,mats.gold);
    orb(g,mats.white,side*4.6,5.08,2.3,.28,.36,.28);
    mesh(g,new T.TorusGeometry(.42,.025,6,24),mats.gold,side*4.6,5.08,2.3).rotation.x=Math.PI/2;
  }
  // A patterned threshold and rug are flush with the true walking surface.
  cube(g,accent,0,.012,2.8,11.4,.018,4.4);
  for(const side of [-1,1])cube(g,mats.gold,side*5.62,.026,2.8,.024,.012,4.2);
  for(const z of [.74,4.86])cube(g,mats.gold,0,.026,z,11.25,.012,.024);
  for(let j=0;j<12;j++){
    const x=-5.1+j*.93;
    const inlay=cube(g,mats.gold,x,.03,4.5,.17,.009,.17);inlay.rotation.y=Math.PI/4;
  }
  yield;
  if(luxury){
    // Three dimensional arched recesses; individual jewellery/bags and their
    // price labels remain in front of the niches, not printed on them.
    for(const x of [-4,0,4]){
      soft(g,paint('ink'),x,.55,-4.03,3.3,.8,.16);
      for(const side of [-1,1])soft(g,accent,x+side*1.5,2.8,-3.91,.16,4.25,.15);
      const arch=[];for(let j=0;j<=24;j++){const a=Math.PI-j*Math.PI/24;arch.push([x+Math.cos(a)*1.42,3.5+Math.sin(a)*1.25,-3.79]);}
      tube(g,arch,.045,mats.gold);
      for(const side of [-1,1])cube(g,mats.gold,x+side*1.42,2,-3.79,.06,3,.055);
      for(const y of [1.2,2.6,4]){cube(g,mats.white,x,y,-3.55,2.5,.10,.8);cube(g,mats.gold,x,y+.07,-3.1,2.45,.025,.025);}
    }
    // Transparent side display cases with thick bevelled plinths and lids.
    for(const side of [-1,1]){
      const x=side*4.65,z=.1;
      soft(g,paint('ivory'),x,.65,z,1.5,1.25,1.55);
      cube(g,mats.gold,x,1.3,z,1.56,.045,1.6);
      cube(g,glassMat,x,2.03,z,1.48,1.4,1.48);
      soft(g,paint('ink'),x,1.41,z,1.35,.12,1.35);
      for(let j=0;j<3;j++){
        const stand=new T.Group();stand.position.set(x+(j-1)*.34,1.7,z);g.add(stand);
        orb(stand,paint('ivory'),0,0,0,.19,.28,.15);
        const necklace=mesh(stand,new T.TorusGeometry(.15,.018,6,20),mats.gold,0,.02,.14);necklace.rotation.x=.22;
        orb(stand,mats.pink,0,-.13,.17,.04,.06,.035);
      }
    }
    // Fitting alcove with folded fabric, an open doorway, stool and rail.
    const x=s.key==='chanel'?-5:5;
    soft(g,paint('ink'),x,2.6,-2.2,1.7,4.9,1.5);
    for(let j=0;j<9;j++){
      const curtain=mesh(g,new T.CylinderGeometry(.12,.12,4.35,8),accent,x-.72+j*.085,2.65,-1.4);curtain.scale.z=.72;
    }
    disk(g,mats.gold,x,4.95,-1.4,.05,1.8).rotation.z=Math.PI/2;
    labelText(g,'NEW COLLECTION',0,5.26,-3.62,7.5,.46);
  }else if(food){
    // Ribbed timber counter frontage, glazed pastry/drink wing and detailed
    // place settings. The middle staff passage remains open behind checkout.
    for(let j=0;j<24;j++)soft(g,paint('oak'),-2.27+j*.197,.44,1.32,.075,.74,.045);
    for(const side of [-1,1]){
      const x=side*3.65,z=1.3;
      for(let j=0;j<2;j++){
        const q=x+(j?-.36:.36);
        disk(g,mats.white,q,1.035,z-.2,.29,.035);
        cube(g,paint('ivory'),q,1.064,z-.2,.26,.014,.38).rotation.y=.12;
        tube(g,[[q-.18,1.08,z-.38],[q-.18,1.08,z+.1]],.012,mats.gold);
        disk(g,accent,q,1.18,z+.3,.1,.22);
        mesh(g,new T.TorusGeometry(.07,.016,6,16),mats.gold,q+.12,1.18,z+.3);
      }
    }
    // Upper menu lightbox has real product names/prices from the economy.
    soft(g,paint('ink'),0,5.38,-3.95,8.9,.92,.12);
    products.slice(0,3).forEach((p,i)=>labelText(g,`${p.name} · ${p.price}`,(i-1)*2.85,5.4,-3.85,2.65,.38));
    for(const side of [-1,1]){
      const x=side*5.35;
      soft(g,paint('ink'),x,2.1,-3.3,1.2,3.9,1.35);
      cube(g,glassMat,x,2.3,-2.60,1.02,2.85,.055);
      for(let row=0;row<4;row++)for(let j=0;j<3;j++){
        disk(g,paint(['fern','rose','ivory'][j]),x-.33+j*.33,.95+row*.8,-2.98,.09,.32);
        disk(g,mats.gold,x-.33+j*.33,1.14+row*.8,-2.98,.065,.07);
      }
      cube(g,mats.gold,x+.42,2.2,-2.55,.03,.55,.05);
    }
    labelText(g,'PICK UP',0,.44,1.4,2.45,.35);
  }else if(s.kind==='home'){
    // A complete staged room: framed prints, wall panelling, cushions, rug,
    // side table and shelf plants, separate from the actual inventory props.
    for(let j=0;j<16;j++)cube(g,paint('oak'),-5.6+j*.75,2.55,-4.02,.08,4.8,.12);
    for(const x of [-2.3,2.3]){
      soft(g,paint('ink'),x,3.7,-3.82,2.3,1.5,.13);
      cube(g,paint('ivory'),x,3.7,-3.73,2.05,1.25,.015);
      for(let j=0;j<3;j++)orb(g,paint(['rose','fern','gold'][j]),x-.5+j*.5,3.7,-3.7,.3,.4,.015);
    }
    for(const x of [1.7,3.7]){const cushion=soft(g,paint('rose'),x,1.26,.22,.56,.42,.56);cushion.rotation.y=x*.1;}
    cube(g,paint('ivory'),2.7,.09,2.1,3.8,.045,3.7);
    for(let j=0;j<10;j++)cube(g,accent,1.05+j*.36,.12,2.1,.04,.009,3.4);
  }else if(s.kind==='cinema'){
    // Entry ticket scanner, perforated speakers and deep upholstered surrounds.
    for(const side of [-1,1]){
      soft(g,paint('ink'),side*4.92,3.5,-3.65,.65,1.65,.5);
      for(let j=0;j<5;j++)for(let k=0;k<3;k++)orb(g,mats.gold,side*4.92+(k-1)*.14,3.05+j*.22,-3.38,.025);
    }
    for(const x of [-1.15,1.15]){soft(g,paint('ink'),x,.72,4.55,.28,1.4,.65);cube(g,mats.cyan,x,1.48,4.55,.22,.045,.4);}
    labelText(g,'TICKETS',-4,2.65,5.56,2.5,.55);
  }else if(['book','gadget','toy'].includes(s.kind)){
    // Edge-lit recessed wall modules with individual object-sized openings.
    for(const x of [-5.65,5.65])for(let row=0;row<4;row++){
      soft(g,paint('ink'),x,.65+row*1.03,-1.1,.75,.9,2.1);
      cube(g,mats.gold,x,.24+row*1.03,-.02,.7,.035,.025);
      for(let j=0;j<3;j++)soft(g,paint(['blue','rose','fern'][j]),x,.63+row*1.03,-1.7+j*.6,.42,.57,.33);
    }
  }else if(quiet){
    for(const side of [-1,1]){
      const x=side*5.4;
      for(let j=0;j<10;j++)cube(g,paint('oak'),x,2.4,-3.1+j*.66,.12,4.6,.08);
      plant(g,side*4.7,-2.7);
      for(let j=0;j<3;j++)orb(g,mats.gold,side*3.6,1.1+j*.12,2.8,.09,.04,.09);
    }
  }
  yield;
}
