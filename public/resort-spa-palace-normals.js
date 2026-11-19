import {Float32BufferAttribute} from 'three';
// A displaced non-indexed surface needs a continuous normal field. Computing
// face normals after tessellation leaves visible triangular lighting patches.
// Only normals change; authored support triangles, UVs and bounds stay intact.
export function smoothPalaceNormals(geometry,heightAt){
 const p=geometry.attributes.position,n=geometry.attributes.normal||new Float32BufferAttribute(new Float32Array(p.count*3),3),e=.02;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),dx=(heightAt(x+e,z)-heightAt(x-e,z))/(2*e),dz=(heightAt(x,z+e)-heightAt(x,z-e))/(2*e),length=Math.hypot(dx,1,dz);n.setXYZ(i,-dx/length,1/length,-dz/length);}
 n.needsUpdate=true;geometry.setAttribute('normal',n);return geometry;
}
