// Offline, exact authored-surface proof. Never run fitting/mesh scans on RAF.
import fs from 'node:fs';
import {MOSA_REEF_AUTHORED_INSTANCES} from '../public/mosasaur-reef-data.js';
import {mosaReefTemplate} from '../public/mosasaur-reef-sculpt.js';
import {MOSA_RADIUS} from '../public/mosasaur-data.js';
import {MALL_LAYOUT as L,mallConstructionFootprintDistance as field} from '../public/mall-layout.js';
const models=[0,1,2].map(k=>mosaReefTemplate(k)),fits=[],evidence=[];
for(const [index,c]of MOSA_REEF_AUTHORED_INSTANCES.entries()){
 const attr=models[c.kind].attributes.position,points=[],cos=Math.cos(c.yaw),sin=Math.sin(c.yaw);
 for(let i=0;i<attr.count;i++)points.push({dx:(attr.getX(i)*cos+attr.getZ(i)*sin)*c.scaleXZ,dz:(-attr.getX(i)*sin+attr.getZ(i)*cos)*c.scaleXZ,y:c.base+attr.getY(i)*c.scaleY});
 const measure=(dx,dz,stride=1)=>{let min=Infinity,maxRadius=0;for(let i=0;i<points.length;i+=stride){const p=points[i],x=c.x+dx+p.dx,z=c.z+dz+p.dz;maxRadius=Math.max(maxRadius,Math.hypot(x,z));if(p.y>=L.y-6&&p.y<=1)min=Math.min(min,field(x,z));}return{min,maxRadius};};
 const before=measure(0,0);if(before.min>=2){fits.push(null);evidence.push({index,changed:false,before});continue;}
 const gx=field(c.x+.1,c.z)-field(c.x-.1,c.z),gz=field(c.x,c.z+.1)-field(c.x,c.z-.1),angle=Math.atan2(gz,gx);let chosen=null;
 for(let radius=2;radius<=120&&!chosen;radius+=2)for(const da of [0,.35,-.35,.7,-.7,1.05,-1.05]){
  const dx=Math.cos(angle+da)*radius,dz=Math.sin(angle+da)*radius,rough=measure(dx,dz,8);if(rough.min<6||rough.maxRadius>MOSA_RADIUS-2)continue;
  const exact=measure(dx,dz);if(exact.min>=5&&exact.maxRadius<MOSA_RADIUS-2){chosen={dx,dz,after:exact};break;}
 }
 if(!chosen)throw Error('No full-detail reef fit for colony '+index);
 fits.push({dx:chosen.dx,dz:chosen.dz});evidence.push({index,changed:true,before,after:chosen.after,translation:{dx:chosen.dx,dz:chosen.dz}});
}
fs.writeFileSync('public/mall-reef-fit.js','// Offline authored-surface fitting; no vertices, materials or colony counts removed.\n// Regenerate: node scripts/fit-mall-reefs.mjs\nexport const MALL_REEF_OFFSETS=Object.freeze('+JSON.stringify(fits,null,2)+');\n');
fs.writeFileSync('/workspace/qa/mall-reef-fitted-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
