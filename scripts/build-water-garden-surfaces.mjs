// Original, deterministic PBR authoring. Run offline; gameplay only decodes
// finished images once for the selected water-adventure collection.
import fs from 'node:fs';
import {deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const folder=new URL('../public/art/water-garden/',import.meta.url);
fs.mkdirSync(folder,{recursive:true});
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
function noise(u,v,cells){const x=u*cells,y=v*cells,ix=Math.floor(x),iy=Math.floor(y),a=smooth(x-ix),b=smooth(y-iy),h=(dx,dy)=>hash(((ix+dx)%cells+cells)%cells,((iy+dy)%cells+cells)%cells);return (h(0,0)*(1-a)+h(1,0)*a)*(1-b)+(h(0,1)*(1-a)+h(1,1)*a)*b;}
const distance=(a,b)=>{let d=a-b;return d-Math.round(d);};
function surface(kind,u,v){
 const broad=noise(u,v,4),mid=noise(u,v,16),fine=noise(u,v,128);let height,tone,tint=[1,1,1],rough;
 if(kind==='wood'){
  let warp=.015*Math.sin(v*TAU)+.009*Math.sin(v*TAU*3),knot=0;
  for(const [cx,cy,r]of [[.28,.27,.13],[.76,.71,.095]]){const dx=distance(u,cx),dy=distance(v,cy)*.58,d=Math.hypot(dx,dy),fall=Math.exp(-d*d/(r*r));warp+=dx*fall*.62;knot+=fall;}
  const x=u+warp,grain=Math.sin(x*TAU*31+Math.sin(v*TAU*2)*.5),fibres=Math.sin(x*TAU*123+Math.sin(v*TAU*5)*.7),pore=Math.exp(-Math.abs(grain)*12),heart=clamp(knot*.75);
  height=.34+grain*.09+fibres*.025+mid*.13-pore*.10-heart*.12;
  tone=.81+grain*.095+fibres*.02+mid*.14-pore*.18-heart*.22;
  tint=[1,.93,.79];rough=.78+mid*.15-pore*.08;
 }else if(kind==='stone'){
  const strata=v*11+.18*Math.sin(u*TAU*2)+.14*Math.sin(u*TAU*5)+mid*.15,
   joint=Math.exp(-Math.abs(Math.sin(strata*Math.PI))*24),fault=Math.exp(-Math.abs(Math.sin((u*7+.10*Math.sin(v*TAU*3))*Math.PI))*37),
   chisel=smooth((noise(u,v,32)-.4)*3),grain=fine*.04;
  height=.34+broad*.19+mid*.13+chisel*.08-joint*.12-fault*.08+grain;
  tone=.69+broad*.20+mid*.12-joint*.22-fault*.14+chisel*.10+fine*.055;
  tint=[1,.98,.91];rough=.83+mid*.15;
 }else if(kind==='moss'){
  const tuft=noise(u,v,40),tips=Math.pow(noise(u+.018,v+.013,192),3),fibre=Math.sin((u+Math.sin(v*TAU*3)*.012)*TAU*107)*.5+.5;
  height=.25+tuft*.34+tips*.22+fibre*.05+mid*.06;
  tone=.49+tuft*.34+tips*.26+fibre*.045+mid*.08;
  tint=[.94,1,.76];rough=.88+fine*.12;
 }else if(kind==='leaf'){
  const centre=Math.exp(-Math.abs(u-.5)*110),sides=Math.abs(u-.5),phase=v*12-sides*7,
   veins=Math.exp(-Math.abs(Math.sin(phase*Math.PI))*24)*(1-smooth((sides-.39)*12));
  height=.30+Math.sin(u*Math.PI)*.12+centre*.13+veins*.07+fine*.012;
  tone=.77+Math.sin(u*Math.PI)*.15+centre*.13+veins*.075+mid*.065;
  tint=[1,1,1];rough=.76+fine*.16;
 }else{
  height=.5;tone=.68+broad*.23+mid*.11+fine*.055;tint=[.94,1,.80];rough=.98;
 }
 return {height,tone,tint,rough};
}
const crcTable=Array.from({length:256},(_,i)=>{let n=i;for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,bytes){const t=Buffer.from(type),size=Buffer.alloc(4);size.writeUInt32BE(bytes.length);let crc=0xffffffff;for(const x of Buffer.concat([t,bytes]))crc=crcTable[(crc^x)&255]^(crc>>>8);const end=Buffer.alloc(4);end.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([size,t,bytes,end]);}
function png(bytes,size){const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;const rows=Buffer.alloc((size*4+1)*size);for(let y=0;y<size;y++)rows.set(bytes.subarray(y*size*4,(y+1)*size*4),y*(size*4+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
const manifest={};let bytes=0,gpu=0;
for(const kind of ['wood','stone','moss','leaf','lawn']){
 manifest[kind]={};
 for(const role of kind==='lawn'?['color']:['color','normal','roughness']){
  const size=role==='color'?512:role==='normal'?256:128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const u=x/size,v=y/size,s=surface(kind,u,v),at=(y*size+x)*4;
   if(role==='color'){for(let c=0;c<3;c++)data[at+c]=Math.round(clamp(s.tone*s.tint[c])*255);}
   else if(role==='roughness')data.fill(Math.round(clamp(s.rough)*255),at,at+3);
   else{const e=1/size,dx=(surface(kind,u-e,v).height-surface(kind,u+e,v).height)*3,dy=(surface(kind,u,v-e).height-surface(kind,u,v+e).height)*3,n=Math.hypot(dx,dy,1);data[at]=Math.round((dx/n*.5+.5)*255);data[at+1]=Math.round((dy/n*.5+.5)*255);data[at+2]=Math.round((1/n*.5+.5)*255);}
   data[at+3]=255;
  }
  const file=png(data,size),name=kind+'-'+role+'-'+createHash('sha256').update(file).digest('hex').slice(0,12)+'.png';fs.writeFileSync(new URL(name,folder),file);manifest[kind][role]='./art/water-garden/'+name;bytes+=file.length;gpu+=Math.ceil(data.length*4/3);
 }
}
fs.writeFileSync(new URL('../public/showcase-surface-assets.js',import.meta.url),'// Offline original surface charts; shared by all eight adventures.\nexport const SHOWCASE_SURFACE_ASSETS='+JSON.stringify(manifest,null,2)+';\nexport const SHOWCASE_SURFACE_BYTES='+JSON.stringify({download:bytes,gpuMipmapped:gpu})+';\n');
const keep=new Set(Object.values(manifest).flatMap(roles=>Object.values(roles).map(url=>url.split('/').at(-1))));for(const file of fs.readdirSync(folder))if(/^(wood|stone|moss|leaf|lawn)-(color|normal|roughness)-[a-f0-9]{12}\.png$/.test(file)&&!keep.has(file))fs.unlinkSync(new URL(file,folder));
console.log(JSON.stringify({maps:13,downloadBytes:bytes,gpuMipmappedBytes:gpu}));
