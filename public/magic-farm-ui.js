import {MAGIC_FARMS,MAGIC_FRUITS} from './magic-farms-data.js';
import {orchardCounts} from './magic-farm-state.js';
export function renderMagicFarmCards(container,game,{busy=false,onVisit,onHarvest,onShop}){
 container.replaceChildren();
 for(const f of MAGIC_FARMS){
  const owned=game.unlocked.includes(f.id),counts=orchardCounts(game,f.id),card=document.createElement('article');card.className='magic-farm-card';card.dataset.farm=f.id;
  const title=document.createElement('h3');title.textContent=f.icon+' '+f.name;
  const text=document.createElement('p');text.textContent=owned?'Стиглих: '+counts.ready+' · Зібрано: '+counts.collected+' · На складі: '+counts.stock:f.subtitle;
  const stock=document.createElement('small');stock.textContent=owned?MAGIC_FRUITS.filter(x=>x.biome===f.id).map(x=>x.icon+' '+x.name+': '+(game.farm.stock[x.id]||0)).join(' · '):'Ціна: '+f.price.toLocaleString('uk-UA')+' ✦';
  const visit=document.createElement('button');visit.className='secondary';visit.textContent=owned?'На ферму':'Відкрити в магазині';visit.onclick=()=>owned?onVisit(f.id):onShop(f.id);card.append(title,text,stock,visit);
  if(owned){const harvest=document.createElement('button');harvest.textContent=counts.ready?'Чічі, зібрати врожай':'Плоди дозрівають';harvest.disabled=busy||counts.ready===0;harvest.className='primary';harvest.onclick=()=>onHarvest('orchard-'+f.id);card.append(harvest);}
  container.append(card);
 }
}
