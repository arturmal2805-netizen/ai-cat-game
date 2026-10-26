import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {createCompileLighting} from "../public/compile-lighting.js";

test("compilation retains the exact light/environment scope without revisiting world geometry for each batch",()=>{
  const scene=new THREE.Scene(),a=new THREE.DirectionalLight(),b=new THREE.HemisphereLight(),
    nested=new THREE.PointLight(),hidden=new THREE.Group();
  a.castShadow=true;a.add(nested);hidden.visible=false;hidden.add(new THREE.PointLight());
  scene.add(a,b,hidden);
  for(let i=0;i<1000;i++)scene.add(new THREE.Object3D());
  scene.fog=new THREE.FogExp2(0xaabbcc,.01);scene.environment=new THREE.Texture();
  const children=scene.children,originalLights=[];
  scene.traverseVisible(o=>{if(o.isLight)originalLights.push(o);});
  let sceneWalks=0;const native=scene.traverseVisible;
  scene.traverseVisible=function(...args){sceneWalks++;return native.apply(this,args);};
  const view=createCompileLighting(scene);
  assert.equal(view.environment,scene.environment);assert.equal(view.fog,scene.fog);
  assert.equal(view.isScene,true);assert.equal(scene.children,children);
  for(let i=0;i<10;i++){
    const lights=[];let visits=0;
    view.traverseVisible(o=>{visits++;if(o.isLight)lights.push(o);});
    assert.deepEqual(lights,originalLights);assert.equal(visits,originalLights.length+1);
  }
  assert.equal(sceneWalks,1,"ten target-scene preparations share one world-light collection");
  assert.equal(a.parent,scene);assert.equal(nested.parent,a);
  a.color.set(0xffaa00);a.position.x=7;assert.equal(view.children[0],a);
  const seen=[];a.visible=false;view.traverseVisible(o=>{if(o.isLight)seen.push(o);});
  assert.deepEqual(seen,[b],"nested lights retain their actual ancestor visibility");
  b.removeFromParent();const removed=[];view.traverseVisible(o=>{if(o.isLight)removed.push(o);});assert.deepEqual(removed,[]);
  scene.visible=false;let visits=0;view.traverseVisible(()=>visits++);assert.equal(visits,0);
});
