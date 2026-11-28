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
  const white=box(u,v,.16,.69,.075,.1)*18+box(u,v,.67,.62,.08,.035)*13;
  const cyan=box(u,v,.39,.64,.075,.11)*3;
  const pink=box(u,v,.88,.57,.06,.065)*4;
  const strips=Math.pow(Math.max(0,Math.cos(u*Math.PI*16)),80)*Math.exp(-(((v-.71)/.1)**2))*4;
  data[i]=.24+dome*.95+white+strips+pink;
  data[i+1]=.2+dome*.84+white*.94+strips*.68+cyan*.85+pink*.17;
  data[i+2]=.33+dome*1.1+white*.9+strips*.4+cyan+pink*.62;data[i+3]=1;
 }
 const env=new T.DataTexture(data,width,height,T.RGBAFormat,T.FloatType);env.name='Warehouse owned softbox / ocean / champagne HDR';env.mapping=T.EquirectangularReflectionMapping;env.needsUpdate=true;return env;
}
