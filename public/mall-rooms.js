import * as T from 'three';
import {mallFixtureLibrary} from './mall-interiors.js';
import {mallConveyorSteps} from './mall-conveyor.js';
import {MALL_PRODUCTS,mallLabel,MALL_STORES} from './mall-data.js';

// Full 28-metre retail rooms, with a real rear service zone, showcases, public
// entry and dining/sitting areas. Old enclosing kiosk boxes are not reused.
export function* mallRoomSteps(store,placement,kit){
  const {cube,orb,disk,tube,ring,mesh,mats,glassMat,chair,plant,label,labels,clock}=kit;
  const room=new T.Group(),ceiling=new T.Group(),motion=new T.Group(),physical=new T.Group();
  const w=placement.w,d=placement.d,front=d/2;
  room.position.set(placement.x,0,placement.z);room.rotation.y=placement.yaw;
  room.add(physical,motion);ceiling.position.copy(room.position);ceiling.rotation.copy(room.rotation);
  const labelText=(parent,text,x,y,z,width,height,yaw=0)=>label(parent,labels.indexOf(text),x,y,z,width,height,yaw);
  const h={...kit,labelText,motion,clock},f=mallFixtureLibrary(physical,store,h);
  const {paint,soft,bag,garment,rack,bottle,touchscreen,foodOnPlate,upholsteredBench,nativeProp}=f;
  const color=store.kind==='fashion'?store.key==='chanel'?'ivory':store.key==='gucci'?'fern':'rose':store.kind==='food'?['star','cafe','restaurant','sky-cafe'].includes(store.key)?'fern':'coral':store.kind==='cinema'?'lilac':'blue';
  const accent=paint(color),trim=paint('gold');
  // Independent room plan, front glazing with a wide open door, glazed rear
  // and low service storage. Warm rooms stay visible through the outer skin.
  const floorGeometry=new T.BoxGeometry(w-.2,.05,d-.2),uv=floorGeometry.attributes.uv,position=floorGeometry.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,position.getX(i)*.35,position.getZ(i)*.35);
  const marble=new T.MeshStandardMaterial({color:0xf6efe3,roughness:.29,metalness:.12,...kit.getSurface('marble'),normalScale:new T.Vector2(.11,.11)});
  mesh(physical,floorGeometry,marble,0,-.025,0);
  for(const side of [-1,1]){
    cube(physical,trim,side*(w/2-.75),.006,0,.035,.012,d-1.5);
    cube(physical,trim,0,.006,side*(d/2-.75),w-1.5,.012,.035);
    cube(physical,mats.gold,side*(w/2-.45),7.48,0,.045,.06,d-.8);
  }
  // Cutaway inspection retains hanging fittings and the luminous wall coves;
  // only the actual opaque ceiling is lifted away.
  cube(physical,mats.gold,0,7.48,-front+.45,w-.8,.06,.045);
  label(physical,4+MALL_STORES.findIndex(s=>s.id===store.id),0,5.95,-front+.32,w-4,1.0);

  for(const side of [-1,1]){
    soft(physical,paint('ivory'),side*(w/2-.15),.52,0,.25,1,d-.6);
    cube(physical,glassMat,side*(w/2-.16),4,0,.055,6.7,d-.6);
    cube(physical,trim,side*(w/2-.12),1.04,0,.055,.045,d-.4);
    for(const z of [-front+.4,0,front-.5]){
      soft(physical,mats.navy,side*(w/2-.2),3.7,z,.24,7.4,.25);
      cube(physical,mats.gold,side*(w/2-.34),3.7,z,.035,7,.035);
    }
    cube(physical,glassMat,side*(w/4+2.6),3.7,front-.1,w/2-5.2,6.8,.055);
    cube(physical,mats.navy,side*5.1,3.7,front-.1,.22,7.4,.2);
    plant(physical,side*(w/2-1.35),front+1.3,.85);
  }
  if(['rest','social','spa'].includes(store.kind))cube(physical,glassMat,0,4,-front+.12,w-.5,6.7,.06);
  else{
    const wall=paint(store.kind==='food'?'ivory':store.kind==='fashion'?'ivory':store.kind==='home'||store.kind==='book'?'oak':'ink');
    soft(physical,wall,0,3.7,-front+.12,w-.4,7.35,.27);
    for(const side of [-1,1]){
      soft(physical,wall,side*(w/2-.2),3.7,-front/2,.22,7.35,front);
      cube(physical,mats.gold,side*(w/2-.4),6.8,-front/2,.055,.055,front);
    }
    for(const x of [-11,-5.5,0,5.5,11])cube(physical,trim,x,3.7,-front+.29,.045,6.8,.035);
  }
  if(store.kind==='fashion'){
    const arch=[[-5.1,0,front+.2],[-5.1,5.1,front+.2],[-3.9,6.7,front+.2],[0,7.1,front+.2],[3.9,6.7,front+.2],[5.1,5.1,front+.2],[5.1,0,front+.2]];
    tube(physical,arch,.16,trim).userData.mallCollisionHandledByPosts=true;tube(physical,arch.map(([x,y,z])=>[x,y,z+.15]),.042,mats.gold).userData.mallCollisionHandledByPosts=true;
    for(const side of [-1,1]){soft(physical,paint('ivory'),side*(w/2-2),3.6,front-.18,3.3,7.2,.4);cube(physical,glassMat,side*(w/2-2),3.6,front+.05,2.75,6.2,.04);}
  }else if(store.kind==='food'){
    const canopy=new T.Group();canopy.position.set(0,5.85,front+.7);physical.add(canopy);
    for(let i=0;i<24;i++){
      cube(canopy,i%2?mats.white:accent,-w/2+.6+i*(w-1.2)/23,.08,0,(w-1.2)/24,.12,1.7).rotation.x=-.14;
      orb(canopy,i%2?mats.white:accent,-w/2+.6+i*(w-1.2)/23,-.20,.86,(w-1.2)/48,.23,.08);
    }
  }else if(store.kind==='cinema'){
    soft(physical,paint('ink'),0,6.5,front+.16,w-1,1.8,.7);
    for(let i=0;i<36;i++)for(const y of [5.7,7.3])orb(physical,i%2?mats.gold:mats.pink,-w/2+1+i*(w-2)/35,y,front+.55,.10);
  }else if(['home','book','toy'].includes(store.kind)){
    for(const side of [-1,1])for(let j=0;j<7;j++)cube(physical,paint('oak'),side*(w/2-2)+(j-3)*.3,3.7,front+.12,.09,7.3,.28);
    tube(physical,[[-5.1,.1,front+.3],[-5.1,6.1,front+.3],[0,7.0,front+.3],[5.1,6.1,front+.3],[5.1,.1,front+.3]],.12,mats.warm).userData.mallCollisionHandledByPosts=true;
  }else if(['arcade','dance','bowling','photo'].includes(store.kind)){
    for(const side of [-1,1]){cube(physical,mats.navy,side*5.2,3.5,front+.13,.7,7.0,.7);cube(physical,mats.purple,side*5.2,3.5,front+.52,.08,6.8,.045);}
    cube(physical,mats.cyan,0,7.0,front+.35,10.7,.08,.06);
  }

  cube(physical,mats.navy,0,7.3,front-.1,w-.2,.18,.22);
  cube(physical,mats.gold,0,7.53,front-.1,w-.5,.055,.12);
  const sign=4+MALL_STORES.findIndex(s=>s.id===store.id);
  label(physical,sign,0,6.65,front+.12,w-1,1.35);
  label(physical,sign,0,6.65,front-.24,w-1,1.35,Math.PI);
  // Real ceiling coves, warm pearl luminaires, metal louvers and layered soffits.
  soft(ceiling,paint('ivory'),0,7.95,0,w,.28,d);
  for(const side of [-1,1]){
    cube(ceiling,mats.gold,side*(w/2-.6),7.75,0,.07,.06,d-1);
    for(let i=0;i<16;i++)cube(ceiling,paint('oak'),side*(w/2-2),7.72,-front+1+i*(d-2)/15,2.7,.11,.075);
  }
  for(const x of [-8,0,8])for(const z of [-6,2,8]){
    disk(physical,mats.gold,x,7.65,z,.34,.06);
    tube(physical,[[x,7.6,z],[x,6.7,z]],.018,trim);
    orb(physical,mats.white,x,6.5,z,.25,.32,.25);
  }
  if(store.kind!=='cinema'){
    const width=store.kind==='food'?14:8;
    soft(physical,accent,0,.43,5.5,width,.8,1.4);
    cube(physical,mats.white,0,.88,5.5,width+.1,.1,1.55);
    for(let j=0;j<Math.ceil(width/.23);j++)cube(physical,trim,-width/2+.16+j*.23,.43,6.22,.035,.7,.025);
    for(const x of [-width/2+1,width/2-1]){
      const terminal=new T.Group();terminal.position.set(x,.97,5.45);terminal.scale.setScalar(.52);physical.add(terminal);touchscreen(terminal,0,.35,0);
    }
  }
  yield;
  if(store.kind==='fashion'){
    // Different boutique identities share genuine merchandise, not identical
    // coloured empty rooms. Glass cabinets flank a broad central route.
    for(const x of [-10,-5,0,5,10]){
      soft(physical,paint('ivory'),x,.5,-front+1.8,3.6,.9,2.3);
      for(const y of [1.1,2.8,4.5]){
        cube(physical,paint('ivory'),x,y,-front+1.8,3.6,.11,1.5);
        cube(physical,mats.gold,x,y+.07,-front+1.03,3.5,.025,.025);
        if(store.key==='nike'){
          for(const side of [-1,1]){soft(physical,paint('ivory'),x+side*.55,y+.22,-front+1.6,.85,.32,.42);orb(physical,accent,x+side*.55-.19,y+.36,-front+1.6,.32,.16,.21);}
        }else bag(physical,x,y+.13,-front+1.4,.95);
      }
      tube(physical,[[x-1.7,.9,-front+1.05],[x-1.7,4.7,-front+1.05],[x,5.6,-front+1.05],[x+1.7,4.7,-front+1.05],[x+1.7,.9,-front+1.05]],.035,trim);
    }
    for(const side of [-1,1]){
      const sideRoom=new T.Group();sideRoom.position.set(side*9,0,-1);physical.add(sideRoom);
      const fixture=mallFixtureLibrary(sideRoom,store,h);fixture.rack(0,0);fixture.rack(0,-3.8);
      fixture.upholsteredBench(0,4.3,paint('cloth-'+color));
      soft(sideRoom,paint('ivory'),0,.65,2,3.7,1.25,2.1);cube(sideRoom,glassMat,0,1.85,2,3.55,1.15,1.95);
      for(let j=0;j<3;j++)bag(sideRoom,(j-1)*1.05,1.34,2,.8);
      // A curved mirror and open fitting alcove, with folded fabric curtains.
      soft(sideRoom,mats.navy,side*3,2.8,2,1.2,4.7,.16);cube(sideRoom,glassMat,side*3,2.8,2.1,1.05,4.5,.025);
      for(let j=0;j<9;j++)disk(sideRoom,accent,side*2.5+j*.11,2.6,-5.3,.10,4.7);
    }
  }else if(store.kind==='food'){
    const kitchen=new T.Group();kitchen.position.z=-4.3;physical.add(kitchen);mallFixtureLibrary(kitchen,store,h).kitchen();
    const cafe=['star','cafe','restaurant','sky-cafe','bakery','ice'].includes(store.key);
    for(const side of [-1,1]){
      for(let i=0;i<13;i++)cube(physical,paint('oak'),side*8.7+(i-6)*.38,4.6,-front+.36,.07,5.3,.16);
      for(const y of [3.15,4.8]){
        cube(physical,paint('oak'),side*8.7,y,-front+1.0,5,.12,1.25);
        cube(physical,mats.gold,side*8.7,y-.08,-front+1.55,4.9,.04,.04);
        for(let i=0;i<7;i++){
          const x=side*8.7+(i-3)*.6;
          if(cafe){disk(physical,mats.white,x,y+.24,-front+.95,.18,.36);ring(physical,x,y+.43,-front+.95,.18,trim,.015);}
          else bottle(physical,x,y+.25,-front+.95,paint(i%2?'coral':'fern'));
        }
      }
      // Upholstered window booths make the dining room feel occupied while
      // preserving the service aisle and the reserved approach to each seat.
      for(const z of [-.8,5.8]){
        soft(physical,paint('cloth-'+color),side*11.8,.58,z,2.2,.48,3.9);
        soft(physical,paint('cloth-'+color),side*12.7,1.2,z,.35,1.3,3.9);
        for(const dz of [-1.5,0,1.5])soft(physical,paint('cloth-ivory'),side*12.2,1.1,z+dz,.52,.45,.55);
      }
    }
    if(cafe){
      const display=new T.Group();display.position.set(0,1.0,-.8);physical.add(display);
      soft(display,paint('ivory'),0,.3,0,5.6,.55,1.8);cube(display,glassMat,0,1.1,0,5.5,1.1,1.75);
      for(let i=0;i<8;i++)foodOnPlate(display,-2.1+(i%4)*1.4,.65,i<4?-.4:.4,'cake',.68);
      for(const x of [-2,0,2]){soft(physical,paint('ink'),x,2.7,-4.0,1.2,1.4,.8);cube(physical,trim,x,2.8,-3.55,.8,.35,.05);bottle(physical,x,2.1,-3.4,mats.white);}
    }

    for(const x of [-9.4,9.4]){
      soft(physical,paint('ivory'),x,1,-7,4.6,1.9,3.2);cube(physical,mats.white,x,2,-7,4.8,.13,3.35);
      for(const z of [-7.7,-6.2])for(const dx of [-1.15,1.15]){disk(physical,paint('ink'),x+dx,2.13,z,.46,.07);disk(physical,paint('ivory'),x+dx,2.4,z,.38,.5);}
      for(let j=0;j<5;j++)bottle(physical,x-1.6+j*.8,2.14,-8.1,accent);
    }
    for(const x of [-8,8])for(const z of [.8,5.8]){
      disk(physical,paint('ivory'),x,.95,z,1.3,.13);disk(physical,trim,x,.47,z,.085,.9);disk(physical,mats.navy,x,.09,z,.62,.09);
      chair(physical,x,z+1.6,paint('cloth-'+color),.65,Math.PI);
      foodOnPlate(physical,x+.35,1.04,z,'sushi',.55);bottle(physical,x-.35,1.04,z,accent);
      disk(physical,mats.white,x,1.04,z+.55,.28,.025);cube(physical,paint('ivory'),x,1.07,z+.55,.27,.012,.35);
    }
    for(let i=0;i<10;i++)foodOnPlate(physical,-5.5+i*1.2,1.01,5.6,store.key==='bakery'?'cake':'burger',.65);
    const menu=new T.Group();menu.position.set(0,4.6,-3.1);physical.add(menu);
    cube(menu,glassMat,0,0,0,18,1.8,.06);labelText(menu,'CAT SAFE MENU',0,.5,.06,8,.5);
    MALL_PRODUCTS.filter(p=>p.storeId===store.id).forEach((p,i)=>labelText(menu,`${p.name} · ${p.price}`,(i-1)*5.7,-.2,.08,5.3,.5));
    if(store.key==='sushi'){
      const belt=new T.Group();belt.position.set(-8,.9,-2.8);physical.add(belt);disk(belt,mats.navy,0,0,0,2.6,.25).scale.z=.5;
      const dishes=yield* mallConveyorSteps(clock);dishes.position.copy(belt.position);motion.add(dishes);
    }
    for(const side of [-1,1]){
      const refrigerator=new T.Group();refrigerator.position.set(side*11.7,0,-7.2);physical.add(refrigerator);
      soft(refrigerator,mats.navy,0,2,0,1.7,3.9,1.5);cube(refrigerator,glassMat,0,2,.78,1.5,3.5,.05);
      for(let row=0;row<4;row++)for(let j=0;j<4;j++)bottle(refrigerator,-.55+j*.36,.7+row*.78,.2,paint(['fern','rose','ivory'][j%3]));
    }
  }else if(store.kind==='cinema'){
    soft(physical,paint('cloth-ink'),0,3.6,-front+.6,w-1,6.7,.35);
    cube(physical,mats.movie,0,3.6,-front+.82,w-4,5.7,.04);
    for(const x of [-8.5,-4.5,4.5,8.5])for(const z of [-7.5,-3.8,0])chair(physical,x,z,paint('cloth-rose'),.65,Math.PI);
    for(const side of [-1,1])for(let j=0;j<8;j++){
      soft(physical,paint(j%2?'cloth-ink':'cloth-lilac'),side*(w/2-.45),3.2,-front+1.1+j*2.4,.27,5.6,2.0);
      cube(physical,mats.gold,side*2.15,.06,-front+1+j*2.4,.07,.04,1.1);
    }
    soft(physical,accent,9,.43,6,5.4,.8,1.35);cube(physical,mats.white,9,.88,6,5.5,.1,1.45);
    const till=new T.Group();till.position.set(10,.98,6);till.scale.setScalar(.55);physical.add(till);touchscreen(till,0,.3,0);
    labelText(physical,'TICKETS',9,2,6.75,4.5,.65);upholsteredBench(-9,7.5,paint('cloth-lilac'));
  }else if(store.kind==='home'){
    for(const side of [-1,1]){
      const staged=new T.Group();staged.position.set(side*8,.01,-3);physical.add(staged);
      const bed=nativeProp('bed');bed.scale.setScalar(.95);staged.add(bed);
      soft(staged,paint('cloth-fern'),0,.7,4.2,4.8,.6,1.65);soft(staged,paint('cloth-fern'),0,1.25,3.5,4.8,1.1,.35);
      for(const x of [-1.5,0,1.5])soft(staged,paint('cloth-ivory'),x,1.15,4.1,.7,.4,.65);
      disk(staged,paint('oak'),0,.72,6.2,1.2,.15);disk(staged,trim,0,.36,6.2,.06,.7);
      cube(staged,paint('ivory'),0,.03,4.8,6.4,.035,6.6);plant(staged,-2.4,-3.5,.7);
    }
    for(const x of [-10,-5,0,5,10]){soft(physical,paint('oak'),x,2.3,-front+1,3.8,4.5,1.1);for(let row=0;row<5;row++){cube(physical,paint('ivory'),x,.4+row*.85,-front+1.6,3.6,.09,.95);for(let j=0;j<5;j++)bottle(physical,x-1.2+j*.6,.65+row*.85,-front+1.6,paint(['fern','rose','ivory'][j%3]));}}
  }else if(['toy','gadget','book'].includes(store.kind)){
    for(const x of [-10,-5,0,5,10]){
      soft(physical,paint('ivory'),x,2.5,-front+1.1,4.1,4.8,1.3);
      for(let row=0;row<5;row++){
        const y=.6+row*.85;cube(physical,trim,x,y,-front+1.8,3.9,.055,.9);
        for(let j=0;j<7;j++){
          if(store.kind==='book'){soft(physical,paint(['rose','fern','blue','ivory'][j%4]),x-1.4+j*.45,y+.34,-front+1.5,.29,.64,.5);cube(physical,mats.gold,x-1.4+j*.45,y+.35,-front+1.77,.18,.035,.015);}
          else{soft(physical,paint(['blue','coral','fern','gold'][j%4]),x-1.4+j*.45,y+.3,-front+1.5,.35,.52,.4);}
        }
      }
    }
    for(const side of [-1,1])for(const z of [-3,1.5]){
      const x=side*8;soft(physical,paint('ivory'),x,.47,z,4.7,.85,2.8);
      if(store.kind==='gadget')for(let j=0;j<5;j++)touchscreen(physical,x-1.6+j*.8,1.4,z);
      else if(store.kind==='toy'){const toy=nativeProp('yarn');toy.scale.setScalar(.65);toy.position.set(x,.95,z);physical.add(toy);for(let j=0;j<10;j++){const px=x+(j%5-2)*.6,pz=z+(j<5?-.6:.6);soft(physical,paint(['coral','gold','blue'][j%3]),px,1.12,pz,.45,.4,.45);for(const dx of [-.1,.1])for(const dz of [-.1,.1])disk(physical,trim,px+dx,1.34,pz+dz,.055,.07);}}
      else for(let j=0;j<6;j++)soft(physical,paint(['rose','fern','blue'][j%3]),x-1.65+j*.65,1.2,z,.5,.14,.8);
    }
  }else if(store.kind==='arcade'||store.kind==='bowling'||store.kind==='dance'||store.kind==='photo'){
    if(store.kind==='bowling'){
      for(const x of [-6,6]){cube(physical,paint('oak'),x,.08,-2.5,3.3,.12,13.5);for(const side of [-1,1])cube(physical,mats.navy,x+side*1.8,.15,-2.5,.2,.26,13.6);for(let row=0;row<4;row++)for(let j=0;j<=row;j++){const px=x+(j-row/2)*.44,z=-7-row*.43;orb(physical,mats.white,px,.5,z,.14,.37,.14);orb(physical,mats.white,px,.86,z,.11);}
        cube(physical,mats.movie,x,5,-10,5.6,2.2,.06);orb(physical,accent,x,.35,4,.3);
      }
    }else if(store.kind==='dance'){
      for(let x=-4;x<=4;x++)for(let z=-3;z<=2;z++)cube(physical,(x+z)%2?mats.pink:mats.cyan,x*2,.025,z*2,1.9,.025,1.9);
      for(const x of [-10,10])for(const y of [1,2.4,3.8])soft(physical,mats.navy,x,y,-8,1.7,1.3,1.4);
    }else for(const x of [-9,-3,3,9])for(const z of [-6,0]){
      soft(physical,mats.navy,x,1.25,z,2.1,2.5,1.6);cube(physical,mats.movie,x,1.65,z+.83,1.7,1.1,.035);cube(physical,mats.cyan,x,.85,z+.98,1.7,.09,.4);for(let j=0;j<5;j++)orb(physical,j%2?mats.pink:mats.gold,x-.6+j*.3,.97,z+1.05,.065);
    }
    for(const side of [-1,1]){tube(physical,[[side*12,.4,-10],[side*12,6,-10],[side*12,6,8]],.055,mats.pink);plant(physical,side*10,8,.9);}
  }else{
    // Panoramic quiet rooms have spacious planted lounges and native toys/spa
    // fittings rather than a generic retail counter and empty rectangular box.
    for(const side of [-1,1])for(const z of [-6,1]){
      const x=side*8;chair(physical,x-1.7,z,paint('cloth-fern'),.65,Math.PI/2);chair(physical,x+1.7,z,paint('cloth-rose'),.65,-Math.PI/2);
      disk(physical,paint('ivory'),x,.95,z,1.2,.13);disk(physical,trim,x,.45,z,.07,.9);plant(physical,x,z-2.8,.9);
      if(store.kind==='spa'){const bath=nativeProp('bath');bath.scale.setScalar(.8);bath.position.set(x,.05,z+3.8);physical.add(bath);}
    }
    for(const x of [-10,-5,0,5,10])plant(physical,x,-front+2,1.1);
  }
  yield;
  const product=MALL_PRODUCTS.find(p=>p.storeId===store.id);
  if(product){const tag=new T.Group();tag.position.set(2.9,1.4,6.3);physical.add(tag);cube(tag,glassMat,0,0,0,6.2,.8,.05);labelText(tag,`${product.name} · ${product.price}`,0,0,.06,5.9,.55);}
  room.userData.storeId=store.id;
  return{room,ceiling,motion,physical};
}
