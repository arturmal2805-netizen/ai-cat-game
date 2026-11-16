import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {splitMeadowSurface} from '../public/meadow-surface.js';
function area(g,start=0,count=g.attributes.position.count){const p=g.attributes.position,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let sum=0;for(let i=start;i<start+count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1).sub(a);c.fromBufferAttribute(p,i+2).sub(a);sum+=b.cross(c).length()/2;}return sum;}
test('local meadow partition retains the full walking plane, interpolated UVs and exact material boundary',()=>{
 const original=new T.PlaneGeometry(10,10).rotateX(-Math.PI/2),before=original.attributes.position.array.slice(),g=splitMeadowSurface(original,{x:0,z:0,rx:1,rz:1});
 assert.deepEqual(original.attributes.position.array,before);assert.deepEqual(g.groups.map(x=>x.materialIndex),[0,1]);assert.ok(Math.abs(area(g)-100)<1e-5);
 const local=g.groups[1];assert.ok(Math.abs(area(g,local.start,local.count)-2.26**2)<1e-5);
 const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++){assert.ok(Math.abs(p.getY(i))<1e-6);assert.ok(Math.abs(uv.getX(i)-(p.getX(i)/10+.5))<1e-6);assert.ok(Math.abs(uv.getY(i)-(.5-p.getZ(i)/10))<1e-6);}
 for(let i=local.start;i<local.start+local.count;i++)assert.ok(Math.abs(p.getX(i))<=1.130001&&Math.abs(p.getZ(i))<=1.130001);
});
test('partition preserves the true extrusion sides and underside as ordinary material',()=>{
 const shape=new T.Shape([new T.Vector2(-5,-5),new T.Vector2(5,-5),new T.Vector2(5,5),new T.Vector2(-5,5)]),source=new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:false}).rotateX(-Math.PI/2),g=splitMeadowSurface(source,{x:0,z:0,rx:1,rz:1}),local=g.groups[1];
 assert.ok(Math.abs(area(g)-area(source))<1e-4);for(let i=local.start;i<local.start+local.count;i++){assert.ok(g.attributes.normal.getY(i)>.99);assert.ok(Math.abs(g.attributes.position.getY(i)-.3)<1e-6);}
});
