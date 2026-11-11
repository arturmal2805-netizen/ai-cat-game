import {MALL_STORES,MALL_PRODUCTS,mallStore,mallLabel} from './mall-data.js';
import {mallStock} from './mall-system.js';
export function createMallUI({getGame,visit,follow,prepareWallet=()=>{},onError=()=>{}}){
  const dialog=document.createElement('dialog');dialog.className='shop-dialog mall-dialog';dialog.setAttribute('aria-label','Підводний Cat Mall');document.body.append(dialog);
  let storeId=null;
  const text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
  function show(id){prepareWallet();storeId=id;render();if(!dialog.open)dialog.showModal();}
  function render(){
    const s=mallStore(storeId);if(!s)return;const game=getGame();dialog.replaceChildren();
    const close=text('button','×','close');close.setAttribute('aria-label','Закрити');close.onclick=()=>dialog.close();dialog.append(close);
    dialog.append(text('p',`Підводний Cat Mall · F${s.floor}`,'eyebrow'),text('h2',mallLabel(s)),text('p','Покупки оплачуються особистими монетками обраного котика біля каси. Ціна відома до візиту.','dialog-copy'));
    const select=document.createElement('select');select.setAttribute('aria-label','Котик-покупець');
    for(const p of Object.values(game.jobCity?.profiles||{})){const option=document.createElement('option');option.value=p.id;option.textContent=`${p.name} · ${p.coins.toLocaleString()} 🪙`;select.append(option);}
    dialog.append(select);
    const list=document.createElement('div');list.className='mall-catalog';
    for(const p of MALL_PRODUCTS.filter(p=>p.storeId===s.id)){
      const card=text('article','', 'mall-product');card.append(text('span',p.icon,'mall-product-icon'),text('h3',p.name),text('p',`${p.price.toLocaleString()} 🪙 · Залишилось ${mallStock(game,p.id)}`));
      const button=text('button','Відвідати й придбати');button.disabled=mallStock(game,p.id)<1;
      button.onclick=async()=>{const id=select.value;if(!id)return;const profile=getGame().jobCity?.profiles[id];if(profile.coins<p.price){onError('У цього котика недостатньо особистих монеток');return;}
        dialog.close();try{if(!await visit(id,s.id,p.id))onError('Котик має бути вільним на острові мозазавра. Поклич його сюди кнопкою острова.');}catch(e){onError(e.message);}};
      card.append(button);list.append(card);
    }
    const browse=text('button','Прогулянка / відпочинок без обов’язкової покупки');browse.onclick=async()=>{dialog.close();if(!await visit(select.value,s.id,null))onError('Спочатку поклич вільного котика на острів мозазавра.');};
    const watch=text('button','Камера котика');watch.onclick=()=>{dialog.close();follow(select.value);};
    dialog.append(list,browse,watch);
    const shops=document.createElement('div');shops.className='mall-shop-links';for(const other of MALL_STORES.filter(p=>p.floor===s.floor&&p.id!==s.id)){const b=text('button',mallLabel(other));b.onclick=()=>show(other.id);shops.append(b);}dialog.append(shops);
  }
  return {show,render(){if(dialog.open)render();},dispose(){dialog.remove();}};
}
