// Eight retained installations from the supplied 2 × 5 reference. Existing
// slide records, islands, prices, routes and saved placement addresses stay put.
const rows=[
 ['barrel-wave','Гігантська хвиля','🌊',64,210000,0x32cde8,0x9deeed,1,3.8,1,'Бодіборд: швидкий розгін крізь велику закручену водяну хвилю.'],
 ['canyon-rafting','Рафтинг у каньйоні','🏞️',43,160000,0x40d5e6,0xb97f61,4,6.5,1,'Спільний круглий рафт: пороги, мости, водоспади та смішні оберти.'],
 ['glass-drop','Вежа вільного падіння','🏰',82,250000,0x57d9f4,0xffdc8c,2,4.8,1,'Прозорий підйом, напружена зупинка й вертикальне водяне падіння.'],
 ['lagoon-launch','Водяний запуск і політ','🚀',38,220000,0x47d1ef,0xfbd37e,2,4.8,3,'Водяний прискорювач і справжня дуга польоту в окрему лагуну.'],
 ['surf-halfpipe','Серфінг на гігантській хвилі','🏄',46,175000,0x38ceee,0xf1b6ed,1,4.2,2,'Відкритий half-pipe: високе балансування, розвороти й трюки на дошці.'],
 ['lazy-river','Пригода на дикій річці','🛟',26,110000,0x58dfdc,0x8ebc77,1,4.6,1,'Кільце крізь джунглі: швидкі струмені, пороги й закручені віражі.'],
 ['fountain-carousel','Водна карусель','🌸',23,145000,0x58d9e9,0xf2aacd,4,4,2,'Чотири радіальні човники навколо квіткового фонтана з плавним розгоном.'],
 ['pool-pendulum','Маятник над басейном','🎡',58,230000,0x4ad5ed,0xd8af6c,4,6.5,0,'Підвісний човен: висока дуга, дотик води й бризки на кожному проході.'],
];
export const SHOWCASE_WATER_RIDES=rows.map(([kind,name,icon,height,price,color,accent,seats,radius,channels,description],i)=>{
 // Keep the retained cells and construction deadlines at their released values.
 const cell=[0,3,4,5,6,7,8,9][i];
 return {
 id:'ride-water-'+kind,kind,name,icon,height,price,color,accent,seats,radius,channels,description,
 showcaseWater:true,referenceSlide:true,premiumWater:true,mega:true,fixedPrice:true,
 collection:'Водні пригоди · 8 мінібіомів',referenceCell:{index:cell+1,row:Math.floor(cell/5)+1,column:cell%5+1},
 category:'rides',actions:['ride'],rarity:'Легендарное',requiredLevel:20,
 buildMinutes:60+cell*5,footprint:[124,120],pool:['barrel-wave','lagoon-launch'].includes(kind)?[0,31,37,20]:kind==='surf-halfpipe'?[0,18,43,22]:['fountain-carousel','pool-pendulum'].includes(kind)?[0,0,26,25]:[0,35,22,15],surfaceY:1.45,
 incomePerHour:Math.round(price/80/100)*100,
};});
export const showcaseWaterRide=id=>SHOWCASE_WATER_RIDES.find(r=>r.id===id);
