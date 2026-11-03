import * as T from 'three';

// Authored once, then merged into the ordinary static scenery batches. Broad
// planes, eroded seams and irregular silhouettes replace stacked rounded boxes.
export function cliffGeometry(height,radius,seed=0,segments=24,levels=12){
 const p=[],uv=[],idx=[],colors=[],rings=levels+1;
 for(let y=0;y<=levels;y++)for(let i=0;i<=segments;i++){
  const u=i/segments,a=u*Math.PI*2,t=y/levels,
   ledge=1+.065*Math.sin(y*2.7+seed)+.045*Math.sin(y*1.3),
   erosion=1+.09*Math.sin(a*3+seed)+.045*Math.cos(a*7-seed*.7)+.035*Math.sin(a*5+y*.7),
   taper=.84+.16*Math.sin(Math.PI*t*.75),r=radius*ledge*erosion*taper;
  p.push(Math.sin(a)*r,height*t,Math.cos(a)*r*.86);uv.push(u*radius*.8,t*height*.13);
  const shade=.83+.13*t+.055*Math.sin(y*2.7+seed)+.025*Math.cos(a*7);colors.push(shade,shade*.985,shade*.94);
  if(y&&i){const k=y*(segments+1)+i;idx.push(k-1,k-segments-2,k,k,k-segments-2,k-segments-1);}
 }
 for(const [ring,reverse]of [[0,true],[levels,false]]){const c=p.length/3;p.push(0,ring?height:0,0);uv.push(.5,.5);colors.push(1,1,1);for(let i=0;i<segments;i++){const a=ring*(segments+1)+i;idx.push(c,reverse?a+1:a,reverse?a:a+1);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();return g;
}

const boulders=new Map();
export function boulderGeometry(variant=0){
 variant=((variant%4)+4)%4;if(boulders.has(variant))return boulders.get(variant);
 const g=new T.SphereGeometry(1,14,10),p=g.attributes.position,v=new T.Vector3();
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i);const a=Math.atan2(v.x,v.z),h=v.y,
   n=1+.13*Math.sin(a*3+variant)+.065*Math.cos(a*5-h*4+variant*2);
  v.x*=n;v.z*=n;v.y=Math.sign(h)*Math.pow(Math.abs(h),.72)*(.89+.08*Math.sin(a*4+variant));
  p.setXYZ(i,v.x,v.y,v.z);
 }
 g.computeVertexNormals();g.userData.sharedScenery=true;boulders.set(variant,g);return g;
}

export function islandOutline(kind){
 const seed=[...kind].reduce((a,c)=>a+c.charCodeAt(0),0)*.031,points=[];
 for(let i=0;i<96;i++){const a=i/96*Math.PI*2,r=1+.025*Math.sin(a*3+seed)+.022*Math.cos(a*7-seed);points.push(new T.Vector2(Math.sin(a)*55.3*r,Math.cos(a)*52.3*r));}
 return points;
}

export function islandCliffGeometry(kind){
 const outline=islandOutline(kind),p=[],uv=[],idx=[],n=outline.length,levels=7;
 for(let j=0;j<=levels;j++)for(let i=0;i<=n;i++){
  const q=outline[i%n],t=j/levels,s=.79+.21*t+.025*Math.sin(j*2.1+i*.9),
   y=-11+t*11+(j===levels?0:Math.sin(i*.71+j*1.7)*.38);
  p.push(q.x*s,y,q.y*s);uv.push(i/n*32,t*4);
  if(j&&i){const k=j*(n+1)+i;idx.push(k,k-1,k-n-1,k-1,k-n-2,k-n-1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
