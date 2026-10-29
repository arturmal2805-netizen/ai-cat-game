import {zooLegPose} from './zoo-anatomy-motion.js';
// Closed, smooth 32-second choreography. Used only while preparing immutable
// pose tables; the browser animation uploads clocks, never new bone buffers.
export const ZOO_CYCLE=32,ZOO_POSE_FRAMES=400;
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const window=(u,a,b)=>Math.sin(Math.PI*clamp((u-a)/(b-a)))**2;
export function zooAnimalPose(species,time,role){
 const u=((time%ZOO_CYCLE)+ZOO_CYCLE)%ZOO_CYCLE/ZOO_CYCLE,t=u*ZOO_CYCLE,a=TAU*u,p={x:0,y:0,z:0,rx:0,ry:0,rz:0,sx:1,sy:1,sz:1};
 const side=role.includes('Left')||role.endsWith('-1')?-1:1,front=role.includes('Front'),leg=/Leg|Foot|Arm/.test(role),blink=Math.max(.035,1-Math.exp(-((((t+1.1)%4)-2)**2)/.025));
 if(role.startsWith('eye'))p.sy=blink;
 if(role.startsWith('lid'))p.sx=p.sy=p.sz=Math.max(.001,1-blink);
 if(role==='body'){
  p.y=Math.sin(a*8)*.025;
  if(species==='elephant'){const walk=window(u,0,.4);p.rz=Math.sin(a*18)*.018*walk;p.y+=Math.abs(Math.sin(a*18))*.025*walk;}
  if(species==='axolotl'){p.sx=1+Math.sin(a*8)*.018;p.sy=1+Math.sin(a*8)*.022;}
  if(species==='tiger'){const stretch=window(u,.2,.42);p.sy=1-stretch*.035;p.sz=1+stretch*.025;}
  return p;
 }
 if(role==='root'){
  if(species==='axolotl'){p.x=Math.sin(a)*.6;p.y=Math.sin(a*2)*.28;p.z=Math.cos(a)*.55;p.ry=Math.sin(a)*.3;p.rz=Math.sin(a*2)*.04;p.rx=Math.sin(a*3)*.035;}
  else if(species==='otter'){const q=smooth(u/.78),s=TAU*q,rest=window(u,.78,1);p.x=Math.sin(s)*1.55;p.z=Math.cos(s)*1.6;p.y=-.38-window(u,.12,.34)*.5+rest*.75;p.ry=s+Math.PI/2;p.rz=window(u,.35,.68)*Math.PI;p.x+=Math.sin(p.rz)*.43;p.y+=(1-Math.cos(p.rz))*.43;p.rx=-window(u,.12,.34)*.4-rest*.13;}
  else if(species==='polar'){const swim=window(u,.23,.75),travel=smooth((u-.08)/.18)*(1-smooth((u-.72)/.18));p.x=Math.sin(a)*.2;p.z=-1.15+travel*2.3;p.y=-swim*.9-window(u,.4,.65)*1.2;p.ry=Math.PI*(smooth((u-.43)/.14)+smooth((u-.89)/.11));p.rx=window(u,.4,.65)*.38-window(u,.65,.8)*.18;}
  else if(species==='gorilla'){const climb=window(u,.2,.6),sit=window(u,.64,.95);p.x=Math.sin(a)*.25;p.z=-climb*2.1;p.y=climb*(1.55+Math.sin(a*10)*.045)-sit*.15;p.ry=Math.sin(a)*.16;}
  else if(species==='tiger'){const q=smooth(u/.2),walk=TAU*q;p.x=Math.sin(walk)*.55;p.z=(Math.cos(walk)-1)*.25;p.ry=Math.sin(walk)*.35;p.y=-window(u,.45,.7)*.28;}
  else{const q=smooth(u/.4),s=q*TAU;p.x=Math.sin(s)*.55;p.z=(Math.cos(s)-1)*.36;p.ry=Math.sin(s)*.24;p.y=-window(u,.68,.93)*.04;}
  return p;
 }
 const limb=zooLegPose(species,t,role,/^(Leg|Knee|Foot)/.test(role)?zooAnimalPose(species,t,'root'):null,/^(Leg|Knee|Foot)/.test(role)?zooAnimalPose(species,t,'body'):null);if(limb)return {...p,...limb};
 if(role==='head'){p.ry=Math.sin(a*4)*.07+(species==='tiger'?window(u,.72,.97)*Math.sin(a*8)*.25:0);p.rx=species==='tiger'?window(u,.23,.43)*.16+window(u,.35,.48)*.2:species==='gorilla'?window(u,.65,.95)*.08:Math.sin(a*4)*.035;}
 if(role.startsWith('ear'))p.ry=side*Math.sin(a*11)*(species==='elephant'?.34:species==='axolotl'?.13:.045);
 if(role.startsWith('gill')){p.rz=side*Math.sin(a*16+Number(role.at(-1)))*.15;p.ry=Math.sin(a*12)*.13;}
 if(role==='tail'){p.ry=Math.sin(a*(species==='axolotl'?15:9))*(species==='axolotl'?.26:.18);p.rz=Math.sin(a*5)*.08;}
 if(role.startsWith('spray')){const i=Number(role.slice(5)),age=(t+i*.067)%.9,live=window(u,.43,.67);p.x=Math.sin(i*2.399)*age*.65*live;p.y=(2.4*age-4.905*age*age)*live;p.z=age*1.6*live;p.sx=p.sy=p.sz=live>.15&&age<.72?1:.001;return p;}
 if(role.startsWith('trunk')){const i=Number(role.at(-1)),wave=window(u,.43,.67);p.rx=-wave*(.28+i*.025)+(Math.sin(a*9-i*.5)-Math.sin(-i*.5))*.055;p.rz=(Math.sin(a*6-i*.4)-Math.sin(-i*.4))*.045;}
 if(leg){
  if(species==='elephant')p.rx=Math.sin(a*18+(front?0:Math.PI)+side*Math.PI/2)*.28*window(u,0,.4);
  else if(species==='axolotl')p.rx=Math.sin(a*15+side+(front?0:Math.PI))*.22;
  else if(species==='otter'){const back=window(u,.35,.68),rest=window(u,.78,1);p.rx=(Math.sin(a*20+side)*.34*(front?1-back:1)-(front?.8:0)*back)*(1-rest);p.rz=side*(.16+back*.2);}
  else if(species==='polar'){const swim=window(u,.18,.75);p.rx=Math.sin(a*15+side)*(.15+.3*swim);p.rz=side*swim*.12;}
  else if(species==='tiger'){p.rx=Math.sin(a*15+side+(front?0:Math.PI))*.18*window(u,0,.2);p.rx+=(front?-.6:.4)*window(u,.2,.42)+(front?-.95:-.8)*window(u,.45,.7);p.y+=window(u,.45,.7)*.18;if(role==='LegFrontRight')p.rx-=window(u,.35,.48)*1.1;if(role==='LegFrontLeft')p.rx-=window(u,.72,.97)*Math.max(0,Math.sin(a*8))*.55;}
  else if(species==='gorilla'){const climb=window(u,.2,.6);p.rx=climb*(-1.8+Math.sin(a*12+side)*.15);const beat=window(u,.04,.19);p.rx-=beat*(.5+Math.sin(a*41+side)*.12);p.ry=-side*beat*.45;p.rz=-side*beat*.28;if(!role.includes('Arm')){p.rx=-window(u,.64,.95)*.9;p.y=window(u,.64,.95)*.13;p.rz=side*window(u,.64,.95)*.2;}}
 }
 if(role.startsWith('Elbow')){p.rx=-window(u,.04,.19)*(.65+Math.sin(a*41+side)*.12)-window(u,.2,.6)*.24-window(u,.64,.95)*.35;}
 if(role==='toy'){const visible=species==='tiger'?window(u,.72,.97):species==='otter'?window(u,.35,.68):window(u,.75,.98);p.sx=p.sy=p.sz=Math.max(.001,visible);p.y=species==='otter'?0:Math.abs(Math.sin(a*20))*.2;}
 return p;
}
export function zooWatchReaction(species,elapsed,seat=0,play=null){
 const photo=play?play.photo:elapsed>7&&elapsed<11,wave=Math.max(0,Math.sin(elapsed*(species==='axolotl'?5:2)+seat)),carried=(play?.carry||0)>0,water=species==='elephant'&&elapsed>1.5&&elapsed<5,amazed=species==='gorilla'&&elapsed<4;
 return {paw:photo?.5:carried?.15:species==='polar'?.2+wave*.3:.15+wave*.4,headPitch:species==='elephant'||species==='gorilla'?-.16:species==='axolotl'?-.08:.06,headRoll:Math.sin(elapsed*(water?5:1.6))*(water?.14:.055),crouch:water?wave*.14:0,surprise:carried?.55:amazed?.8:photo?.25:.15,tailSway:Math.sin(elapsed*2)*.12,cue:photo?'zoo-photo':carried?'zoo-carried':water?'zoo-water':amazed?'zoo-wow':'zoo-wave',emotion:photo||carried||water?'delighted':'curious',photo};
}
