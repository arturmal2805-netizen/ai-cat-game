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
    // RAF timestamps jitter around the display cadence. With only 0.5 ms of
    // tolerance a slightly late first callback anchors every following early
    // callback below the deadline, accidentally dropping alternate 60 Hz
    // frames. Keep absolute deadlines and a bounded early allowance instead
    // of restarting from now or submitting catch-up frames.
    const deadlineTime = now + Math.min(4, interval / 4) + 0.0001;
    if (deadlineTime < next) return false;
    // Consume the same tolerated deadline we tested above. Advancing from raw
    // now can leave a second deadline inside this callback's allowance after
    // a long pause, incorrectly admitting a second frame at the same time.
    next += Math.max(1, Math.floor((deadlineTime - next) / interval) + 1) * interval;
    return true;
  };
}
