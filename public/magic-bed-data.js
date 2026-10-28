// One placeable object, never an island. 10 × 4.8 = four native 4 × 3 beds.
export const MAGIC_BED_ID='farm-magic-fruits';
export const MAGIC_BED={id:MAGIC_BED_ID,name:'Велика магічна грядка',icon:'🌱',category:'farm',price:6400,footprint:[10,4.8],actions:['farm'],requiredLevel:6,buildMinutes:4,rarity:'Редкое',fixedPrice:true,magicBed:true,description:'Шість рядів чарівних культур: пухнаста вата, ліхтарики, сердечка, водяні краплі, смарагди й золоті завитки. Розміщується на наявному острові.'};
const rows=[
 ['cotton','Цукрова хмаринка','Насіння рожевої вати','☁️',0xffa9dd,0xffe7f5,45,35,90,.95],
 ['lantern','Помаранчевий ліхтарик','Насіння плодів-ліхтариків','🏮',0xffa337,0xffe5a0,65,50,120,1.2],
 ['heart','Персикове сердечко','Насіння персикових сердечок','🍑',0xffa6a8,0xffe4b8,80,65,150,1.05],
 ['aqua','Водяна крапля','Насіння блакитних крапель','💧',0x66d9ff,0xe7fcff,105,85,180,1.2],
 ['emerald','Смарагдовий плід','Насіння смарагдових спіралей','💚',0x47c995,0xffdf79,140,115,240,1.15],
 ['golden','Золотий завиток','Насіння золотих завитків','✨',0xffbf4f,0xfff0ad,170,145,300,1.25],
];
export const MAGIC_BED_CROPS=rows.map(([kind,name,seedName,icon,color,core,seedPrice,value,gameMinutes,height],row)=>({id:'magic-fruit-'+kind,kind,name,seedName,icon,color,core,seedPrice,value,row,gameMinutes,height,seconds:gameMinutes,minutes:gameMinutes/60,seed:seedPrice,biome:'moon',magicBedOnly:true,yield:2}));
export const MAGIC_BED_SEEDS=MAGIC_BED_CROPS.map(c=>({id:'magic-seed-'+c.kind,name:c.seedName,icon:c.icon,category:'seeds',price:c.seedPrice,seedCrop:c.id,seedRow:c.row,seed:true,footprint:[.8,.8],actions:[],requiredLevel:6,buildMinutes:0,rarity:'Обычное',fixedPrice:true,description:'Рядок '+(c.row+1)+' · '+c.name+' · ріст '+c.gameMinutes+' ігрових хвилин.'}));
export const magicBedCrop=id=>MAGIC_BED_CROPS.find(c=>c.id===id);
export const magicBedSeed=id=>MAGIC_BED_SEEDS.find(s=>s.id===id);
export const MAGIC_BED_SLOTS=MAGIC_BED_CROPS.flatMap(c=>[1,-1].map((side,i)=>({index:c.row*2+i,row:c.row,side,x:-3.65+c.row*1.46,z:side*1.08,fruitZ:side*1.93,fruitY:c.height+.3,crop:c.id})));
export function emptyMagicBed(){return MAGIC_BED_SLOTS.map(()=>({crop:null,plantedAt:0,readyAt:0,cycle:0}));}
export function magicGrowth(cell,now=Date.now()){
 if(!cell?.crop)return {progress:0,stage:0,ready:false};
 const progress=Math.max(0,Math.min(1,(now-cell.plantedAt)/Math.max(1,cell.readyAt-cell.plantedAt)));
 return {progress,stage:Math.min(5,Math.floor(progress*6)),ready:now>=cell.readyAt};
}
