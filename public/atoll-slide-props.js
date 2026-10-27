import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { shape, line, torus, flowerCluster, teaPavilion, lantern } from "./fantasy-scenery.js";
import { atollStair } from "./atoll-slide-recipes.js";
import { waterMaterial, advanceWater } from "./water-shading.js";

const rockTemplates = new Map();
function rockGeometry(seed) {
  seed %= 4;
  if (!rockTemplates.has(seed)) {
    const g = new THREE.CylinderGeometry(.86, 1.08, 1, 9, 6), p=g.attributes.position;
    for(let i=0;i<p.count;i++) {
      const y=p.getY(i)+.5, a=Math.atan2(p.getZ(i),p.getX(i)), r=1+.08*Math.sin(y*24+seed)+.045*Math.cos(a*5+seed);
      p.setXYZ(i,p.getX(i)*r,y,p.getZ(i)*r);
    }
    g.computeVertexNormals(); g.userData.sharedScenery=true; rockTemplates.set(seed,g);
  }
  return rockTemplates.get(seed);
}
// This is build-time clearance, not a frame-loop scan. Rock/garden objects must
// leave the exact wet seat path and its approved large-cat envelope unobstructed.
function clearance(route, x,y,z,rx,ry,rz) {
  if(route.bowls.some(b=>Math.hypot(x-b.x,z-b.z)<b.radius+Math.max(rx,rz)+1 && y+ry>b.base-1))return false;
  return !route.geometry.some(g=>g.samples.some((s,i)=>i%3===0 &&
    Math.abs(s.p.x-x)<rx+3.1 && Math.abs(s.p.y-1.6-y)<ry+3.1 && Math.abs(s.p.z-z)<rz+3.1));
}
export function* atollProps(props, root, spec, route, poolFactory) {
  const h=spec.height, red=spec.kind==="red-canyon", crystal=spec.kind==="crystal-cavern",
    pink=spec.kind==="flower-lagoon", green=spec.kind==="emerald-canyon" || spec.kind==="green-valley",
    rockColor=red?0xd58b70:crystal?0xa1b0cf:green?0xb4bd94:0xc5bea5,
    grassColor=red?0xadd57f:0x75c880, falls=[], terracePools=[],groundObstacles=[],portals=[];
  const safeShape=(kind,color,x,y,z,sx,sy,sz)=>{
    if(!clearance(route,x,y,z,sx,sy,sz))return null;
    const m=shape(props,kind,color,x,y,z,sx,sy,sz); m.userData.atollSolid=true;
    if(kind==='pole'&&y-sy/2<2)groundObstacles.push({x,z,radius:Math.max(sx,sz)});
    return m;
  };
  const cliff=(x,z,height,radius,seed=0)=>{
    if(!clearance(route,x,height/2,z,radius*1.15,height/2,radius))return false;
    const m=shape(props,"stone",rockColor,x,0,z,radius,height,radius*.86);
    m.geometry=rockGeometry(seed); m.name="Natural terraced atoll cliff";
    groundObstacles.push({x,z,radius:radius*1.17});
    safeShape("sphere",grassColor,x,height+.2,z,radius*.92,.45,radius*.78);
    for(let v=0;v<3;v++) {
      const vx=x+(v-1)*radius*.5, vz=z+radius*.85;
      for(let j=0;j<6;j++) {
        const yy=height-j*1.1-.7;if(yy<1)break;
        safeShape("petal",j%2?0x70aa61:0x9ad676,vx+Math.sin(j)*.3,yy,vz,.4,.8,.2);
      }
    }
    return true;
  };
  const palm=(x,y,z,s=1)=>{
    safeShape("pole",0xae8864,x,y+4*s,z,.3*s,8*s,.3*s);
    for(let j=0;j<8;j++) {
      const a=j*Math.PI/4, m=safeShape("petal",j%2?0x61ad64:0x9ac96d,x+Math.sin(a)*1.6*s,y+7.8*s,z+Math.cos(a)*1.6*s,.8*s,.36*s,4*s);
      if(m){m.rotation.y=a;m.rotation.x=.2;}
    }
  };
  const tree=(x,y,z,s=1,blossom=false)=>{
    safeShape("pole",0xa07a62,x,y+3.5*s,z,.6*s,7*s,.6*s);
    for(let j=0;j<5;j++) {
      const a=j*Math.PI*2/5;
      safeShape("sphere",blossom?(j%2?0xf6b2d9:0xf18fbf):(j%2?0x77b66b:0x99c773),x+Math.sin(a)*2*s,y+7*s+(j%2)*s,z+Math.cos(a)*2*s,3*s,2.5*s,3*s);
    }
  };
  const naturalArch=(sample,radius=8)=>{
    const c=sample.p, right=new THREE.Vector3(sample.right.x,0,sample.right.z).normalize();
    if(right.lengthSq()<.5)right.set(1,0,0);
    for(let j=0;j<=12;j++) {
      const a=j*Math.PI/12, x=c.x+right.x*Math.cos(a)*radius, z=c.z+right.z*Math.cos(a)*radius, y=c.y+Math.sin(a)*radius;
      const m=safeShape("stone",j%3?rockColor:0xc6c3ad,x,y,z,2,2.2,2);if(m)m.rotation.z=a;
    }
    for(const side of [-1,1])cliff(c.x+right.x*radius*side,c.z+right.z*radius*side,c.y,2.3,side+1);
  };
  const portal=(sample,inner,outer,depth)=>{
    const forward=new THREE.Vector3(0,0,1).applyQuaternion(sample.q),right=new THREE.Vector3(forward.z,0,-forward.x).normalize(),up=new THREE.Vector3().crossVectors(forward,right).normalize();
    sample={...sample,q:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,forward))};
    const outline=new THREE.Shape();outline.moveTo(-outer,-4);outline.lineTo(-outer,0);
    for(let i=0;i<=48;i++){const a=Math.PI-i*Math.PI/48;outline.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);}
    outline.lineTo(outer,-4);outline.lineTo(inner,-4);outline.lineTo(inner,0);
    for(let i=0;i<=48;i++){const a=i*Math.PI/48;outline.lineTo(Math.cos(a)*inner,Math.sin(a)*inner);}
    outline.lineTo(-inner,-4);outline.closePath();
    const geo=new THREE.ExtrudeGeometry(outline,{depth,steps:1,bevelEnabled:true,bevelSize:.35,bevelThickness:.35,bevelSegments:2});geo.translate(0,0,-depth/2);
    const g=new THREE.Group();g.position.copy(sample.p);g.quaternion.copy(sample.q);props.add(g);
    const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:rockColor,roughness:.82}));mesh.name=crystal?'Open crystal cavern · real hollow roof and two portals':'Giant natural coral arch';g.add(mesh);
    for(const side of [-1,1]){
      const p=new THREE.Vector3(side*(inner+outer)/2,-2,0).applyQuaternion(sample.q).add(sample.p);
      cliff(p.x,p.z,p.y,Math.max(1.6,(outer-inner)/2),side+1);
    }
    const gemMaterials=crystal?[0xa9a1fc,0x86e7f8].map(color=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.18,roughness:.3,metalness:.16})):[];
    if(crystal)for(const side of [-1,1])for(let i=0;i<8;i++){
      const crystalMesh=shape(g,'crystal',i%2?0xa9a1fc:0x86e7f8,side*(inner+1.9+(i%2)),2+(i%3),-depth/2+(i%4)*depth/3,3.7,8+(i%4)*2,3.7);
      crystalMesh.rotation.z=-side*(.15+(i%3)*.08);
      crystalMesh.material=gemMaterials[i%2];
    }
    portals.push({center:sample.p.toArray(),quaternion:sample.q.toArray(),inner,outer,depth});
    return g;
  };
  // Each plot has its own scalloped shore, layered rocky underside and lagoon.
  const outline=new THREE.Shape();
  for(let i=0;i<=100;i++) {
    const a=i/100*Math.PI*2,r=1+.018*Math.sin(a*7+.5)+.012*Math.cos(a*11),x=Math.cos(a)*51*r,z=Math.sin(a)*50*r;
    if(i)outline.lineTo(x,z);else outline.moveTo(x,z);
  }
  outline.closePath();
  const geo=new THREE.ExtrudeGeometry(outline,{depth:3,bevelEnabled:true,bevelSize:.8,bevelThickness:.5,bevelSegments:2,curveSegments:64});
  // The entire bevel/cap stays BELOW the lawn and real pool floor.
  geo.rotateX(-Math.PI/2);geo.translate(0,-3.6,0);
  props.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xc1c6ad,roughness:.89})));
  const lawn=new THREE.ShapeGeometry(outline,64);lawn.rotateX(-Math.PI/2);lawn.translate(0,.12,0);
  props.add(new THREE.Mesh(lawn,new THREE.MeshStandardMaterial({color:grassColor,roughness:.91})));
  yield;
  for(let i=0;i<24;i++) {
    yield;
    const a=i*Math.PI*2/24,x=Math.sin(a)*48,z=Math.cos(a)*47;
    const stone=shape(props,"stone",i%2?rockColor:0xc5c6ae,x,-1.1,z,3.5,3.2,3.3);
    stone.rotation.y=a;
    if(i%4===0)falls.push({x,y:.4,z,width:3.6,height:10,angle:a});
    if(z<25 && x>-37) {
      flowerCluster(props,x,z,[0xffc493,0xf3afd4,0xd3b6f6][i%3],3,.25);
      if(i%3===0)palm(x,.2,z,.9);
    }
    if(i%5===0)shape(props,"sphere",0xf0f4fa,x,-8,z,5.2,1,3.1);
  }
  // Stairs and their high bridge use the SAME coordinates as boarding cats.
  const steps=Math.ceil((route.height-1.76)/.29);
  for(let i=0;i<=steps;i++) {
    yield;
    const p=atollStair(route.height,i/steps),m=shape(props,"cube",i%2?0xffedcf:0xe6ca9d,p[0],p[1]-.11,p[2],3.5,.2,1.05);
    m.rotation.y=i/steps*Math.PI*2*Math.max(1,Math.round(route.height/9))-Math.PI/2;
  }
  const stairCore=shape(props,"stone",rockColor,-46,0,-32,1.4,route.height-1.8,1.4);stairCore.geometry=rockGeometry(3);
  const rail=[];
  for(let i=0;i<=220;i++) {
    const u=i/220,p=atollStair(route.height,u),a=Math.PI*2*Math.max(1,Math.round(route.height/9))*u;
    rail.push(new THREE.Vector3(-46+Math.sin(a)*5.2,p[1]+1,-32+Math.cos(a)*5.2));
  }
  props.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail),440,.065,5,false),new THREE.MeshStandardMaterial({color:0xffd58f,roughness:.4,metalness:.15})));
  for(const lane of route.lanes) {
    yield;
    const a=new THREE.Vector3(...lane.top),b=new THREE.Vector3(...lane.board),mid=a.clone().add(b).multiplyScalar(.5),len=a.distanceTo(b),dir=b.clone().sub(a).normalize();
    const deck=shape(props,"cube",0xe7cba3,mid.x,mid.y-.18,mid.z,3.6,.24,len);deck.rotation.y=Math.atan2(dir.x,dir.z);
    const right=new THREE.Vector3(dir.z,0,-dir.x);
    for(const side of [-1,1]) {
      const aa=a.clone().addScaledVector(right,side*1.7),bb=b.clone().addScaledVector(right,side*1.7).addScaledVector(dir,-2.8);aa.y+=1;bb.y+=1;
      line(props,aa.toArray(),bb.toArray(),0xffd58f,.065);
    }
  }
  teaPavilion(props,-46,route.height-1.7,-28.6,0xffd085,1.35);
  // A distinct authored rock plan for every cell, clear of its real route.
  const helixKinds=["rock-arch","sky-serpent","double-serpent","root-valley","flower-lagoon"];
  if(helixKinds.includes(spec.kind))cliff(0,-9,h-8,spec.kind==="root-valley"?8:11,1);
  // A continuous terraced mountain, not a bare plate with an isolated pipe.
  // The rear ridge leaves a real three-metre safety corridor behind the flumes.
  for(let i=0;i<9;i++) {
    yield;
    const x=-32+i*8, z=-42, height=h*(spec.kind==='cloud-islets'?.14+.08*Math.sin(i*.7+.2):.66+.18*Math.sin(i*.7+.2));
    if(cliff(x,z,height,5.2,i)) {
      if(i%2)palm(x,height+.4,z,.9);else tree(x,height+.4,z,.85,pink);
      flowerCluster(props,x,z+1.5,pink?0xffa3cf:0xffcb91,3,height+.6);
      if(i%3===1)teaPavilion(props,x,height+.5,z,0xffcf7a,1.7);
      if(i%2===0)falls.push({x:x+1.5,y:height,z:z+5,width:4.5,height:height-1,angle:0});
    }
  }
  const count=spec.kind==="cloud-islets"?10:8;
  for(let i=0;i<count;i++) {
    yield;
    if(spec.kind==='cloud-islets'){
      const s=route.geometry[0].samples[30+i*52],p=s.p.clone().addScaledVector(s.right,(i%2?1:-1)*7.5),top=s.p.y-3;
      if(top<18)continue;
      const rock=shape(props,'stone',rockColor,p.x,top-7,p.z,4.7,7,4.2);rock.geometry=rockGeometry(i);
      safeShape('sphere',grassColor,p.x,top+.1,p.z,4.3,.35,3.8);
      const underside=shape(props,'cone',0xb5bca9,p.x,top-8.6,p.z,4.5,4,4.1);underside.rotation.z=Math.PI;
      shape(props,'sphere',0xf0f5fc,p.x,top-10.8,p.z,5.3,1.1,3.2);
      tree(p.x,top+.5,p.z,.65,i%3===0);
      falls.push({x:p.x+1.5,y:top,z:p.z+3.8,width:2.1,height:9,angle:0});
      continue;
    }
    const x=-34+(i%4)*21,z=-35+Math.floor(i/4)*30,height=7+(i%3)*6+(spec.kind==="cloud-islets"?i*3:0);
    if(cliff(x,z,height,4.8+(i%3),i)) {
      if(i%2)tree(x,height+.2,z,.7,pink);else palm(x,height+.2,z,.75);
      if(i%3===0)teaPavilion(props,x,height+.3,z,0xffd17b,1.25);
      if(i%2===0)falls.push({x:x+3,y:height,z:z+3.6,width:3,height:height-1,angle:0});
    }
  }
  if(["rock-arch","sky-serpent"].includes(spec.kind))naturalArch(route.geometry[0].samples[290],10);
  if(crystal)portal(route.geometry[0].samples[245],6.2,10.5,14);
  if(spec.kind==='coral-arch'){
    const target=new THREE.Vector3(0,h*.72,-11),samples=route.geometry[0].samples;
    const s=samples.reduce((a,b)=>a.p.distanceToSquared(target)<b.p.distanceToSquared(target)?a:b);
    const arch=portal(s,9,13,7);
    for(let i=0;i<9;i++){const a=(i+1)*Math.PI/10,p=new THREE.Vector3(Math.cos(a)*13,Math.sin(a)*13+.2,-3).applyQuaternion(arch.quaternion).add(s.p);flowerCluster(props,p.x,p.z,0xf4b4cb,3,p.y);}
  }
  if(spec.kind==="rock-arch") {
    const p=route.geometry[0].samples[290].p;
    falls.push({x:p.x,y:p.y+11,z:p.z-1.5,width:15,height:17,angle:0});
  }
  if(["emerald-canyon","red-canyon","green-valley","waterfall-cascade","abyss-bridge"].includes(spec.kind)) {
    for(const side of [-1,1])for(let j=0;j<4;j++) {
      yield;
      const y=12+(3-j)*9;
      cliff(side*32,-27+j*15,y,6.8,j);
      tree(side*32,y,-27+j*15,.8);
      if(j===2)teaPavilion(props,side*32,y,-27+j*15,0xffc76d,1.1);
    }
  }
  if(spec.kind==="abyss-bridge") {
    for(const x of [-28,-12,4,20]) {
      for(const side of [-1,1])shape(props,"pole",0xdcc5a0,x,(h-5)/2,-26+side*4.3,.7,h-5,.7);
      const arch=torus(props,0xffdfb0,6.2,.65,x,h-12,-26);arch.rotation.y=Math.PI/2;
    }
  }
  if(spec.kind==="waterfall-cascade") for(const part of route.geometry.filter(g=>g.part.terrace)) {
    yield;
    const s=part.samples.at(-1), p=s.p;
    const basin=poolFactory({...spec,pool:[p.x,p.z,6.5,5.5],surfaceY:p.y-1.95});
    basin.name="Connected cascade terrace pool";root.add(basin);terracePools.push(basin);
    cliff(p.x+9,p.z,p.y-2.2,3.3);
    falls.push({x:p.x,y:p.y-1.9,z:p.z+5.3,width:9,height:Math.min(14,p.y-3),angle:0});
  }
  if(crystal)for(let i=0;i<20;i++) {
    yield;
    const a=i/20*Math.PI*2,x=Math.sin(a)*15,z=-9+Math.cos(a)*15,hh=8+(i%4)*5;
    const m=safeShape("crystal",i%3===0?0x99eafb:i%3===1?0xb19af4:0xddb5fc,x,hh/2,z,2,hh,2);if(m)m.rotation.z=Math.sin(a)*.15;
  }
  if(spec.kind==="root-valley") {
    safeShape("pole",0x9a7552,0,h*.49,-9,4.8,h*.98,4.8);
    for(let i=0;i<12;i++) {
      yield;
      const a=i*Math.PI/6,x=Math.sin(a)*15,z=-9+Math.cos(a)*15;
      const branch=line(props,[0,h*.65,-9],[x,h+3+(i%3),z],0xa37d55,.9);
      branch.name="Ancient tree branch";
      safeShape("sphere",i%2?0x88ba67:0xb0cc79,x,h+7+(i%3),z,11,7.5,11);
      line(props,[0,3,-9],[Math.sin(a)*16,.3,-9+Math.cos(a)*16],0xa17c58,1.15);
    }
  }
  if(pink) {
    const flower=new THREE.Group();flower.position.set(0,h+3,-9);props.add(flower);
    shape(flower,"sphere",0xffdb86,0,1.4,0,4,2,4);
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6,m=shape(flower,"petal",i%2?0xffa9d6:0xd39bfc,Math.sin(a)*6,2,-Math.cos(a)*6,3,2,8);
      m.rotation.y=-a;m.rotation.x=.4;
    }
    for(const x of [-34,34])for(const z of [-22,20])tree(x,0,z,1.25,true);
  }
  if(spec.kind==="coral-arch")for(let i=0;i<12;i++) {
    const x=-31+i*5.7,z=25+(i%2)*4;
    if(Math.abs(x)<22)continue;
    for(let j=0;j<3;j++) {
      const m=shape(props,"petal",[0xf4a4b1,0xcab1fa,0xf9ce95][i%3],x+(j-1)*.7,1.8,z,.5,2.7,.55);m.rotation.z=(j-1)*.4;
    }
  }
  for(const b of route.bowls) {
    if(spec.kind==="blue-whirlpool") for(let i=0;i<22;i++) {
      yield;
      const a=i*Math.PI*2/22;
      if(i>=12&&i<=15)continue; // Open wet inlet, no closed collar across the raft.
      cliff(b.x+Math.cos(a)*(b.radius+6),b.z+Math.sin(a)*(b.radius+6),b.base+b.depth-1,3.8,i);
    }
    for(let i=0;i<(spec.kind==='blue-whirlpool'?0:8);i++) {
      const a=i*Math.PI/4,x=b.x+Math.sin(a)*(b.radius+6),z=b.z+Math.cos(a)*(b.radius+6);
      if(clearance(route,x,b.base/2,z,1,b.base/2,1))shape(props,"pole",0xe3c9a0,x,b.base/2,z,.6,b.base,.6);
    }
  }
  // Layered planting beds frame the lagoon and shore without reducing the
  // walking/boarding corridors or scaling up the approved cat models.
  for(let i=0;i<64;i++) {
    yield;
    const a=i*Math.PI*2/64,x=Math.sin(a)*43,z=Math.cos(a)*43;
    if(x < -36 || (z>28&&Math.abs(x)<24))continue;
    safeShape("sphere",i%2?0x7bbf75:0xa4d883,x,.55,z,2.5,.7,1.9);
    for(let k=0;k<4;k++) {
      const r=a+k*.7,m=safeShape("petal",k%2?0x5aaf72:0x96d478,x+Math.sin(r)*1.4,1.1,z+Math.cos(r)*1.4,.65,.3,2.2);
      if(m){m.rotation.y=r;m.rotation.x=.3;}
    }
    flowerCluster(props,x+.5,z+.5,[0xffb0d3,0xffde91,0xd8b4fb][i%3],3,.7);
    if(i%8===0)lantern(props,x,1,z,1.6);
  }
  // Fixed shader-animated waterfall batch: no per-frame particle/matrix uploads.
  const sheets=[],catchWater=[];
  for(const f of falls) {
    const geo=new THREE.PlaneGeometry(f.width,f.height,4,12);
    geo.rotateY(f.angle);geo.translate(f.x,f.y-f.height/2,f.z);sheets.push(geo);
    if(f.y>2&&f.y-f.height<2&&Math.hypot(f.x,f.z)<47&&clearance(route,f.x,1,f.z,3,1,2.5)){
      const water=new THREE.CircleGeometry(1,40);water.rotateX(-Math.PI/2);water.scale(3,1,2.3);water.translate(f.x,1.45,f.z);catchWater.push(water);
      shape(props,'sphere',0x399eac,f.x,.32,f.z,3.1,.15,2.4);
      const rim=torus(props,0xcbd0b2,3,.25,f.x,1.4,f.z);rim.rotation.x=Math.PI/2;rim.scale.y=.77;
      groundObstacles.push({x:f.x,z:f.z,radius:3.3});
    }
  }
  let fallMaterial;
  if(sheets.length) {
    const geometry=mergeGeometries(sheets);sheets.forEach(g=>g.dispose());
    fallMaterial=waterMaterial(0x70e4f1,.67,{waterfall:true,width:5,height:25});
    const mesh=new THREE.Mesh(geometry,fallMaterial);mesh.name="Fixed-buffer terraced waterfalls";root.add(mesh);
  }
  let foamMaterial;
  if(["giant-wave","blue-halfpipe","waterfall-cascade"].includes(spec.kind)) {
    const points=[],seeds=[];
    for(const data of route.geometry)for(let i=0;i<data.samples.length;i+=4) {
      const s=data.samples[i];
      if(spec.kind==="giant-wave" && s.p.y<15)continue;
      for(const side of [-1,1]) {
        const p=s.p.clone().addScaledVector(s.up,-1.88).addScaledVector(s.right,side*(data.wave?7.2:data.halfpipe?4.3:1.3));
        points.push(...p.toArray());seeds.push(i*.73+side);
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));
    foamMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0}},
      vertexShader:`attribute float aSeed;uniform float uTime;varying float alpha;void main(){vec3 p=position;p.y+=sin(uTime*2.1+aSeed)*.22;p.x+=cos(uTime+aSeed)*.13;vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(440./max(1.,-v.z),1.,11.);alpha=.65+.3*sin(aSeed+uTime*1.7);}`,
      fragmentShader:`varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.9,1.,1.,(1.-smoothstep(.4,1.,r))*alpha);}`});
    const foam=new THREE.Points(geometry,foamMaterial);foam.name="Living wave crest · fixed GPU foam";foam.raycast=()=>{};root.add(foam);
  }
  let catchMaterial;
  if(catchWater.length){const geometry=mergeGeometries(catchWater);catchWater.forEach(g=>g.dispose());catchMaterial=waterMaterial(0x23cbdc,.88);const pools=new THREE.Mesh(geometry,catchMaterial);pools.name='Batched clear waterfall catch pools';root.add(pools);}
  return {update(time,reduced){if(fallMaterial)advanceWater(fallMaterial,time,reduced);if(catchMaterial)advanceWater(catchMaterial,time,reduced);if(foamMaterial)foamMaterial.uniforms.uTime.value=reduced?0:time;for(const pool of terracePools)pool.userData.update(time,reduced);},falls,terracePools,groundObstacles,portals,surfaceDraws:(fallMaterial?1:0)+(catchMaterial?1:0)};
}
