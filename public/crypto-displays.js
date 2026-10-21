import * as T from "three";

// One fixed instanced plane and one price array for every office display.
// Trading/saves run elsewhere; a chart tick never calls AI or rebuilds buffers.
export function cryptoDisplays(placements) {
  const prices = new Float32Array(65);
  for (let i=0;i<prices.length;i++) prices[i]=.25+i*.006+Math.sin(i*.63)*.11+Math.sin(i*1.7)*.035;
  const progress={value:1},material=new T.ShaderMaterial({
    uniforms:{prices:{value:prices},progress},side:T.DoubleSide,toneMapped:false,
    vertexShader:'varying vec2 chartUV;void main(){chartUV=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 chartUV;uniform float prices[65];uniform float progress;
      void main(){vec2 p=chartUV;float column=floor(p.x*32.);int i=int(min(31.,column))*2;
        float a=prices[i],b=prices[i+2],lo=min(a,b),hi=max(a,b),x=fract(p.x*32.);
        float grid=step(.97,fract(p.x*8.))+step(.97,fract(p.y*6.));
        vec3 c=vec3(.025,.08,.14)+min(grid,1.)*.035;
        float known=step(column,max(0.,progress*32.));
        float wick=(1.-step(.09,abs(x-.5)))*step(lo-.035,p.y)*step(p.y,hi+.035);
        float body=step(.2,x)*step(x,.8)*step(lo-.007,p.y)*step(p.y,hi+.007);
        vec3 ink=b>=a?vec3(.15,.94,.65):vec3(1.,.3,.43);
        c=mix(c,ink,max(wick,body)*known);gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`,
  });
  const mesh=new T.InstancedMesh(new T.PlaneGeometry(1,1),material,placements.length),dummy=new T.Object3D();
  mesh.name="Live BTC / ETH candlestick displays";
  placements.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.w,p.h,1);dummy.rotation.set(0,p.turn||0,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.computeBoundingSphere();
  let previous=null,trade=null,key="";
  return {mesh,
    setState(state){
      if(state===previous)return;previous=state;
      const trades=Object.values(state?.profiles||{}).filter(p=>p.profession==='crypto').map(p=>p.investments?.current).filter(t=>t?.path);
      trade=trades.find(t=>t.status==='open')||trades.sort((a,b)=>(b.closedAt||b.startedAt)-(a.closedAt||a.startedAt))[0]||null;
      const next=trade?trade.id+':'+trade.status:'';if(next===key)return;key=next;
      if(trade){const min=Math.min(...trade.path),max=Math.max(...trade.path),range=Math.max(.01,max-min);for(let i=0;i<prices.length;i++)prices[i]=.13+(trade.path[i]-min)/range*.74;}
    },
    update(time,reduced){progress.value=reduced?1:trade?(trade.status==='open'?Math.max(0,Math.min(1,(Date.now()-trade.startedAt)/trade.durationMs)):1):.12+(time*.065% .88);},
  };
}
