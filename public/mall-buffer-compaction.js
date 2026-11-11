import {BufferAttribute} from 'three';

// Only new, fully baked Mall copies. Remove vertices that are never referenced
// by their already exact reuse index. No weld, quantization, triangle reorder,
// colour/normal change or per-frame work; picking retains every face number.
export function* compactMallGeometrySteps(geometry){
 const index=geometry.index,attributes=Object.entries(geometry.attributes),count=geometry.attributes.position?.count;
 if(!index||!count||Object.keys(geometry.morphAttributes).length||attributes.some(([,a])=>a.isInterleavedBufferAttribute||a.isInstancedBufferAttribute||a.isFloat16BufferAttribute||a.count!==count))return 0;
 const remap=new Int32Array(count).fill(-1);let used=0;
 for(let i=0;i<index.count;i++){if((i&8191)===0)yield;const v=index.array[i];if(remap[v]===-1)remap[v]=used++;}
 if(used===count)return 0;
 let saved=0;
 for(const [name,attribute]of attributes){
  yield;const src=attribute.array,dst=new src.constructor(used*attribute.itemSize),width=attribute.itemSize;
  for(let v=0;v<count;v++){if((v&4095)===0)yield;if(remap[v]!==-1)dst.set(src.subarray(v*width,(v+1)*width),remap[v]*width);}
  const compact=new BufferAttribute(dst,width,attribute.normalized);compact.name=attribute.name;compact.usage=attribute.usage;compact.gpuType=attribute.gpuType;
  geometry.setAttribute(name,compact);saved+=src.byteLength-dst.byteLength;
 }
 // Keep the existing index type: native static multi-draw ranges retain their
 // original byte offsets as well as their exact sequence of triangles.
 const next=new index.array.constructor(index.count);for(let i=0;i<next.length;i++){if((i&8191)===0)yield;next[i]=remap[index.array[i]];}
 geometry.setIndex(new BufferAttribute(next,1));return saved;
}
export function* compactMallBuffersSteps(root){
 const geometries=new Set();root.traverse(m=>{if(m.isMesh&&!m.isSkinnedMesh&&!m.isInstancedMesh)geometries.add(m.geometry);});
 let saved=0;for(const g of geometries)saved+=yield* compactMallGeometrySteps(g);return saved;
}
