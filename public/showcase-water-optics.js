import * as T from 'three';
import {applyUnderwaterLighting} from './water-shading.js';
import {showcaseWaterProbe} from './showcase-water-probes.js';

// The same two wave samples and one shared probe as native lagoon water.
// Physical metre UVs, impact rings and the original motion clock stay put.
const flowingFoam=`if(uFlowing>.5){
  float across=abs(vWaterUv.x-.5)*2.;
  float rim=smoothstep(.89,.995,across)*(.025+fieldA.a*.12);
  float aeration=smoothstep(.72,.96,fieldA.a)*smoothstep(.55,.9,fieldB.a)*.045;
  foam=clamp(foam+rim+aeration,0.,.34);
 }`;
export function polishShowcaseWater(material,{id,pool=[0,35,22,15],surfaceY=1.45}={}){
 if(material.userData.showcaseOptics)return material;
 if(!material.defines?.SLIDE_CATCH_POOL){material.uniforms.uColor.value.setHex(0x1499fa);material.uniforms.uShoreColor.value.setHex(0xb1efff);}
 material.uniforms.uWaterEnvironment.value=showcaseWaterProbe(id);
 material.uniforms.uShowcaseBasin={value:new T.Vector4(...pool)};
 material.uniforms.uShowcaseBasinY={value:surfaceY};
 material.uniforms.uShowcaseReceiving={value:!['lazy-river','surf-halfpipe','fountain-carousel','pool-pendulum'].some(kind=>id?.endsWith(kind))?1:0};
 material.vertexShader=material.vertexShader.replace('float wave=sin(p.x*1.3+uTime*.8)*.004+cos(p.y*1.7-uTime*.6)*.003;',`float wave=sin(p.x*.68+p.z*.44+uTime*.8)*.035+cos(p.z*.79-p.x*.23-uTime*.6)*.028;
 #ifdef SLIDE_CATCH_POOL
 wave*=1.-smoothstep(.78,1.,length((uv-.5)*2.));
 #endif`);
 material.vertexShader=material.vertexShader.replace('vec4 world=modelMatrix*vec4(p,1.0);',`if(uShowcaseReceiving>.5&&uFlowing>.5&&uFlowing<1.5){
 float r=length((p.xz-uShowcaseBasin.xy)/uShowcaseBasin.zw);
 float merge=(1.-smoothstep(.62,1.,r))*(1.-smoothstep(uShowcaseBasinY+.6,uShowcaseBasinY+2.,p.y));
 p.y=mix(p.y,min(p.y,uShowcaseBasinY-.10),merge);
 }
 vec4 world=modelMatrix*vec4(p,1.0);`);
 material.vertexShader='uniform vec4 uShowcaseBasin;uniform float uShowcaseBasinY;uniform float uShowcaseReceiving;varying vec3 vShowcaseLocal;varying vec3 vShowcaseProbeX;\n'+material.vertexShader.replace('vWaterUv=uv;','vWaterUv=uv;vShowcaseLocal=p;vShowcaseProbeX=normalize(modelMatrix[0].xyz);');
 material.fragmentShader='varying vec3 vShowcaseLocal;varying vec3 vShowcaseProbeX;uniform vec4 uShowcaseBasin;uniform float uShowcaseBasinY;\n'+material.fragmentShader
  .replace('p*.10+flow','p*.075+flow*.75')
  .replace('p.yx*.157-flow*.71','p.yx*.119-flow*.53')
  .replace('vec2 slope=(fieldA.rg+fieldB.gr-1.0)*.19;','vec2 slope=(fieldA.rg+fieldB.gr-1.0)*.095;')
  .replace('float fresnel=.025+.975*pow(1.0-facing,5.0);','float fresnel=.035+.965*pow(1.0-facing,4.0);')
  .replace('environmentUv(reflected),.7','environmentUv(vec3(dot(reflected,vShowcaseProbeX),reflected.y,dot(reflected,cross(vShowcaseProbeX,vec3(0.,1.,0.))))),.35')
  .replace('float roughness=.085+min(.12,length(fwidth(slope))*.65);','float roughness=.065+min(.10,length(fwidth(slope))*.5);')
  .replace('))*.014*(.4+fieldB.a*.6)', '))*.025*(.4+fieldB.a*.6)')
  .replace('vec3 body=mix(uColor*.7,mix(deep,shore,transmission),uLake);','vec3 body=mix(uColor*.82,mix(deep,shore,transmission),uLake);')
  .replace('clamp(.035+fresnel*.91,0.0,.96)','clamp(.075+fresnel*.91,0.0,.96)')
  .replace('color+=lightTint*caustic*(.3+shallow*.2);','color+=vec3(.045,.13,.19)*caustic*(.16+shallow*.09);')
  .replace(/if\(uFlowing>\.5\)\{\n  float across=[\s\S]*?\n \}/,flowingFoam)
  .replace('vec3(.88,1.0,.96),foam','vec3(.93,.985,1.0),foam')
  .replace('if(uFlowing>.5)alpha=max(alpha,.62+fresnel*.22);',`if(uFlowing>.5)alpha=max(alpha,.44+fresnel*.35);
 if(uFlowing>.5&&uFlowing<1.5){
  float basinRadius=length((vShowcaseLocal.xz-uShowcaseBasin.xy)/uShowcaseBasin.zw);
  float basinMix=(1.-smoothstep(.70,.98,basinRadius))*(1.-smoothstep(uShowcaseBasinY+.02,uShowcaseBasinY+.65,vShowcaseLocal.y));
  alpha*=1.-basinMix;
 }`)
  .replace('uOpacity*(.38+depth*.17)','uOpacity*(.55+depth*.20)')
  .replace('vec4(max(color,vec3(0.0)),.96)','vec4(max(color,vec3(0.0)),.90)')
  .replace('vec4(max(color,vec3(0.0)),.95)','vec4(max(color,vec3(0.0)),.84)');
 material.userData.showcaseOptics='crystal-v3';material.needsUpdate=true;return material;
}

