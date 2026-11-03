import * as T from 'three';
import {shape,line,torus,flowerCluster,teaPavilion,lantern,surfaceTexture} from './fantasy-scenery.js';
import {showcaseWaterfallSteps as waterfallSteps} from './showcase-waterfalls.js';
import {slideBasin} from './slide-water.js';
import {slideBasinWater} from './slide-basin-optics.js';
import {tropicalPalm,tropicalTree,flowerBank,sandstoneColumn,tropicalShore} from './showcase-water-landscape.js';
import {showcaseVignettes} from './showcase-vignettes.js';
const plankGeometry=new T.BoxGeometry(1,1,1);plankGeometry.userData.sharedScenery=true;
const pathStone=new T.CylinderGeometry(1,1,1,7);pathStone.userData.sharedScenery=true;
const steel=new T.MeshStandardMaterial({color:0x789295,roughness:.35,metalness:.24});steel.userData.sharedScenery=true;
const crystalGeometry=new T.LatheGeometry([new T.Vector2(.72,-.5),new T.Vector2(1,-.35),new T.Vector2(.92,.18),new T.Vector2(0,.5)],6);crystalGeometry.userData.sharedScenery=true;
// Distinct landscapes, authored against the actual route clearance. All helpers
// build once into the existing material batch; waterfall buffers stay fixed.
export function* showcaseProps(props,root,spec,route){
 const falls=[],springs=[],obstacles=[],passages=[],margin=spec.radius+2.4,dry=[];for(const leg of route.legs)if(['board','climb','exit','lift'].includes(leg.phase))for(let i=0;i<=24;i++)dry.push(leg.fn(i/24).position);
 const clear=(x,y,z,rx,ry,rz)=>!dry.some(p=>Math.abs(p[0]-x)<rx+4&&Math.abs(p[2]-z)<rz+4&&Math.abs(p[1]-y)<ry+3)&&!route.geometry.some(g=>g.samples.some((s,i)=>i%4===0&&Math.abs(s.p.x-x)<rx+margin&&Math.abs(s.p.z-z)<rz+margin&&Math.abs(s.p.y-spec.radius/2-y)<ry+margin));
 const solid=(kind,color,x,y,z,sx,sy,sz)=>{if(!clear(x,y,z,sx,sy,sz))return null;const m=shape(props,kind,color,x,y,z,sx,sy,sz);if(y-sy/2<1)obstacles.push({x,z,radius:Math.max(sx,sz)});return m;};
 const cliff=(x,z,h,r,color=0xc5aa83)=>{if(!clear(x,h/2,z,r,h/2,r))return false;sandstoneColumn(props,x,z,h,r,color);obstacles.push({x,z,radius:r*1.16});return true;};
 const palm=(x,y,z,s=1)=>{if(!clear(x,y+6*s,z,3*s,6*s,3*s))return;tropicalPalm(props,x,y,z,12*s,(x+z)*.3);if(y<2)obstacles.push({x,z,radius:1.6});};
 const tree=(x,y,z,s=1,pink=false)=>{
  const h=12*s,hit=(p,margin)=>{const dx=p[0]-x,dz=p[2]-z,dy=p[1]-y,trunk=dx*dx+dz*dz<(h*.055+margin)**2&&dy>-margin&&dy<h*.76+margin,crown=(dx/(h*.52+margin))**2+(dz/(h*.52+margin))**2+((dy-h*.84)/(h*.32+margin))**2<1;return trunk||crown;};
  if(dry.some(p=>hit(p,3))||route.geometry.some(g=>g.samples.some((p,i)=>i%4===0&&hit(p.p.toArray(),spec.radius+1))))return;
  tropicalTree(props,x,y,z,h,pink);if(y<2)obstacles.push({x,z,radius:h*.055+1});return true;
 };
 const bridge=(x,y,z,length=18,alongX=true)=>{const group=new T.Group();group.position.set(x,y,z);if(!alongX)group.rotation.y=Math.PI/2;props.add(group);shape(group,'cube',0xbf9766,0,0,0,length,.5,4.3);for(const side of [-1,1]){for(let i=0;i<=8;i++)shape(group,'pole',0xc79d65,-length/2+i*length/8,1,side*2,.15,2.4,.15);line(group,[-length/2,1.9,side*2],[length/2,1.9,side*2],0xd6b277,.14);}return group;};
 const crystal=(x,y,z,h,color)=>{const m=solid('cone',color,x,y+h/2,z,h*.19,h,h*.19);if(m){m.geometry=crystalGeometry;m.material=new T.MeshStandardMaterial({color,roughness:.18,metalness:.12,flatShading:true});m.rotation.z=(x%3-1)*.13;const small=shape(props,'cone',0xbba0f5,x+1.3,y+h*.25,z+.3,h*.10,h*.5,h*.1);small.geometry=crystalGeometry;small.material=m.material;}};
 const fall=function*(x,y,z,width,height){const f=yield*waterfallSteps(x,z,width,height,{color:0x3bd4ed});f.position.y+=y-.12;root.add(f);falls.push(f);};
 const cascades=yield*tropicalShore(props,spec,clear,obstacles);
 for(const c of cascades){
  for(const [x,z,rx,rz,surfaceY]of [[c.x,c.z,c.width*.78,3.1,.22],[...c.spring,c.radius,c.radius*.86,c.y+.16]]){
   const pond=slideBasin({x,z,rx,rz,surfaceY,color:0x16c9ed});slideBasinWater(pond.userData.water);pond.userData.bed.material.color.setHex(0x8ad8f3);
   pond.updateMatrix();for(const child of [...pond.children])if(child.material!==pond.userData.water){child.applyMatrix4(pond.matrix);props.add(child);}
   root.add(pond);springs.push(pond);
  }
  yield*fall(c.x,c.y,c.z,c.width,c.y-.22);falls.at(-1).rotation.y=c.angle;
  obstacles.push({x:c.x,z:c.z,radius:Math.max(c.width*.78,3.1)+.8});
 }
 for(const [x,z,h,r]of [[-43,-34,18,8],[44,-34,24,8],[-47,10,14,6],[46,16,17,7]]){if(cliff(x,z,h,r)){palm(x,h,z,1.2);yield*fall(x,h,z+r*.85,3.4,h-1.45);}yield;}
 const builders={
  'barrel-wave':function*(){for(const [x,z]of [[-43,-5],[41,-5],[-34,25],[35,25]])palm(x,1,z,1.5);for(const [x,z]of [[-35,26],[36,28],[-25,-42],[30,-36]])if(clear(x,1,z,5,3,5))flowerBank(props,x,.3,z,0xf59bc8,1.1);for(const [x,z,h]of [[-36,-19,22],[35,-21,30]])if(cliff(x,z,h,6.2)){palm(x,h,z,1.25);teaPavilion(props,x,h+.7,z+1,0xe8bc64,2.0);yield*fall(x,h,z+5.3,4,h-1.45);}},
  'jungle-coaster':function*(){for(const [x,z]of [[-31,-7],[33,-16],[-34,20],[37,22]])tree(x,0,z,2.0);for(const [x,h]of [[-43,18],[44,24]])teaPavilion(props,x,h+.3,-34,0xe4bb72,1.7);for(let j=0;j<6;j++){const a=j*Math.PI/3;line(props,[-31+Math.sin(a)*5,23,-7+Math.cos(a)*5],[-31+Math.sin(a)*13,12,-7+Math.cos(a)*13],0x6ca562,.2);}},
  'crystal-vortex':function*(){for(let j=0;j<14;j++){const a=j*Math.PI*2/14;crystal(Math.sin(a)*43,0,-8+Math.cos(a)*35,12+j%4*3,j%2?0xc28bed:0x9ee0f6);yield;}for(const x of [-42,42])if(cliff(x,-6,35,5.5)){crystal(x,35,-6,17,0xd29af4);crystal(x+3.3,35,-3,11,0x8ddbf3);crystal(x-2.5,35,-8,10,0xae8de8);}},
  'canyon-rafting':function*(){for(let j=0;j<9;j++){const x=j%2?-40:40,z=-34+j*8;cliff(x,z,12+(8-j)*3,7.5,j%2?0xc58a6b:0xd99a72);yield;}bridge(-1,39,-24,54);bridge(1,21,6,60);teaPavilion(props,-36,45,-35,0xd7ad66,1.4);},
  'glass-drop':function*(){for(const x of [-4,23]){shape(props,'pole',0xeadfc3,x,spec.height/2,-13,3.2,spec.height,3.2);for(const y of [18,39,60,79]){shape(props,'pole',0xe0bb68,x,y,-13,4.2,.8,4.2);teaPavilion(props,x,y+1,-13,0x73b8d8,1.5);lantern(props,x,y+1,-9.5,1.4);}}teaPavilion(props,9,spec.height,-12,0xf1cc74,4.3);const badge=torus(props,0xf5cd6d,3.9,.65,9,spec.height+8,-9);shape(props,'sphere',0xf6d476,9,spec.height+7.9,-8.5,1.5,.9,.6);for(const [x,y]of [[7.2,91],[9,92],[10.8,91],[12,89.5]])shape(props,'sphere',0xf6d476,x,y,-8.5,.6,.8,.5);for(const x of [-31,34])tree(x,0,12,1.7,true);},
  'lagoon-launch':function*(){for(const side of [-1,1]){const x=-8+side*(spec.radius+4),gear=torus(props,0xe9bd55,4.2,1.1,x,4,-22);gear.name='Launch pump outside the occupied flume';gear.rotation.y=Math.PI/2;for(let j=0;j<8;j++){const a=j*Math.PI/4;shape(props,'cube',0xe9c66e,x,4+Math.sin(a)*4.6,-22+Math.cos(a)*4.6,1.3,1.3,1.3);}}bridge(-34,2,26,24);palm(-44,0,32,1.5);palm(40,0,30,1.6);teaPavilion(props,-39,4,17,0xefce82,1.6);},
  'surf-halfpipe':function*(){for(const x of [-39,39]){shape(props,'pole',0xd0a777,x,16,-5,1,32,1);teaPavilion(props,x,30,-5,0xe9c171,1.5);}for(let j=0;j<12;j++){const a=j*Math.PI/6;solid('petal',j%2?0xecaddc:0x9adbe8,Math.sin(a)*39,.8,Math.cos(a)*27,2.2,4,1.4);}bridge(0,30,-23,78);},
  'lazy-river':function*(){tree(0,0,-4,3.2);for(const [x,z]of [[-28,3],[28,0],[-9,-25]])tree(x,0,z,1.5);bridge(0,9,24,25);bridge(-29,9,-6,22,false);
   // The river travels along X here: a real open YZ tunnel, not a solid
   // decoration across the water or an unsupported crossbar above it.
   const paint=new T.MeshStandardMaterial({color:0xb7aa8e,roughness:.8,map:surfaceTexture('stone')});paint.userData.surfaceKind='stone';
   for(const x of [-6,6]){const arch=new T.Mesh(new T.TorusGeometry(12,3,8,40,Math.PI),paint);arch.rotation.y=Math.PI/2;arch.position.set(x,4,-30);arch.castShadow=true;props.add(arch);for(const z of [-42,-18]){shape(props,'stone',0xb7aa8e,x,1.5,z,3.3,3.5,3.2);obstacles.push({x,z,radius:3.5});}}
   shape(props,'stone',0xc9b99a,0,16.7,-30,9,2.5,5);flowerBank(props,0,18.7,-30,0xe5b2d5,.9);passages.push({axis:'x',min:-9,max:9,y:4,z:-30,innerRadius:9});
  },
  'fountain-carousel':function*(){tree(0,14,0,1.5,true);for(const [x,z]of [[-36,-28],[36,-28],[-38,25],[38,25]])tree(x,0,z,1.6,true);for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.sin(a)*30,z=Math.cos(a)*30,open=dry.some(p=>p[1]<8&&Math.hypot(p[0]-x,p[2]-z)<7);if(open)continue;shape(props,'pole',0xf0daae,x,3,z,.45,6,.45);if(!dry.some(p=>p[1]<8&&Math.hypot(p[0]-Math.sin(a+.26)*30,p[2]-Math.cos(a+.26)*30)<8))line(props,[x,6,z],[Math.sin(a+.52)*30,6,Math.cos(a+.52)*30],0xf2b7d5,.25);}
   for(const x of [-26,0,26]){
    for(const side of [-1,1]){shape(props,'pole',0xffedcf,x+side*8,4.5,-32,.7,9,.7);shape(props,'pole',0xf0cf8c,x+side*8,.5,-32,1.1,1,1.1);}
    const arch=torus(props,0xffedcf,8,.75,x,9,-32,false,Math.PI);arch.receiveShadow=true;
    for(let j=0;j<5;j++){const a=j*Math.PI/4;flowerBank(props,x+Math.cos(a)*8,9+Math.sin(a)*8,-32,0xf798c6,.65);}
    yield;
   }teaPavilion(props,-33,7,-31,0xf0c37a,1.4);},
  'pool-pendulum':function*(){for(const x of [-17,17])for(const z of [-28,28])line(props,[x,1,z],[x,46,0],0xc8a06b,1.5);line(props,[-20,46,0],[20,46,0],0xe4be77,1.8);const sign=torus(props,0xf1ca77,5,.8,0,49,0);shape(props,'sphere',0xd4b1ec,0,49,.5,3,.7,2);bridge(-1,39,-36,58);for(const x of [-35,35])palm(x,0,35,1.8);},
 };
 yield*builders[spec.kind]();
 yield*showcaseVignettes(props,spec,route,{canPlace:clear,groundObstacles:obstacles});
 // Track supports follow the real floor. Inverted sections get an outer spine;
 // upright columns terminate below that floor, never through a boat or bowl.
 for(const data of route.geometry){
  if(data.bowl||data.barrel||data.river||data.carousel||data.surf)continue;
  const points=data.samples.filter((_,i)=>i%4===0).map(s=>s.p.clone().addScaledVector(s.up,-spec.radius-.8));
  const spine=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),180,.52,6,false),steel);props.add(spine);
  for(let i=16;i<data.samples.length-16;i+=48){const s=data.samples[i];if(s.up.y<.65||s.p.y<12)continue;
   const p=s.p.clone().addScaledVector(s.up,-spec.radius-.8);for(const side of [-1,1]){
    const top=p.clone().addScaledVector(s.right,side*(spec.radius+.6));line(props,[top.x,0,top.z],top.toArray(),0x789295,.5);line(props,p.toArray(),top.toArray(),0x789295,.4);
   }yield;
  }
 }
 for(const leg of route.legs.filter(l=>l.phase==='lift')){
  for(const side of [-1,1]){const a=leg.fn(0).position,b=leg.fn(1).position;line(props,[a[0]+side*(spec.radius+1),a[1]-.6,a[2]],[b[0]+side*(spec.radius+1),b[1]-.6,b[2]],0x607f87,.5);}
  if(spec.kind==='jungle-coaster'){const a=leg.fn(0).position,b=leg.fn(1).position;for(let i=0;i<13;i++){const u=i/12,p=a.map((v,j)=>v+(b[j]-v)*u);line(props,[p[0]-spec.radius-1,p[1]-.75,p[2]],[p[0]+spec.radius+1,p[1]-.75,p[2]],0xb5a382,.22);if(i%3===0)line(props,[p[0],0,p[2]],[p[0],p[1]-1,p[2]],0x789295,.6);}}
 }
 for(const b of route.bowls){
  // A substantial rock/crystal cradle, with an open drain below. The bowl is
  // no longer a thin blue plate standing on twelve bare wooden sticks.
  const profile=[new T.Vector2(8,b.base-3),new T.Vector2(18,b.base-1),new T.Vector2(27,b.base+8),new T.Vector2(b.radius+3,b.base+b.depth-2),new T.Vector2(b.radius,b.base+b.depth-.5)],
   mantle=new T.Mesh(new T.LatheGeometry(profile,72),new T.MeshStandardMaterial({color:0xcbb5d7,roughness:.69,map:surfaceTexture('stone'),side:T.DoubleSide}));
  mantle.material.userData.surfaceKind='stone';mantle.position.set(b.x,0,b.z);mantle.castShadow=mantle.receiveShadow=true;props.add(mantle);
  for(const a of [-1.3,-.6,0,.6,1.3]){const x=b.x+Math.sin(a)*29,z=b.z-Math.cos(a)*29;sandstoneColumn(props,x,z,18,5.5,0xb4a8b5);}
  const rail=torus(props,0xf1ce79,b.radius+4,.23,b.x,b.base+b.depth+1.5,b.z,false,Math.PI*1.6);rail.rotation.x=Math.PI/2;rail.rotation.z=-Math.PI*.8;
  for(let i=0;i<28;i++){const a=-Math.PI*.8+i/27*Math.PI*1.6,x=b.x+Math.cos(a)*(b.radius+4),z=b.z+Math.sin(a)*(b.radius+4);
   if(x<b.x-28)continue;
   line(props,[x,b.base+b.depth-.5,z],[x,b.base+b.depth+1.5,z],0xf1ce79,.13);
   if(i%2===0){flowerBank(props,x,b.base+b.depth-.8,z,i%4?0xf59ccf:0xd69ee9,.7);for(let j=0;j<3;j++)line(props,[x+j*.4,b.base+b.depth-1,z],[x+j*.4,b.base+b.depth-4-j,z+.8],0x629c6e,.15);}
   yield;
  }
 }
 // Every walked step and overhead boarding bridge uses the authored path.
 for(const leg of route.legs){
  if(leg.phase==='climb'){
   const top=leg.fn(1).position[1],n=Math.ceil(top/.45);shape(props,'pole',0xd4bd91,-44,top/2,-37,2.1,top,2.1);
   for(let y=6;y<top;y+=12){torus(props,0xe6bf78,3.0,.35,-44,y,-37).rotation.x=Math.PI/2;}
   teaPavilion(props,-44,top+.2,-37,0xe7b953,3.0);
   for(let i=0;i<=n;i++){const f=leg.fn(i/n),step=shape(props,'cube',0xe9d4a5,...f.position,spec.seats===4?11.6:9,.25,1.2);step.geometry=plankGeometry;step.position.y-=.14;step.rotation.y=f.yaw||0;if(i%4===0){const a=i/n*Math.PI*2*Math.ceil(spec.height/12),p=[-44+Math.sin(a)*11.5,f.position[1]+1.25,-37+Math.cos(a)*11.5];shape(props,'pole',0xc49350,...p,.15,2.6,.15);}if(i%12===0)yield;}
  }else if(['board','exit'].includes(leg.phase)&&leg.fn(0).walking&&leg.fn(.5).position[1]>.5){
   const n=Math.max(8,Math.ceil(new T.Vector3(...leg.fn(0).position).distanceTo(new T.Vector3(...leg.fn(1).position))*2.3));for(let i=0;i<=n;i++){const f=leg.fn(i/n),deck=shape(props,'cube',0xe7cc97,...f.position,spec.seats===4?11.6:9,.3,1.1);deck.geometry=plankGeometry;deck.position.y-=.16;deck.rotation.y=f.yaw||0;if(i%8===0){const side=new T.Vector3(1,0,0).applyAxisAngle(new T.Vector3(0,1,0),f.yaw||0);for(const s of [-1,1]){const p=new T.Vector3(...f.position).addScaledVector(side,s*(spec.seats===4?5.7:4.4));shape(props,'pole',0xbe914e,p.x,p.y+1.1,p.z,.13,2.3,.13);}}if(i%16===0)yield;}
   for(const s of [-1,1]){const points=Array.from({length:17},(_,i)=>{const f=leg.fn(i/16),right=new T.Vector3(1,0,0).applyAxisAngle(new T.Vector3(0,1,0),f.yaw||0);return new T.Vector3(...f.position).addScaledVector(right,s*(spec.seats===4?5.7:4.4)).add(new T.Vector3(0,1.9,0));});props.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.12,4,false),steel));}
   for(let i=0;i<=n;i+=16){const f=leg.fn(i/n),right=new T.Vector3(1,0,0).applyAxisAngle(new T.Vector3(0,1,0),f.yaw||0),half=spec.seats===4?5:3.7;
    for(const s of [-1,1]){const p=new T.Vector3(...f.position).addScaledVector(right,s*half);if((p.x/54)**2+(p.z/51)**2<1)line(props,[p.x,-3,p.z],[p.x,p.y-.35,p.z],0xb98d58,.3);else{const anchor=new T.Vector3(...f.position).addScaledVector(right,-s*half);line(props,[anchor.x,-2.5,anchor.z],[p.x,p.y-.4,p.z],0xba925e,.28);}}
   }
  }
 }
 // Independent dry queues and wide exits remain outside the water and scenery.
 shape(props,'cube',0xe9d7b3,route.entry[0]-1.5,.02,route.entry[2]+2,8,.2,9);
 for(const z of [-2,2,6])shape(props,'pole',0xc2a16e,route.entry[0]-5.3,1.1,route.entry[2]+z,.11,2.1,.11);
 for(const leg of route.legs.filter(l=>['board','exit'].includes(l.phase)&&l.fn(.5).walking)){
  const a=leg.fn(0).position,b=leg.fn(1).position,n=Math.max(1,Math.ceil(new T.Vector3(...a).distanceTo(new T.Vector3(...b))/2));
  for(let i=0;i<=n;i++){const f=leg.fn(i/n);if(f.position[1]>.4)continue;const stone=shape(props,'stone',i%3?0xe8d5b6:0xd7c3a4,f.position[0],.04,f.position[2],1.2,.12,1.1);stone.geometry=pathStone;stone.rotation.y=i*.37;}
  yield;
 }
 for(let i=0;i<8;i++)shape(props,'cube',0xdac5a2,route.pool[0]+route.pool[2]-2+i*.65,1.45-i*.17,route.pool[1],1.1,.23,4.8);
 return {canPlace:clear,groundObstacles:obstacles,waterfalls:falls,springs,hollowPassages:passages,update(time,reduced){for(const f of falls)f.userData.update?.(time,reduced);for(const p of springs)p.userData.update(time,reduced);}};
}
