import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { decorateSquishInterior } from '../public/squish-interior-decor.js';
import { SQUISH_SECTORS } from '../public/squish-interior-layout.js';

function build(){
  const geometries=new Set(),materials=new Set(),parts=[],drawMaterials=new Set(),
    g=geometry=>{geometries.add(geometry);return geometry;},
    mat=options=>{const material=new T.MeshPhysicalMaterial(options);materials.add(material);return material;},
    original={gold:mat({color:0xffcd8c}),cream:mat({color:0xfff2df}),pink:mat({color:0xffb6d6}),violet:mat({color:0xbca0dc}),white:mat({color:0xffffff}),warm:mat({color:0xffe3ad})},
    box=g(new T.BoxGeometry()),before={materials:materials.size,geometries:geometries.size},dummy=new T.Object3D();
  const batch=(geometry,material,position,scale=[1,1,1],rotation=[0,0,0])=>{
    assert(geometries.has(geometry),'all geometry must belong to the existing owner');
    assert(materials.has(material),'all materials must belong to the existing owner');
    assert([...position,...scale,...rotation].every(Number.isFinite));
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.rotation.set(...rotation);dummy.updateMatrix();
    geometry.computeBoundingBox();
    parts.push({geometry,material,matrix:dummy.matrix.clone(),bounds:geometry.boundingBox.clone().applyMatrix4(dummy.matrix)});drawMaterials.add(material);
  };
  const iterator=decorateSquishInterior({batch,g,mat,...original,box});
  let next,yields=0;do{next=iterator.next();if(!next.done)yields++;}while(!next.done);
  return{geometries,materials,parts,drawMaterials,before,stats:next.value,yields,dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}

test('ten sectors gain bounded real batched decorations with owned resources and unchanged anchors',()=>{
  const anchors=JSON.stringify(SQUISH_SECTORS),b=build();
  try{
    assert.equal(JSON.stringify(SQUISH_SECTORS),anchors);
    assert.deepEqual(b.stats,{sectors:10,gifts:60,rareJars:60,planters:20,banners:20,static:true});
    assert.equal(b.yields,10,'each sector permits cooperative preparation');
    assert.equal(b.materials.size-b.before.materials,3);
    assert.equal(b.geometries.size-b.before.geometries,5);
    assert(b.drawMaterials.size<=9,'static finalization merges ornaments by the existing materials');
    const triangles=b.parts.reduce((sum,p)=>sum+(p.geometry.index?.count??p.geometry.attributes.position.count)/3,0);
    assert(triangles>30000,'decorations are actual volume geometry');
    assert(triangles<100000,`extra triangle budget: ${triangles}`);
    for(const material of b.materials){assert.equal(material.map,null);assert.equal(material.transmission,0);}
    assert.equal([...b.materials].filter(m=>m.transparent).length,1,'rare jars share one ordinary transparent material');
  }finally{b.dispose();}
});

test('all decoration bounds clear every existing toy approach and the front exit corridor',()=>{
  const b=build();
  try{
    for(const {bounds}of b.parts){
      assert(bounds.min.y>-.2,'nothing penetrates the original floor');
      assert(bounds.max.z<0,'decor remains behind the unchanged front exits');
      for(const sector of SQUISH_SECTORS){
        const dx=Math.max(bounds.min.x-sector.x,0,sector.x-bounds.max.x),dz=Math.max(bounds.min.z-sector.z,0,sector.z-bounds.max.z);
        assert(Math.hypot(dx,dz)>=5,`decoration entered ${sector.id} live approach`);
      }
    }
  }finally{b.dispose();}
});

test('repeated construction is deterministic and the existing resource sets dispose every addition once',()=>{
  const a=build(),b=build();
  try{
    assert.equal(a.parts.length,b.parts.length);
    for(let i=0;i<a.parts.length;i++)assert.deepEqual(a.parts[i].matrix.elements,b.parts[i].matrix.elements);
    let geometryDisposals=0,materialDisposals=0;
    for(const g of a.geometries)g.addEventListener('dispose',()=>geometryDisposals++);
    for(const m of a.materials)m.addEventListener('dispose',()=>materialDisposals++);
    a.dispose();assert.equal(geometryDisposals,a.geometries.size);assert.equal(materialDisposals,a.materials.size);
  }finally{b.dispose();}
});
