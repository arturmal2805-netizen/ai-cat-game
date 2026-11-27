import * as T from 'three';
// Subtract a rectangular entry from this venue's static scenery only. Keep
// untouched meshes and all original attribute values outside cut triangles.
export function* warehouseApertureSteps(mesh,box){
 const g=mesh.geometry;if(!g?.attributes.position)return;g.computeBoundingBox();
 const localBox=g.boundingBox.clone().translate(mesh.position);if(!localBox.intersectsBox(box))return;
 const names=Object.keys(g.attributes),attrs=names.map(n=>g.attributes[n]),sizes=attrs.map(a=>a.itemSize),offsets=[];let stride=0;for(const n of sizes){offsets.push(stride);stride+=n;}
 const positionOffset=offsets[names.indexOf('position')],read=index=>{const v=[];for(const a of attrs)for(let c=0;c<a.itemSize;c++)v.push(a.getComponent(index,c));v.originalIndex=index;return v;},coordinate=(v,axis)=>v[positionOffset+axis]+mesh.position.getComponent(axis),output=attrs.map(a=>Array.from(a.array)),indices=[],source=g.index?.array||Array.from({length:g.attributes.position.count},(_,i)=>i);
 const planes=[];for(let axis=0;axis<3;axis++){planes.push({axis,value:box.min.getComponent(axis),sign:1});planes.push({axis,value:box.max.getComponent(axis),sign:-1});}
 function split(poly,plane){const inside=[],outside=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(coordinate(a,plane.axis)-plane.value)*plane.sign,db=(coordinate(b,plane.axis)-plane.value)*plane.sign;
   (da>=0?inside:outside).push(a);
   if((da>=0)!==(db>=0)){const t=da/(da-db),p=a.map((v,j)=>v+(b[j]-v)*t);inside.push(p);outside.push(p);}
  }return{inside,outside};}
 function emit(poly){for(let i=1;i+1<poly.length;i++)for(const v of [poly[0],poly[i],poly[i+1]]){if(v.originalIndex!==undefined){indices.push(v.originalIndex);continue;}if(v.addedIndex===undefined){v.addedIndex=output[0].length/sizes[0];for(let a=0;a<attrs.length;a++)for(let c=0;c<sizes[a];c++)output[a].push(v[offsets[a]+c]);}indices.push(v.addedIndex);}}
 for(let i=0;i<source.length;i+=3){if(i%3072===0)yield;let poly=[read(source[i]),read(source[i+1]),read(source[i+2])];
  // Wholly outside one halfspace is the common fast path.
  if(planes.some(p=>poly.every(v=>(coordinate(v,p.axis)-p.value)*p.sign<0))){emit(poly);continue;}
  for(const plane of planes){const cut=split(poly,plane);if(cut.outside.length>=3)emit(cut.outside);poly=cut.inside;if(poly.length<3)break;}
 }
 const result=new T.BufferGeometry();for(let a=0;a<attrs.length;a++)result.setAttribute(names[a],new T.Float32BufferAttribute(output[a],sizes[a]));result.setIndex(indices);result.computeBoundingBox();result.computeBoundingSphere();mesh.geometry=result;g.dispose();
}
