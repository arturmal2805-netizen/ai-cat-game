// Appended islands and permanent plant IDs; existing world addresses never move.
export const MAGIC_FARMS = [
  {id:'farm-starlight',kind:'star',name:'Зоряний фруктовий сад',icon:'🌟',price:120000,requiredLevel:8,radius:88,center:[-600,-340],ground:0x8cc995,edge:0x8984b0,foliage:0x71bb91,accent:0xffdf87,water:0x52dcd9,subtitle:'Зоряні крони, місячні груші, світлячки та озеро бажань.'},
  {id:'farm-sugarcloud',kind:'cloud',name:'Ферма цукрових хмар',icon:'☁️',price:155000,requiredLevel:10,radius:96,center:[-650,-60],ground:0xc6e2ce,edge:0xb1a4cd,foliage:0xe9abd8,accent:0x9be6ff,water:0xb2e5fa,subtitle:'Пухнасті дерева, хмарні ягоди й солодкі рожеві каскади.'},
  {id:'farm-crystal',kind:'crystal',name:'Кристальні джунглі',icon:'💎',price:195000,requiredLevel:12,radius:104,center:[-630,220],ground:0x84bdb3,edge:0x8b86ae,foliage:0x91cbb2,accent:0xc5a0ff,water:0x49cbdc,subtitle:'Сяйливі кристали, прозорі фрукти й бірюзові джерела.'},
  {id:'farm-moonpumpkin',kind:'moon',name:'Місячний гарбузовий край',icon:'🌙',price:240000,requiredLevel:14,radius:98,center:[-410,400],ground:0x9cb4c0,edge:0x777e9c,foliage:0xc5d9e0,accent:0xffc07b,water:0x8ecdf1,subtitle:'Велетенські гарбузи, срібний гай і теплі нічні ліхтарики.'},
].map(f=>({...f,magicFarm:true,arrival:[0,f.radius-10]}));
const fruitSpecs = [
  ['starberry','Зірчаста ягода','⭐',0xffd05d,0xfff6c1,55,'Звичайний',90],['moonpear','Місячна груша','🍐',0xadebf1,0xe9feff,120,'Рідкісний',180],['sunstar','Сонячна зірка','🌟',0xffa5be,0xffe7a3,380,'Легендарний',420],
  ['cloudberry','Ягідка-хмаринка','☁️',0xffb7e6,0xffeffa,65,'Звичайний',100],['sugarpeach','Цукровий персик','🍑',0x9fdcfb,0xe8faff,145,'Рідкісний',200],['rainbowfloss','Веселкова солодка хмарка','🌈',0xe6b5ff,0xffe6a3,440,'Легендарний',450],
  ['crystalapple','Кристальне яблуко','💎',0x75e4d9,0xf2fff9,90,'Звичайний',120],['amethystplum','Аметистова слива','🔮',0xb597ff,0xffe8ff,195,'Рідкісний',240],['aurorafruit','Плід полярного сяйва','✨',0xffabd7,0xffffff,560,'Легендарний',480],
  ['moonpumpkin','Місячний гарбуз','🎃',0xffbc78,0xffe4a5,100,'Звичайний',130],['silverpear','Срібляста груша','🍐',0xc3def8,0xf5ffff,210,'Рідкісний',260],['lunapumpkin','Гарбуз місячного сяйва','🌙',0xc4b2fa,0xffefa9,620,'Легендарний',540],
];
export const MAGIC_FRUITS=fruitSpecs.map(([id,name,icon,color,core,value,rarity,seconds],i)=>({id,name,icon,color,core,value,rarity,seconds,minutes:seconds/60,seed:0,biome:MAGIC_FARMS[Math.floor(i/3)].id,magicFruit:true}));
export const magicFarm=id=>MAGIC_FARMS.find(f=>f.id===id);
export const farmActivity=id=>MAGIC_FARMS.find(f=>'orchard-'+f.id===id);
export const farmFruits=id=>MAGIC_FRUITS.filter(f=>f.biome===id);
const layouts=new Map();
export function magicFarmLayout(id){
 if(layouts.has(id))return layouts.get(id);
 const farm=magicFarm(id);if(!farm)return null;
 const fruits=farmFruits(id),plants=[];
 for(let i=0;i<18;i++){
  let x,z;
  if(farm.kind==='star'){const a=i*Math.PI*2/18;x=Math.sin(a)*57;z=Math.cos(a)*43-5;}
  else if(farm.kind==='cloud'){x=(i%3-1)*43+Math.sin(Math.floor(i/3)*1.7)*5;z=Math.floor(i/3)*22-58;}
  else if(farm.kind==='crystal'){const side=i%2?1:-1;x=side*(32+Math.sin(i*.9)*13);z=Math.floor(i/2)*14-62;}
  else {const a=i*Math.PI*2/18;x=Math.sin(a)*(i%2?60:43);z=Math.cos(a)*(i%2?50:34)-4;}
  const fruit=fruits[i===5||i===14?2:i%3===1?1:0];
  plants.push({id:'plant-'+i,x,z,fruit:fruit.id,kind:farm.kind==='moon'&&i%3!==1?'pumpkin':farm.kind==='crystal'?'crystal':'tree',radius:farm.kind==='moon'&&i%3!==1?3.2:2.2,height:5.5+(i%3)*.9});
 }
 const pond=farm.kind==='star'?[0,-7,18,15]:farm.kind==='cloud'?[20,-4,12,10]:farm.kind==='crystal'?[0,-32,14,24]:[0,-5,20,16];
 const result={plants,pond,storage:{x:0,z:67},gate:{x:0,z:farm.radius-11},bounds:farm.radius-5};layouts.set(id,result);return result;
}
export const MAGIC_FARM_OBJECTS=MAGIC_FARMS.map(f=>({id:'orchard-'+f.id,type:'farm-field',biome:f.id,name:f.name,x:0,z:0,magicFarm:f.id}));
