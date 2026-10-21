// Rank personal available cat coins; player money and house ownership stay
// separate. Stable ties prevent podium cards shuffling on each clock tick.
export function richestCats(state){
 return Object.values(state?.profiles||{}).filter(p=>p&&typeof p.id==='string'&&Number.isFinite(p.coins)&&p.coins>=0)
  .sort((a,b)=>b.coins-a.coins||(b.earnedTotal||0)-(a.earnedTotal||0)||a.id.localeCompare(b.id)).slice(0,3);
}
