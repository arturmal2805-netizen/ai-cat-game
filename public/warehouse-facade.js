import * as T from 'three';
// Limit only this illuminated exterior's fog. The global ocean and other
// buildings retain their original shaders and depth haze. No extra samplers.
export function litWarehouseMaterial(material){
 material.onBeforeCompile=shader=>{const fog=T.ShaderChunk.fog_fragment.replace('fogFactor );','min( fogFactor, 0.32 ) );');shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',fog);};
 material.customProgramCacheKey=()=> 'warehouse-illuminated-facade-v1';return material;
}
// Static architectural detail in the original shell's authored metres. The
// exterior builder applies the requested width/height factors once afterwards.
export function* warehouseFacadeSteps({tube,buffers,stadium}){
 const put=(key,g,x=0,y=0,z=0)=>{g.translate(x,y,z);buffers[key].push(g);};
 const box=(key,w,h,d,x,y,z)=>put(key,new T.BoxGeometry(w,h,d),x,y,z);
 // Layered stone podium, bronze reveals and a continuous illuminated cornice.
 for(const [rx,rz,y,key,r]of [[130.2,72.2,.35,'bronze',.24],[125,65,1.4,'stone',.48],[120.6,60.6,4.5,'bronze',.14],[120.6,60.6,8.2,'gold',.14],[121,61,12.1,'stone',.38],[121.2,61.2,12.45,'warm',.09]])tube(key,stadium(rx,rz).getSpacedPoints(96).map(v=>[v.x,y,v.y]),r);
 // Finer roof glazing rhythm and restrained ridge lighting.
 for(let x=-112.5;x<=112.5;x+=15){yield;const r=Math.sqrt(3600-Math.max(0,Math.abs(x)-60)**2),points=[];for(let j=0;j<=24;j++){const a=Math.PI*j/24;points.push([x,12+Math.sin(a)*r*.72,Math.cos(a)*r]);}tube('bronze',points,.115);}
 for(const a of [Math.PI*.36,Math.PI*.64]){const pts=[];for(let i=0;i<=48;i++){const x=-120+240*i/48,r=Math.sqrt(Math.max(0,3600-Math.max(0,Math.abs(x)-60)**2));pts.push([x,12+Math.sin(a)*r*.72+.22,Math.cos(a)*r]);}tube('warm',pts,.075);}
 // Recessed enamel panels, fluted pilasters, sill ledges and warm lanterns.
 for(const side of [-1,1])for(const x of [-90,-75,-60,-45,-30,30,45,60,75,90]){
  yield;const dx=Math.max(0,Math.abs(x)-60),z=side*Math.sqrt(3600-dx*dx),yaw=Math.atan2(Math.sign(x)*dx/60,z/60);
  const panel=(key,w,h,d,px,y,pz)=>{const g=new T.BoxGeometry(w,h,d);g.translate(px,y,pz);g.rotateY(yaw);g.translate(x,0,z);buffers[key].push(g);};
  panel('enamel',12.4,1.8,.18,0,2.3,.35);panel('bronze',12.8,.12,.26,0,3.3,.47);panel('stone',13.1,.3,.8,0,1.15,.65);
  for(const offset of [-6.6,6.6])panel('gold',.16,10.6,.24,offset,6.5,.51);
  if(Math.abs(x)%30===0){panel('bronze',.85,3.6,.7,0,7.4,1.05);panel('warm',.5,2.9,.76,0,7.4,1.1);panel('gold',1.05,.16,.94,0,9.3,1.05);}
 }
 // A legible main portal: nested arches, paired fluted columns and a canopy.
 for(const [radius,height,z,key,r]of [[18.3,26,62,'stone',.7],[17.1,25,62.8,'bronze',.46],[16.2,24.2,63.4,'gold',.3],[16.1,24.1,63.85,'warm',.075]]){const pts=[];for(let i=0;i<=32;i++){const a=Math.PI*i/32;pts.push([Math.cos(a)*radius,2+Math.sin(a)*height,z]);}tube(key,pts,r);}
 for(const x of [-23,-19,19,23]){put('stone',new T.CylinderGeometry(.54,.7,27,10),x,15.5,63);for(const dx of [-.22,0,.22])box('bronze',.065,25,.1,x+dx,15.5,63.52);put('gold',new T.CylinderGeometry(.9,.9,.35,12),x,1.4,63);put('gold',new T.CylinderGeometry(.85,.85,.4,12),x,29.3,63);}
 box('enamel',50,1.15,5,0,30.1,64);box('gold',50.6,.2,5.35,0,30.75,64);box('warm',47.5,.08,.12,0,29.52,66.58);
 for(const [w,z,y]of [[41,68,.62],[45,70,.32],[49,72,.05]]){box('stone',w,.3,1.8,0,y,z);box('warm',w-.8,.055,.08,0,y+.15,z+.9);}
 // Cat crest and door handles remain decoration on the sealed exterior.
 tube('gold',[[-4,46.1,63.1],[-4.4,52.3,63.1],[-1.7,50.6,63.1],[1.7,50.6,63.1],[4.4,52.3,63.1],[4,46.1,63.1],[0,44.4,63.1],[-4,46.1,63.1]],.18);
 for(const x of [-.65,.65])tube('gold',[[x,5.5,64.2],[x,8,64.2]],.09);
 return {version:2,wallPanelCount:20,lanternCount:12,portalLayers:4,roofSecondaryRibs:16,interiorAdded:false};
}
