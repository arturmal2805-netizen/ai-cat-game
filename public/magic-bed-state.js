import {MAGIC_BED_ID,MAGIC_BED_SLOTS,magicBedCrop,magicBedSeed,emptyMagicBed} from './magic-bed-data.js';
import {addXP} from './progression.js';
export function normalizeMagicBed(cells){
 return emptyMagicBed().map((empty,i)=>{const c=cells?.[i],crop=magicBedCrop(c?.crop),cycle=Number.isSafeInteger(c?.cycle)&&c.cycle>=0?c.cycle:0;
  return crop&&crop.row===MAGIC_BED_SLOTS[i].row&&Number.isFinite(c.plantedAt)&&c.plantedAt>=0&&Number.isFinite(c.readyAt)&&c.readyAt>c.plantedAt?{crop:crop.id,plantedAt:c.plantedAt,readyAt:c.readyAt,cycle}:{...empty,cycle};});
}
export function magicBedSnapshotValid(game){
 const valid=cells=>Array.isArray(cells)&&cells.length===MAGIC_BED_SLOTS.length&&cells.every((c,i)=>c&&Number.isSafeInteger(c.cycle)&&c.cycle>=0&&(c.crop===null&&c.plantedAt===0&&c.readyAt===0||magicBedCrop(c.crop)?.row===MAGIC_BED_SLOTS[i].row&&Number.isFinite(c.plantedAt)&&c.plantedAt>=0&&Number.isFinite(c.readyAt)&&c.readyAt>c.plantedAt));
 for(const p of game?.placements||[])if(p.item===MAGIC_BED_ID&&!valid(game.farm?.fields?.[p.id]))return false;
 for(const r of game?.relocatedPurchases||[])if(r.item===MAGIC_BED_ID&&r.fieldCells&&!valid(r.fieldCells))return false;
 return true;
}
export function plantMagicSeed(game,field,index,seedId,now=Date.now()){
 const p=game.placements.find(p=>p.id===field),s=magicBedSeed(seedId),crop=s&&magicBedCrop(s.seedCrop),slot=MAGIC_BED_SLOTS[index],cell=game.farm.fields[field]?.[index];
 if(p?.item!==MAGIC_BED_ID||p.readyAt>now)throw Error('Спочатку побудуйте магічну грядку.');
 if(!slot||!s||s.seedRow!==slot.row)throw Error('Це насіння можна посадити тільки у свій рядок.');
 if(!cell||cell.crop)throw Error('Ця ділянка вже засаджена.');
 if(!(game.inventory[seedId]>0))throw Error('Купіть відповідне насіння в магазині.');
 const next=structuredClone(game);next.inventory[seedId]--;next.farm.fields[field][index]={crop:crop.id,plantedAt:now,readyAt:now+crop.gameMinutes*1000,cycle:cell.cycle};return next;
}
export function harvestMagicFruit(game,receipt,now=Date.now()){
 const p=game.placements.find(p=>p.id===receipt?.field),slot=MAGIC_BED_SLOTS[receipt?.index],cell=game.farm.fields[receipt?.field]?.[receipt?.index],crop=magicBedCrop(cell?.crop);
 if(p?.item!==MAGIC_BED_ID||p.readyAt>now||!slot||!crop||crop.row!==slot.row||cell.cycle!==receipt.cycle||cell.readyAt>now)throw Error('Цей плід ще росте або його вже зібрали.');
 if((game.farm.stock[crop.id]||0)+crop.yield>100000)throw Error('Сховище заповнене. Продайте врожай або пригостіть котиків.');
 const next=structuredClone(game);next.farm.stock[crop.id]=(next.farm.stock[crop.id]||0)+crop.yield;next.farm.harvests+=crop.yield;next.farm.fields[p.id][receipt.index]={crop:null,plantedAt:0,readyAt:0,cycle:cell.cycle+1};return {game:addXP(next,18*crop.yield,now),crop:crop.id,count:crop.yield};
}
