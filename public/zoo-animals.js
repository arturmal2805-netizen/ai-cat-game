import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {copyGeometryBuffers} from './geometry-tasks.js';
import {ZOO_ANIMALS,zooFacing} from './zoo-data.js';
import {ZOO_CYCLE,ZOO_POSE_FRAMES,zooAnimalPose} from './zoo-animal-motion.js';
const cache=new Map(),sphere=new T.SphereGeometry(1,20,14),smallSphere=new T.SphereGeometry(1,12,8),eyeSphere=new T.SphereGeometry(1,24,16);for(const g of [sphere,smallSphere,eyeSphere])g.userData.sharedScenery=true;
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),TAU=Math.PI*2;
function buildTemplate(species){
 const joints=[],parts=[],map=new Map();
 const joint=(role,pivot,parent='root')=>{if(species==='axolotl'&&(role==='head'||parent==='head'))pivot=[pivot[0],pivot[1]+.12,pivot[2]];const id=joints.length;map.set(role,id);joints.push({role,pivot:v(...pivot),parent:id?map.get(parent):null});return id;};
 joint('root',[0,0,0]);joint('body',[0,1,0]);
 function add(color,pos,size,role='body',options={}){
  const geo=options.geometry?copyGeometryBuffers(options.geometry):copyGeometryBuffers(options.gloss?eyeSphere:Math.max(...size)<.2?smallSphere:sphere);geo.scale(...size);if(options.rot)geo.rotateZ(options.rot);geo.translate(...pos);
  if(species==='axolotl'){let id=map.get(role);while(id!==undefined&&id!==null){if(joints[id].role==='head'){geo.translate(0,.12,0);break;}id=joints[id].parent;}}
  const p=geo.attributes.position,colors=[],ids=[],weights=[],gloss=[],stripes=[],greetIds=[],greetPivots=[];
  for(let i=0;i<p.count;i++){const c=new T.Color(color);stripes.push(options.stripes?1:0);
   colors.push(c.r,c.g,c.b);let a=map.get(role),b=a,w=0;
   if(options.trunk){const q=Math.min(3.999999,Math.floor(i/13)/40*4);a=map.get('trunk'+Math.floor(q));b=map.get('trunk'+Math.min(4,Math.floor(q)+1));w=q%1;}
   ids.push(a,b);weights.push(1-w,w);gloss.push(options.gloss?1:0);
   const target=species==='otter'?'root':species==='elephant'?'trunk0':species==='gorilla'?'ArmRight':species==='polar'?'LegFrontRight':'head';let id=map.get(role),found=-1;while(id!==undefined&&id!==null){if(joints[id].role===target){found=id;break;}id=joints[id].parent;}greetIds.push(found);greetPivots.push(...(found<0?[0,0,0]:joints[found].pivot.toArray()));
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('aJoints',new T.Float32BufferAttribute(ids,2));geo.setAttribute('aWeights',new T.Float32BufferAttribute(weights,2));geo.setAttribute('aGloss',new T.Float32BufferAttribute(gloss,1));geo.setAttribute('aStripe',new T.Float32BufferAttribute(stripes,1));
  geo.setAttribute('aGreetId',new T.Float32BufferAttribute(greetIds,1));geo.setAttribute('aGreetPivot',new T.Float32BufferAttribute(greetPivots,3));parts.push(geo);return geo;
 }
 const curve=(points,r,color,role='head')=>{const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>v(...p))),20,r,6,false);add(color,[0,0,0],[1,1,1],role,{geometry:g});g.dispose();};
 const tuft=(x,y,z,size,color,role='body',rot=0)=>add(color,[x,y,z],[size*.36,size,size*.28],role,{rot});
 const eye=(x,y,z,r,parent='head',blue=false)=>{
  const name='eye'+(x<0?'Left':'Right');joint(name,[x,y,z],parent);
  add(0xfffbf1,[x,y,z],[r,r*1.05,r*.76],name,{gloss:true});
  add(blue?0x48cde5:0x775139,[x,y,z+r*.58],[r*.81,r*.87,r*.44],name,{gloss:true});
  add(0x152333,[x,y,z+r*.89],[r*.66,r*.72,r*.3],name,{gloss:true});
  add(0xffffff,[x-r*.22,y+r*.31,z+r*1.16],[r*.22,r*.24,r*.11],name,{gloss:true});
  add(0xbaf3ff,[x+r*.25,y-r*.22,z+r*1.15],[r*.095,r*.1,r*.07],name,{gloss:true});
  const lid='lid'+(x<0?'Left':'Right');joint(lid,[x,y,z],parent);
  const skin={axolotl:0xffdceb,elephant:0xc1a5b2,gorilla:0xaaa0a6,tiger:0xf4f1ee,polar:0xfff9e9,otter:0x986a49}[species];
  add(skin,[x,y,z+r*.35],[r*1.04,r*.19,r*.85],lid);
  curve([[x-r*.8,y+r*.04,z+r*.98],[x,y-r*.045,z+r*1.15],[x+r*.8,y+r*.04,z+r*.98]],r*.065,0x5e4b5c,lid);
 };
 const smile=(x,y,z,w,role='head')=>{const g=new T.TubeGeometry(new T.CatmullRomCurve3([v(x-w,y+.03,z),v(x-w*.5,y-.04,z+.015),v(x,y-.06,z+.02),v(x+w*.5,y-.04,z+.015),v(x+w,y+.03,z)]),16,.014,5,false);add(0x72516a,[0,0,0],[1,1,1],role,{geometry:g});g.dispose();};
 const legs=(col,y,z,x,sy,sx=.2,parent='body')=>{for(const front of [true,false])for(const side of [-1,1]){const name='Leg'+(front?'Front':'Back')+(side<0?'Left':'Right'),pz=front?z:-z;joint(name,[side*x,y+sy*.72,pz],parent);add(col,[side*x,y,pz],[sx,sy,sx*1.15],name,{stripes:species==='tiger'});add(col,[side*x,y-sy*.66,pz+.09],[sx*1.15,sy*.24,sx*1.35],name);}};
 if(species==='axolotl'){
  joint('head',[0,.42,.26],'body');joint('tail',[0,.24,-.38],'body');
  add(0xffc8e0,[0,.27,-.06],[.34,.25,.48]);add(0xffdceb,[0,.44,.31],[.47,.34,.37],'head');
  add(0xff9fc8,[0,.42,-.66],[.12,.22,.47],'tail');add(0xffd9e8,[0,.26,-.64],[.12,.1,.4],'tail');
  for(const side of [-1,1])for(let i=0;i<3;i++){const role='gill'+(side<0?'Left':'Right')+i,x=side*(.36+i*.035),y=.43+(i-1)*.18;joint(role,[x,y,.28],'head');add(0xf49cc4,[side*(.54+i*.035),y+(i-1)*.055,.25],[.23,.085,.09],role,{rot:side*(i-1)*.35});for(let f=0;f<5;f++)add(f%2?0xffbadb:0xee87bb,[side*(.43+f*.053+i*.022),y+(i-1)*.05+(f%2?.09:-.08),.26],[.045,.1,.045],role);}
  legs(0xffc4da,.14,.27,.28,.13,.1);eye(-.218,.49,.611,.162,'head',true);eye(.218,.49,.611,.162,'head',true);curve([[-.066,.295,.678],[0,.265,.687],[.066,.295,.678]],.009,0x8f5577);
  add(0xfff5f7,[0,.205,.04],[.275,.14,.38]);
  for(const side of [-1,1]){
   add(0xffa6c4,[side*.31,.31,.598],[.09,.042,.025],'head');add(0xd88cae,[side*.065,.37,.666],[.012,.014,.009],'head');
   for(let front=0;front<2;front++)for(let f=0;f<3;f++)add(0xffe6ee,[side*(.25+f*.042),.055,front?.34:-.24],[.031,.035,.06],'Leg'+(front?'Front':'Back')+(side<0?'Left':'Right'));
   for(let i=0;i<3;i++){
    const role='gill'+(side<0?'Left':'Right')+i,base=[side*.38,.43+(i-1)*.18,.255],tip=[side*(.64+(i===1?.08:0)),.43+(i-1)*.34,.22];
    curve([base,[side*.56,.43+(i-1)*.26,.23],tip],.038,0xfb93c3,role);
    for(let k=0;k<6;k++){const q=k/6,x=side*(.45+q*.27),y=.43+(i-1)*(.19+q*.15);tuft(x,y+.065,.24,.08,0xffbddc,role,side*.6);tuft(x,y-.065,.245,.075,0xf78cbe,role,-side*.55);}
   }
  }
 }else if(species==='elephant'){
  const col=0xc1a5b2;joint('head',[0,2.05,.83],'body');joint('tail',[0,1.42,-1.18],'body');
  add(col,[0,1.65,-.15],[1.04,1.14,1.4]);add(col,[0,2.28,.89],[.78,.89,.8],'head');add(0xd7bec8,[0,2.06,1.46],[.6,.48,.36],'head');
  legs(col,.64,.78,.64,.64,.34);
  for(const side of [-1,1]){joint('ear'+side,[side*.61,2.38,.87],'head');add(col,[side*1.06,2.29,.79],[.64,.87,.18],'ear'+side);add(0xe6b8c5,[side*1.12,2.31,.945],[.43,.65,.055],'ear'+side);add(0xfbeacb,[side*.36,1.81,1.67],[.105,.28,.12],'head');eye(side*.34,2.57,1.48,.13);}
  for(let i=0;i<5;i++)joint('trunk'+i,[0,2.08-i*.32,1.64+i*.075],i?'trunk'+(i-1):'head');
  const trunk=new T.TubeGeometry(new T.CatmullRomCurve3([v(0,2.1,1.63),v(0,1.7,1.8),v(0,1.15,1.92),v(0,.63,2.02),v(0,.52,2.24)]),40,.22,12,false);const tp=trunk.attributes.position;for(let j=0;j<tp.count;j++){const t=Math.floor(j/13)/40,c=trunk.parameters.path.getPointAt(t),r=1.4-t*.77;tp.setXYZ(j,c.x+(tp.getX(j)-c.x)*r,c.y+(tp.getY(j)-c.y)*r,c.z+(tp.getZ(j)-c.z)*r);}trunk.computeVertexNormals();add(col,[0,0,0],[1,1,1],'trunk0',{geometry:trunk,trunk:true});trunk.dispose();
  add(col,[0,.52,2.24],[.145,.145,.065],'trunk4');
  for(let i=0;i<12;i++){joint('spray'+i,[0,.52,2.3],'trunk4');add(0x9ce9ff,[0,.52,2.3],[.045,.06,.045],'spray'+i);}
  for(const side of [-1,1]){add(0x8e738b,[side*.067,.5,2.275],[.04,.035,.014],'trunk4');add(0xd6b2c2,[side*.43,2.08,1.6],[.15,.09,.025],'head');}
  curve([[-.4,1.88,1.65],[-.27,1.79,1.72],[0,1.77,1.76],[.27,1.79,1.72],[.4,1.88,1.65]],.022,0x8c7186);
  for(let i=0;i<4;i++)curve([[-.13,1.1+i*.18,2.01-i*.055],[0,1.07+i*.18,2.04-i*.055],[.13,1.1+i*.18,2.01-i*.055]],.012,0xb597a9,'trunk'+Math.max(0,3-Math.floor(i/2)));
  add(0xb096aa,[0,1.34,-1.47],[.1,.11,.36],'tail');add(0x8c788c,[0,1.28,-1.75],[.13,.17,.12],'tail');
  for(const side of [-1,1])for(const z of [-.78,.78])for(let i=0;i<3;i++)add(0xe7cfce,[side*.64+(i-1)*.16,.18,z+.34],[.08,.09,.035],'Leg'+(z>0?'Front':'Back')+(side<0?'Left':'Right'));
 }else if(species==='gorilla'){
  const fur=0x54555f,skin=0xaaa0a6;joint('head',[0,1.91,.42],'body');
  add(fur,[0,1.15,-.08],[.82,1.07,.62]);add(0x777781,[0,1.18,.39],[.61,.81,.23]);add(fur,[0,2.05,.35],[.61,.66,.53],'head');add(skin,[0,1.96,.76],[.46,.4,.18],'head');add(0xbdb0b3,[0,1.79,.82],[.33,.24,.14],'head');
  for(const side of [-1,1]){joint('Arm'+(side<0?'Left':'Right'),[side*.75,1.65,.12],'body');const arm='Arm'+(side<0?'Left':'Right');add(fur,[side*1.02,1.43,.1],[.37,.51,.36],arm);const elbow='Elbow'+(side<0?'Left':'Right');joint(elbow,[side*1.06,.97,.14],arm);add(fur,[side*1.1,.78,.16],[.34,.48,.35],elbow);add(skin,[side*1.1,.39,.22],[.3,.28,.3],elbow);for(let i=0;i<4;i++)add(fur,[side*(.9+i*.12),.23,.36],[.07,.18,.1],elbow);add(fur,[side*.6,2.02,.27],[.16,.2,.1],'head');eye(side*.205,2.07,.9,.083);}
  for(const side of [-1,1]){const role='LegBack'+(side<0?'Left':'Right');joint(role,[side*.42,.73,-.1],'body');add(fur,[side*.43,.43,-.06],[.3,.51,.3],role);add(fur,[side*.43,.15,.13],[.34,.17,.43],role);}
  add(0x6e626c,[0,1.99,.94],[.18,.09,.07],'head');add(0x6a4f59,[0,1.72,.957],[.245,.1,.035],'head');add(0xf8e9d7,[0,1.76,.983],[.19,.035,.012],'head');smile(0,1.72,.997,.21);
  for(const side of [-1,1]){curve([[side*.1,2.24,.89],[side*.22,2.28,.88],[side*.34,2.24,.83]],.035,0x76717a);add(0xc0adb5,[side*.32,1.87,.9],[.1,.075,.025],'head');add(0x574853,[side*.06,1.99,1.006],[.026,.018,.015],'head');for(let k=0;k<12;k++){tuft(side*(.66+Math.sin(k)*.09),1.15+k*.07,.42,.12,0x73747e,'body',side*.3);tuft(side*(1.12+Math.sin(k)*.05),.7+k*.07,.3,.08,0x5e5d67,(k<4?'Elbow':'Arm')+(side<0?'Left':'Right'),side*.25);}}
  for(let i=0;i<5;i++)tuft((i-2)*.1,2.64,.32,.1,0x62616b,'head',(i-2)*-.13);
 }else if(species==='tiger'){
  const col=0xf4f1ee;joint('head',[0,1.05,.79],'body');joint('tail',[0,.85,-1.02],'body');
  add(col,[0,.95,-.12],[.63,.65,1.07],'body',{stripes:true});add(col,[0,1.2,.84],[.55,.56,.57],'head',{stripes:true});add(0xffffff,[0,1.04,1.29],[.37,.27,.2],'head');for(const side of [-1,1])add(0xfffaf4,[side*.26,1.04,1.31],[.24,.22,.18],'head');
  legs(col,.43,.67,.43,.43,.19);for(const side of [-1,1]){joint('ear'+side,[side*.38,1.6,.7],'head');add(col,[side*.4,1.66,.69],[.2,.23,.12],'ear'+side);add(0xd7aabf,[side*.4,1.67,.8],[.115,.14,.03],'ear'+side);eye(side*.22,1.32,1.31,.11,'head',true);}
  add(0x9c7587,[0,1.12,1.5],[.1,.065,.055],'head');smile(0,.98,1.515,.15);add(0xe2a7b7,[0,1.13,1.543],[.067,.042,.021],'head');
  for(const side of [-1,1]){
   curve([[side*.06,1.51,1.3],[side*.19,1.55,1.28],[side*.32,1.51,1.22]],.026,0x4b4c59);
   for(let k=0;k<3;k++){curve([[side*.29,1.03+k*.035,1.47],[side*.48,1.04+k*.06,1.48],[side*.7,1.03+k*.08,1.44]],.008,0xfffdf5);add(0x6f6371,[side*(.21+k*.045),1.045,1.489],[.012,.012,.008],'head');}
   for(let k=0;k<12;k++)tuft(side*(.46+Math.sin(k)*.03),.92+k*.035,.99,.085,0xfffcf3,'head',side*.55);
   for(const front of [true,false])for(let k=0;k<3;k++)curve([[side*.57,.25+k*.16,front?.69:-.65],[side*.61,.29+k*.16,front?.76:-.58],[side*.57,.32+k*.16,front?.83:-.51]],.022,0x4b4d59,'Leg'+(front?'Front':'Back')+(side<0?'Left':'Right'));
  }
  for(let k=0;k<3;k++)curve([[-.1,1.52+k*.055,1.22-k*.07],[0,1.5+k*.055,1.24-k*.07],[.1,1.52+k*.055,1.22-k*.07]],.027,0x4b4c59);
  add(col,[0,1.02,-1.54],[.1,.13,.67],'tail',{stripes:true});add(0x424653,[0,1.03,-2.1],[.12,.13,.18],'tail');joint('toy',[.7,.19,1.45]);add(0xdda2ee,[.7,.19,1.45],[.23,.23,.23],'toy');
 }else if(species==='polar'){
  const col=0xfff9e9;joint('head',[0,1.55,.75],'body');joint('tail',[0,1,-1.03],'body');add(col,[0,1.14,-.12],[.8,.88,1.18]);add(col,[0,1.62,.83],[.57,.6,.68],'head');add(0xf3e6d6,[0,1.4,1.37],[.35,.25,.35],'head');legs(col,.49,.71,.53,.49,.26);for(const side of [-1,1]){joint('ear'+side,[side*.42,2.05,.67],'head');add(col,[side*.43,2.08,.67],[.19,.2,.13],'ear'+side);eye(side*.235,1.73,1.35,.115);}add(0x3b4251,[0,1.48,1.69],[.14,.1,.095],'head');smile(0,1.29,1.72,.14);
  for(const side of [-1,1]){
   add(0xeacbd2,[side*.32,1.4,1.35],[.1,.055,.023],'head');
   curve([[side*.11,1.93,1.28],[side*.23,1.96,1.27],[side*.34,1.93,1.22]],.025,0xe4dbd3);
   for(let k=0;k<12;k++)tuft(side*(.5+Math.sin(k)*.02),1.36+k*.03,.93,.07,0xfffcf1,'head',side*.5);
   for(const front of [true,false])for(let k=0;k<3;k++)add(0xd6c8c3,[side*.53+(k-1)*.1,.16,front?1.02:-.4],[.035,.045,.018],'Leg'+(front?'Front':'Back')+(side<0?'Left':'Right'));
  }add(col,[0,1.08,-1.36],[.21,.22,.27],'tail');joint('toy',[.8,.25,1.1]);add(0xe7f9ff,[.8,.25,1.1],[.24,.24,.24],'toy');
 }else{
  const col=0x986a49;joint('head',[0,.57,.49],'body');joint('tail',[0,.4,-.65],'body');add(col,[0,.43,-.05],[.34,.37,.7]);add(0xe8cfab,[0,.51,.2],[.28,.29,.55]);add(col,[0,.65,.55],[.4,.36,.35],'head');add(0xe6cba8,[0,.55,.81],[.31,.19,.15],'head');legs(col,.18,.36,.28,.2,.12);for(const side of [-1,1]){joint('ear'+side,[side*.31,.88,.44],'head');add(col,[side*.32,.89,.44],[.13,.14,.09],'ear'+side);eye(side*.17,.7,.82,.09);}add(0x43333a,[0,.6,.975],[.095,.06,.035],'head');smile(0,.48,.995,.12);
  for(const side of [-1,1]){
   add(0xf6dfbf,[side*.18,.55,.91],[.13,.09,.04],'head');
   for(let k=0;k<3;k++)curve([[side*.19,.53+k*.025,.956],[side*.32,.54+k*.05,.965],[side*.47,.55+k*.06,.91]],.007,0xf9e9d0);
   for(let k=0;k<9;k++)tuft(side*.32,.35+k*.035,.45,.055,0xae805b,'body',side*.35);
  }
  add(col,[0,.35,-1.05],[.17,.13,.58],'tail');
 }
 const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());geometry.computeBoundingSphere();geometry.userData.sharedScenery=true;
 const n=joints.length,values=new Float32Array(n*4*ZOO_POSE_FRAMES*4),rest=joints.map((j,i)=>new T.Matrix4().makeTranslation(...j.pivot.toArray())),inverse=rest.map(m=>m.clone().invert()),animated=[];
 for(let f=0;f<ZOO_POSE_FRAMES;f++)for(let i=0;i<n;i++){
  const j=joints[i],p=zooAnimalPose(species,f*ZOO_CYCLE/ZOO_POSE_FRAMES,j.role),local=j.pivot.clone().sub(j.parent===null?v():joints[j.parent].pivot).add(v(p.x,p.y,p.z)),m=new T.Matrix4().compose(local,new T.Quaternion().setFromEuler(new T.Euler(p.rx,p.ry,p.rz)),v(p.sx,p.sy,p.sz));
  animated[i]=j.parent===null?m:animated[j.parent].clone().multiply(m);const skin=animated[i].clone().multiply(inverse[i]);values.set(skin.elements,(f*n+i)*16);
 }
 const texture=new T.DataTexture(values,n*4,ZOO_POSE_FRAMES,T.RGBAFormat,T.FloatType);texture.minFilter=texture.magFilter=T.NearestFilter;texture.needsUpdate=true;texture.userData.sharedScenery=true;
 return {species,geometry,texture,joints,values,width:n*4,refs:0};
}
const declarations=`attribute vec2 aJoints;attribute vec2 aWeights;attribute float aGloss;attribute float aStripe;varying float vZooStripe;varying vec3 vZooRest;attribute float aZooPhase;varying float vZooGloss;uniform sampler2D uZooPose;uniform float uZooTime;uniform float uZooFrames;uniform float uZooCycle;uniform float uZooGreet;uniform float uZooApproach;uniform float uZooAngle;uniform vec3 uZooAxis;attribute float aGreetId;attribute vec3 aGreetPivot;
vec3 zooRotate(vec3 p){float a=uZooAngle;return p*cos(a)+cross(uZooAxis,p)*sin(a)+uZooAxis*dot(uZooAxis,p)*(1.-cos(a));}
mat4 zooMatrix(float id){float f=mod((uZooTime+aZooPhase)/uZooCycle,1.)*uZooFrames;int a=int(floor(f)),b=(a+1)%int(uZooFrames),x=int(id)*4;float w=fract(f);return mat4(mix(texelFetch(uZooPose,ivec2(x,a),0),texelFetch(uZooPose,ivec2(x,b),0),w),mix(texelFetch(uZooPose,ivec2(x+1,a),0),texelFetch(uZooPose,ivec2(x+1,b),0),w),mix(texelFetch(uZooPose,ivec2(x+2,a),0),texelFetch(uZooPose,ivec2(x+2,b),0),w),mix(texelFetch(uZooPose,ivec2(x+3,a),0),texelFetch(uZooPose,ivec2(x+3,b),0),w));}
vec3 zooNormal(mat4 m,vec3 n){mat3 a=mat3(m);return mat3(a[0]/max(dot(a[0],a[0]),.000001),a[1]/max(dot(a[1],a[1]),.000001),a[2]/max(dot(a[2],a[2]),.000001))*n;}`;
function motion(material,uniforms){material.onBeforeCompile=shader=>{
 Object.assign(shader.uniforms,uniforms);shader.vertexShader=declarations+'\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nmat4 zooA=zooMatrix(aJoints.x);objectNormal=zooNormal(zooA,objectNormal)*aWeights.x;if(aWeights.y>.0001)objectNormal+=zooNormal(zooMatrix(aJoints.y),normal)*aWeights.y;if(aGreetId>=0.)objectNormal=zooRotate(objectNormal);');
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvZooGloss=aGloss;vZooStripe=aStripe;vZooRest=position;transformed=(zooMatrix(aJoints.x)*vec4(position,1.)).xyz*aWeights.x;if(aWeights.y>.0001)transformed+=(zooMatrix(aJoints.y)*vec4(position,1.)).xyz*aWeights.y;if(aGreetId>=0.){vec3 pivot=(zooMatrix(aGreetId)*vec4(aGreetPivot,1.)).xyz;transformed=pivot+zooRotate(transformed-pivot);}transformed.z+=uZooGreet*uZooApproach;');
 shader.fragmentShader='varying float vZooGloss;varying float vZooStripe;varying vec3 vZooRest;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
if(vZooStripe>.1){float band=vZooRest.y<.75? vZooRest.y*17.+vZooRest.z*2.:vZooRest.z*11.+sin(vZooRest.y*5.)*1.7+vZooRest.x*1.6;float s=sin(band),edge=max(.025,fwidth(s)*.8);float mask=smoothstep(.76-edge,.76+edge,s)*smoothstep(.12,.3,abs(vZooRest.x));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.035,.04,.055),mask*vZooStripe);}`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.76,.09,vZooGloss);');
 };material.customProgramCacheKey=()=> 'zoo-fixed-pose-v2';return material;}
export function zooAnimals(exhibit){
 let template=cache.get(exhibit.species);if(!template){template=buildTemplate(exhibit.species);cache.set(exhibit.species,template);}if(!template.refs++)template.texture.needsUpdate=true;
 const spec=ZOO_ANIMALS[exhibit.species],uniforms={uZooPose:{value:template.texture},uZooTime:{value:0},uZooFrames:{value:ZOO_POSE_FRAMES},uZooCycle:{value:ZOO_CYCLE},uZooGreet:{value:0},uZooApproach:{value:exhibit.species==='axolotl'?.8:0},uZooAngle:{value:0},uZooAxis:{value:exhibit.species==='otter'||exhibit.species==='elephant'?v(0,0,1):exhibit.species==='axolotl'||exhibit.species==='tiger'?v(0,1,0):v(1,0,0)}},geometry=copyGeometryBuffers(template.geometry),phases=new Float32Array(spec.count),dummy=new T.Object3D();
 const material=motion(new T.MeshStandardMaterial({vertexColors:true,roughness:.76}),uniforms),mesh=new T.InstancedMesh(geometry,material,spec.count);mesh.name='Zoo animals · '+exhibit.species;mesh.boundingSphere=new T.Sphere(v(0,1,0),9);mesh.boundingBox=new T.Box3(v(-9,-4,-9),v(9,8,9));mesh.frustumCulled=true;mesh.raycast=()=>{};geometry.userData.sharedScenery=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.customDepthMaterial=motion(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}),uniforms);mesh.customDistanceMaterial=motion(new T.MeshDistanceMaterial(),uniforms);
 const anchors=spec.count===8?[[-2,1.2,-.8],[0,2.3,-1],[1.8,1.4,-.2],[-1.5,2.6,1.2],[.6,1.1,1.8],[2.1,2.7,1],[-2.4,1.7,1],[0,2.5,2.2]]:spec.count===4?[[-.2,0,0],[.1,0,0],[0,0,0],[0,0,0]]:exhibit.species==='polar'?[[-1.2,0,-.35],[1.25,0,-.45],[0,0,1.25]]:exhibit.species==='gorilla'?[[-1.9,0,-.35],[1.85,0,-.45],[.4,0,-.65]]:[[-1.6,0,-.35],[1.7,0,-.45],[-.6,0,1.45]];
 const actorData=[];
 for(let i=0;i<spec.count;i++){
  const scale=spec.scale[i],anchor=anchors[i],phase=exhibit.species==='otter'?i*ZOO_CYCLE/4+i*.21:['gorilla','tiger','polar'].includes(exhibit.species)?i*8+i*.31:i*.48;
  phases[i]=phase;dummy.position.set(...anchor);dummy.rotation.set(0,exhibit.species==='gorilla'?0:zooFacing(exhibit),0);dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);actorData.push({anchor,scale,phase,matrix:dummy.matrix.clone()});
 }
 geometry.setAttribute('aZooPhase',new T.InstancedBufferAttribute(phases,1));
 let disposed=false;mesh.userData={zooSpecies:exhibit.species,actors:actorData,poseTexture:template.texture,poseData:template,uniforms,update(time,reduced=false,greet=0,elapsed=0){uniforms.uZooTime.value=reduced?0:time;uniforms.uZooGreet.value=reduced?0:greet;uniforms.uZooAngle.value=reduced?0:exhibit.species==='otter'?TAU*T.MathUtils.smoothstep(elapsed,0,4):greet*(exhibit.species==='polar'?-.7:exhibit.species==='gorilla'?-.45:Math.sin(elapsed*3.8)*.28);},dispose(){if(disposed)return;disposed=true;mesh.customDepthMaterial.dispose();mesh.customDistanceMaterial.dispose();if(--template.refs===0)template.texture.dispose();}};
 mesh.addEventListener('dispose',mesh.userData.dispose);return mesh;
}
export function zooAnimalPoint(mesh,index,time,out=new T.Vector3()){
 const d=mesh.userData,a=d.actors[index%d.actors.length],data=d.poseData,f=((time+a.phase)%ZOO_CYCLE+ZOO_CYCLE)%ZOO_CYCLE/ZOO_CYCLE*ZOO_POSE_FRAMES,lo=Math.floor(f),hi=(lo+1)%ZOO_POSE_FRAMES,n=data.joints.length,t=f-lo;
 const x=data.values[lo*n*16+12]*(1-t)+data.values[hi*n*16+12]*t,y=data.values[lo*n*16+13]*(1-t)+data.values[hi*n*16+13]*t,z=data.values[lo*n*16+14]*(1-t)+data.values[hi*n*16+14]*t;
 return out.set(x,y,z+d.uniforms.uZooGreet.value*d.uniforms.uZooApproach.value).applyMatrix4(a.matrix);
}
// Catalogue artwork uses the same real animal, framed alone, with no new rig.
export function zooAnimalPreview(exhibit){
 const group=new T.Group(),a=zooAnimals(exhibit),m=new T.Matrix4();a.count=1;a.setMatrixAt(0,m);a.instanceMatrix.needsUpdate=true;group.add(a);
 group.userData.disposeStaff=()=>{a.dispose();a.geometry.dispose();a.material.dispose();};return group;
}
