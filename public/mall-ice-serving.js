import * as T from 'three';
import {MALL_ICE_FLAVORS,mallIceFlavor} from './mall-ice-data.js';
import {runSceneSteps} from './scene-tasks.js';

const templates=new Map();
const creamMaterial=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.43,metalness:0});
const coneMaterial=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.76});
let coneGeometry=null;
function waffleCone(){
  if(coneGeometry)return coneGeometry;
  const p=[],c=[],uv=[],indices=[],a=new T.Color(0xc48a45),b=new T.Color(0xf3c67f),rings=18,sides=48;
  for(let row=0;row<=rings;row++)for(let col=0;col<=sides;col++){
    const t=row/rings,angle=col/sides*Math.PI*2,ridge=Math.pow(Math.max(0,Math.cos(angle*14+t*22)),12)+Math.pow(Math.max(0,Math.cos(angle*14-t*22)),12),r=.018+t*.205+ridge*.0035*t;
    p.push(Math.cos(angle)*r,t*.55,Math.sin(angle)*r);uv.push(col/sides,t);const color=a.clone().lerp(b,.28+ridge*.23+t*.16);c.push(color.r,color.g,color.b);
    if(row<rings&&col<sides){const k=row*(sides+1)+col;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
  }
  coneGeometry=new T.BufferGeometry();coneGeometry.setAttribute('position',new T.Float32BufferAttribute(p,3));coneGeometry.setAttribute('color',new T.Float32BufferAttribute(c,3));coneGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));coneGeometry.setIndex(indices);coneGeometry.computeVertexNormals();coneGeometry.userData.sharedScenery=true;return coneGeometry;
}
function scoop(flavor,variant=0){
  const g=new T.SphereGeometry(.265,32,20),p=g.attributes.position,colors=[],base=new T.Color(flavor.color),accent=new T.Color(flavor.accent),palette=[0xff82bd,0x6ae6ef,0xffd66a];
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),relief=1+.024*Math.sin(x*43+z*17)*Math.cos(y*37-x*11)+.018*Math.sin(z*51+y*19);
    p.setXYZ(i,x*relief,y*relief,z*relief);let color=base.clone();
    if(flavor.style==='rainbow')color=new T.Color(palette[(variant+Math.floor((y+.27)*7))%3]);
    const streak=Math.pow(Math.max(0,Math.sin(x*19+z*12+y*13)),12);color.lerp(accent,streak*.35);colors.push(color.r,color.g,color.b);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.userData.sharedScenery=true;return g;
}
function swirl(flavor){
  const points=[];for(let i=0;i<=120;i++){const t=i/120,a=t*Math.PI*10,r=.195*(1-t)+.008;points.push(new T.Vector3(Math.cos(a)*r,.62+t*.44,Math.sin(a)*r));}
  const g=new T.TubeGeometry(new T.CatmullRomCurve3(points),120,.055,10,false),p=g.attributes.position,colors=[],a=new T.Color(flavor.color),b=new T.Color(flavor.accent);
  for(let i=0;i<p.count;i++){const color=a.clone().lerp(b,Math.pow(Math.max(0,Math.sin(p.getY(i)*37+p.getX(i)*5)),8)*.28);colors.push(color.r,color.g,color.b);}
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.userData.sharedScenery=true;return g;
}
export function* prepareMallIceServings(){
  for(const flavor of MALL_ICE_FLAVORS){
    if(templates.has(flavor.key))continue;yield;
    const root=new T.Group(),cream=new T.Group();cream.name='Gelato';root.add(new T.Mesh(waffleCone(),coneMaterial),cream);
    if(flavor.style==='swirl'){
      const base=new T.Mesh(scoop(flavor),creamMaterial);base.position.y=.60;base.scale.set(1,.5,1);cream.add(base,new T.Mesh(swirl(flavor),creamMaterial));
    }else{
      const count=flavor.style==='rainbow'?3:2;
      for(let i=0;i<count;i++){const mesh=new T.Mesh(scoop(flavor,i),creamMaterial),s=1-i*.16;mesh.position.set((i%2?1:-1)*.06,.64+i*.16,0);mesh.scale.setScalar(s);cream.add(mesh);}
    }
    yield;
    // Small edible decorations share the cream material and fixed geometry.
    const topping=new T.SphereGeometry(.024,8,6),color=new T.Color(flavor.accent);topping.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:topping.attributes.position.count},()=>color.toArray()).flat(),3));topping.userData.sharedScenery=true;
    for(let i=0;i<9;i++){const a=i*2.399,r=.10+(i%3)*.035,m=new T.Mesh(topping,creamMaterial);m.position.set(Math.cos(a)*r,.86+Math.sin(i)*.035,Math.sin(a)*r);m.scale.set(flavor.key==='pistachio-garden'?1.7:1,.6,1);cream.add(m);}
    root.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});templates.set(flavor.key,root);
  }
}
export function mallIceServing(key){
  if(!mallIceFlavor(key))return null;if(!templates.has(key))runSceneSteps(prepareMallIceServings());
  const root=templates.get(key).clone(true);root.userData.iceFlavor=key;root.userData.cream=root.getObjectByName('Gelato');return root;
}
