import * as T from 'three';
// One shallow, coloured corneal cap replaces five stacked cartoon eye balls.
export function zooEyeCap(radius,{blue=false,axolotl=false}={}){
 const rings=12,sides=36,p=[],uv=[],color=[],index=[],c=new T.Color(),iris=new T.Color(blue?axolotl?0x4094a7:0x76999a:0x60452c),rim=new T.Color(0x242823),pupil=new T.Color(0x11191a),sclera=new T.Color(axolotl?0xe9e4db:0x686357);
 for(let row=0;row<=rings;row++)for(let j=0;j<=sides;j++){
  const r=row/rings,a=j/sides*Math.PI*2,ny=Math.sin(a),s= Math.sqrt(Math.max(0,1-r*r));p.push(Math.cos(a)*r*radius,ny*r*radius*(axolotl?.88:.64),s*radius*(axolotl?.72:.48));uv.push((Math.cos(a)*r+1)/2,(ny*r+1)/2);
  c.copy(iris);if(r<(axolotl?.46:.32))c.copy(pupil);else {c.lerp(rim,T.MathUtils.smoothstep(r,.72,.88));c.multiplyScalar(.9+Math.sin(a*42+r*19)*.055+Math.sin(a*19-r*30)*.035);if(r>.9)c.lerp(sclera,T.MathUtils.smoothstep(r,.9,1));}
  color.push(c.r,c.g,c.b);if(row<rings&&j<sides){const k=row*(sides+1)+j;index.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setIndex(index);g.computeVertexNormals();return g;
}
