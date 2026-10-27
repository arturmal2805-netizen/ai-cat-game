// Explicit diagnostics only. Ordinary play keeps the original function object.
let active = null;
export function createWorkSamples({ clock = () => performance.now(), limit = 32 } = {}) {
  const rows = new Map(), longest = [];
  let origin = clock();
  return {
    run(label, fn, receiver, args) {
      const at = clock();
      try { return fn.apply(receiver, args); }
      finally {
        const ms = clock() - at;
        if (!rows.has(label) && rows.size >= Math.max(1,limit)-1) label = "other";
        let row = rows.get(label);
        if (!row) rows.set(label, row = { calls: 0, totalMs: 0, maxMs: 0, over50ms: 0 });
        row.calls++; row.totalMs += ms; row.maxMs = Math.max(row.maxMs, ms);
        if (ms >= 50) {
          row.over50ms++;
          longest.push({label,atMs:Math.round(at-origin),durationMs:Math.round(ms*100)/100});
          longest.sort((a,b)=>b.durationMs-a.durationMs);longest.length=Math.min(longest.length,12);
        }
      }
    },
    clear() { rows.clear();longest.length=0;origin=clock(); },
    report() { return { phases:Object.fromEntries([...rows].map(([name,r])=>[name,{
      ...r,totalMs:Math.round(r.totalMs*100)/100,maxMs:Math.round(r.maxMs*100)/100,
    }])),longest:longest.map(r=>({...r})) }; },
  };
}
export function activateWorkSamples(samples) {
  active = samples;
  return () => { if (active === samples) active = null; };
}
export function profileFunction(label, fn) {
  if (new URLSearchParams(globalThis.location?.search || "").get("profile") !== "1") return fn;
  return function (...args) {
    return active ? active.run(label, fn, this, args) : fn.apply(this, args);
  };
}
