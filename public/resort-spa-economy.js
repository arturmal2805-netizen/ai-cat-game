import {resortProduct} from './resort-spa-data.js';
import {buyMallProduct,useMallProduct,normalizeMallProfile} from './mall-system.js';
// No new wallet, save field, merge policy or ephemeral payment table. The
// existing sequenced receipt ledger is the sole source of payment/consumption.
export function resortPaidTicket(game,catId,zoneId){
 const p=game.jobCity?.profiles[catId];if(!p)return null;const product=zoneId+'-session';if(!resortProduct(product))return null;
 const m=normalizeMallProfile(p.mall),receipts=Object.entries(m.receipts).filter(([,r])=>r.product===product).sort((a,b)=>a[1].sequence-b[1].sequence),used=m.used[product]||0;
 return receipts[used]?.[0]||null;
}
export function buyResortTicket(game,catId,zoneId,receipt,now=Date.now()){
 if(!resortProduct(zoneId+'-session'))throw Error('Unknown SPA procedure');return buyMallProduct(game,catId,zoneId+'-session',receipt,now);
}
export function completeResortTicket(game,catId,zoneId,receipt){
 const p=game.jobCity?.profiles[catId],product=zoneId+'-session';if(!p||!resortProduct(product))throw Error('Unknown SPA procedure');const m=normalizeMallProfile(p.mall),r=m.receipts[receipt];if(!r||r.product!==product)throw Error('SPA procedure requires its own paid ticket');
 const ordered=Object.entries(m.receipts).filter(([,r])=>r.product===product).sort((a,b)=>a[1].sequence-b[1].sequence),index=ordered.findIndex(([id])=>id===receipt),used=m.used[product]||0;
 if(index<used)return game;
 if(index!==used)throw Error('Use earlier SPA ticket first');
 return useMallProduct(game,catId,product);
}
