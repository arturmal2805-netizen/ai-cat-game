import * as T from 'three';
// One owned static HDR lighting field, replacing the existing Warehouse probe.
// Soft rectangular windows and warm strip lights show curvature/dents clearly.
// It never changes scene.environment, renderer exposure or another venue.
export function createSquishEnvironment(){
 const width=256,height=128,data=new Float32Array(width*height*4);
 const wrap=(a,b)=>Math.atan2(Math.sin((a-b)*Math.PI*2),Math.cos((a-b)*Math.PI*2))/(Math.PI*2);
 const box=(u,v,cx,cy,rx,ry)=>Math.exp(-Math.pow(wrap(u,cx)/rx,8)-Math.pow((v-cy)/ry,8));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=(x+.5)/width,v=(y+.5)/height,i=(y*width+x)*4,dome=Math.max(0,Math.sin(v*Math.PI));
  const white=box(u,v,.16,.69,.055,.045)*9+box(u,v,.67,.62,.06,.025)*6;
  const cyan=box(u,v,.39,.64,.065,.08)*1.2;
  const pink=box(u,v,.88,.57,.055,.045)*1.5;
  const strips=Math.pow(Math.max(0,Math.cos(u*Math.PI*16)),80)*Math.exp(-(((v-.71)/.1)**2))*1.5;
  data[i]=.055+dome*.11+white+strips+pink;
  data[i+1]=.045+dome*.095+white*.94+strips*.68+cyan*.85+pink*.17;
  data[i+2]=.07+dome*.13+white*.9+strips*.4+cyan+pink*.62;data[i+3]=1;
 }
 const env=new T.DataTexture(data,width,height,T.RGBAFormat,T.FloatType);env.name='Warehouse owned softbox / ocean / champagne HDR';env.mapping=T.EquirectangularReflectionMapping;env.needsUpdate=true;return env;
}
