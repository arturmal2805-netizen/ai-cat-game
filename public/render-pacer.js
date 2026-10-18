// Retain the target cadence after a late RAF instead of restarting the interval.
// Skip missed deadlines; never replay them as a burst of extra GPU frames.
export function createRenderPacer() {
  let next = 0,
    period = 0;
  return (now, interval, force = false) => {
    if (force || interval !== period) {
      period = interval;
      next = now + interval;
      return true;
    }
    if (now + 0.5 < next) return false;
    next += Math.max(1, Math.floor((now - next) / interval) + 1) * interval;
    return true;
  };
}
