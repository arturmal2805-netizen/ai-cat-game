import * as T from 'three';
let furMap,bearFurMap;
const random=n=>{let h=Math.imul(n^0x68bc21eb,0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);return ((h^(h>>>16))>>>0)/4294967295;};
// Filtered individual hair fibres, shared by every static fur ribbon.
export function zooFurTexture(){
 if(furMap)return furMap;const size=128,data=new Uint8Array(size*size);
 for(let strand=0;strand<13;strand++)for(let y=0;y<size;y++){
  const t=y/(size-1),root=(strand+.2+random(strand)*.5)/13,bend=(random(strand+70)-.5)*.055,
   x=(root+bend*t*t)*size,width=(.56+random(strand+30)*.35)*(1-t*.7),fade=Math.min(1,t*25)*(1-T.MathUtils.smoothstep(t,.76+random(strand+100)*.2,1));
  for(let px=Math.floor(x-width-1);px<=Math.ceil(x+width+1);px++)if(px>=0&&px<size){const v=Math.max(0,1-Math.abs(px-x)/(width+.7))*fade;data[y*size+px]=Math.max(data[y*size+px],Math.round(v*255));}
 }
 furMap=new T.DataTexture(data,size,size,T.RedFormat,T.UnsignedByteType);furMap.magFilter=T.LinearFilter;furMap.minFilter=T.LinearMipmapLinearFilter;furMap.generateMipmaps=true;furMap.needsUpdate=true;furMap.userData.sharedScenery=true;return furMap;
}
// Eight groomed tufts in one tiny atlas. Distinct lengths/curves avoid the
// repeated dotted rectangular patches visible on the old white bear coat.
export function zooBearFurTexture(){
 if(bearFurMap)return bearFurMap;const size=256,data=new Uint8Array(size*size);
 for(let cell=0;cell<8;cell++)for(let strand=0;strand<11;strand++)for(let y=0;y<128;y++){
  const t=y/127,seed=cell*31+strand,root=4+(strand+.2+random(seed)*.45)/11*56,
   end=.68+random(seed+270)*.3,bend=(random(seed+91)-.5)*5*t*t,
   x=root+bend,width=(.5+random(seed+42)*.35)*(1-t*.65),fade=Math.min(1,t*18)*(1-T.MathUtils.smoothstep(t,end-.13,end));
  for(let px=Math.floor(x-width-1);px<=Math.ceil(x+width+1);px++)if(px>=0&&px<64){const v=Math.max(0,1-Math.abs(px-x)/(width+.65))*fade,at=(Math.floor(cell/4)*128+y)*size+(cell%4)*64+px;data[at]=Math.max(data[at],Math.round(v*255));}
 }
 bearFurMap=new T.DataTexture(data,size,size,T.RedFormat,T.UnsignedByteType);bearFurMap.magFilter=T.LinearFilter;bearFurMap.minFilter=T.LinearMipmapLinearFilter;bearFurMap.generateMipmaps=true;bearFurMap.needsUpdate=true;bearFurMap.userData.sharedScenery=true;return bearFurMap;
}
export function* zooFurSteps(sculpt,species){
 const counts={tiger:1400,polar:1800,gorilla:1600,otter:850},count=counts[species];if(!count)return null;
 const pos=sculpt.attributes.position,norm=sculpt.attributes.normal,col=sculpt.attributes.color,joints=sculpt.attributes.aSculptJoints,weights=sculpt.attributes.aSculptWeights,stripe=sculpt.attributes.aSculptStripe,idx=sculpt.index.array,cumulative=[];
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3(),root=new T.Vector3(),flow=new T.Vector3(),right=new T.Vector3(),at=new T.Vector3();let area=0;
 for(let i=0;i<idx.length;i+=3){a.fromBufferAttribute(pos,idx[i]);b.fromBufferAttribute(pos,idx[i+1]).sub(a);c.fromBufferAttribute(pos,idx[i+2]).sub(a);area+=b.cross(c).length()*.5;cumulative.push(area);if(i%6000===0)yield;}
 const positions=[],normals=[],uv=[],colors=[],ids=[],ws=[],stripes=[],indices=[];let made=0;
 for(let attempt=0;made<count&&attempt<count*5;attempt++){
  const r=random(attempt*19+11)*area;let lo=0,hi=cumulative.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(cumulative[mid]<r)lo=mid+1;else hi=mid;}
  const vi=[idx[lo*3],idx[lo*3+1],idx[lo*3+2]],s=Math.sqrt(random(attempt*19+12)),q=random(attempt*19+13),bary=[1-s,s*(1-q),s*q];root.set(0,0,0);n.set(0,0,0);const color=new T.Color(0,0,0),bone=new Map();let st=0;
  for(let k=0;k<3;k++){const i=vi[k],w=bary[k];a.fromBufferAttribute(pos,i);root.addScaledVector(a,w);a.fromBufferAttribute(norm,i);n.addScaledVector(a,w);color.r+=col.getX(i)*w;color.g+=col.getY(i)*w;color.b+=col.getZ(i)*w;st+=stripe.getX(i)*w;bone.set(joints.getX(i),(bone.get(joints.getX(i))||0)+weights.getX(i)*w);bone.set(joints.getY(i),(bone.get(joints.getY(i))||0)+weights.getY(i)*w);}
  n.normalize();if(root.y<.11||species==='gorilla'&&root.y>1.65&&root.z>.52||species==='gorilla'&&root.y<.5&&Math.abs(root.x)>.85)continue;
  const face=species==='tiger'&&root.z>1.2||species==='polar'&&root.z>1.5||species==='otter'&&root.z>.8,
   length=({tiger:.041,polar:.067,gorilla:.077,otter:.025}[species])*(.7+random(attempt+170)*.6)*(face?.35:1),width=length*.45;
  flow.set(root.x*.08,-.4,-.8);flow.addScaledVector(n,-flow.dot(n));if(flow.lengthSq()<.01)flow.set(1,0,0);flow.normalize();right.crossVectors(n,flow).normalize();const angle=(random(attempt+230)-.5)*.6;right.applyAxisAngle(n,angle);flow.crossVectors(right,n).normalize();
  const bones=[...bone].sort((a,b)=>b[1]-a[1]).slice(0,2);if(bones.length===1)bones.push([bones[0][0],0]);const total=bones[0][1]+bones[1][1],base=positions.length/3;
  // Two-sided two-segment ribbons. No transparent sorting, shells or extra
  // animal draw batches; colour AND depth use the same fibre cutout.
  for(const back of [false,true])for(let row=0;row<3;row++)for(const side of [-1,1]){
   const t=row/2;at.copy(root).addScaledVector(n,.005+length*t).addScaledVector(flow,length*t*t*.32).addScaledVector(right,side*width*(1-t*.3));positions.push(at.x,at.y,at.z);
   // Both sides of a hair card use the outward groom normal. Reversing it
   // made back-facing white fibres look like dark square patches.
   normals.push(n.x,n.y,n.z);const cell=Math.floor(random(attempt+301)*7.999);uv.push(species==='polar'?((cell%4)*64+(side<0?2:62))/256:side<0?0:1,species==='polar'?(Math.floor(cell/4)*128+1+t*126)/256:t);colors.push(color.r,color.g,color.b);ids.push(bones[0][0],bones[1][0]);ws.push(bones[0][1]/total,bones[1][1]/total);stripes.push(st);
  }
  for(const back of [false,true])for(let row=0;row<2;row++){const k=base+(back?6:0)+row*2,quad=[k,k+1,k+2,k+1,k+3,k+2];if(back)quad.reverse();indices.push(...quad);}made++;if(made%80===0)yield;
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('aSculptJoints',new T.Float32BufferAttribute(ids,2));g.setAttribute('aSculptWeights',new T.Float32BufferAttribute(ws,2));g.setAttribute('aSculptStripe',new T.Float32BufferAttribute(stripes,1));g.setIndex(indices);g.userData.furCards=made;return g;
}
