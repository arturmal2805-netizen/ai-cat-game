// Opt-in elapsed GPU time. Availability is polled without waiting, query
// objects are reused, and disjoint state is checked only when copying a report.
// This module is never instantiated by ordinary play.
export function createGpuProfile(gl, { limit = 4, samples = 300 } = {}) {
  let ext;
  try { ext = gl.getExtension("EXT_disjoint_timer_query_webgl2"); } catch {}
  const supported = !!(ext && gl.createQuery && gl.beginQuery && gl.getQueryParameter),
    pool = [], pending = [], values = [];
  let active = null, disposed = false;
  function poll() {
    if (!supported || disposed) return;
    while (pending.length) {
      const q = pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT);
      pending.shift();pool.push(q);
      if (Number.isFinite(ns) && ns >= 0) {
        values.push(ns / 1e6);
        if (values.length > samples) values.shift();
      }
    }
  }
  function clear() {
    if (active) { gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(active);active = null; }
    for (const q of [...pool, ...pending]) gl.deleteQuery(q);
    pool.length = pending.length = values.length = 0;
  }
  return {
    begin() {
      if (!supported || disposed || active) return;
      poll();
      if (pending.length >= limit) return;
      const q = pool.pop() || gl.createQuery();
      if (!q) return;
      gl.beginQuery(ext.TIME_ELAPSED_EXT, q);active = q;
    },
    end() {
      if (!active) return;
      gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(active);active = null;
    },
    clear,
    report() {
      if (!supported || disposed) return {supported:false,samples:0};
      poll();
      const disjoint = !!gl.getParameter(ext.GPU_DISJOINT_EXT);
      if (disjoint) clear();
      const sorted = values.slice().sort((a,b)=>a-b),
        value = p => sorted.length ? Math.round(sorted[Math.floor((sorted.length-1)*p)]*100)/100 : null;
      return {supported:true,disjoint,samples:sorted.length,pending:pending.length,
        medianMs:value(.5),p95Ms:value(.95),maxMs:value(1)};
    },
    dispose() { clear();disposed = true; },
  };
}
