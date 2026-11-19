import {smoothPalaceNormals} from './resort-spa-palace-normals.js';
import * as T from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {SPA_V7_ROOMS,SPA_PALACE as P,spaRoomOutline,spaNightCeilingY} from './resort-spa-layout-v7.js';
import {spaGalaxyTexture} from './resort-spa-soft-furnishings.js';
// One full-room vault per retained night suite, following the ACTUAL expanded
// room outline. The common pressure roof stays above it; no low black lids.
export function* resortPalaceNightSteps({shell,decor,mats}){
 const geos=new Set(),materials=new Set(),textures=new Set(),dynamic=new T.Group(),time={value:0};
 const own=g=>(geos.add(g),g),glow=new T.MeshBasicMaterial({color:0x9c54ff,toneMapped:false});materials.add(glow);
 for(const z of SPA_V7_ROOMS.filter(z=>['vip','midnight'].includes(z.key))){
  const outline=spaRoomOutline(z,.8),shape=new T.Shape();outline.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
  const source=new T.ShapeGeometry(shape,32);source.rotateX(-Math.PI/2);const g=own(new TessellateModifier(4,8).modify(source));source.dispose();const p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){const x=p.getX(i),d=p.getZ(i);p.setY(i,spaNightCeilingY(z,x,d));uv.setXY(i,(x-z.x)/(z.rx*2)+.5,(d-z.z)/(z.rz*2)+.5);}smoothPalaceNormals(g,(x,d)=>spaNightCeilingY(z,x,d));
  const material=new T.MeshStandardMaterial({color:z.key==='vip'?0x291f29:0x0e1831,roughness:.92,side:T.DoubleSide});materials.add(material);
  if(z.key==='vip'){const chart=spaGalaxyTexture({planar:true});textures.add(chart);material.emissiveMap=chart;material.emissive.setHex(0xffffff);material.emissiveIntensity=1.6;}
  const vault=new T.Mesh(g,material);vault.name='SPA full-height '+z.key+' star vault';vault.userData.resortFloor=2;shell.add(vault);
  for(const [offset,radius,mat]of[[.02,.16,mats.gold],[-.12,.055,glow]]){
   const curve=new T.CatmullRomCurve3([...outline,outline[0]].map(p=>new T.Vector3(p.x,spaNightCeilingY(z,p.x,p.z)+offset,p.z)),true),geo=own(new T.TubeGeometry(curve,256,radius,6,true)),ring=new T.Mesh(geo,mat);ring.name='SPA '+z.key+' continuous ceiling '+(mat===glow?'violet LED':'cornice');ring.userData.resortFloor=2;decor.add(ring);
  }
  const vertices=[],colors=[],phases=[],color=new T.Color();let n=0;
  for(let i=0;n<1600&&i<4000;i++){
   const x=z.x+(2*((i*.618033988749895)%1)-1)*(z.rx-.95),d=z.z+(2*((i*.754877666246693)%1)-1)*(z.rz-.95),qx=Math.abs(x-z.x)-z.rx+z.corner,qz=Math.abs(d-z.z)-z.rz+z.corner;if(Math.hypot(Math.max(0,qx),Math.max(0,qz))+Math.min(Math.max(qx,qz),0)>z.corner-1)continue;
   vertices.push(x,spaNightCeilingY(z,x,d)-.055,d);phases.push(i*1.117);color.setHex(z.key==='midnight'?(i%7?0xbacfff:0xa698e6):(i%4?0xa698e6:0xffd08a));colors.push(color.r,color.g,color.b);n++;
  }
  const stars=own(new T.BufferGeometry());stars.setAttribute('position',new T.Float32BufferAttribute(vertices,3));stars.setAttribute('color',new T.Float32BufferAttribute(colors,3));stars.setAttribute('aPhase',new T.Float32BufferAttribute(phases,1));
  const sm=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,uniforms:{time},vertexShader:'attribute float aPhase;uniform float time;varying vec3 ink;varying float glow;void main(){ink=color;glow=.82+.18*sin(time*.35+aPhase);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp((1.7+fract(aPhase)*2.)*65./max(1.,-p.z),.85,7.);}',fragmentShader:'varying vec3 ink;varying float glow;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(ink,exp(-d*d*22.)*glow);\n#include <colorspace_fragment>\n}'});materials.add(sm);const field=new T.Points(stars,sm);field.userData.resortFloor=2;dynamic.add(field);yield;
 }
 return{dynamic,update:(t,reduced)=>{time.value=reduced?0:t;},inspect:level=>{dynamic.visible=level==null||level>=2;},dispose(){for(const g of geos)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}
