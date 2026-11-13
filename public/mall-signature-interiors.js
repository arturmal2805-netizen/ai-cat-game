import * as T from 'three';
import {MALL_PRODUCTS} from './mall-data.js';

// Brand-specific fitted rooms. Public checkout and reserved seats remain at
// their native coordinates; everything here is real, measured 3D furniture.
export function* mallSignatureInteriorSteps(parent,ceiling,store,placement,kit,f){
  const {cube,orb,disk,tube,mesh,glassMat,mats,labelText,chair,plant}=kit;
  const {soft,paint,bag,garment,foodOnPlate,touchscreen}=f;
  kit.signatureMaterials??=new Map();
  const finish=(id,color,roughness,metalness=0)=>{if(!kit.signatureMaterials.has(id))kit.signatureMaterials.set(id,new T.MeshStandardMaterial({color,roughness,metalness}));return kit.signatureMaterials.get(id);};
  const chalk=finish('chalk',0xe5ddcc,.68),charcoal=finish('charcoal',0x252b2a,.66),bronze=finish('bronze',0x94754a,.32,.7),steel=finish('stainless',0xa2aaa9,.27,.78),walnut=paint('oak');
  const width=placement.w,back=-placement.d/2;
  // Proper enclosed ceiling: tracks, inset lights and ventilation are real
  // fittings. Floor overview still lifts this ceiling; the close view retains it.
  for(const x of [-8,0,8]){
    cube(ceiling,charcoal,x,7.60,0,.08,.10,placement.d-1.2);
    for(const z of [-8,-3,2,7]){
      const spot=disk(ceiling,charcoal,x,7.42,z,.15,.32);spot.rotation.z=x<0?.22:-.22;
      disk(ceiling,mats.warm,x,7.24,z,.115,.018);
    }
  }
  for(const x of [-11,11])for(let i=0;i<16;i++)cube(ceiling,charcoal,x,7.69,-7.5+i*.17,1.6,.035,.045);
  if(store.key==='mcd'){
    // Walnut/charcoal service counter, with a lower stone top and discreet
    // equipment. The employee works behind it at the retained service point.
    soft(parent,charcoal,0,.43,5.5,14,.80,1.4);soft(parent,chalk,0,.89,5.5,14.14,.12,1.58);
    cube(parent,charcoal,0,.10,6.22,13.85,.12,.045);
    for(const side of [-1,1]){
      soft(parent,walnut,side*5,.45,6.225,3.5,.62,.025);
      const till=new T.Group();till.position.set(side*5,.99,5.4);till.scale.setScalar(.58);parent.add(till);touchscreen(till,0,.35,0);
      for(const z of [-.8,5.8]){
        soft(parent,paint('cloth-red'),side*11.8,.58,z,2.2,.48,3.9);
        soft(parent,paint('cloth-red'),side*12.7,1.2,z,.35,1.3,3.9);
        for(let i=0;i<10;i++)cube(parent,charcoal,side*12.5,1.21,z-1.6+i*.35,.018,.85,.016);
      }
      for(const z of [.8,5.8]){
        const x=side*8;soft(parent,chalk,x,.95,z,2.45,.13,2.15);disk(parent,steel,x,.48,z,.065,.88);soft(parent,charcoal,x,.08,z,.85,.10,.75);
        chair(parent,x,z+1.6,paint('cloth-red'),.65,Math.PI);
        foodOnPlate(parent,x+.35,1.04,z,'burger',.40);disk(parent,mats.white,x-.45,1.22,z-.4,.13,.32);
        cube(parent,chalk,x-.4,1.04,z+.52,.5,.025,.32);
      }
      // Recessed kitchen pass, tiled wall and fitted stainless workbench.
      soft(parent,charcoal,side*8.2,3.3,back+.38,9.0,6.3,.18);
      for(let row=0;row<9;row++)cube(parent,steel,side*8.2,.6+row*.57,back+.485,8.9,.016,.012);
      for(let col=0;col<13;col++)cube(parent,steel,side*8.2-4.2+col*.70,3.1,back+.485,.013,5.65,.012);
      soft(parent,steel,side*8.8,1.0,-8.7,6.3,1.85,2.05);soft(parent,steel,side*8.8,1.99,-8.7,6.45,.12,2.2);
      for(const dx of [-1.8,0,1.8]){
        soft(parent,steel,side*8.8+dx,.95,-7.62,1.72,1.65,.045);cube(parent,charcoal,side*8.8+dx,1.72,-7.58,1.3,.045,.055);
        foodOnPlate(parent,side*8.8+dx,2.12,-8.7,'burger',.35);
      }
      soft(parent,steel,side*8.8,4.7,-9.4,6.6,.65,2.4);
      for(let j=0;j<22;j++)cube(parent,charcoal,side*8.8-3+j*.285,4.38,-8.55,.09,.04,.7);
      yield;
    }
    // Three mounted menu screens: small, flat product presentation, real
    // wallet prices, no huge floating toy burgers suspended across the room.
    const products=MALL_PRODUCTS.filter(p=>p.storeId===store.id);
    products.forEach((p,i)=>{
      const x=(i-1)*4.5;soft(parent,charcoal,x,4.9,-5.7,4.28,2.4,.13);
      labelText(parent,`${p.name} · ${p.price}`,x,5.55,-5.61,3.85,.30);
      labelText(parent,'CAT SAFE MENU',x,4.12,-5.61,3.4,.20);
      if(i<2)foodOnPlate(parent,x,4.65,-5.48,i?'cake':'burger',.38);
      else disk(parent,mats.white,x,4.7,-5.45,.15,.26);
    });
    // A visible preparation pass and collection bay, rather than a duplicate
    // row of freestanding blocks behind an oversized menu.
    soft(parent,chalk,0,1.95,-8.0,7.2,.12,2.0);
    for(const x of [-3.2,3.2])cube(parent,steel,x,3.2,-8.7,.065,2.5,.09);
    cube(parent,steel,0,4.45,-8.7,6.5,.1,.1);
    for(const x of [-2.4,0,2.4]){soft(parent,charcoal,x,1,-9,2.2,1.8,1.7);foodOnPlate(parent,x,2.05,-8.2,'burger',.35);}
    return;
  }
  if(store.key!=='vuitton')return;
  // Luxury joinery forms continuous recessed bays, not isolated shelf blocks.
  // Reference: real Louis Vuitton airport boutiques (Incheon/Doha/Heathrow).
  soft(parent,walnut,0,3.5,back+.38,width-1.1,6.8,.25);
  kit.label(parent,4+kit.storeIds.indexOf(store.id),0,7.05,back+.65,8,.58);
  for(const [index,x]of [-10,-5,0,5,10].entries()){
    const bay=new T.Group();bay.position.set(x,0,back+1);parent.add(bay);
    soft(bay,chalk,0,3.5,0,4.58,6.30,.24);
    for(const side of [-1,1])cube(bay,bronze,side*2.3,3.5,.16,.045,6.35,.12);
    for(const y of [.5,6.55])cube(bay,bronze,0,y,.16,4.65,.05,.12);
    soft(bay,walnut,0,.62,.65,4.25,1.05,1.45);
    for(const side of [-1,1]){cube(bay,bronze,side*1.0,.84,1.39,.6,.025,.025);cube(bay,bronze,side*1.0,.66,1.39,.02,.15,.025);}
    for(const y of [1.65,3.3,4.95]){
      soft(bay,chalk,0,y,.65,4.24,.11,1.5);cube(bay,mats.warm,0,y-.07,.85,4.05,.025,.65);
      for(const dx of [-1,1])bag(bay,dx,y+.09,.75,.83+(index%2)*.10);
    }
    yield;
  }
  // Two bronze/wood display islands, glass jewellery tops and proper drawers.
  // They flank the native circulation aisle and the retained checkout.
  for(const side of [-1,1]){
    const x=side*8.6,z=-2.8;
    soft(parent,walnut,x,.55,z,5.3,1.02,2.55);cube(parent,bronze,x,.11,z,5.13,.10,2.4);
    soft(parent,chalk,x,1.12,z,5.44,.12,2.7);
    for(let j=0;j<3;j++){
      const px=x-1.55+j*1.55;soft(parent,paint('leather-ivory'),px,1.25,z,1.04,.16,1.35);bag(parent,px,1.35,z,.67);
      cube(parent,glassMat,px,1.8,z+.75,1.3,1.2,.03);
    }
    soft(parent,paint('cloth-ivory'),side*9,.52,3.3,3.5,.42,1.6);
    for(const dz of [-.6,.6])cube(parent,bronze,side*9,.22,3.3+dz,3.1,.08,.065);
    // Quiet fitting alcove, bronze mirror, hanging apparel and textured drape.
    soft(parent,walnut,side*12,3.2,-3.4,1.4,6.2,5.4);
    cube(parent,glassMat,side*11.24,3.1,-3.4,.035,5.5,3.5);
    const apparel=new T.Group();apparel.position.set(side*9,0,-6.8);parent.add(apparel);
    tube(apparel,[[-1.5,.2,0],[-1.5,3.2,0],[1.5,3.2,0],[1.5,.2,0]],.028,bronze);
    for(let j=0;j<4;j++)garment(apparel,-1+j*.66,2.45,0,j);
    for(let j=0;j<14;j++)disk(parent,paint('cloth-ivory'),side*12-.6+j*.09,3.2,-.5,.07,5.8);
    yield;
  }
  // Shaped ceiling cove, warm indirect soffit and a restrained bronze pendant.
  for(const side of [-1,1]){
    const points=[];for(let i=0;i<=64;i++){const a=i*Math.PI/32;points.push([side*7.5+Math.cos(a)*4.8,7.55,-1+Math.sin(a)*7.6]);}
    tube(ceiling,points,.055,bronze);tube(ceiling,points.map(([x,y,z])=>[x,y-.07,z]),.025,mats.warm);
  }
  const pendant=[];for(let i=0;i<=64;i++){const a=i*Math.PI/32;pendant.push([Math.cos(a)*3,5.85,Math.sin(a)*1.5]);}
  tube(parent,pendant,.045,bronze);
  for(const x of [-2.4,2.4])tube(parent,[[x,7.6,0],[x,5.85,0]],.012,bronze);
}
