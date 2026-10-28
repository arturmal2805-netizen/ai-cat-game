import * as T from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
// A closed, continuous animal surface. The authored volumes are sculpting
// controls, not separate visible balls. Skin weights and colour blend through
// necks, shoulders and ankles; the shared baked palette animates the result.
export function* sculptZooAnimalSteps(volumes,{resolution=48,soft=.11}={}){
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
 for(const v of volumes)for(let k=0;k<3;k++){low[k]=Math.min(low[k],v.pos[k]-v.size[k]-.22);high[k]=Math.max(high[k],v.pos[k]+v.size[k]+.22);}
 volumes=volumes.map(v=>({...v,inv:v.size.map(n=>1/n),minimum:Math.min(...v.size)}));
 const span=high.map((n,k)=>n-low[k]),clay=new MarchingCubes(resolution,new T.MeshBasicMaterial(),false,false,40000);clay.isolation=0;
 const distance=(p,v)=>(Math.sqrt(((p[0]-v.pos[0])*v.inv[0])**2+((p[1]-v.pos[1])*v.inv[1])**2+((p[2]-v.pos[2])*v.inv[2])**2)-1)*v.minimum;
 const p=[0,0,0];
 for(let z=0;z<resolution;z++){for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
  p[0]=low[0]+x/resolution*span[0];p[1]=low[1]+y/resolution*span[1];p[2]=low[2]+z/resolution*span[2];let d=10;
  for(const v of volumes){const q=distance(p,v),h=Math.max(soft-Math.abs(d-q),0)/soft;d=Math.min(d,q)-h*h*soft*.25;}
  clay.field[x+y*resolution+z*resolution*resolution]=-d;
 }yield;}
 clay.update();const surface=new T.BufferGeometry();surface.setAttribute('position',new T.Float32BufferAttribute(clay.geometry.attributes.position.array.slice(0,clay.count*3),3));
 surface.scale(span[0]/2,span[1]/2,span[2]/2);surface.translate(low[0]+span[0]/2,low[1]+span[1]/2,low[2]+span[2]/2);
 const g=mergeVertices(surface,.00005);surface.dispose();clay.geometry.dispose();clay.material.dispose();// Taubin fairing removes voxel ripples without shrinking the authored
 // silhouette. It runs only during cooperative template preparation.
 const p0=g.attributes.position,index=g.index.array,edges=Array.from({length:p0.count},()=>new Set());
 for(let i=0;i<index.length;i+=3){for(let k=0;k<3;k++){const a=index[i+k],b=index[i+(k+1)%3];edges[a].add(b);edges[b].add(a);}if(i%6000===0)yield;}
 const next=new Float32Array(p0.array.length);
 for(const strength of [.35,-.36,.35,-.36]){
  for(let i=0;i<p0.count;i++){let x=0,y=0,z=0;for(const j of edges[i]){x+=p0.getX(j);y+=p0.getY(j);z+=p0.getZ(j);}const n=edges[i].size||1;
   next[i*3]=p0.getX(i)+(x/n-p0.getX(i))*strength;next[i*3+1]=p0.getY(i)+(y/n-p0.getY(i))*strength;next[i*3+2]=p0.getZ(i)+(z/n-p0.getZ(i))*strength;if(i%1024===0)yield;}
  p0.array.set(next);yield;
 }
 g.computeVertexNormals();
 const positions=g.attributes.position,colors=[],ids=[],weights=[],stripes=[],a=new T.Color(),b=new T.Color();
 for(let i=0;i<positions.count;i++){
  p[0]=positions.getX(i);p[1]=positions.getY(i);p[2]=positions.getZ(i);let first,second,da=Infinity,db=Infinity;
  for(const v of volumes){const d=distance(p,v);if(d<da){second=first;db=da;first=v;da=d;}else if(d<db){second=v;db=d;}}
  second||=first;const w=T.MathUtils.clamp(.5+(db-da)/(2*soft),.5,1);a.set(first.color);b.set(second.color);a.lerp(b,1-w);
  // Broad soft coat variation is baked once; fine fibres/pores use a shared
  // mipmapped material texture and never allocate/update per animal frame.
  const shade=.97+.025*Math.sin(p[0]*4+p[2]*3)*Math.sin(p[1]*5-p[2]*2);a.multiplyScalar(shade);
  if(i%512===0)yield;
  colors.push(a.r,a.g,a.b);ids.push(first.id,second.id);weights.push(w,1-w);stripes.push((first.stripes||0)*w+(second.stripes||0)*(1-w));
 }
 g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.count*2),2));
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('aSculptJoints',new T.Float32BufferAttribute(ids,2));g.setAttribute('aSculptWeights',new T.Float32BufferAttribute(weights,2));g.setAttribute('aSculptStripe',new T.Float32BufferAttribute(stripes,1));
 return g;
}
