import * as THREE from 'three';
const kernel=(radius,sigma)=>Array.from({length:radius+1},(_,i)=>Math.exp(-.5*(i/sigma)**2));
// Construction-time, distance-based fairing removes tiny spline hairpins where
// dense spiral/loop knots meet a long exit. Keep endpoints and all 601 samples;
// the very same centres/bases build the flume, water and exact occupied seat.
export function smoothWaterSamples(data,{surface=false}={}){
 const a=data.samples,n=a.length,step=data.curve.getLength()/(n-1),sigma=1.35/Math.max(.03,step),radius=Math.min(36,Math.ceil(sigma*3)),weights=kernel(radius,sigma);
 if(!surface){
  let points=a.map(s=>s.p.toArray());
  for(let pass=0;pass<2;pass++){
   const next=[],start=points[0],end=points[n-1],first=points[1].map((v,k)=>v-start[k]),last=end.map((v,k)=>v-points[n-2][k]);
   for(let i=0;i<n;i++){let x=0,y=0,z=0,sum=0;for(let j=i-radius;j<=i+radius;j++){
    const w=weights[Math.abs(i-j)],p=j<0?start.map((v,k)=>v+first[k]*j):j>=n?end.map((v,k)=>v+last[k]*(j-n+1)):points[j];
    x+=p[0]*w;y+=p[1]*w;z+=p[2]*w;sum+=w;
   }next.push([x/sum,y/sum,z/sum]);}
   // Restore exact mouths without restoring the hairpin next to a mouth.
   // Extrapolation keeps its tangent; broad corrections have no short kink.
   const ds=start.map((v,k)=>v-next[0][k]),de=end.map((v,k)=>v-next[n-1][k]);
   for(let i=0;i<n;i++){const u=i/(n-1),a=(1-u)**4,b=u**4;for(let k=0;k<3;k++)next[i][k]+=ds[k]*a+de[k]*b;}
   points=next;
  }for(let i=0;i<n;i++)a[i].p.fromArray(points[i]);
 }
 const forward=new THREE.Vector3(),previous=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),turn=new THREE.Quaternion(),matrix=new THREE.Matrix4();
 for(let i=0;i<n;i++){
  forward.copy(a[Math.min(n-1,i+1)].p).sub(a[Math.max(0,i-1)].p).normalize();
  if(i===0){right.set(forward.z,0,-forward.x);if(right.lengthSq()<1e-7)right.set(1,0,0);right.normalize();}
  else{turn.setFromUnitVectors(previous,forward);right.applyQuaternion(turn).addScaledVector(forward,-right.dot(forward)).normalize();}
  up.crossVectors(forward,right).normalize();a[i].right.copy(right);a[i].up.copy(up);a[i].q.setFromRotationMatrix(matrix.makeBasis(right,up,forward));previous.copy(forward);
 }
 data.waterSmoothed=true;return data;
}
// Fair the transported frame as well as the path. A tiny spline corner must not
// spin an occupied carrier half a turn in one display frame. The original
// full loop orientation remains; cat, raft, flume and water share these bases.
export function smoothWaterFrames(data){
 const a=data.samples,n=a.length,step=data.curve.getLength()/(n-1),sigma=3.2/Math.max(.03,step),radius=Math.min(48,Math.ceil(sigma*3)),weights=kernel(radius,sigma),source=a.map(s=>s.q.clone());
 for(let i=0;i<n;i++){
  const q=source[i],sum=new THREE.Quaternion(0,0,0,0);let weight=0;
  for(let j=Math.max(0,i-radius);j<=Math.min(n-1,i+radius);j++){const w=weights[Math.abs(i-j)]*(q.dot(source[j])<0?-1:1),b=source[j];sum.x+=b.x*w;sum.y+=b.y*w;sum.z+=b.z*w;sum.w+=b.w*w;weight+=Math.abs(w);}
  if(weight)sum.normalize();a[i].q.copy(sum);a[i].up.set(0,1,0).applyQuaternion(sum);a[i].right.set(1,0,0).applyQuaternion(sum);
 }
 const startError=source[0].clone().multiply(a[0].q.clone().invert()),endError=source[n-1].clone().multiply(a[n-1].q.clone().invert()),identity=new THREE.Quaternion();
 for(let i=0;i<n;i++){const u=i/(n-1);a[i].q.premultiply(identity.clone().slerp(startError,(1-u)**4));a[i].q.premultiply(identity.clone().slerp(endError,u**4));a[i].up.set(0,1,0).applyQuaternion(a[i].q);a[i].right.set(1,0,0).applyQuaternion(a[i].q);}
 // Bound only isolated roll spikes, retaining endpoint poses and complete
 // inversion. This construction-only relaxation changes no runtime buffers.
 const limit=18/53.2,mid=new THREE.Quaternion(),dist=a.map((s,i)=>i?Math.max(.003,s.p.distanceTo(a[i-1].p)):.003),threshold=dist.map(d=>Math.cos(Math.min(Math.PI,d*limit)/2));
 for(let pass=0;pass<100;pass++){let changed=false;
  for(let i=1;i<n-1;i++){const left=dist[i],right=dist[i+1];
   if(Math.abs(a[i].q.dot(a[i-1].q))>=threshold[i]&&Math.abs(a[i].q.dot(a[i+1].q))>=threshold[i+1])continue;
   mid.copy(a[i-1].q).slerp(a[i+1].q,left/(left+right));a[i].q.slerp(mid,.65);changed=true;
  }if(!changed)break;
 }
 for(const s of a){s.up.set(0,1,0).applyQuaternion(s.q);s.right.set(1,0,0).applyQuaternion(s.q);}
 return data;
}
