// Local, opt-in diagnostics. No networking, player records or graphics changes.
export function createFrameSamples(limit = 300) {
  const rows = new Array(limit), delays = [];
  let head = 0, size = 0, gpuPolls = 0, contextPolls = 0, queueTotal = 0, queueMax = 0;
  return {
    blocked(reason, ms = 0) {
      if (reason === "gpu") { gpuPolls++;this.queue(ms); }
      if (reason === "context") contextPolls++;
    },
    queue(ms) { queueTotal+=ms;queueMax=Math.max(queueMax,ms); },
    delay(ms) { delays.push(ms);if(delays.length>limit)delays.shift(); },
    clear() { head = size = gpuPolls = contextPolls = queueTotal = queueMax = 0;delays.length=0; },
    frame(row) { rows[head] = { ...row }; head = (head + 1) % limit; size = Math.min(size + 1, limit); },
    report() {
      const a = Array.from({length:size},(_,i)=>rows[(head-size+i+limit)%limit]);
      const percentile = (values,p) => {
        values.sort((x,y)=>x-y); return values.length ? Math.round(values[Math.floor((values.length-1)*p)]*100)/100 : null;
      };
      const gaps = a.slice(1).map((r,i)=>r.at-a[i].at), elapsed = a.length > 1 ? a.at(-1).at-a[0].at : 0;
      return { samples:size, seconds:Math.round(elapsed)/1000,
        fps:elapsed ? Math.round((size-1)*100000/elapsed)/100 : null,
        gapP95:percentile(gaps,.95),gapMax:gaps.length?Math.max(...gaps):null,
        cpuMedian:percentile(a.map(r=>r.cpu),.5),cpuP95:percentile(a.map(r=>r.cpu),.95),
        renderMedian:percentile(a.map(r=>r.render),.5),renderP95:percentile(a.map(r=>r.render),.95),
        gpuWaitCallbacksSinceReset:gpuPolls,contextWaitCallbacksSinceReset:contextPolls,
        queueCpuTotalSinceReset:Math.round(queueTotal*100)/100,queueCpuMaxSinceReset:Math.round(queueMax*100)/100,
        eventLoopDelayP95:percentile(delays.slice(),.95),eventLoopDelayMax:delays.length?Math.max(...delays):null,
        last:a.length?{...a.at(-1),at:undefined,cpu:undefined,render:undefined}:null };
    },
  };
}

export function createFrameProfile(renderer) {
  if (new URLSearchParams(location.search).get("profile") !== "1") return null;
  // One optional startup query, never a synchronous driver query per frame.
  let gpu = "not exposed";
  try {
    const gl=renderer.getContext(), info=gl.getExtension("WEBGL_debug_renderer_info");
    gpu=gl.getParameter(info?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
  } catch {}
  const samples = createFrameSamples(), panel = document.createElement("aside"),
    label = document.createElement("div"), copy = document.createElement("button"),
    output = document.createElement("textarea");
  panel.id = "frame-profile";
  panel.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:10000;max-width:calc(100vw - 24px);background:#25283bef;color:white;padding:10px;border-radius:12px;font:12px/1.5 system-ui;box-shadow:0 2px 12px #0003";
  label.textContent = "Диагностика: покрути и приблизь игровую камеру 10–15 секунд";
  label.style.whiteSpace = "pre-line";
  copy.textContent = "Скопировать отчёт";copy.type="button";copy.style.cssText="margin-top:6px;padding:5px 12px;border-radius:8px";
  output.hidden = true;output.readOnly=true;output.style.cssText="width:100%;height:110px";
  const report = () => ({version:1,gpu,app:document.querySelector('script[src*="dist/app.js"]')?.getAttribute("src"),
    browser:navigator.userAgent,viewport:[innerWidth,innerHeight],...samples.report()});
  copy.onclick=async()=>{
    const text=JSON.stringify(report(),null,2);
    try { await navigator.clipboard.writeText(text); copy.textContent="Отчёт скопирован"; }
    catch { output.value=text;output.hidden=false;output.focus();output.select();copy.textContent="Выделено — скопируй текст"; }
  };
  panel.append(label,copy,output);document.body.append(panel);
  let next = 0, lastTimer = performance.now();
  const timer = setInterval(()=>{
    const now=performance.now();samples.delay(Math.max(0,now-lastTimer-200));lastTimer=now;
  },200);
  return {
    blocked:(reason,ms)=>samples.blocked(reason,ms),
    queue:ms=>samples.queue(ms),
    pause:()=>{samples.clear();lastTimer=performance.now();},
    frame(row){
      samples.frame(row);
      if(row.at<next)return;next=row.at+1000;
      const r=samples.report();label.textContent=`${r.fps??"…"} FPS · CPU ${r.cpuMedian??0} мс · рендер ${r.renderMedian??0} мс\n${row.biome} · ${row.calls} вызовов · DPR ${row.dpr}`;
    },
    dispose(){clearInterval(timer);panel.remove();},
  };
}
