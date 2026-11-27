import {WAREHOUSE as W} from './mosasaur-expansion-data.js';
// One dry, level entry and a two-door pressure chamber; no elevator or new fee.
const floor=W.y+.86,front=W.depth/2,berth=W.platformDepth/2;
export const WAREHOUSE_ACCESS=Object.freeze({
 floor,foot:floor+.012,capacity:3,cruiseSpeed:48,
 shore:Object.freeze({x:0,y:.16,z:96}),
 departure:Object.freeze({x:6,y:-.85,z:92}),
 chamber:Object.freeze({x:W.x,y:floor-.1,z:W.z+berth+22,w:8,d:8,h:7.25}),
 dock:Object.freeze({x:W.x,y:floor+.56,z:W.z+berth+35}),
 outside:Object.freeze({x:W.x,y:floor+.012,z:W.z+berth+27}),
 inside:Object.freeze({x:W.x,y:floor+.012,z:W.z+berth+6}),
 lobby:Object.freeze({x:W.x,y:floor+.012,z:W.z+front-20}),
 aperture:Object.freeze({min:Object.freeze([-4,.66,front-10]),max:Object.freeze([4,8,berth+3])}),
});
export const WAREHOUSE_ACTIVITIES=Object.freeze([
 Object.freeze({id:'warehouse-explore',name:'Warehouse · огляд',action:'explore',duration:45,capacity:12}),
 Object.freeze({id:'warehouse-rest',name:'Warehouse · відпочинок',action:'rest',duration:55,capacity:8}),
]);
export const warehouseActivity=id=>WAREHOUSE_ACTIVITIES.find(a=>a.id===id)||null;
export const warehouseOffers=game=>game.unlocked.includes('autumn')?WAREHOUSE_ACTIVITIES.map(a=>({id:a.id,type:a.id,biome:'autumn',name:a.name,action:a.action})):[];
