import * as T from 'three';

// Three original, small SPA fish. Real curved membranes/anatomy, no reference
// image on a plane, no extra render target or per-frame geometry upload.
export function createResortAquariumFish(kind){
 const root=new T.Group(),geometries=new Set(),materials=new Set(),fins=[];
 const ray=kind==='ray',angel=kind==='angelfish';
 const own=g=>(geometries.add(g),g),mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.32,metalness:.22,...extra});materials.add(m);return m;};
 const base=mat(ray?0x8097b0:angel?0xe6b25d:0x43bed9,{vertexColors:true}),membrane=mat(ray?0x7c75bd:angel?0xdeb966:0xac6bbf,{side:T.DoubleSide,roughness:.38,vertexColors:true}),dark=mat(0x101821,{roughness:.18}),iris=mat(0xecc677),pearl=mat(0xe9f3ec);
 function mesh(g,m,x=0,y=0,z=0){const o=new T.Mesh(own(g),m);o.position.set(x,y,z);root.add(o);return o;}
 function sphere(m,x,y,z,rx,ry,rz){const g=new T.SphereGeometry(1,24,14);g.scale(rx,ry,rz);return mesh(g,m,x,y,z);}
 function colors(g,low,high){const p=g.attributes.position,a=new Float32Array(p.count*3),c=new T.Color(),one=new T.Color(low),two=new T.Color(high);for(let i=0;i<p.count;i++){const t=.35+.3*Math.sin(p.getX(i)*11+p.getY(i)*4)+.2*Math.sin(p.getY(i)*8);c.copy(one).lerp(two,Math.max(0,Math.min(1,t)));a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new T.BufferAttribute(a,3));return g;}
 const body=new T.SphereGeometry(1,32,20);body.scale(ray?1.08:angel?.7:1.03,ray?.16:angel?.65:.38,ray?.55:angel?.22:.29);colors(body,ray?0x677c9e:angel?0xcf8f37:0x217b9b,ray?0xabb5ca:angel?0xffe6ab:0x8de4e0);mesh(body,base).name=kind+' body';
 function fin(shape,{plane='xy',offset=[0,0,0],moving=false}={}){const g=new T.ShapeGeometry(shape,24),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin(x*4+y*3)*.07*(Math.abs(x)+Math.abs(y)));}if(plane==='xz')g.rotateX(Math.PI/2);colors(g,ray?0x6d77ae:angel?0xc38a32:0x8059aa,ray?0xb3d4da:angel?0xffe9b3:0xefabd5);g.computeVertexNormals();const o=mesh(g,membrane,...offset);if(moving)fins.push(o);return o;}
 if(ray){
  for(const side of [-1,1]){const wing=new T.Shape();wing.moveTo(.85,0);wing.bezierCurveTo(.4,side*.5,-.05,side*1.7,-.8,side*1.6);wing.bezierCurveTo(-.8,side*.8,-1.2,side*.3,-.7,0);wing.closePath();fin(wing,{plane:'xz',moving:true});}
  const curve=new T.CatmullRomCurve3([new T.Vector3(-.8,0,0),new T.Vector3(-1.4,.02,.1),new T.Vector3(-2.35,.1,.12)]);mesh(new T.TubeGeometry(curve,20,.025,5,false),dark).name='ray tail';
 }else{
  const tail=new T.Shape();tail.moveTo(-.76,0);tail.bezierCurveTo(-1.25,.25,-1.7,angel?.7:1.05,-2.2,angel?.75:.85);tail.bezierCurveTo(-2.0,.4,-2.32,.2,-2.08,0);tail.bezierCurveTo(-2.32,-.25,-2.05,-.48,-2.2,angel?-.75:-.9);tail.bezierCurveTo(-1.5,-.95,-1.15,-.15,-.76,0);tail.closePath();fin(tail,{moving:true}).name=kind+' fan tail';
  for(const side of [-1,1]){const shape=new T.Shape();shape.moveTo(.55,side*.2);shape.bezierCurveTo(.2,side*.65,-.35,side*(angel?1.5:.95),-.9,side*(angel?1.45:.55));shape.bezierCurveTo(-.7,side*.2,-.2,side*.2,.55,side*.2);fin(shape).name=side>0?'dorsal fin':'ventral fin';}
  for(const side of [-1,1]){const shape=new T.Shape();shape.moveTo(.25,0);shape.bezierCurveTo(-.1,-.15,-.45,-.6,-.8,-.45);shape.bezierCurveTo(-.5,-.15,-.1,.08,.25,0);const o=fin(shape,{offset:[0,0,side*.25],moving:true});o.rotation.x=side*.8;o.name='pectoral fin';}
 }
 // Eyes sit on the actual body, both visible sides; pupils remain forward.
 for(const side of [-1,1]){const x=ray?.64:angel?.45:.7,y=ray?.14:angel?.2:.12,z=side*(ray?.24:angel?.19:.22);sphere(pearl,x,y,z,.115,.115,.07);sphere(iris,x+.018,y,z+side*.05,.085,.085,.025);sphere(dark,x+.034,y,z+side*.073,.052,.06,.013);sphere(pearl,x+.05,y+.035,z+side*.085,.018,.018,.008);}
 if(!ray){const mouth=mesh(new T.TorusGeometry(.058,.016,5,16),dark,angel?.69:1.01,-.035,0);mouth.rotation.y=Math.PI/2;for(const side of [-1,1]){const arc=new T.CatmullRomCurve3([new T.Vector3(.35,.25,side*.23),new T.Vector3(.2,0,side*.3),new T.Vector3(.3,-.22,side*.23)]);mesh(new T.TubeGeometry(arc,10,.012,4,false),iris);}}
 root.name='SPA aquarium '+kind;root.userData.kind=kind;root.userData.animate=(time,reduced=false)=>{for(let i=0;i<fins.length;i++)fins[i].rotation.y=reduced?0:Math.sin(time*2.6+i*.8)*.13;};
 return{root,dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}
