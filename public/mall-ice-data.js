// One shared catalogue for the real shop, serving models and native reactions.
// Existing meal/treat/drink receipts remain separately readable as legacy items.
export const MALL_ICE_FLAVORS=Object.freeze([
  {key:'strawberry-cloud',name:'Полунична хмаринка',icon:'🍓',price:45,color:0xff70a3,accent:0xd82b60,style:'scoop',reaction:'delight'},
  {key:'blue-lagoon',name:'Блакитна лагуна',icon:'🫐',price:48,color:0x47d8ff,accent:0x6860e9,style:'swirl',reaction:'cool'},
  {key:'pistachio-garden',name:'Фісташковий сад',icon:'🌿',price:52,color:0xb8e477,accent:0x547b38,style:'scoop',reaction:'savour'},
  {key:'mango-sun',name:'Мангове сонечко',icon:'🥭',price:50,color:0xffc63e,accent:0xff7e36,style:'swirl',reaction:'delight'},
  {key:'vanilla-pearl',name:'Ванільна перлина',icon:'🍦',price:40,color:0xffefd3,accent:0xd2b18c,style:'swirl',reaction:'savour'},
  {key:'cosmic-rainbow',name:'Космічна веселка',icon:'🌈',price:65,color:0xdf8eff,accent:0x5be5e8,style:'rainbow',reaction:'wow'},
].map(Object.freeze));
export const mallIceFlavor=key=>MALL_ICE_FLAVORS.find(f=>f.key===key);

// Shared deterministic food choreography; no render imports in the simulation.
export function mallIceEating(elapsed,key,reduced=false){
  const flavor=mallIceFlavor(key);if(!flavor)return null;
  const progress=Math.min(1,Math.max(0,elapsed/10.5)),cycle=elapsed*(flavor.reaction==='cool'?3.6:flavor.reaction==='savour'?2.8:4.2),lick=reduced?0:Math.max(0,Math.sin(cycle))**4;
  return {flavor:key,progress,lick,reaction:{headPitch:.22+lick*.12,headRoll:reduced?0:flavor.reaction==='cool'?Math.sin(elapsed*9)*.055*Math.exp(-Math.max(0,elapsed-2)*2):Math.sin(elapsed*1.7)*.055,paw:reduced?0:.48+lick*.18,earRelax:reduced?0:-.08,surprise:reduced?0:flavor.reaction==='wow'?Math.max(0,1-elapsed/2)*.5:0,tailSway:reduced?0:Math.sin(elapsed*2)*.12}};
}