export function submergeReceivingFloor(geometry,pool,surfaceY){
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const radius=Math.hypot((p.getX(i)-pool[0])/pool[2],(p.getZ(i)-pool[1])/pool[3]);
  if(radius>=.98||p.getY(i)>surfaceY+1.5)continue;
  const blend=T.MathUtils.smoothstep(.98-radius,0,.38),target=Math.min(p.getY(i),surfaceY-1.18);
  p.setY(i,T.MathUtils.lerp(p.getY(i),target,blend));
 }
 geometry.computeVertexNormals();return geometry;
}

export function receivingBankEnd(data,depth,pool,surfaceY){
 if(!data.rapids)return .955;
 for(let i=Math.floor(data.samples.length*.65);i<data.samples.length;i++){
  const p=data.samples[i].p,r=Math.hypot((p.x-pool[0])/pool[2],(p.z-pool[1])/pool[3]);
  if(r<1.01&&p.y-depth<surfaceY+2)return Math.max(.65,(i-2)/(data.samples.length-1));
 }
 return .955;
}
export function submergeReceivingWalls(geometry,pool,surfaceY){
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const radius=Math.hypot((p.getX(i)-pool[0])/pool[2],(p.getZ(i)-pool[1])/pool[3]),base=p.getY(i)-(i%2?2.6:0);
  if(radius>=.98||base>surfaceY+1.5)continue;
  const blend=T.MathUtils.smoothstep(.98-radius,0,.3);p.setY(i,T.MathUtils.lerp(p.getY(i),surfaceY-1.45,blend));
 }geometry.computeVertexNormals();return geometry;
}

// Dense enough for actual small ripples, with the exact released shore contour.
// Buffers are built once; the native water clock drives all later displacement.
export function showcaseBasinGrid(rx,rz){
 const p=[0,0,0],uv=[.5,.5],idx=[],angular=100,rings=16;
 for(let r=1;r<=rings;r++)for(let a=0;a<angular;a++){
  const angle=a/angular*Math.PI*2,x=Math.sin(angle)*rx*r/rings,z=Math.cos(angle)*rz*r/rings;
  p.push(x,0,z);uv.push(.5+x/(2*rx),.5-z/(2*rz));
 }
 for(let a=0;a<angular;a++)idx.push(0,1+a,1+(a+1)%angular);
 for(let r=1;r<rings;r++)for(let a=0;a<angular;a++){
  const i=1+(r-1)*angular+a,j=1+(r-1)*angular+(a+1)%angular;
  idx.push(i,i+angular,j+angular,i,j+angular,j);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingBox();g.boundingBox.expandByScalar(.064);g.boundingSphere=g.boundingBox.getBoundingSphere(new T.Sphere());return g;
}
let pebbleGeometry;
export function detailShowcaseBasin(pool){
 if(pool.userData.showcaseBasin)return pool;
 const {rx,rz,water,bed,slideBasinOptics}=pool.userData;bed.material.color.setHex(0x67bee8);
 for(const mesh of slideBasinOptics.surfaces){const old=mesh.geometry;mesh.geometry=showcaseBasinGrid(rx,rz);if(!old.userData.sharedScenery)old.dispose();}
 pebbleGeometry??=new T.IcosahedronGeometry(1,1);pebbleGeometry.userData.sharedScenery=true;
 const material=applyUnderwaterLighting(new T.MeshStandardMaterial({color:0xffffff,roughness:.84}),water.uniforms.uTime,0x24b9ff,{level:bed.material.userData.waterLight.level});
 const stones=new T.InstancedMesh(pebbleGeometry,material,24),pose=new T.Object3D(),color=new T.Color();stones.name='Submerged lagoon pebbles';stones.receiveShadow=true;
 for(let i=0;i<24;i++){
  const a=i*2.399963229728653,r=.23+.61*Math.sqrt((i+.5)/24),s=.38+(i%5)*.12;
  pose.position.set(Math.sin(a)*rx*r,bed.position.y+.08,Math.cos(a)*rz*r);pose.rotation.y=a;pose.scale.set(s,.13+(i%3)*.05,s*.73);pose.updateMatrix();stones.setMatrixAt(i,pose.matrix);
  color.setHex([0xb4d9de,0x89b6c5,0xc2e4e6,0x92bfc7][i%4]);stones.setColorAt(i,color);
 }
 stones.instanceMatrix.needsUpdate=true;stones.instanceColor.needsUpdate=true;stones.computeBoundingSphere();pool.add(stones);pool.userData.showcaseBasin={stones};return pool;
}
// The top handrail follows the same smooth submerged outlet as the glass wall.
// Ending it at a centreline shore test left coloured rods suspended above pools.
export function receivingRailPoint(sample,side,width,depth,pool,surfaceY){
 const p=sample.p.clone().addScaledVector(sample.right,side*width).addScaledVector(sample.up,-depth+2.5),r=Math.hypot((p.x-pool[0])/pool[2],(p.z-pool[1])/pool[3]);
 if(r<.98&&sample.p.y-depth<surfaceY+1.5)p.y=T.MathUtils.lerp(p.y,surfaceY-1.45,T.MathUtils.smoothstep(.98-r,0,.3));return p;
}
