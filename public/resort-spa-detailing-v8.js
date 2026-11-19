import {spaGardenFlowerGeometry} from './resort-spa-gardens.js';
import * as T from 'three';
import {SPA_PALACE as P,spaPalacePools} from './resort-spa-layout-v7.js';
import {SPA_V7_ZONES,spaV7Seat} from './resort-spa-services-v7.js';
// SPA-local furnishing, authored around the immutable V7 service contacts.
// Rugs/cloth/inlays are non-obstructing; new furniture bases remain in solid.
export function* resortSpaDetailSteps(h){
 const {solid,decor,shell,mats,material,geometry,mesh,box,disk,ball,line,ring,pillow,plant,tree,lantern,lotus,tray,curtains,flowerCluster,petal,petalDark,leafGeo,green}=h;
 const cream=material(0xf4e7dc,{roughness:.78}),blush=material(0xc98dac,{roughness:.85}),blue=material(0x1b3555,{roughness:.83}),rug=material(0x576678,{roughness:1}),jade=material(0x32675f,{roughness:.58}),porcelain=material(0xf4f3e9,{roughness:.22}),warm=material(0xffd28a,{emissive:0xffc76f,emissiveIntensity:1.2,roughness:.4}),violet=material(0xab6ad9,{emissive:0x8c51ca,emissiveIntensity:.6});
 for(const m of [cream,blush,blue,rug]){for(const k of ['map','normalMap','roughnessMap'])m[k]=mats.cloth[k];m.normalScale.copy(mats.cloth.normalScale);}
 const report={version:8,rooms:{},newPointLights:0,layoutMoved:false,source:'Authored reusable 3D furniture, textiles, porcelain and floral compositions; no image scenery'};
 let level=0,y=0,key='';
 function carpet(x,z,rx,rz,mat=rug){disk(decor,mats.gold,x,y+.013,z,rx+.08,rz+.08,.018);disk(decor,mat,x,y+.027,z,rx,rz,.018);ring(decor,cream,x,y+.04,z,rx-.17,rz-.17,.024);}
 function bowl(x,z,s=.7){disk(solid,mats.gold,x,y+.3*s,z,.55*s,.55*s,.6*s);disk(decor,porcelain,x,y+.64*s,z,.65*s,.65*s,.1*s);plant(x,y+.67*s,z,s*.7,true);}
 function rolled(x,py,z,n=3){const g=geometry('v8-rolled-towel',()=>new T.CylinderGeometry(.15,.15,.7,12));for(let i=0;i<n;i++){const o=mesh(decor,g,cream,x+(i%2)*.34,py+.15+Math.floor(i/2)*.27,z);o.rotation.z=Math.PI/2;}}
 function bottle(x,py,z,c=jade){disk(decor,c,x,py+.16,z,.105,.105,.3);disk(decor,mats.gold,x,py+.34,z,.055,.055,.07);disk(decor,porcelain,x,py+.17,z,.108,.108,.09);}
 function lanternPair(x,z){for(const side of [-1,1])lantern(x+side*.6,y,z,.55+Number(side>0)*.2);}
 const bouquet=geometry('v8-shared-small-bouquet',spaGardenFlowerGeometry),stem=geometry('v8-shared-vase-stems',()=>new T.CylinderGeometry(.018,.025,.6,5));
 function flowerVase(x,py,z,s=.5){disk(decor,mats.gold,x,py+.2*s,z,.16*s,.16*s,.4*s);mesh(decor,stem,jade,x,py+.55*s,z,s,s,s);mesh(decor,bouquet,blush,x,py+.68*s,z,s*1.5,s*1.5,s*1.5);}

 function chairDress(c){
  const z=c.seat?.z??c.z;
  // Soft accents fit the current solid back/arm footprint. No new support height.
  for(const side of [-1,1]){const p=pillow(decor,key==='midnight'?blue:blush,c.x+side*.83,y+1.26,z-.42,.54,.35,.5);p.rotation.z=side*.16;}
  for(let j=0;j<5;j++)box(decor,cream,c.x-1.15+j*.575,y+1.4,z-.64,.54,.68,.12,true);
  const throwGeo=geometry('v8-folded-throw',()=>{const g=new T.PlaneGeometry(.85,1.3,8,12);const p=g.attributes.position;for(let i=0;i<p.count;i++){const t=(p.getY(i)+.65)/1.3;p.setZ(i,.018*Math.sin(p.getX(i)*30)+Math.max(0,t-.62)*.9);}g.computeVertexNormals();g.rotateX(-Math.PI/2);return g;});
  mesh(decor,throwGeo,key==='midnight'?cream:blush,c.x-.6,y+1.045,z+.25).material.side=T.DoubleSide;
 }
 function sideboard(x,z,width=4,food=false){
  box(solid,mats.wood,x,y+.7,z,width,1.4,.9,true);box(decor,mats.ivory,x,y+1.43,z,width+.12,.1,1,true);
  for(let j=0;j<5;j++)box(decor,mats.gold,x-width*.42+j*width*.21,y+.7,z+.46,.025,1.15,.025);
  for(const side of [-1,1]){bottle(x+side*width*.33,y+1.5,z);flowerVase(x+side*width*.15,y+1.5,z,.65);}if(food)tray(x,y+1.51,z,true);else rolled(x-.3,y+1.49,z,3);
 }
 function conversation(x,z,theme=cream){
  carpet(x,z,4.8,3.7,key==='midnight'?rug:jade);
  // Twelve individually bounded members preserve the real open sofa mouth.
  for(let j=0;j<9;j++){const a=Math.PI+j*Math.PI/8,px=x+Math.cos(a)*2.7,pz=z+Math.sin(a)*1.9;for(const [mat,py,w,height,d]of [[mats.gold,.4,1,.12,1.1],[theme,.64,.95,.38,1.1],[theme,1.2,.95,.95,.28]]){const back=py>1,xx=px+(back?Math.cos(a)*.35:0),zz=pz+(back?Math.sin(a)*.35:0),o=box(solid,mat,xx,y+py,zz,w,height,d,true);o.rotation.y=-a-Math.PI/2;}if(j%2===0)pillow(decor,blush,px,y+1,pz,.5,.38,.5);}
  disk(solid,mats.gold,x,y+.35,z+.3,1.35,1,.7);disk(decor,mats.ivory,x,y+.73,z+.3,1.45,1.08,.08);tray(x-.45,y+.8,z+.3,true);flowerVase(x+.65,y+.8,z+.3,.9);
  for(const side of [-1,1]){const px=x+side*3.4,pz=z+1.1;box(solid,mats.gold,px,y+.32,pz,1.4,.5,1.6,true);box(solid,theme,px,y+.69,pz,1.5,.3,1.65,true);box(solid,theme,px,y+1.25,pz+.7,1.5,1.1,.28,true);for(const arm of [-1,1])box(solid,theme,px+arm*.7,y+1,pz,.2,.6,1.6,true);pillow(decor,blush,px,y+1,pz+.4,.55,.45,.45);lantern(px+side*.9,y,pz-.4,.7);}
 }
 function ceilingMedallion(x,z,rx,rz,top){
  for(let j=0;j<3;j++)ring(decor,j===1?warm:mats.gold,x,top-.06-j*.045,z,rx+j*.25,rz+j*.25,j===1?.026:.045);
 }
 for(const zone of SPA_V7_ZONES){
  level=zone.level;y=level*P.rise;key=zone.key;h.setRoom(zone);const features=report.rooms[zone.id]={features:[],contacts:zone.seats};
  for(let i=0;i<zone.seats;i++){
   const c=spaV7Seat(zone,i);if(c.pool)continue;
   if(['vip','midnight','cabana','aroma','waterfall'].includes(key)){
    chairDress(c);carpet(c.x,c.z+.2,key==='cabana'?3:2.9,key==='cabana'?2.7:2.5,key==='midnight'?rug:key==='aroma'?jade:rug);
    flowerVase(c.x+(key==='cabana'?2.69:2.04),y+.6,c.z-.95,.65);
    if(['cabana','vip','midnight'].includes(key))rolled(c.x+1.1,y+1.02,c.z+.35,2);
   }
   if(key==='massage'){
    // Head cradle and linen are above the existing treatment support; therapist
    // space at x+2.2 and the four metre front entrance remain clear.
    const cradle=mesh(decor,geometry('v8-head-cradle',()=>new T.TorusGeometry(.27,.085,8,24)),cream,c.x,y+1.18,c.z-1.2);cradle.rotation.x=-Math.PI/2;
    box(decor,blush,c.x,y+1.05,c.z+.85,1.53,.045,.85,true);carpet(c.x,c.z,3.2,3.1,rug);
    for(let j=0;j<4;j++)bottle(c.x+2.65+(j%2)*.3,y+1.68+Math.floor(j/2)*.3,c.z-2.65,j%2?jade:blush);
   }
  }
  if(key==='thermal'){
   for(const side of [-1,1])conversation(side*38,247);
   // Ornament follows the existing double-height balcony edge. The hanging
   // leaves/petals remain well above a cat and never close an actual opening.
   for(let i=0;i<18;i++){const a=Math.PI*.08+i*Math.PI*.84/17,x=Math.cos(a)*48,z=266-Math.sin(a)*21.7;
    line(decor,green,[[x,14,z],[x+Math.sin(i)*.3,12.6,z+.15],[x+Math.sin(i*1.7+1)*.32,10.7,z+Math.cos(i+1)*.18]],.035);for(let j=0;j<6;j++){const t=j/5,px=x+Math.sin(i*1.7+t)*.32,py=13.7-t*2.6,pz=z+Math.cos(i+t)*.18;const leaf=mesh(decor,leafGeo,green,px,py,pz,.8,.85,.8);leaf.rotation.set(-.5,i*2.4+t,0);if(j%2===0)mesh(decor,flowerCluster,i%2?petal:petalDark,px,py,pz,.65,.45,.65);}
   }
   ring(decor,mats.gold,0,.06,266,45.3,19.3,.07);ring(decor,warm,0,.025,266,45.75,19.75,.035);
   for(const side of [-1,1])ceilingMedallion(side*22,266,9,5,25.7);
   features.features.push('pool coping jewellery','embroidered chaise upholstery','paired lantern terraces','water-edge porcelain');
   // Refinement of the ten existing perimeter chaises, not new obstructions.
   for(let i=0;i<10;i++){const a=i*Math.PI/5,x=zone.x+Math.cos(a)*(zone.rx-2.4),z=zone.z+Math.sin(a)*(zone.rz-2.4);const back=box(decor,cream,x,y+1.18,z,1.15,.18,1.05,true);back.rotation.set(-.32,-a,0);const p=pillow(decor,blush,x,y+1.12,z,.52,.2,.48);p.rotation.y=-a;rolled(x,y+.96,z+.6,1);}
   for(const side of [-1,1]){for(let i=0;i<4;i++)lanternPair(side*(34+i*3),251-i*.3);for(let i=0;i<3;i++)bowl(side*50,258+i*7,.75);}
  }else if(key==='vip'){
   tree(125,y,220,1.4);tree(125,y,241,1.25);tree(74,y,258,1.15);
   for(const z of [213,230,247]){box(decor,mats.gold,127,y+4,z,.16,3.2,.42,true);box(decor,warm,126.88,y+4,z,.035,2.8,.18);lantern(124,y,z,.65);}
   features.features.push('eight dressed jacuzzi rims','towel and drink ledges','layered textile islands','private gold arches');
   for(const p of spaPalacePools().filter(p=>p.room===zone.id)){
    ring(decor,mats.gold,p.x,y+.045,p.z,p.rx+.18,p.rz+.18,.075);ring(decor,warm,p.x,y-.055,p.z,p.rx+.055,p.rz+.055,.025);
    // The rear ledge has the basin itself behind it; front stairs stay open.
    const tz=p.z-p.rz-.55;box(decor,mats.gold,p.x,y+.22,tz,2.7,.12,.55,true);rolled(p.x-.75,y+.29,tz,2);tray(p.x+.65,y+.3,tz);
   }
  }else if(key==='midnight'){
   conversation(zone.x-24,zone.z-1,cream);conversation(zone.x+24,zone.z-1,cream);
   features.features.push('navy rugs','quiet layered upholstery','warm Amber corner porcelain','low indirect lamps');
   for(const side of [-1,1]){for(let i=0;i<3;i++)lantern(zone.x+side*37,y,zone.z-10+i*10,.8);flowerVase(zone.x+side*23,y+.1,zone.z+16,1.2);}
   // Accent follows the preserved violet ceiling perimeter; no new low roof.
   for(let i=0;i<4;i++)ring(decor,i%2?violet:mats.gold,zone.x,y+.025,zone.z,5+i*.2,2.8+i*.2,.018);
  }else if(key==='massage'){
   features.features.push('treatment head cradles','linen carpets','oil collections','waiting reception');
   sideboard(zone.x,zone.z+18,5);ceilingMedallion(zone.x,zone.z,19,13,25.7);for(const side of [-1,1])bowl(zone.x+side*5,zone.z+18,1.1);
  }else if(key==='aroma'){
   features.features.push('central blossom canopy','garden rugs','diffuser porcelain','petal trails');
   tree(zone.x,y,zone.z,1.5);ceilingMedallion(zone.x,zone.z,20,16,25.7);for(let i=0;i<12;i++){const a=i*Math.PI/6,x=zone.x+Math.sin(a)*4,z=zone.z+Math.cos(a)*3;flowerVase(x,y+.03,z,.7);}
   for(const side of [-1,1]){sideboard(zone.x+side*20,zone.z+15,3);for(let i=0;i<3;i++)lantern(zone.x+side*20,y,zone.z-7+i*7,.65);}
  }else if(key==='cabana'){
   features.features.push('six dressed private capsules','porcelain tea trays','privacy folds','curved ornamental ribs');
   ceilingMedallion(zone.x,zone.z,28,13,25.7);
   for(let i=0;i<zone.seats;i++){const c=spaV7Seat(zone,i);for(const side of [-1,1]){line(decor,mats.gold,[[c.x+side*3.6,y+.2,c.z-3.4],[c.x+side*3.6,y+7,c.z-3.4],[c.x+side*2.3,y+10.8,c.z-3.4],[c.x,y+11.1,c.z-3.4]],.045);flowerVase(c.x+side*2.8,y+.05,c.z-2.4,.8);}rolled(c.x-1,y+1.05,c.z+.3,3);}
  }else if(key==='cafe'){
   features.features.push('porcelain table settings','curved dessert display','aquarium planted bed','gold framed glass shelves');
   for(let i=0;i<8;i++){const c=spaV7Seat(zone,i),t=c.table??{x:c.x,y:P.baseY+1.3,z:c.z};flowerVase(t.x+.55,t.y-P.baseY+.1,t.z,.6);bottle(t.x-.4,t.y-P.baseY+.1,t.z,blush);}
   // Display stays over the existing solid counter arc, never in its walkway.
   for(let j=0;j<6;j++){const a=-1.4+j*.56,x=Math.sin(a)*9,z=203+Math.cos(a)*9;const glass=box(shell,mats.glass,x,y+2,z,1.6,.75,1,true);glass.rotation.y=a;for(const side of [-1,1])box(decor,mats.gold,x+side*.7,y+2,z,.035,.8,.035);tray(x,y+1.65,z,true);}
   for(let i=0;i<13;i++){const a=i*2.4,r=1+Math.sqrt(i/13)*3.6;const x=Math.sin(a)*r,z=203+Math.cos(a)*r;ball(decor,i%3?jade:blush,x,y+.18,z,.35,.25,.4);for(let j=0;j<3;j++)line(decor,j%2?jade:violet,[[x,y+.2,z],[x+Math.sin(a+j)*.3,y+.7+j*.2,z+Math.cos(a+j)*.2],[x+Math.sin(a+j)*.5,y+1+j*.25,z+Math.cos(a+j)*.4]],.035);}
  }else if(key==='waterfall'){
   features.features.push('sculptural planter groups','lotus porcelain bowls','layered rest islands','garden lantern rhythm');
   conversation(110,254);ceilingMedallion(zone.x,zone.z,22,17,13.7);
   for(let i=0;i<6;i++){const z=213+i*7,x=124-Math.sin(i*.7)*2;bowl(x,z,1.2);lantern(x-1.5,y,z,.75);}
   for(const side of [-1,1])for(let j=0;j<3;j++)flowerVase(zone.x+side*24,y+.02,zone.z+2+j*7,1.2);
  }
  yield;
 }
 return {report};
}
