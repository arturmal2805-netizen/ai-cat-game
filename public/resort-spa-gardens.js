import * as T from 'three';
import {RESORT_SPA as S,RESORT_ZONES,resortSpaSeat} from './resort-spa-data.js';
import {AROMA_CASCADES,resortGardenSites} from './resort-spa-garden-data.js';
import {waterMaterial} from './water-shading.js';
import {applyResortWaterReflection} from './resort-spa-reflections.js';

function colouredGeometry(positions,indices,colors,uv){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
// Small curved petals and veined leaves, shared by every garden instance.
// No alpha-card garden, reference photograph or per-frame geometry generation.
export function spaGardenFlowerGeometry(){
 const p=[],ix=[],colors=[],uv=[],ink=new T.Color(),light=new T.Color(0xfff2f7),rose=new T.Color(0xe885b6);
 for(let flower=0;flower<7;flower++){
  const a=flower*2.399963,r=flower?Math.sqrt(flower/7)*.35:0,cx=Math.cos(a)*r,cz=Math.sin(a)*r,cy=.12+.12*Math.sin(flower*1.8);
  for(let petal=0;petal<5;petal++){
   const angle=petal*Math.PI*2/5+a*.3,start=p.length/3;
   for(let j=0;j<=4;j++)for(let i=0;i<3;i++){
    const t=j/4,s=i-1,x=s*Math.sin(Math.PI*t)*.053,z=.025+t*.13;
    p.push(cx+Math.cos(angle)*x+Math.sin(angle)*z,cy+.06*t*t+.012*s*s,cz-Math.sin(angle)*x+Math.cos(angle)*z);uv.push(i/2,t);
    ink.copy(rose).lerp(light,.35+t*.55);colors.push(ink.r,ink.g,ink.b);
   }
   for(let j=0;j<4;j++)for(let i=0;i<2;i++){const n=start+j*3+i;ix.push(n,n+3,n+1,n+1,n+3,n+4);}
  }
 }
 return colouredGeometry(p,ix,colors,uv);
}
export function spaGardenLeafGeometry(){
 const p=[],ix=[],colors=[],uv=[],ink=new T.Color(),dark=new T.Color(0x285c43),light=new T.Color(0x8bb886);
 for(let j=0;j<=8;j++)for(let i=0;i<3;i++){
  const t=j/8,s=i-1;p.push(s*Math.sin(Math.PI*t)*.18,.17*Math.sin(Math.PI*t)+.05*t+.022*(1-s*s),t*.85);uv.push(i/2,t);
  ink.copy(dark).lerp(light,(1-Math.abs(s))*.5+t*.22);colors.push(ink.r,ink.g,ink.b);
 }
 for(let j=0;j<8;j++)for(let i=0;i<2;i++){const n=j*3+i;ix.push(n,n+3,n+1,n+1,n+3,n+4);}return colouredGeometry(p,ix,colors,uv);
}
// The fall begins at the actual curved outlet and ends inside the next basin.
export function spaGardenFallGeometry(upper,lower){
 const p=[],uv=[],ix=[],width=upper.rx*.85,height=upper.y-lower.y;
 for(let j=0;j<=12;j++)for(let i=0;i<=8;i++){
  const t=j/12,x=(i/8-.5)*width,z=upper.z+upper.rz*Math.sqrt(1-(x/upper.rx)**2),fall=Math.max(0,(t-.15)/.85);
  p.push(x,upper.y-height*fall,z+Math.min(1,t/.15)*.2+.18*Math.sqrt(fall));uv.push(i/8,t);
 }
 for(let j=0;j<12;j++)for(let i=0;i<8;i++){const n=j*9+i;ix.push(n,n+1,n+9,n+1,n+10,n+9);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function* resortGardenSteps({solid,decor,surfaces,waters,mats,rise=S.rise,zoneList=RESORT_ZONES,seatContact=resortSpaSeat,sites=resortGardenSites(),cascadeList=AROMA_CASCADES,probeForFeature=()=>3}){
 const fixed=new T.Group(),geometries=new Set(),materials=new Set(),records=new Map(),instances=[],features=[],impacts=[];let staticTriangles=0,lastRipple=-1;
 const own=g=>(geometries.add(g),g),cylinder=own(new T.CylinderGeometry(1,1,1,32)),box=own(new T.BoxGeometry(1,1,1)),soil=new T.MeshStandardMaterial({color:0x302c24,roughness:1}),liner=new T.MeshStandardMaterial({color:0x7ccad1,roughness:.38,side:T.DoubleSide});materials.add(soil);materials.add(liner);
 const flowerGeometry=own(spaGardenFlowerGeometry()),leafGeometry=own(spaGardenLeafGeometry()),flowerMaterial=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.86,side:T.DoubleSide}),leafMaterial=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.78,side:T.DoubleSide});materials.add(flowerMaterial);materials.add(leafMaterial);
 function mesh(parent,g,m,x,y,z,sx=1,sy=1,sz=1,level=0,yaw=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.y=yaw;o.userData.resortFloor=level;o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);staticTriangles+=(g.index?.count||g.attributes.position.count)/3;return o;}
 function record(level,x,y,z,scale,angle,flower=true){let row=records.get(level);if(!row)records.set(level,row={flowers:[],leaves:[]});row[flower?'flowers':'leaves'].push({x,y,z,scale,angle});}
 function planting(level,x,y,z,rx,rz,yaw,count=9){
  for(let i=0;i<count;i++){
   const a=i*2.399963,r=Math.sqrt((i+.5)/count),lx=Math.cos(a)*rx*r,lz=Math.sin(a)*rz*r,px=x+Math.cos(yaw)*lx+Math.sin(yaw)*lz,pz=z-Math.sin(yaw)*lx+Math.cos(yaw)*lz;
   record(level,px,y+.28+(i%3)*.07,pz,.66+(i%3)*.09,a);
   for(let j=0;j<4;j++)record(level,px,y+.04,pz,.75+(i%4)*.08,a+j*Math.PI/2,false);
  }
 }
 for(const site of sites){
  const y=site.level*rise;
  mesh(solid,cylinder,mats.ivory,site.x,y+.4,site.z,site.rx,.8,site.rz,site.level,site.yaw);
  mesh(decor,cylinder,mats.gold,site.x,y+.79,site.z,site.rx+.025,.06,site.rz+.025,site.level,site.yaw);
  mesh(decor,cylinder,soil,site.x,y+.827,site.z,site.rx-.08,.018,site.rz-.08,site.level,site.yaw);
  planting(site.level,site.x,y+.84,site.z,site.rx-.12,site.rz-.08,site.yaw);yield;
 }
 // Enrich existing Cabana planters on their true private platforms, without
 // placing new solid pots across the narrow wet ring or dry boarding paths.
 const cabana=zoneList.find(z=>z.key==='cabana');for(let i=0;i<cabana.seats;i++){const s=seatContact(cabana,i);planting(1,s.x+(cabana.roomId?2.7:1.9),rise+.75,s.z+(cabana.roomId?-2.2:.8),.3,.3,0,4);}
 for(const feature of cascadeList){
  const group=new T.Group();group.position.set(feature.x,0,feature.z);const tierRecords=[];surfaces.add(group);
  for(let i=0;i<feature.tiers.length;i++){
   const t=feature.tiers[i],base=feature.level*rise,bodyHeight=t.y-t.depth-base,foundation=mesh(solid,cylinder,mats.ivory,feature.x,base+bodyHeight/2,feature.z+t.z,t.rx+.14,bodyHeight,t.rz+.14,feature.level);
   const bed=mesh(surfaces,own(new T.CircleGeometry(1,48).rotateX(-Math.PI/2)),liner,feature.x,t.y-t.depth+.006,feature.z+t.z,t.rx,1,t.rz,feature.level);
   const wall=own(new T.CylinderGeometry(1,1,t.depth,48,1,true));mesh(solid,wall,liner,feature.x,t.y-t.depth/2-.025,feature.z+t.z,t.rx,1,t.rz,feature.level);
   // Coping has a real front opening, over the lower weir wall. No solid lid.
   const shape=new T.Shape(),start=.5,end=Math.PI*2-.5;
   for(let k=0;k<=64;k++){const a=start+(end-start)*k/64,x=Math.sin(a)*(t.rx+.15),z=-Math.cos(a)*(t.rz+.15);if(k)shape.lineTo(x,z);else shape.moveTo(x,z);}
   for(let k=64;k>=0;k--){const a=start+(end-start)*k/64;shape.lineTo(Math.sin(a)*t.rx,-Math.cos(a)*t.rz);}shape.closePath();
   mesh(decor,own(new T.ShapeGeometry(shape,16).rotateX(-Math.PI/2)),mats.gold,feature.x,t.y+.035,feature.z+t.z,1,1,1,feature.level);
   const material=waterMaterial(0x26bed5,.7,{width:t.rx*2,height:t.rz*2});material.uniforms.uWaterDepth.value=t.depth;material.fragmentShader=material.fragmentShader.replace('float waterDepth=mix(.23,uWaterDepth*(1.-.8*smoothstep(.55,1.,edge)),uLake);','float waterDepth=uWaterDepth;');applyResortWaterReflection(material,probeForFeature(feature));materials.add(material);
   const water=mesh(group,own(new T.CircleGeometry(1,48).rotateX(-Math.PI/2)),material,0,t.y,t.z,t.rx,1,t.rz,feature.level);waters.push(water);tierRecords.push({spec:t,water,bed,foundation});
  }
  for(let i=1;i<feature.tiers.length;i++){
   const upper=feature.tiers[i],lower=feature.tiers[i-1],material=waterMaterial(0x26bed5,.7,{waterfall:true,width:upper.rx*.85,height:upper.y-lower.y,flow:{width:upper.rx*.85,length:upper.y-lower.y,speed:3}});applyResortWaterReflection(material,probeForFeature(feature));materials.add(material);
   for(let j=0;j<8;j++){const x=((j+.5)/8-.5)*upper.rx*.85,z=upper.z+upper.rz*Math.sqrt(1-(x/upper.rx)**2);mesh(solid,box,mats.ivory,feature.x+x,upper.y-.1,feature.z+z+.11,upper.rx*.85/8+.012,.1,.25,feature.level);}
   const fall=mesh(group,own(spaGardenFallGeometry(upper,lower)),material,0,0,0,1,1,1,feature.level);waters.push(fall);
   impacts.push({material:tierRecords[i-1].water.material,x:feature.x,z:feature.z+upper.z+upper.rz+.38});
  }
  features.push({...feature,tiers:tierRecords});
  for(const side of [-1,1])planting(feature.level,feature.x+side*2.8,feature.level*rise+.1,feature.z-.5,.32,1.25,0,4);
  yield;
 }
 const transform=new T.Object3D(),color=new T.Color(),report={beds:sites.length,sites,ornamentalCascades:features.length,ornamentalTiers:features.length*3,flowerInstances:0,leafInstances:0,staticTriangles,triangles:staticTriangles};
 for(const[level,row]of records)for(const kind of ['flowers','leaves']){
  const flowers=kind==='flowers',list=row[kind],g=flowers?flowerGeometry:leafGeometry,m=flowers?flowerMaterial:leafMaterial,batch=new T.InstancedMesh(g,m,list.length);batch.name='SPA garden '+kind+' '+level;batch.userData.resortFloor=level;
  for(let i=0;i<list.length;i++){const p=list[i];transform.position.set(p.x,p.y,p.z);transform.rotation.set(flowers?.08:-.28,p.angle,0);transform.scale.setScalar(p.scale);transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);color.setHex(flowers?[0xffd4e9,0xe981bd,0xffefd5][i%3]:[0x98bb86,0x5e966f,0x88b7a3][i%3]);batch.setColorAt(i,color);}
  batch.instanceMatrix.needsUpdate=true;batch.instanceColor.needsUpdate=true;batch.castShadow=batch.receiveShadow=true;batch.computeBoundingSphere();fixed.add(batch);instances.push(batch);report[flowers?'flowerInstances':'leafInstances']+=list.length;report.triangles+=g.index.count/3*list.length;yield;
 }
 return{fixed,features,report,update(time,reduced,origin){if(reduced){lastRipple=-1;return;}const tick=Math.floor(time*.85);if(tick===lastRipple)return;lastRipple=tick;for(const p of impacts){p.material.uniforms.uRipples.value[0].set(origin.x+p.x,origin.z+p.z,time,.035);p.material.uniforms.uRippleCount.value=1;}},inspect(level){for(const o of instances)o.visible=level==null||o.userData.resortFloor<=level;},dispose(){for(const o of instances)o.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}
