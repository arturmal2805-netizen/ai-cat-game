import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { uploadPoseTextureRows } from "../public/pose-texture-upload.js";

function fixture() {
  const texture = new THREE.DataTexture(new Float32Array(8 * 6 * 4), 8, 6,
    THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;
  const calls = [], stores = new Map(), properties = { __webglTexture: {}, __version: texture.version },
    gl = Object.fromEntries(["TEXTURE_2D", "UNPACK_ALIGNMENT", "UNPACK_FLIP_Y_WEBGL",
      "UNPACK_PREMULTIPLY_ALPHA_WEBGL", "UNPACK_COLORSPACE_CONVERSION_WEBGL", "NONE",
      "UNPACK_ROW_LENGTH", "UNPACK_SKIP_PIXELS", "UNPACK_SKIP_ROWS", "RGBA", "FLOAT"].map(k=>[k,k]));
  gl.texSubImage2D = (...args) => calls.push(args);
  gl.getParameter = () => assert.fail("no synchronous GL state reads");
  let initializations = 0;
  const renderer = { getContext:()=>gl, properties:{get:()=>properties},
    state:{bindTexture:(...args)=>calls.push(["bind",...args]),pixelStorei:(key,value)=>stores.set(key,value)},
    initTexture(t) { initializations++; assert.equal(t,texture); assert.equal(t.updateRanges.length,0);
      properties.__webglTexture={};properties.__version=t.version; } };
  return {texture,renderer,calls,stores,properties,get initializations(){return initializations;}};
}

test("pose rows combine into exact rectangles, keep sparse gaps and transfer only their byte views",()=>{
  const f=fixture(), data=f.texture.image.data;
  for(let i=0;i<data.length;i++)data[i]=Math.fround(Math.sin(i));
  for(const row of [0,1,2,4,5])f.texture.addUpdateRange(row*32,32);
  const version=f.texture.version;
  assert.equal(uploadPoseTextureRows(f.renderer,f.texture),true);
  const calls=f.calls.filter(a=>a[0]!=="bind");
  assert.equal(calls.length,2);
  assert.deepEqual(calls.map(a=>a.slice(2,6)),[[0,0,8,3],[0,4,8,2]]);
  assert.deepEqual(calls.map(a=>a[8].length),[96,64]);
  for(const a of calls)assert.equal(a[8].buffer,data.buffer);
  assert.deepEqual(Array.from(calls[1][8]),Array.from(data.slice(128,192)));
  assert.equal(f.texture.updateRanges.length,0);
  assert.equal(f.texture.version,version,"no redundant native re-upload on the next draw");
  for(const name of ["UNPACK_ROW_LENGTH","UNPACK_SKIP_PIXELS","UNPACK_SKIP_ROWS"])
    assert.equal(f.stores.get(name),0);
  assert.equal(f.initializations,0);
});

test("initial allocations, explicit native updates and context restoration retain the full CPU image",()=>{
  const f=fixture();delete f.properties.__webglTexture;
  for(let i=0;i<3;i++) {
    f.texture.addUpdateRange(32,32);
    assert.equal(uploadPoseTextureRows(f.renderer,f.texture),true);
    assert.equal(f.initializations,i+1);
    if(i===0)f.texture.needsUpdate=true;
    else delete f.properties.__webglTexture;
  }
  assert.equal(f.calls.length,0,"initialization stays owned by Three");
});

test("unsupported or non-row texture updates stay on the native path untouched",()=>{
  for(const update of [t=>t.addUpdateRange(1,32),t=>t.addUpdateRange(0,3),
    t=>{t.addUpdateRange(32,32);t.addUpdateRange(0,32);},
    t=>{t.addUpdateRange(0,32);t.flipY=true;},
    t=>{t.addUpdateRange(0,32);t.premultiplyAlpha=true;},
    t=>{t.addUpdateRange(0,32);t.colorSpace=THREE.SRGBColorSpace;}]) {
    const f=fixture();update(f.texture);
    const ranges=structuredClone(f.texture.updateRanges);
    assert.equal(uploadPoseTextureRows(f.renderer,f.texture),false);
    assert.equal(f.calls.length,0);assert.deepEqual(f.texture.updateRanges,ranges);
  }
  const f=fixture();f.texture.addUpdateRange(0,32);
  assert.equal(uploadPoseTextureRows({},f.texture),false);
  assert.equal(f.texture.updateRanges.length,1);
});

test("a driver exception keeps pending CPU rows for the native fallback",()=>{
  const f=fixture();f.texture.addUpdateRange(0,32);
  f.renderer.getContext().texSubImage2D=()=>{throw Error("context unavailable");};
  assert.equal(uploadPoseTextureRows(f.renderer,f.texture),false);
  assert.deepEqual(f.texture.updateRanges,[{start:0,count:32}]);
});
