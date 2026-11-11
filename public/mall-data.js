// Stable product/venue addresses are independent of display-brand replacements.
export const MALL_ID = 'underwater-cat-mall';
export const MALL = Object.freeze({biome:'autumn', x:0, z:55, y:-117, rise:7.5, radius:32,
  lift:{x:12,z:87,radius:7.6}, gate:{x:12,y:.35,z:99}, capacity:4, speed:9});
export const MALL_FLOORS = Object.freeze([
  ['Atrium','Ocean Grand Atrium',0x65e4ed],['Luxury','Cat Luxury Avenue',0xffcd87],
  ['Food','Cat Food Paradise',0xffa287],['Cinema','Cinema & Entertainment',0xce8fff],
  ['Lifestyle','Cat Lifestyle',0x80e7df],['Leisure','Ocean Leisure',0xf4a5ec],
  ['Observatory','Sky Ocean Observatory',0x83dcff],
].map(([short,name,color],i)=>Object.freeze({id:i+1,short,name,color,y:MALL.y+i*MALL.rise})));
// Plain display names can be exchanged without changing ownership or AI IDs.
export const MALL_BRANDS = Object.freeze({vuitton:'Louis Vuitton',gucci:'Gucci',prada:'Prada',chanel:'Chanel',nike:'Nike',
  mcd:'McDonald’s',star:'Starbucks',kfc:'KFC',sushi:'Sushi Cat',bakery:'Meow Bakery',ice:'Ocean Ice Cream',
  ikea:'IKEA Cat Home',lego:'LEGO Cat World',tech:'Paw Technology',toys:'Cat Toy Planet',fashion:'Pet Fashion',books:'Book & Magic'});
export const MALL_PARODY_BRANDS = Object.freeze({vuitton:'Louis Mewton',gucci:'Purrcci',prada:'Prawda',chanel:'Chatnelle',nike:'Paw Sprint',
  mcd:'McMeow',star:'StarPaws',kfc:'Kitten Kitchen',ikea:'MIKEA',lego:'MEOW Blocks'});
