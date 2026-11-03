import * as T from 'three';

export function naturalBankPoint(data,width,depth,side,u,across,end=.955){
 const row=(u-.045)/(end-.045)*160,s=data.samples[Math.round(u*(data.samples.length-1))],irregular=Math.sin(row*.61+side)*.36+Math.sin(row*.17)*.3,blend=T.MathUtils.clamp((across-1.8)/3.4,0,1),soil=T.MathUtils.lerp(1.4+Math.sin(row*.31+1)*.16,1.8+Math.sin(row*.31+2)*.16,blend);
 return s.p.clone().addScaledVector(s.right,side*(width+across+irregular)).addScaledVector(s.up,-depth+soil);
}

// Broad eroded faces and ledges, smooth along the route but split at each rock
// stratum. Boarding/unloading mouths remain open. All buffers are static.
export function naturalBank(data,width,depth,side,{end=.955}={}){
 const positions=[],uv=[],colors=[],indices=[],steps=160,
  profile=[[.6,-.15],[1.8,1.4],[5.2,1.8],[6.5,-.8],[4.5,-4.2],[.6,-2.8]],length=data.curve.getLength(),
  point=(i,j)=>{const u=.045+i/steps*(end-.045),s=data.samples[Math.round(u*(data.samples.length-1))],[x,y]=profile[j],irregular=Math.sin(i*.61+side)*.36+Math.sin(i*.17)*.3;return s.p.clone().addScaledVector(s.right,side*(width+x+irregular)).addScaledVector(s.up,-depth+y+Math.sin(i*.31+j)*.16);};
 for(let face=0;face<profile.length;face++){
  const start=positions.length/3,shade=[.80,1,.92,.76,.70,.82][face];
  for(let i=0;i<=steps;i++)for(let edge=0;edge<2;edge++){
   const p=point(i,(face+edge)%profile.length);positions.push(p.x,p.y,p.z);uv.push(i/steps*length*.16,(face+edge)*.4);colors.push(shade,shade,shade);
   if(i&&edge){const a=start+(i-1)*2,b=a+1,c=start+i*2,d=c+1;indices.push(a,c,b,b,c,d);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
