import * as T from 'three';
// Original SPA upholstery, authored once. No simulation/frame buffer uploads.
export function spaTiedCurtainGeometry(){
 const columns=24,rows=16,positions=[],uv=[],indices=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const v=j/rows,u=i/columns,waist=Math.exp(-(((v-.48)/.2)**2)),width=1.15-.72*waist+.1*(1-v);
  positions.push((u-.5)*width+.18*Math.sin(v*Math.PI),v*2.6+.035*Math.cos(u*Math.PI*8)*(1-v),Math.sin(u*Math.PI*10)*(.045+.04*(1-waist))+.24*Math.sin(v*Math.PI));uv.push(u,v);
 }
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i;indices.push(a,a+1,a+columns+1,a+1,a+columns+2,a+columns+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function spaPillowGeometry(){
 const g=new T.SphereGeometry(1,24,16),p=g.attributes.position;
 const rounded=x=>Math.sign(x)*Math.abs(x)**.46;
 for(let i=0;i<p.count;i++)p.setXYZ(i,rounded(p.getX(i))*.5,Math.sign(p.getY(i))*Math.abs(p.getY(i))**.7*.5,rounded(p.getZ(i))*.5);
 g.computeVertexNormals();g.computeBoundingBox();return g;
}
// Original painted emissive star-vault chart, not a photograph/reference asset.
// Only the VIP ceiling uses this bounded256px map; other rooms keep their palette.
export function spaGalaxyTexture({planar=false}={}){
 const size=256,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=x/(size-1)*2-1,nz=y/(size-1)*2-1,angle=planar?Math.atan2(nz,nx):x/(size-1)*Math.PI*2,r=planar?Math.hypot(nx,nz):Math.sin((1-y/(size-1))*Math.PI),a=angle*2+Math.log(r+.07)*6;
  const core=Math.exp(-r*r*160),arm=Math.max(0,Math.cos(a))**8*Math.exp(-r*4),mist=(.5+.5*Math.sin(angle*9+r*57))*.08*Math.exp(-r*3);
  const rgb=[core*.95+arm*.45+mist*.5,core*.65+arm*.16+mist*.2,core*.6+arm*.7+mist*.7],k=(y*size+x)*4;
  for(let c=0;c<3;c++)data[k+c]=Math.round(Math.min(1,rgb[c])*255);data[k+3]=255;
 }
 const t=new T.DataTexture(data,size,size);t.name='Original SPA golden-violet spiral star vault';t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
