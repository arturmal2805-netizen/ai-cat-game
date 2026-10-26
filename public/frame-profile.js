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
        geometryEvictionsDuringWindow:a.length>1&&Number.isFinite(a[0].evicted)&&Number.isFinite(a.at(-1).evicted)?a.at(-1).evicted-a[0].evicted:null,
        last:a.length?{...a.at(-1),at:undefined,cpu:undefined,render:undefined}:null };
    },
  };
}

// Aggregate transfer volume only, without storing buffers or making GL queries.
export function trackProfileUploads(gl) {
  const originals = {}, wrappers = {}, counts = {dataCalls:0,dataBytes:0,subCalls:0,subBytes:0};
  for (const [name, prefix, at, offsetAt, lengthAt] of [
    ["bufferData","data",1,3,4], ["bufferSubData","sub",2,3,4],
  ]) {
    if(typeof gl[name]!=="function")continue;
    const native=originals[name]=gl[name];
    wrappers[name]=gl[name]=function(...args){
      const result=native.apply(this,args),data=args[at],width=data?.BYTES_PER_ELEMENT||1;
      const bytes=typeof data==="number"?data:!data?0:args[lengthAt]>0?args[lengthAt]*width:Math.max(0,data.byteLength-(args[offsetAt]||0)*width);
      counts[prefix+"Calls"]++;counts[prefix+"Bytes"]+=bytes;return result;
    };
  }
  return {snapshot:()=>({...counts}),clear(){for(const key of Object.keys(counts))counts[key]=0;},
    dispose(){for(const name of Object.keys(originals))if(gl[name]===wrappers[name])gl[name]=originals[name];}};
}

// A bounded diagnostic can release the GPU even if its RAF/interval is late.
// This controller never participates in ordinary play.
export function createProfilePause({ seconds = 0, clock = () => performance.now(), onChange = () => {} } = {}) {
  const duration = Number.isFinite(seconds) && seconds >= 5 && seconds <= 60 ? seconds * 1000 : 0;
  let paused = false, deadline = duration ? clock() + duration : Infinity;
  const stop = () => { if (!paused) { paused = true; onChange(true); } };
  return {
    seconds: duration / 1000,
    get suspended() { if (!paused && clock() >= deadline) stop(); return paused; },
    stop,
    resume() { paused = false; deadline = duration ? clock() + duration : Infinity; onChange(false); },
  };
}

export function createFrameProfile(renderer) {
  const query = new URLSearchParams(location.search);
  if (query.get("profile") !== "1") return null;
  // One optional startup query, never a synchronous driver query per frame.
  let gpu = "not exposed";
  try {
    const gl=renderer.getContext(), info=gl.getExtension("WEBGL_debug_renderer_info");
    gpu=gl.getParameter(info?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
  } catch {}
  const uploads=trackProfileUploads(renderer.getContext());
  const samples = createFrameSamples(), panel = document.createElement("aside"),
    label = document.createElement("div"), copy = document.createElement("button"),
    toggle = document.createElement("button"),
    output = document.createElement("textarea");
  panel.id = "frame-profile";
  panel.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:10000;max-width:calc(100vw - 24px);background:#25283bef;color:white;padding:10px;border-radius:12px;font:12px/1.5 system-ui;box-shadow:0 2px 12px #0003";
  label.textContent = "Диагностика: покрути и приблизь игровую камеру 10–15 секунд";
  label.style.whiteSpace = "pre-line";
  copy.textContent = "Скопировать отчёт";copy.type="button";copy.style.cssText="margin-top:6px;padding:5px 12px;border-radius:8px";
  copy.dataset.profileCopy="";
  toggle.textContent="Приостановить 3D";toggle.type="button";toggle.dataset.profilePause="";
  toggle.style.cssText="margin:6px 0 0 6px;padding:5px 12px;border-radius:8px";
  output.hidden = true;output.readOnly=true;output.style.cssText="width:100%;height:110px";
  const pauseControl=createProfilePause({seconds:Number(query.get("pauseAfter")),onChange:paused=>{
    toggle.textContent=paused?"Продолжить 3D":"Приостановить 3D";
    label.textContent=paused?"3D на паузе · скопируй отчёт и закрой вкладку диагностики":"Диагностика: покрути и приблизь камеру";
  }});
  if(pauseControl.seconds)label.textContent+=` · 3D остановится через ${pauseControl.seconds} с`;
  const report = () => ({version:2,gpu,suspended:pauseControl.suspended,automaticPauseSeconds:pauseControl.seconds,
    app:document.querySelector('script[src*="dist/app.js"]')?.getAttribute("src"),bufferTransfersSinceReset:uploads.snapshot(),
    browser:navigator.userAgent,viewport:[innerWidth,innerHeight],...samples.report()});
  copy.onclick=async()=>{
    const text=JSON.stringify(report(),null,2);
    try { await navigator.clipboard.writeText(text); copy.textContent="Отчёт скопирован"; }
    catch { output.value=text;output.hidden=false;output.focus();output.select();copy.textContent="Выделено — скопируй текст"; }
  };
  toggle.onclick=()=>{if(pauseControl.suspended){samples.clear();uploads.clear();lastTimer=performance.now();pauseControl.resume();}else pauseControl.stop();};
  panel.append(label,copy,toggle,output);document.body.append(panel);
  let next = 0, lastTimer = performance.now();
  const timer = setInterval(()=>{
    // Refresh the deadline label even when no further frame is submitted.
    void pauseControl.suspended;
    const now=performance.now();samples.delay(Math.max(0,now-lastTimer-200));lastTimer=now;
  },200);
  return {
    get suspended(){return pauseControl.suspended;},
    blocked:(reason,ms)=>samples.blocked(reason,ms),
    queue:ms=>samples.queue(ms),
    pause:()=>{samples.clear();uploads.clear();lastTimer=performance.now();},
    frame(row){
      samples.frame(row);
      if(pauseControl.suspended)return;
      if(row.at<next)return;next=row.at+1000;
      const r=samples.report();label.textContent=`${r.fps??"…"} FPS · CPU ${r.cpuMedian??0} мс · рендер ${r.renderMedian??0} мс\n${row.biome} · ${row.calls} вызовов · DPR ${row.dpr}`;
    },
    dispose(){clearInterval(timer);uploads.dispose();panel.remove();},
  };
}
