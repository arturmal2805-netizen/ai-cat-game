import {MALL_LAYOUT,mallRoomPlacement,mallRoomContacts} from './mall-layout.js';
import {MALL_ICE_FLAVORS} from './mall-ice-data.js';
// Stable product/venue addresses are independent of display-brand replacements.
export const MALL_ID = 'underwater-cat-mall';
export const MALL = MALL_LAYOUT;
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
  const placement=mallRoomPlacement(j,rows.length),angle=-placement.yaw-Math.PI/2;
  const store={id:'mall-'+key,key,name,brand:key,floor:i+1,kind,price,angle,placement,x:placement.x,z:placement.z,y:MALL_FLOORS[i].y};
  return Object.freeze({...store,entrance:mallPoint(store,0,.18,placement.d/2+3),counter:mallPoint(store,0,.18,5.5),seat:mallPoint(store,8,.18,14.3)});
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
const originalProducts=MALL_STORES.flatMap(s=>(s.price>0?(goods[s.kind]||[]):[]).map(([key,name,icon,use],i)=>Object.freeze({
  id:`${s.id}-${key}`,storeId:s.id,name,brand:mallLabel(s),category:'mall',kind:s.kind,use,icon,
  price:Math.max(1,Math.round(s.price*[1,.6,.4][i])),stock:['food','cinema','arcade','spa','bowling','photo'].includes(s.kind)?100000:60,
  unique:!['food','cinema','arcade','spa','bowling','photo'].includes(s.kind),
  ...(s.key==='ice'?{legacy:true}:{}),
})));
export const MALL_PRODUCTS = Object.freeze([...originalProducts.filter(p=>!p.legacy),...MALL_ICE_FLAVORS.map(f=>Object.freeze({
  id:'mall-ice-'+f.key,storeId:'mall-ice',name:f.name,brand:MALL_BRANDS.ice,category:'mall',kind:'food',use:'eat',icon:f.icon,price:f.price,stock:100000,unique:false,iceFlavor:f.key,
})),...originalProducts.filter(p=>p.legacy)]);
export const mallProduct = id => MALL_PRODUCTS.find(p=>p.id===id);
export const MALL_ACTIONS = Object.freeze(['VisitMall','EnterElevator','SelectFloor','BrowseStore','InspectProduct','CompareProducts','PurchaseItem','VisitRestaurant','OrderFood','EatMeal','BuyCinemaTicket','WatchMovie','PlayArcade','MeetFriend','RelaxAtMall','ReturnHome']);
export function mallOffers(game){return game.unlocked?.includes('autumn')?MALL_STORES.map(s=>({id:s.id,type:s.id,biome:'autumn',name:`Підводний ТРЦ · F${s.floor} · ${s.name}`,action:['food'].includes(s.kind)?'eat':['rest','spa','social'].includes(s.kind)?'rest':'play'})):[];}

export const MALL_SIGN_HEADERS=['CAT SAFE MENU','NEW COLLECTION','PICK UP','TICKETS','OCEAN SPECIAL','WELCOME'];
export function mallSignTexts(parody=false){return ['CHICHI','CAT SHOPPING MALL','UNDERWATER MEGA MALL','OCEAN EXPRESS',...MALL_STORES.map(s=>s.key==='vuitton'&&!parody?'LOUIS VUITTON':mallLabel(s,parody)),...MALL_FLOORS.map(f=>`F${f.id}  ${f.short.toUpperCase()}`),...MALL_PRODUCTS.filter(p=>!p.legacy).map(p=>`${p.name} · ${p.price}`),...MALL_SIGN_HEADERS];}

// Coordinates are the real fittings' local frame: +Z faces the public gallery.
// Both navigation and the cashier use these same authored contact positions.
export function mallPoint(store,x=0,y=.18,z=0){const c=Math.cos(store.angle),s=Math.sin(store.angle);return{x:store.x-s*x-c*z,y:store.y+y,z:store.z+c*x-s*z};}
export function mallServiceFrames(store,slot=0,radius=.8){
  const frame=mallRoomContacts(store.kind,slot,radius),map=p=>mallPoint(store,p.x,p.y,p.z);
  return{customer:map(frame.customer),vendor:map(frame.vendor),approach:map(frame.approach),seat:map(frame.seat),yaw:Math.PI/2-store.angle,seated:frame.seated};
}
