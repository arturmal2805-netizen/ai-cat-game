// A new leaf destination. Released map addresses and waterpark assets stay put.
export const ZOO_ID='magic-zoo',ZOO_RADIUS=11.65*Math.sqrt(3),ZOO_GATE={x:0,z:17.9};
export const ZOO_BIOME={id:ZOO_ID,name:'Чарівний зоопарк',subtitle:'Шість великих вольєрів · маленькі дива й добрі велетні',icon:'🐘',price:3600,requiredLevel:8,radius:ZOO_RADIUS,center:[207,136],arrival:[0,17.9],ground:0xa6c67b,edge:0x929b88,foliage:0x65a74c,accent:0xffc9dc,zoo:true};
const row=[
 ['elephant','Слонова долина','🐘',0,0,-12.8,0x9bbf70,0xffd0ab,'Добрі велетні, слоненя, хоботи-фонтани та каскад.'],
 ['axolotl','Риф аксолотлів','🫧',6500,-12.1,6.1,0x8ce6ee,0xffb3d6,'Крихітні пухкі аксолотлі з пелюстковими зябрами у великому прозорому акваріумі.'],
 ['otter','Лагуна видр','🦦',11000,0,11.35,0x74c9b3,0xf2cb83,'Пірнання, веселі перевороти й відпочинок на теплих камінцях.'],
 ['tiger','Бузкові водоспади','🐯',18000,12.1,6.1,0xa8adc9,0xc998f0,'Білі тигри, прохолодні каскади, бузкові квіти та іграшки.'],
 ['polar','Полярна казка','🐻‍❄️',29000,11.5,-6.4,0xc6edf5,0xa5c9ef,'Білі ведмеді, крижані скелі, ялинки й чиста льодова вода.'],
 ['gorilla','Джунглі горил','🦍',44000,-11.5,-6.4,0x5a9c64,0xf1cf8f,'Могутні добрі горили, ліани, дерев’яні конструкції та зелень.'],
];
export const ZOO_EXHIBITS=row.map(([species,name,icon,price,x,z,ground,accent,description],index)=>({id:'zoo-'+species,type:'zoo-'+species,biome:ZOO_ID,kind:'zoo',zoo:true,species,index,name,icon,price,x,z,ground,accent,description,radius:4.5,w:9,d:9,h:species==='axolotl'?4.4:4,buildMinutes:0,rate:0,footprint:[9,9]}));
export const zooExhibit=id=>ZOO_EXHIBITS.find(e=>e.id===id||e.species===id);
export const zooFacing=e=>Math.atan2(-e.x,-e.z);
export function zooSeats(e){
 const r=Math.hypot(e.x,e.z),ux=-e.x/r,uz=-e.z/r;
 return [0,-3.8,3.8].map((side,index)=>({x:e.x+ux*6.6+uz*side,z:e.z+uz*6.6-ux*side,y:.16,index}));
}
export const zooViewGate=e=>zooSeats(e)[0];
export const zooObstacles=extra=>[...ZOO_EXHIBITS.map(e=>({id:e.id,x:e.x,z:e.z,radius:e.radius+.08})),{x:0,z:0,radius:2.15},{x:-9.5,z:16.7,radius:.9},{x:9.5,z:16.7,radius:.9},{x:-3.3,z:19.8,radius:.3},{x:3.3,z:19.8,radius:.3},...(extra||[])];
export function zooExit(e,index=0){const p=zooSeats(e)[index%3],r=Math.hypot(p.x,p.z);return{x:p.x*(r-.85)/r,z:p.z*(r-.85)/r,y:.16};}
export const ZOO_ANIMALS={elephant:{count:3,scale:[1.15,1.02,.52],height:3.6},axolotl:{count:8,scale:[.72,.63,.6,.52,.48,.58,.55,.45],height:.62},otter:{count:4,scale:[.8,.72,.76,.6],height:.85},tiger:{count:3,scale:[.87,.8,.58],height:1.65},polar:{count:3,scale:[.95,.8,.52],height:2.15},gorilla:{count:3,scale:[1,.9,.6],height:2.65}};