const floors = [
  [['cafe','Pearl Café','food',65],['map','Ocean Welcome','rest',0]],
  [['vuitton','Louis Vuitton','fashion',850],['gucci','Gucci','fashion',720],['prada','Prada','fashion',680],['chanel','Chanel','fashion',790],['nike','Nike','fashion',420]],
  [['mcd','McDonald’s','food',48],['star','Starbucks','food',40],['kfc','KFC','food',55],['sushi','Sushi Cat','food',72],['bakery','Meow Bakery','food',36],['ice','Ocean Ice Cream','food',45]],
  [['cinema','CHICHI CINEMA','cinema',90],['cinema-two','Moon Cinema','cinema',90],['arcade','Pixel Paw Arcade','arcade',25],['dance','Neon Dance','dance',0],['bowling','Ocean Bowling','bowling',35],['vr','Deep VR','arcade',40],['photo','Paw Photo','photo',20]],
  [['ikea','IKEA Cat Home','home',320],['lego','LEGO Cat World','toy',180],['tech','Paw Technology','gadget',480],['toys','Cat Toy Planet','toy',95],['fashion','Pet Fashion','fashion',160],['books','Book & Magic','book',120]],
  [['restaurant','Blue Horizon','food',110],['spa','Ocean Spa','spa',80],['jellies','Jellyfish Garden','rest',0],['playground','Coral Playground','arcade',0],['tunnel','Ocean View Tunnel','rest',0]],
  [['sky-cafe','Sky Ocean Café','food',85],['date','Moonlight Seats','social',0],['observatory','Ocean Hologram','rest',0]],
];
export const MALL_STORES = Object.freeze(floors.flatMap((rows,i)=>rows.map(([key,name,kind,price],j)=>{
  const angle = Math.PI*.5 + (j+1)*Math.PI*2/(rows.length+1), radius=23;
  return Object.freeze({id:'mall-'+key,key,name,brand:key,floor:i+1,kind,price,angle,
    x:Math.cos(angle)*radius,z:MALL.z+Math.sin(angle)*radius,
    entrance:{x:Math.cos(angle)*16,z:MALL.z+Math.sin(angle)*16},
    counter:{x:Math.cos(angle)*24,z:MALL.z+Math.sin(angle)*24},
    seat:{x:Math.cos(angle)*26,z:MALL.z+Math.sin(angle)*26},y:MALL_FLOORS[i].y});
})));
export const mallStore = id => MALL_STORES.find(s=>s.id===id);
export const mallFloor = floor => MALL_FLOORS.find(f=>f.id===floor);
export const mallLabel = (s,parody=false) => (parody&&MALL_PARODY_BRANDS[s.brand])||MALL_BRANDS[s.brand]||s.name;
const goods = {
  fashion:[['collar','Перлинний нашийник','🎀','wear'],['bag','Сумочка з лапкою','👜','carry'],['bow','Океанський бантик','🎀','wear']],
  food:[['meal','Ніжне котяче філе','🐟','eat'],['treat','Безпечний котячий десерт','🍥','eat'],['drink','Бульйон із морською зірочкою','🥣','eat']],
  cinema:[['ticket','Квиток «Пригоди Чичі»','🎟️','cinema']],
  arcade:[['pass','Сеанс гри','🕹️','arcade']],dance:[],bowling:[['pass','Гра в боулінг','🎳','bowling']],photo:[['print','Пам’ятне фото','📸','photo']],
  home:[['bed','Перлинна лежанка','🛏️','rest'],['lamp','Лампа-медуза','🪼','home'],['cushion','Океанська подушка','🛋️','rest']],
  toy:[['ball','Коралова іграшка','🧶','play'],['blocks','Набір котячих кубиків','🧩','play']],
  gadget:[['tablet','Котячий планшет','📱','play'],['headset','Океанські навушники','🎧','wear']],
  book:[['book','Книга океанських чар','📖','read'],['star','Магічна зоря','✨','play']],
  spa:[['session','Перлинний догляд','🫧','spa']],rest:[],social:[],
};
export const MALL_PRODUCTS = Object.freeze(MALL_STORES.flatMap(s=>(s.price>0?(goods[s.kind]||[]):[]).map(([key,name,icon,use],i)=>Object.freeze({
  id:`${s.id}-${key}`,storeId:s.id,name,brand:mallLabel(s),category:'mall',kind:s.kind,use,icon,
  price:Math.max(1,Math.round(s.price*[1,.6,.4][i])),stock:['food','cinema','arcade','spa','bowling','photo'].includes(s.kind)?100000:60,
  unique:!['food','cinema','arcade','spa','bowling','photo'].includes(s.kind),
}))));
export const mallProduct = id => MALL_PRODUCTS.find(p=>p.id===id);
export const MALL_ACTIONS = Object.freeze(['VisitMall','EnterElevator','SelectFloor','BrowseStore','InspectProduct','CompareProducts','PurchaseItem','VisitRestaurant','OrderFood','EatMeal','BuyCinemaTicket','WatchMovie','PlayArcade','MeetFriend','RelaxAtMall','ReturnHome']);
export function mallOffers(game){return game.unlocked?.includes('autumn')?MALL_STORES.map(s=>({id:s.id,type:s.id,biome:'autumn',name:`Підводний ТРЦ · F${s.floor} · ${s.name}`,action:['food'].includes(s.kind)?'eat':['rest','spa','social'].includes(s.kind)?'rest':'play'})):[];}

export const MALL_SIGN_HEADERS=['CAT SAFE MENU','NEW COLLECTION','PICK UP','TICKETS','OCEAN SPECIAL','WELCOME'];
export function mallSignTexts(parody=false){return ['CHICHI','CAT SHOPPING MALL','UNDERWATER MEGA MALL','OCEAN EXPRESS',...MALL_STORES.map(s=>mallLabel(s,parody)),...MALL_FLOORS.map(f=>`F${f.id}  ${f.short.toUpperCase()}`),...MALL_PRODUCTS.map(p=>`${p.name} · ${p.price}`),...MALL_SIGN_HEADERS];}

// Coordinates are the real fittings' local frame: +Z faces the public gallery.
// Both navigation and the cashier use these same authored contact positions.
export function mallPoint(store,x=0,y=.18,z=0){const c=Math.cos(store.angle),s=Math.sin(store.angle);return{x:store.x-s*x-c*z,y:store.y+y,z:store.z+c*x-s*z};}
export function mallServiceFrames(store,slot=0,radius=.8){
  const side=slot%2?1:-1,food=store.kind==='food',cinema=store.kind==='cinema';
  const customer=mallPoint(store,cinema?-4:0,.18,cinema?7.2:food?3.05:6.2);
  const vendor=mallPoint(store,cinema?-4:0,.18,cinema?3.55:food?-.85:2.6);
  let approach,seat,yaw,seated=false;
  if((food||cinema)&&radius<=1.05){
    const x=food?side*3.65:side*3.6,z=food?2.9:.5;
    approach=mallPoint(store,food?side*1.9:0,.18,food?3.2:z);
    seat=mallPoint(store,x,.99,z);seated=true;
    yaw=Math.PI/2-store.angle;
  }else{
    approach=mallPoint(store,side*4.3,.18,7.3);seat={...approach};yaw=Math.PI/2-store.angle;
  }
  return{customer,vendor,approach,seat,yaw,seated};
}
