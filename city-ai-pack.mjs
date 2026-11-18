// Lossless packing of explicitly string-valued columns only. Cat/place indices,
// balances, needs, skills, output schema and request count remain unchanged.
export function packCityPayload(payload,columns){
 const counts=new Map();const count=v=>{if(typeof v==='string')counts.set(v,(counts.get(v)||0)+1);else if(Array.isArray(v))v.forEach(count);};
 for(const [table,positions]of Object.entries(columns))for(const row of payload[table]||[])for(const index of positions)count(row[index]);
 const text=[],indices=new Map();for(const [value,n]of counts){const original=JSON.stringify(value).length,digits=String(text.length).length;if(n>1&&(original-digits)*n>original+1){indices.set(value,text.length);text.push(value);}}
 if(!text.length)return payload;
 const encode=v=>typeof v==='string'?(indices.has(v)?indices.get(v):v):Array.isArray(v)?v.map(encode):v;
 const packed={...payload};for(const [table,positions]of Object.entries(columns))if(payload[table])packed[table]=payload[table].map(row=>{const next=[...row];for(const i of positions)if(i<next.length)next[i]=encode(next[i]);return next;});
 packed.text=text;return JSON.stringify(packed).length<JSON.stringify(payload).length?packed:payload;
}
export const CITY_PLAN_TEXT_COLUMNS=Object.freeze({cats:[2,14]});
export const CITY_LIFE_TEXT_COLUMNS=Object.freeze({careers:[1],evenings:[1,6,7],buyers:[5],singles:[3]});
export const CITY_PLAN_PACKING_HINT=' If text exists, numbers in cat personality or wishes are indices into text; strings stay literal. Decode before reasoning. All other numbers retain their column meaning.';
export const CITY_LIFE_PACKING_HINT=' If text exists, numbers in personality, wishes or visitedMallStores columns are indices into text; strings stay literal. Decode before reasoning. All other numbers retain their column meaning.';
