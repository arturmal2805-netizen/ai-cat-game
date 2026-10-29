// Offline authored brachiation. One palm is pinned to its actual branch during
// each swing; the transfer uses a 9.81 m/s² arc between the two grips.
export const GORILLA_BRANCH_HEIGHT=4.6,GORILLA_BRANCH_X=2.3,GORILLA_BRANCH_Z=-1.2;
export const GORILLA_SWING_REVISION='gorilla-play-swing-v2';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},lerp=(a,b,w)=>a+(b-a)*w;
export function gorillaSwingState(u){
 let x=0,y=0,z=0,rz=0,left=0,right=0,phase='climb',grip=null;
 const A=10/79,B=30/79,C=38/79,D=57/79,E=67/79,flight=(C-B)*12;
 const h=GORILLA_BRANCH_HEIGHT-3.34,back=GORILLA_BRANCH_Z+.5,rootA=-GORILLA_BRANCH_X+1.12,rootB=GORILLA_BRANCH_X-1.12;
 if(u<A){const w=smooth(u/A);x=rootA*w;y=h*w;z=back*w;left=-Math.PI*w;right=-Math.PI*smooth((u-.04)/.08);}
 else if(u<B){phase='left-swing';const q=(u-A)/(B-A);rz=.366*Math.sin(q*Math.PI*2);left=right=-Math.PI;grip='Left';x=-GORILLA_BRANCH_X+1.12*Math.cos(rz)+3.34*Math.sin(rz);y=GORILLA_BRANCH_HEIGHT+1.12*Math.sin(rz)-3.34*Math.cos(rz);z=back;}
 else if(u<C){phase='transfer';const q=(u-B)/(C-B),t=q*flight;x=lerp(rootA,rootB,q);y=h+4.905*t*(flight-t);z=back;left=right=-Math.PI;}
 else if(u<D){phase='right-swing';const q=(u-C)/(D-C);rz=.366*Math.sin(q*Math.PI*2);left=right=-Math.PI;grip='Right';x=GORILLA_BRANCH_X-1.12*Math.cos(rz)+3.34*Math.sin(rz);y=GORILLA_BRANCH_HEIGHT-1.12*Math.sin(rz)-3.34*Math.cos(rz);z=back;}
 else if(u<E){phase='descend';const w=smooth((u-D)/(E-D));x=rootB;y=h*(1-w);z=back*(1-w);left=right=-Math.PI*(1-w);}
 else {phase='return';x=rootB*(1-smooth((u-E)/(1-E)));}
 return {x,y,z,rz,left,right,phase,grip};
}
export function gorillaSwingPose(u,role){
 const s=gorillaSwingState(u),p={x:0,y:0,z:0,rx:0,ry:0,rz:0,sx:1,sy:1,sz:1};
 if(role==='root'){p.x=s.x;p.y=s.y;p.z=s.z;p.rz=s.rz;}
 if(role==='ArmLeft')p.rx=s.left;if(role==='ArmRight')p.rx=s.right;
 if(role==='head'){p.rz=-s.rz*.3;p.rx=s.grip?-.08:0;}
 if(role.startsWith('LegBack')){const w=smooth(u/.12)*smooth((.85-u)/.13);p.rx=-.5*w;p.rz=(role.endsWith('Left')?-1:1)*.12*w;}
 if(role.startsWith('lid'))p.sx=p.sy=p.sz=.001;
 return p;
}
