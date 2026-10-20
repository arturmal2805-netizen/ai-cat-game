// Camera response follows wall time even if rendering was late. Simulation
// retains its own bounded delta, so a slow draw cannot replay physics steps.
export function cameraBlend(elapsed, reduced = false) {
  return reduced ? 1 : 1 - Math.exp(-Math.max(0, elapsed) * 8);
}
export function wheelPixels(event, height) {
  return (
    event.deltaY *
    (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1)
  );
}
