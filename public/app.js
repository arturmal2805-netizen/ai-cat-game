import {apiBase} from './config.js';
const api=path=>apiBase?new URL(path,apiBase).href:new URL('.'+path,location.href).href;
const $=id=>document.getElementById(id);
const positions={home:[18,26],tree:[76,22],pond:[79,59],garden:[27,77],picnic:[57,76]};
let state={location:'home',hunger:30,energy:85},busy=false,configured=false,steps=0;
const buttonLabel='Дай Чичи решить самой';
function update(decision){state.location=decision.target;state.hunger=Math.min(100,state.hunger+5);state.energy=Math.max(0,state.energy-4);if(decision.target==='home')state.energy=Math.min(100,state.energy+30);if(decision.target==='picnic')state.hunger=Math.max(0,state.hunger-40);const [x,y]=positions[decision.target];$('cat').style.left=x+'%';$('cat').style.top=y+'%';$('bubble').textContent=decision.thought;$('steps').textContent=++steps+' приключений';$('energy').value=state.energy;$('food').value=100-state.hunger;$('energy-text').textContent=state.energy+'%';$('food-text').textContent=(100-state.hunger)+'%';const li=document.createElement('li');li.textContent=decision.thought;$('diary').prepend(li);while($('diary').children.length>5)$('diary').lastChild.remove();}
async function decide(demo=false){
 if(busy)return;
 if(!demo&&!configured){$('status').textContent='Cloudflare AI пока не подключён. Можно попробовать отдельное демо.';return;}
 busy=true;$('toggle').disabled=true;$('demo').disabled=true;
 $('toggle').textContent=demo?buttonLabel:'Чичи думает…';
 try {
  let decision;
  if(demo){
   const choices=Object.keys(positions).filter(x=>x!==state.location);
   const target=state.hunger>65?'picnic':state.energy<30?'home':choices[Math.floor(Math.random()*choices.length)];
   decision={target,thought:{home:'Свернусь клубочком и немного отдохну.',pond:'Интересно, о чём мечтают рыбки?',tree:'С высоты лучше видно приключения!',garden:'Эти цветы пахнут солнечным утром.',picnic:'Кажется, пора перекусить. Мур!'}[target]};
  }else{
   $('status').textContent='Cloudflare AI выбирает путь…';
   const response=await fetch(api('/api/decide'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state),signal:AbortSignal.timeout(25000)});
   decision=await response.json();
   if(!response.ok)throw new Error(decision.error||'Не удалось получить решение ИИ.');
  }
  if(!positions[decision.target]||typeof decision.thought!=='string')throw new Error('ИИ вернул некорректное решение. Попробуйте ещё раз.');
  update(decision);
  $('mode').textContent=demo?'Демо · без ИИ':'Cloudflare AI';
  $('status').textContent=demo?'Это демо без ИИ. Для решения ИИ нажмите «Дай Чичи решить самой».':'Чичи решила! Нажмите кнопку, когда захотите узнать её следующий выбор.';
 }catch(error){$('status').textContent=error.message;}
 finally{busy=false;$('toggle').disabled=false;$('demo').disabled=false;$('toggle').textContent=buttonLabel;}
}
$('toggle').onclick=()=>decide();
$('demo').onclick=()=>decide(true);
try{
 const response=await fetch(api('/api/status'));if(!response.ok)throw new Error();
 ({configured}=await response.json());
 $('mode').textContent=configured?'Cloudflare AI':'ИИ не подключён';
 $('status').textContent=configured?'Нажмите «Дай Чичи решить самой» — ИИ выберет, куда ей пойти.':'Cloudflare AI пока не подключён. Можно попробовать отдельное демо.';
}catch{$('mode').textContent='ИИ не подключён';$('status').textContent='Не удалось подключиться к Cloudflare AI. Можно попробовать отдельное демо.';}
