import * as T from 'three';
import {MALL} from './mall-data.js';
import {mosaBedY} from './mosasaur-data.js';
import {borrowedMosaCoralLevels} from './mosasaur-corals.js';
import {detailedCoral} from './mosasaur-coral-anatomy.js';
import {batchModelSteps} from './model-batching.js';
import {mosaRockSurface} from './mosasaur-rock-surfaces.js';
// Original existing coral anatomy is reused at real seabed anchors. These are
// additional gardens; none of the ocean's released 1,024 colonies is moved.
export function* mallGardenSteps(){
  const root=new T.Group(),source=new T.Group(),templates=[],borrowed=new Set(),clock={value:0};
  for(const form of [1,3,5,6,7,8]){yield;const levels=borrowedMosaCoralLevels(form);
    if(levels){for(const g of levels)borrowed.add(g);const m=new T.MeshStandardMaterial({vertexColors:true,color:0xffffff,roughness:.65,normalMap:mosaRockSurface().coralNormal||null});const mesh=new T.Mesh(levels[0],m);mesh.userData.mallLods=levels;templates.push(mesh);}
    else {const g=new T.Group();detailedCoral(g,form);templates.push(yield* batchModelSteps(g,{combineColors:true}));}
  }
  const surface=mosaRockSurface(),rockMat=new T.MeshStandardMaterial({color:0x345e74,roughness:.78,map:surface.color||surface.reef||null,normalMap:surface.normal||null});
  const rock=new T.IcosahedronGeometry(1,3),pos=rock.attributes.position;
  for(let i=0;i<pos.count;i++){if((i&1023)===0)yield;const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),r=1+.09*Math.sin(x*9+z*6)*Math.cos(y*8)+.035*Math.sin(y*23+z*13);pos.setXYZ(i,x*r,y*r,z*r);}
  rock.computeVertexNormals();rock.userData.sharedScenery=true;
  for(let i=0;i<64;i++){
    yield;const a=i*2.399963,rad=38+(i%6)*6,x=Math.cos(a)*rad,z=MALL.z+Math.sin(a)*rad*.72,y=mosaBedY(x,z);
    const stone=new T.Mesh(rock,rockMat);stone.scale.set(3+i%4,2.5+i%3,2.8+i%5);stone.position.set(x,y+stone.scale.y*.4,z);stone.rotation.y=a;source.add(stone);
  }
  // Each added colony selects detail at its own real seabed anchor. A single
  // LOD at the building centre previously kept all distant gardens at full
  // resolution even while the camera inspected an indoor shop.
  for(const [index,template]of templates.entries()){
    const sites=Array.from({length:64},(_,i)=>i).filter(i=>i%6===index);
    const meshes=[];template.traverse(o=>{if(o.isMesh)meshes.push(o);});
    for(const i of sites){
      yield;
      const a=i*2.399963,rad=38+(i%6)*6,x=Math.cos(a)*rad,z=MALL.z+Math.sin(a)*rad*.72,y=mosaBedY(x,z);
      const colony=new T.Group();colony.position.set(x,y+3+i%3,z);colony.scale.setScalar(3+i%4*.8);colony.rotation.y=a;root.add(colony);
      for(const source of meshes){
        source.material.emissive?.set(0x5a225b);source.material.emissiveIntensity=.2;
        const levels=source.userData.mallLods;
        if(levels){
          const lod=new T.LOD();
          // Three's LOD distance is world-space, independent of colony scale.
          for(let level=0;level<3;level++)lod.addLevel(new T.Mesh(levels[level],source.material),[0,32,80][level],.1);
          colony.add(lod);
        }else{
          const mesh=new T.Mesh(source.geometry,source.material);mesh.matrix.copy(source.matrix);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);colony.add(mesh);
        }
      }
    }
  }
  const garden=yield* batchModelSteps(source,{combineColors:true});root.add(garden);
  const glow=new T.MeshBasicMaterial({color:0xdb68ee});
  for(let j=0;j<12;j++){
    yield;const a=j*Math.PI/6,x=Math.cos(a)*45,z=MALL.z+Math.sin(a)*36,y=mosaBedY(x,z),r=2.4+j%3;
    const stem=new T.Mesh(new T.CylinderGeometry(.3,.65,5+j%4,12),rockMat);stem.position.set(x,y+2.5,z);root.add(stem);
    const cap=new T.Mesh(new T.SphereGeometry(r,32,12,0,Math.PI*2,0,Math.PI/2),glow);cap.scale.y=.27;cap.position.set(x,y+5+j%4,z);root.add(cap);
  }
  // Fixed particle attributes; the single scalar clock moves bubbles on GPU.
  const g=new T.BufferGeometry(),p=new Float32Array(320*3),seed=new Float32Array(320);
  for(let i=0;i<320;i++){const a=i*2.399963,r=33+i%37;p.set([Math.cos(a)*r,MALL.y-14+(i%100),MALL.z+Math.sin(a)*r*.7],i*3);seed[i]=(i*37%101)/101;}
  g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('aSeed',new T.BufferAttribute(seed,1));
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uTime:clock},vertexShader:`uniform float uTime;attribute float aSeed;varying float alpha;void main(){vec3 p=position;float t=mod(aSeed*115.+uTime*(1.+aSeed),115.);p.y=${MALL.y-14}.+t;p.x+=sin(uTime*.35+aSeed*30.)*.35;alpha=smoothstep(0.,5.,t)*(1.-smoothstep(105.,115.,t));vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((.2+aSeed*.45)*700./-mv.z,1.,12.);}`,fragmentShader:'varying float alpha;void main(){float d=length(gl_PointCoord-.5)*2.;float a=(smoothstep(1.,.8,d)-smoothstep(.8,.55,d))*.26*alpha;gl_FragColor=vec4(.35,.85,1.,a);}'});
  const bubbles=new T.Points(g,m);bubbles.frustumCulled=false;root.add(bubbles);
  root.userData.borrowed=borrowed;
  root.userData.update=(time,reduced)=>{clock.value=reduced?0:time;};return root;
}
