import * as T from 'three';
import {mallIceFrontSteps} from './mall-ice-shop.js';

function whiteLetters(object){const c=object.geometry.getAttribute('color');if(c)for(let i=0;i<c.count;i++)c.setXYZ(i,.98,.98,.96);return object;}

// Actual shopfront construction, not a facade photograph. All glass apertures
// and the original ten-metre entry remain open to the same navigation system.
export function* mallStorefrontSteps(physical,header,store,placement,kit,f){
  const {cube,tube,disk,mesh,mats,glassMat,label}=kit,{paint,soft,bag}=f;
  const {w,d}=placement,front=d/2,sign=4+kit.storeIds.indexOf(store.id);
  kit.frontMaterials??=new Map();
  const finish=(name,color,roughness,metalness=0)=>{
    if(!kit.frontMaterials.has(name))kit.frontMaterials.set(name,new T.MeshStandardMaterial({color,roughness,metalness}));
    return kit.frontMaterials.get(name);
  };
  const aluminium=finish('anodised-bronze',0x7c7263,.3,.72),stone=finish('warm-limestone',0xddd5c6,.68),red=finish('mcd-enamel',0x9b2530,.41,.04),carbon=finish('mcd-carbon',0x242b2a,.5,.12),gold=finish('mcd-gold',0xffc52c,.29,.25);
  if(store.key==='ice')yield* mallIceFrontSteps(physical,header,store,placement,kit,f);
  if(store.key==='mcd'){
    // Contemporary charcoal sign band and a continuous, thin timber soffit.
    // No giant striped café awning, mirrored wordmark or yellow wooden wall.
    soft(header,carbon,0,6.57,front+.18,w-.25,1.72,.40);
    soft(header,carbon,0,7.52,front+.45,w+.18,.18,1.30);
    cube(header,mats.warm,0,7.39,front+.55,w-.4,.035,1.05);
    for(const x of [-w/2+.38,w/2-.38]){
      soft(physical,stone,x,2.62,front+.08,.66,5.22,.70);
      for(let i=0;i<6;i++)cube(physical,paint('oak'),x+(i-2.5)*.085,2.65,front+.46,.045,4.85,.05);
    }
    whiteLetters(label(header,sign,1.8,6.55,front+.43,14.7,1.24));
    // Bevelled, broad ribbon arches: real M silhouette rather than two thin
    // tubular humps. The same immutable source serves both front/back signs.
    if(!kit.storefrontGeometry.has('mcd-arches')){
      const shapes=[-1,1].map(side=>{const shape=new T.Shape();shape.moveTo(side*1.8,0);shape.bezierCurveTo(side*1.8,3.5,side*.1,3.5,0,0);shape.lineTo(side*.27,0);shape.bezierCurveTo(side*.40,2.76,side*1.35,2.76,side*1.38,0);shape.closePath();return shape;});
      const geometry=new T.ExtrudeGeometry(shapes,{depth:.12,bevelEnabled:true,bevelThickness:.025,bevelSize:.02,bevelSegments:3,curveSegments:32});geometry.userData.sharedScenery=true;kit.storefrontGeometry.set('mcd-arches',geometry);
    }
    mesh(header,kit.storefrontGeometry.get('mcd-arches'),gold,-9.6,5.57,front+.49,.63,.63,.63);
    soft(physical,red,0,.025,front-.10,9.55,.02,.4);
    // An illuminated inner identity wall with restrained red rather than
    // making every surface a striped luminous sign.
    soft(physical,carbon,0,6.05,-front+.34,14.4,2.2,.12);
    whiteLetters(label(physical,sign,0,6.03,-front+.43,12.2,1.14));
  }
  if(store.key==='vuitton'){
    // Ribbed, bowed silver-glass skin observed at the real Doha boutique.
    // Depth comes from the actual ribs/panels, never a picture of a storefront.
    const silver=finish('lv-pearl-aluminium',0xc5c8c0,.32,.55),bronze=finish('lv-bronze',0x9d8156,.31,.68),points=[];
    const surface=(x,y)=>[x,y,front+.25+.55*(1-Math.cos(x/w*Math.PI*2))];
    const p=[],uv=[],index=[];
    for(let i=0;i<=96;i++){
      const x=(i/96-.5)*(w-.35);p.push(...surface(x,5.75),...surface(x,7.55));uv.push(i/8,0,i/8,1);
      if(i<96){const k=i*2;index.push(k,k+2,k+1,k+1,k+2,k+3);}
      if(i%2===0)tube(header,[surface(x,5.75),surface(x,7.55)],.020,silver);
      points.push(surface(x,7.56));
    }
    const skin=new T.BufferGeometry();skin.setAttribute('position',new T.Float32BufferAttribute(p,3));skin.setAttribute('uv',new T.Float32BufferAttribute(uv,2));skin.setIndex(index);skin.computeVertexNormals();mesh(header,skin,silver);tube(header,points,.045,bronze);
    const letters=label(header,sign,0,6.62,front+.90,15,1.04),c=letters.geometry.getAttribute('color');if(c)for(let i=0;i<c.count;i++)c.setXYZ(i,.035,.026,.02);
    for(const side of [-1,1]){
      soft(physical,stone,side*(w/2-1.10),2.87,front+.30,1.78,5.72,.48);
      for(let j=0;j<12;j++){const x=side*(w/2-1.10)+(j-5.5)*.14;tube(physical,[[x,.08,front+.57],[x,5.73,front+.57]],.020,silver);}
      cube(physical,bronze,side*5.18,2.72,front+.15,.13,5.45,.22);
    }
  }
  yield;
  for(const side of [-1,1]){
    const a=side*5.18,b=side*(w/2-.75),left=Math.min(a,b),right=Math.max(a,b),width=right-left,x=(left+right)/2;
    // Recessed glazing has an actual sill, paired gasket/frame, fine transom
    // and floor shoe. These replace the impression of one unsupported sheet.
    soft(physical,stone,x,.16,front-.10,width,.28,.36);
    for(const px of [left,right]){
      cube(physical,aluminium,px,2.64,front+.05,.075,4.95,.14);
      cube(physical,carbon,px+.048,2.64,front+.11,.018,4.91,.025);
    }
    for(const y of [.32,4.98])cube(physical,aluminium,x,y,front+.05,width,.07,.14);
    cube(physical,aluminium,x,4.47,front+.05,width,.045,.11);
    for(const y of [1.12,1.55])for(const dx of [-.17,0,.17])disk(physical,stone,side*5.65+dx,y,front+.105,.026,.015).rotation.x=Math.PI/2;
    tube(physical,[[side*5.55,1.2,front+.18],[side*5.55,2.4,front+.18]],.026,aluminium);
    if(store.kind==='fashion'){
      const display=new T.Group();display.position.set(side*9.3,0,front-1.25);physical.add(display);
      soft(display,stone,0,.25,0,4.6,.46,1.55);cube(display,aluminium,0,.5,0,4.4,.035,1.40);
      for(const [index,dx]of [-1.25,0,1.25].entries()){
        const h=.10+index%2*.30,y=.51+h/2,top=.51+h;soft(display,paint('ivory'),dx,y,0,.95,h,.85);
        if(store.key==='nike'){soft(display,paint('ivory'),dx,top+.20,0,.88,.28,.43);soft(display,paint('ink'),dx,top+.035,.015,.90,.07,.45);}
        else bag(display,dx,top+.02,0,.85);
      }
      // Slim picture-frame reveal and warm indirect edge light around the
      // merchandise, leaving the transparent pane itself unobstructed.
      const points=[[side*6.25,.7,front-.65],[side*6.25,4.2,front-.65],[side*12.1,4.2,front-.65],[side*12.1,.7,front-.65]];
      tube(physical,points,.033,aluminium);tube(physical,points.map(([x,y,z])=>[x,y,z-.025]),.012,mats.warm);
    }
    yield;
  }
}
