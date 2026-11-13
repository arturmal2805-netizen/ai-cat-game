import {spaPath} from './spa-navigation.js';
import {MALL_LAYOUT as L,mallBuildingFootprintDistance,mallAtriumVoidDistance,roundedMallRectDistance} from './mall-layout.js';

const prepared=new WeakMap(),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const queues=Array.from({length:6},(_,i)=>({x:L.lift.x+(i%2?4.5:-4.5),z:L.lift.z-L.z-L.lift.landing-Math.floor(i/2)*4}));
const navigationWalkable=(p,radius,boxes,access=[],avoid=[])=>mallWalkableV2(p,radius,boxes)&&queues.every(q=>access.some(a=>dist(a,q)<.05)||dist(p,q)>radius+1.8+.2)&&avoid.every(q=>dist(p,q)>radius+q.radius+.2);
export const mallNavigationV2Ready=(boxes,radius)=>!!prepared.get(boxes)?.has(radius);
export function mallWalkableV2(p,radius,boxes){
  const x=p.x,z=p.z+L.z;
  const main=mallBuildingFootprintDistance(x,z)<-radius-.12&&(!(boxes.floor>1)||mallAtriumVoidDistance(x,z)>radius+.12);
  // Boarding/alighting is handled by the lift FSM, never by an ordinary
  // walking route across an empty shaft when the cabin is on another floor.
  const shaft=Math.hypot(x-L.lift.x,z-L.lift.z)<L.lift.radius+radius+.12;
  let landing=false;
  if(boxes.floor>1)for(const side of [-1,1])landing||=roundedMallRectDistance(x,z,{x:side*25,z:L.z+13.5,w:17,d:4.6,corner:0})< -radius-.12;
  let pavilion=false;
  for(const p of L.pavilions)if(p.floor===boxes.floor){
    pavilion||=Math.hypot(x-p.x,z-p.z)<p.radius-radius-.2;
    const ax=p.connection.x,az=p.connection.z,dx=p.x-ax,dz=p.z-az,length=Math.hypot(dx,dz),mx=(p.x+ax)/2,mz=(p.z+az)/2;
    const along=((x-mx)*dx+(z-mz)*dz)/length,across=(-(x-mx)*dz+(z-mz)*dx)/length;
    pavilion||=Math.abs(along)<length/2+radius&&Math.abs(across)<4-radius-.12;
  }
  if(shaft||(!main&&!landing&&!pavilion))return false;
  const nearby=boxes.cells?boxes.cells.get(Math.floor(p.x/4)+','+Math.floor(p.z/4))||[]:boxes;
  for(const b of nearby){const dx=p.x-b.x,dz=p.z-b.z,xx=Math.abs(dx*b.c+dz*b.s),zz=Math.abs(-dx*b.s+dz*b.c);if(Math.hypot(Math.max(0,xx-b.hx),Math.max(0,zz-b.hz))<radius+.04)return false;}
  return true;
}
function clear(a,b,radius,boxes,access=[],avoid=[]){
  const n=Math.max(1,Math.ceil(dist(a,b)/.22));
  for(let i=0;i<=n;i++){const t=i/n;if(!navigationWalkable({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},radius,boxes,access,avoid))return false;}
  return true;
}
export function mallSegmentClearV2(from,to,radius,boxes){const a={x:from.x,z:from.z-L.z},b={x:to.x,z:to.z-L.z};return clear(a,b,radius,boxes,[a,b]);}
function roadPoints(){
  const nodes=[];for(const r of [30.5,34.5])for(let i=0;i<=12;i++){const a=-i*Math.PI/12;nodes.push({x:Math.cos(a)*r,z:Math.sin(a)*r});}
  for(const side of [-1,1]){
    nodes.push({x:side*38,z:13});
    for(const x of [43,53.3,56.8,58.2,60.5,75.5,87,102.5,113])for(const z of [27.5,32])nodes.push({x:side*x,z});
    for(const [x,z]of [[119,28],[121,25],[122.5,20],[122.5,6],[122.5,-10],[119,-19],[110,-28],[101,-28],[87,-28],[73,-28],[57,-23]])nodes.push({x:side*x,z});
  }
  for(const x of [-60.5,-56.8])for(const z of [0,8,16,24,32,40,49])nodes.push({x,z});
  for(const z of [-3,4,12,20,28,35])nodes.push({x:-28.7,z});
  for(const x of [L.lift.x-4.5,L.lift.x,L.lift.x+4.5])for(const z of [-8,-4,0,4,8])nodes.push({x,z});
  for(const x of [L.lift.x-2.3,L.lift.x+2.3])for(const z of [L.lift.z-L.z+L.lift.landing,L.lift.z-L.z+L.lift.landing+4])nodes.push({x,z});
  for(const p of L.pavilions){nodes.push({x:p.connection.x,z:p.connection.z-L.z},{x:(p.connection.x+p.x)/2,z:(p.connection.z+p.z)/2-L.z},{x:p.x,z:p.z-L.z});}
  return nodes;
}
export function* mallNavigationV2Steps(boxes,radius){
  let rows=prepared.get(boxes);if(rows?.has(radius))return rows.get(radius);
  const nodes=roadPoints().filter(p=>navigationWalkable(p,radius,boxes)),edges=nodes.map(()=>[]);
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
    yield;const d=dist(nodes[i],nodes[j]);if(d>22||!clear(nodes[i],nodes[j],radius,boxes))continue;
    edges[i].push({index:j,cost:d});edges[j].push({index:i,cost:d});
  }
  // A measured aisle can bend around a planter even when no two authored
  // road nodes see each other directly. Join disconnected local components
  // with the existing bounded furniture pathfinder, retaining the full bend.
  const component=nodes.map((_,i)=>i),find=i=>{while(component[i]!==i)i=component[i];return i;},join=(a,b)=>{component[find(a)]=find(b);};
  for(let i=0;i<edges.length;i++)for(const e of edges[i])join(i,e.index);
  const candidates=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(find(i)!==find(j)){const d=dist(nodes[i],nodes[j]);if(d<28)candidates.push({i,j,d});}
  candidates.sort((a,b)=>a.d-b.d);let attempts=0;
  for(const {i,j}of candidates){if(find(i)===find(j))continue;if(attempts++>=48)break;yield;const path=localPath(nodes[i],nodes[j],radius,boxes);if(!path)continue;const cost=length(path);edges[i].push({index:j,cost,path});edges[j].push({index:i,cost,path:path.slice().reverse()});join(i,j);}
  if(!rows){rows=new Map();prepared.set(boxes,rows);}if(rows.size>=32)rows.delete(rows.keys().next().value);
  const graph={nodes,edges,paths:new Map()};rows.set(radius,graph);return graph;
}
function localPath(a,b,radius,boxes,access=[],avoid=[]){
  if(clear(a,b,radius,boxes,access,avoid))return[a,b];
  if(dist(a,b)>43)return null;
  const origin={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
  // Wide cats can fit a real doorway yet miss a coarse grid sample. Retry the
  // same measured geometry at 30 cm only for that short, bounded local route.
  for(const cell of [.45,.3]){
    const extent=Math.min(avoid.length?48:90,Math.ceil((Math.max(Math.abs(a.x-b.x),Math.abs(a.z-b.z))/2+5)/cell));
    const known=new Map(),walkable=p=>{const key=p.x+','+p.z;if(known.has(key))return known.get(key);const ok=navigationWalkable({x:p.x+origin.x,z:p.z+origin.z},radius,boxes,access,avoid);known.set(key,ok);return ok;};
    const found=spaPath({x:a.x-origin.x,z:a.z-origin.z},{x:b.x-origin.x,z:b.z-origin.z},radius,[],walkable,{cell,extent});
    if(!found)continue;
    const path=[a,...found.map(p=>({x:p.x+origin.x,z:p.z+origin.z}))];
    let valid=true;for(let i=1;i<path.length;i++)if(!clear(path[i-1],path[i],radius,boxes,access,avoid)){valid=false;break;}
    if(valid)return path;
  }
  return null;
}
const length=path=>path.reduce((sum,p,i)=>sum+(i?dist(path[i-1],p):0),0);
function attachments(p,graph,radius,boxes,access){
  const candidates=graph.nodes.map((node,index)=>({node,index,d:dist(node,p)})).filter(x=>x.d<36).sort((a,b)=>a.d-b.d),out=[];
  for(const c of candidates){if(out.length>=4)break;if(clear(p,c.node,radius,boxes,access))out.push({index:c.index,path:[p,c.node],cost:c.d});}
  if(!out.length)for(const c of candidates.slice(0,4)){const path=localPath(p,c.node,radius,boxes,access);if(path)out.push({index:c.index,path,cost:length(path)});}
  return out;
}
export function mallPathV2(floor,from,to,radius,boxes,dynamic=[]){
  const a={x:from.x,z:from.z-L.z},b={x:to.x,z:to.z-L.z},y=L.y+(floor-1)*L.rise+.18;
  const access=[a,b];
  if(!mallWalkableV2(a,radius,boxes)||!mallWalkableV2(b,radius,boxes))return null;
  if(dynamic.length){const avoid=dynamic.map(p=>({x:p.x,z:p.z-L.z,radius:p.radius})),path=localPath(a,b,radius,boxes,access,avoid);return path?.map(p=>({x:p.x,y,z:p.z+L.z}))||null;}
  const graph=prepared.get(boxes)?.get(radius),key=[a.x,a.z,b.x,b.z].map(n=>n.toFixed(6)).join(',');
  const cached=graph?.paths.get(key);if(cached)return cached.map(p=>({...p}));
  const emit=path=>{const mapped=path.map(p=>({x:p.x,y,z:p.z+L.z}));if(graph){if(graph.paths.size>=128)graph.paths.delete(graph.paths.keys().next().value);graph.paths.set(key,mapped);}return mapped.map(p=>({...p}));};
  const direct=dist(a,b)<43?localPath(a,b,radius,boxes,access):clear(a,b,radius,boxes,access)?[a,b]:null;
  if(direct)return emit(direct);
  if(!graph)return null;
  const starts=attachments(a,graph,radius,boxes,access),ends=attachments(b,graph,radius,boxes,access);if(!starts.length||!ends.length)return null;
  const costs=new Float64Array(graph.nodes.length).fill(Infinity),prev=new Int16Array(graph.nodes.length).fill(-1),prevPaths=[],done=new Uint8Array(graph.nodes.length),startPaths=new Map();
  for(const s of starts){costs[s.index]=s.cost;startPaths.set(s.index,s.path);}
  for(let i=0;i<graph.nodes.length;i++){
    let n=-1;for(let j=0;j<costs.length;j++)if(!done[j]&&(n<0||costs[j]<costs[n]))n=j;
    if(n<0||!Number.isFinite(costs[n]))break;done[n]=1;
    for(const edge of graph.edges[n])if(costs[n]+edge.cost<costs[edge.index]){costs[edge.index]=costs[n]+edge.cost;prev[edge.index]=n;prevPaths[edge.index]=edge.path||[graph.nodes[n],graph.nodes[edge.index]];}
  }
  const end=ends.sort((a,b)=>costs[a.index]+a.cost-costs[b.index]-b.cost)[0];if(!Number.isFinite(costs[end.index]))return null;
  const indices=[];let index=end.index;while(index>=0){indices.push(index);index=prev[index];}indices.reverse();
  const path=[...startPaths.get(indices[0]),...indices.slice(1).flatMap(i=>prevPaths[i].slice(1)),...end.path.slice().reverse().slice(1)];
  return emit(path);
}
