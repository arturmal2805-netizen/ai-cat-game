// A canvas resize clears its drawing buffer. Observe layout changes without
// touching WebGL; apply the final dimensions immediately before the next draw.
export function watchWorldViewport(
  container,
  Observer = globalThis.ResizeObserver,
) {
  let width = 0,
    height = 0,
    clientWidth = 0,
    clientHeight = 0,
    pending = null,
    invalid = true;
  const measure = () => {
    const rect = container.getBoundingClientRect(),
      nextWidth = Math.round(rect.width),
      nextHeight = Math.round(rect.height);
    if (nextWidth <= 0 || nextHeight <= 0) return;
    // HUD projection uses the content dimensions, not the rounded canvas rect
    // (which can include a border). Read layout on resize, never after each
    // frame's badge/text mutations: that would force synchronous layout.
    clientWidth = container.clientWidth;
    clientHeight = container.clientHeight;
    pending =
      nextWidth === width && nextHeight === height
        ? null
        : { width: nextWidth, height: nextHeight };
  };
  const observer = new Observer(measure);
  observer.observe(container);
  measure();
  return {
    get width() {
      return clientWidth;
    },
    get height() {
      return clientHeight;
    },
    get pending() {
      return !!pending || invalid;
    },
    apply(renderer, camera) {
      if (pending) {
        ({ width, height } = pending);
        pending = null;
        // CSS owns the displayed size; inline pixel dimensions can feed back
        // into layout and cause another resize while a phone toolbar moves.
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      invalid = false;
    },
    invalidate() {
      invalid = true;
      measure();
    },
    dispose() {
      observer.disconnect();
    },
  };
}
