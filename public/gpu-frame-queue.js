// Keep input responsive when a phone's GPU is still finishing earlier frames.
// Poll fences without waiting; never queue an unbounded trail of obsolete views.
// The next submitted frame uses the latest camera at the original resolution.
export function createGpuFrameQueue(gl, limit = 2) {
  const pending = [];
  const supported = typeof gl.fenceSync === "function";
  function clear() {
    for (const fence of pending) gl.deleteSync(fence);
    pending.length = 0;
  }
  return {
    ready() {
      if (!supported) return true;
      while (pending.length) {
        const status = gl.clientWaitSync(pending[0], 0, 0);
        if (status === gl.TIMEOUT_EXPIRED) break;
        gl.deleteSync(pending.shift());
      }
      return pending.length < limit;
    },
    submitted() {
      if (!supported) return;
      const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (fence) {
        pending.push(fence);
        gl.flush();
      }
    },
    clear,
    get pending() {
      return pending.length;
    },
  };
}
