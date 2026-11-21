import * as T from 'three';
import {parts,roundedShape,slab,signMesh} from './waterfront-primitives.js';
export const GLASS_PANELS=Object.freeze([{x:0,z:13,w:112,d:48},{x:-96,z:22,w:32,d:24},{x:96,z:22,w:32,d:24}]);
export function floorHoles(shape,offset=0){for(const p of GLASS_PANELS){const h=new T.Path();h.moveTo(p.x-p.w/2,-(p.z+offset)-p.d/2);h.lineTo(p.x-p.w/2,-(p.z+offset)+p.d/2);h.lineTo(p.x+p.w/2,-(p.z+offset)+p.d/2);h.lineTo(p.x+p.w/2,-(p.z+offset)-p.d/2);h.closePath();shape.holes.push(h);}return shape;}
function roofHeight(x,z){return 25+10*Math.exp(-((x/60)**2))+3*Math.cos(x/67)-3*(z/58)**2;}
function roofGeometry(){const g=new T.BufferGeometry(),positions=[],uv=[],nx=72,nz=20;for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const x=-145+290*i/nx,z=-60+120*j/nz,dx=290/nx,dz=120/nz;if(Math.abs(x+dx/2)<54&&Math.abs(z+dz/2)<23)continue;for(const [a,b]of[[x,z],[x,z+dz],[x+dx,z],[x+dx,z],[x,z+dz],[x+dx,z+dz]]){positions.push(a,roofHeight(a,b),b);uv.push((a+145)/45,(b+60)/45);}}g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;}
export function table(b,x,z,y=1.05,{terrace=false}={}){
 b.cylinder('gold',x,y+1.3,z,.23,2.6,.65);b.cylinder('ivory',x,y+2.65,z,2.6,.28);b.torus('gold',x,y+2.8,z,2.5,.065);
 b.cylinder('gold',x,y+3.1,z,.25,.65);b.sphere('flower',x,y+3.55,z,.6,.65,.6);
 for(let j=0;j<3;j++){const a=j*Math.PI*2/3,px=x+Math.sin(a)*1.4,pz=z+Math.cos(a)*1.4;b.cylinder('ivory',px,y+2.85,pz,.52,.08);b.cylinder('light',px+.55,y+3.03,pz,.17,.32);b.sphere('rose',px,y+3.02,pz,.27,.15,.27);}
 for(let j=0;j<4;j++){const a=j*Math.PI/2,px=x+Math.sin(a)*3.9,pz=z+Math.cos(a)*3.9;b.cylinder('gold',px,y+.7,pz,.13,1.4);b.sphere(terrace?'rose':'pink',px,y+1.25,pz,1.3,.35,1.1);b.box('rose',px+Math.sin(a)*.85,y+2.2,pz+Math.cos(a)*.85,2.4,1.8,.38,[0,a,0]);}
}
export function sofa(b,x,z,y=1.05,angle=0){
 const point=(dx,dz)=>[x+dx*Math.cos(angle)+dz*Math.sin(angle),z-dx*Math.sin(angle)+dz*Math.cos(angle)];
 for(let j=-1;j<=1;j++){const[p,q]=point(j*2.7,0);b.sphere('ivory',p,y+1,q,1.5,.65,1.8);const[r,s]=point(j*2.7,-1.45);b.sphere('rose',r,y+2,s,1.5,1.3,.4);const[a,c]=point(j*2.7,-.8);b.sphere('pink',a,y+2,c,.65,.7,.3);}
 const[p,q]=point(0,3.3);b.cylinder('gold',p,y+1.1,q,1.5,1.6);b.cylinder('ivory',p,y+2,q,1.8,.18);b.cylinder('light',p,y+2.5,q,.2,.8);
}
export function lantern(b,x,z,y=1.05,h=6){b.cylinder('gold',x,y+h/2,z,.11,h);b.cylinder('gold',x,y+h,z,.6,.2);b.box('light',x,y+h+.75,z,.72,1.25,.72);b.cylinder('gold',x,y+h+1.45,z,.64,.25,.2);}
export function planter(b,x,z,y=1.05,r=5){b.cylinder('gold',x,y+.5,z,r,1,r*.9);b.cylinder('ivory',x,y+1.2,z,r*.98,.8);b.cylinder('dark',x,y+1.65,z,r*.85,.15);}
export function* restaurantSteps(root,materials){
 const b=parts(root,materials),floor=floorHoles(roundedShape(280,112,24)),y=1.05;b.put(slab(floor,.8),'ivory',0,y-.8,-8);
 // The supporting pier has these same real holes: no opaque mesh behind glass.
 for(const p of GLASS_PANELS){yield;b.box('floorGlass',p.x,y-.12,p.z-8,p.w,.24,p.d);for(let x=p.x-p.w/2;x<=p.x+p.w/2+.01;x+=p.w/8)b.box('gold',x,y-.18,p.z-8,.16,.42,p.d);for(let z=p.z-p.d/2;z<=p.z+p.d/2+.01;z+=p.d/4)b.box('gold',p.x,y-.18,z-8,p.w,.42,.16);}
 const roof=new T.Group();roof.name='Laguna pearl canopy';root.add(roof);const rb=parts(roof,materials);rb.put(roofGeometry(),'ivory',0,0,-8);
 for(const z of[-60,60]){yield;const pts=[];for(let i=0;i<=72;i++){const x=-145+290*i/72;pts.push([x,roofHeight(x,z),z-8]);}rb.tube('gold',pts,.65);rb.tube('light',pts.map(p=>[p[0],p[1]-.38,p[2]+(z<0?.6:-.6)]),.2);}
 for(let x=-140;x<=140;x+=20){yield;const h=roofHeight(x,51)-y;b.cylinder('gold',x,y+h/2,43,.23,h);b.cylinder('gold',x,y+h/2,-59,.23,h);if(Math.abs(x)>19){const w=18.8;b.box('glass',x+10,y+h/2,46,w,h-.4,.15);}b.box('glass',x+10,y+h/2,-62,18.8,h-.5,.15);const pts=[];for(let z=-60;z<=60;z+=5)pts.push([x,roofHeight(x,z)+.2,z-8]);rb.tube('gold',pts,.15);}
 // Central roof lantern gives sunlight and a real view through the arched glazing.
 for(let x=-54;x<=54;x+=9){const pts=[];for(let z=-24;z<=24;z+=4)pts.push([x,roofHeight(x,z)+.1,z-8]);rb.tube('gold',pts,.18);}
 for(let i=-1;i<=1;i+=2){const pts=[];for(let x=-54;x<=54;x+=6)pts.push([x,roofHeight(x,i*24)+.1,i*24-8]);rb.tube('gold',pts,.25);}
 const skylight=new T.SphereGeometry(1,48,16,0,Math.PI*2,0,Math.PI/2);rb.put(skylight,'glass',0,30,-8,56,9,26);
 yield* rb.finish();
 // The entry remains an open arch, not a transparent collision wall.
 const arch=[];for(let i=0;i<=32;i++){const a=Math.PI*i/32;arch.push([Math.cos(a)*18,y+8+Math.sin(a)*15,47]);}b.tube('gold',arch,.8);b.tube('light',arch.map(p=>[p[0]*.94,p[1]-.45,p[2]+.4]),.23);for(const x of[-18,18])b.cylinder('gold',x,y+4,47,.8,8);
 const sign=signMesh('РЕСТОРАН\n«ЛАГУНА»',27,8);sign.position.set(0,29,49);root.add(sign);
 // Paw above the arch; these are sculpted meshes, not substituted cat avatars.
 b.sphere('light',0,37,48,1.5,1.1,.3);for(let i=0;i<4;i++)b.sphere('light',(i-1.5)*1.1,38.5+(.5-Math.abs(i-1.5)*.25),48,.45,.65,.3);
 // A broad curved bar and stocked back shelving, leaving the glazed centre open.
 const bar=[];for(let i=0;i<=32;i++){const a=-Math.PI/2+Math.PI*i/32;bar.push([Math.sin(a)*31,y+2.3,-36+Math.cos(a)*8]);}b.tube('rose',bar,2.1);b.tube('gold',bar.map(p=>[p[0],p[1]+1.5,p[2]]),.22);b.tube('light',bar.map(p=>[p[0],p[1]-.8,p[2]+2]),.12);
 for(let i=-3;i<=3;i++){b.cylinder('gold',i*7,y+1,-22,.18,2);b.sphere('rose',i*7,y+2.1,-22,1.1,.3,1.1);}
 for(let k=0;k<3;k++){b.box('wood',0,y+3+k*3,-54,65,.35,2.5);for(let i=-10;i<=10;i++){b.cylinder(i%2?'gold':'rose',i*2.9,y+4+k*3,-54,.4,1.7);b.cylinder('light',i*2.9,y+5+k*3,-54,.17,.3);}}
 for(const x of[-115,-75,75,115])for(const z of[-40,-10,34]){yield;table(b,x,z,y);}
 for(const x of[-44,-22,22,44])table(b,x,-13,y);
 for(const x of[-100,0,100]){yield;sofa(b,x,-48,y);for(const s of[-1,1]){b.cylinder('gold',x+s*9,y+9,-48,.16,18);b.tube('light',[[x+s*9,y+18,-48],[x+s*8,y+20,-48],[x,y+21,-48]],.15);}}
 // Suspended warm ring luminaires and slim pendants.
 for(const x of[-100,-50,0,50,100]){yield;b.torus('gold',x,22,-5,9,.22);b.torus('light',x,21.8,-5,8.8,.16);b.cylinder('gold',x,25.5,-5,.08,7);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;b.cylinder('gold',x+Math.cos(a)*7,20,-5+Math.sin(a)*7,.05,3);b.sphere('light',x+Math.cos(a)*7,18.4,-5+Math.sin(a)*7,.35,.6,.35);}}
 for(const x of[-130,-65,65,130]){planter(b,x,42,y,3.2);lantern(b,x,40,y,4);}
 yield* b.finish();root.userData.roof=roof;root.userData.glassPanels=GLASS_PANELS;root.userData.tableCount=16;return root;
}
