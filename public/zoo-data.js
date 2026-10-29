// A new leaf destination. Released map addresses and waterpark assets stay put.
export const ZOO_LINEAR_SCALE=2; // Four times the released land/exhibit area.
export const ZOO_ID='magic-zoo',ZOO_RADIUS=11.65*Math.sqrt(3)*ZOO_LINEAR_SCALE,ZOO_GATE={x:0,z:17.9*ZOO_LINEAR_SCALE};
export const ZOO_BIOME={id:ZOO_ID,name:'Чарівний зоопарк',subtitle:'П’ять просторих вольєрів · маленькі дива й добрі велетні',icon:'🐘',price:3600,requiredLevel:8,radius:ZOO_RADIUS,center:[207,136],arrival:[ZOO_GATE.x,ZOO_GATE.z],ground:0xa6c67b,edge:0x929b88,foliage:0x65a74c,accent:0xffc9dc,zoo:true};
const row=[
 ['elephant','Слонова долина','🐘',0,0,-12.8,0x9bbf70,0xffd0ab,'Добрі велетні, слоненя, хоботи-фонтани та каскад.'],
 ['axolotl','Риф аксолотлів','🫧',6500,-12.1,6.1,0x8ce6ee,0xffb3d6,'Крихітні пухкі аксолотлі з пелюстковими зябрами у великому прозорому акваріумі.'],
 ['otter','Лагуна видр','🦦',11000,0,11.35,0x74c9b3,0xf2cb83,'Пірнання, веселі перевороти й відпочинок на теплих камінцях.'],
 ['polar','Полярна казка','🐻‍❄️',29000,11.5,-6.4,0xc6edf5,0xa5c9ef,'Білі ведмеді, крижані скелі, ялинки й чиста льодова вода.'],
 ['gorilla','Джунглі горил','🦍',44000,-11.5,-6.4,0x5a9c64,0xf1cf8f,'Могутні добрі горили, ліани, дерев’яні конструкції та зелень.'],
];
export const ZOO_EXHIBITS=row.map(([species,name,icon,price,x,z,ground,accent,description],index)=>({id:'zoo-'+species,type:'zoo-'+species,biome:ZOO_ID,kind:'zoo',zoo:true,species,index,name,icon,price,x:species==='polar'?24.5:species==='otter'?8:x*ZOO_LINEAR_SCALE,z:species==='polar'?-4:species==='otter'?23.5:z*ZOO_LINEAR_SCALE,ground,accent,description,radius:['polar','otter'].includes(species)?11.5:9,w:['polar','otter'].includes(species)?23:18,d:['polar','otter'].includes(species)?23:18,h:species==='axolotl'?4.4:4,buildMinutes:0,rate:0,footprint:['polar','otter'].includes(species)?[23,23]:[18,18]}));
export const zooExhibit=id=>ZOO_EXHIBITS.find(e=>e.id===id||e.species===id);
export const zooFacing=e=>Math.atan2(-e.x,-e.z);
export function zooSeats(e){
 const r=Math.hypot(e.x,e.z),ux=-e.x/r,uz=-e.z/r;
 return [0,-3.8,3.8].map((side,index)=>({x:e.x+ux*(e.radius+2.1)+uz*side,z:e.z+uz*(e.radius+2.1)-ux*side,y:.16,index}));
}
export const zooViewGate=e=>zooSeats(e)[0];
export const zooObstacles=extra=>[...ZOO_EXHIBITS.map(e=>({id:e.id,x:e.x,z:e.z,radius:e.radius+.08})),{x:0,z:0,radius:4.3},{x:-19,z:33.4,radius:.9},{x:19,z:33.4,radius:.9},{x:-6.6,z:39.6,radius:.3},{x:6.6,z:39.6,radius:.3},...(extra||[])];
export function zooExit(e,index=0){const p=zooSeats(e)[index%3],r=Math.hypot(p.x,p.z);return{x:p.x*(r-.85)/r,z:p.z*(r-.85)/r,y:.16};}
export const ZOO_ANIMALS={elephant:{count:3,scale:[1.15,1.02,.52],height:3.6},axolotl:{count:8,scale:[.72,.63,.6,.52,.48,.58,.55,.45],height:.62},otter:{count:4,scale:[.8,.72,.76,.6],height:.85},polar:{count:3,scale:[.95,.8,.52],height:2.15},gorilla:{count:3,scale:[1,.9,.6],height:2.65}};

// Retain the historical paid receipt for cached devices; no tiger object, gate,
// model, collision volume, map entry or visitor activity is created.
export const ZOO_RETIRED_EXHIBIT={id:'zoo-tiger',index:3,price:18000};
