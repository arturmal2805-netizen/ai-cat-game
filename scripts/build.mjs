import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createCat} from '../public/cat-model.js';
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}async readAsDataURL(blob){this.result='data:application/octet-stream;base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onloadend?.();}};
await mkdir('public/dist',{recursive:true});await mkdir('public/models',{recursive:true});
await build({entryPoints:['public/app.js'],bundle:true,format:'esm',minify:true,target:'es2022',outfile:'public/dist/app.js',external:['./config.js']});
// The bundle is served from dist; runtime configuration stays at the site root.
const {readFile}=await import('node:fs/promises');const bundle=await readFile('public/dist/app.js','utf8');await writeFile('public/dist/app.js',bundle.replaceAll('"./config.js"','"../config.js"'));
for(const mood of ['sleep','crazy hungry','happy']){const model=createCat(mood);model.userData={};model.traverse(node=>{node.userData={};});const times=[0,.6,1.2,1.8,2.4];
const quaternions=times.flatMap(time=>new THREE.Quaternion().setFromEuler(new THREE.Euler(mood==='sleep'?.18:0,0,(mood==='crazy hungry'?-.13:0)+Math.sin(time/2.4*Math.PI*2)*.07)).toArray());
const tailValues=times.flatMap(time=>new THREE.Quaternion().setFromEuler(new THREE.Euler(mood==='crazy hungry'?-.35:0,0,(mood==='sleep'?.7:0)+Math.sin(time/2.4*Math.PI*2)*.18)).toArray());
const idle=new THREE.AnimationClip('MoodLoop',2.4,[new THREE.QuaternionKeyframeTrack('Head.quaternion',times,quaternions),new THREE.QuaternionKeyframeTrack('Tail.quaternion',times,tailValues)]);
const legTracks=[];for(const leg of model.children.filter(x=>x.name.startsWith('Leg'))){const values=[0,.2,.4,.6,.8].flatMap(time=>new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(time/.8*Math.PI*2+(leg.position.x*leg.position.z>0?Math.PI:0))*.3,0,0)).toArray());legTracks.push(new THREE.QuaternionKeyframeTrack(leg.name+'.quaternion',[0,.2,.4,.6,.8],values));}
const walk=new THREE.AnimationClip('Walk',.8,legTracks);
const bytes=await new GLTFExporter().parseAsync(model,{binary:true,animations:[idle,walk]});await writeFile(`public/models/chichi-${mood.replace(' ','-')}.glb`,Buffer.from(bytes));}
console.log('Built 3D world and three downloadable Chichi GLB models.');
