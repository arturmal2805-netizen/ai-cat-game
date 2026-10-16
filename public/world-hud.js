const positions = new WeakMap();
// Exact screen coordinates are retained. Idle/offscreen income badges used to
// toggle hidden twice per frame and rewrite styles, needlessly invalidating the
// mobile page while the WebGL world was already busy drawing.
export function placeWorldBadge(element, hidden, x = 0, y = 0) {
  if (element.hidden !== hidden) element.hidden = hidden;
  if (hidden) return;
  let previous = positions.get(element);
  if (previous && previous.x === x && previous.y === y) return;
  if (!previous) positions.set(element, (previous = {}));
  previous.x = x;
  previous.y = y;
  element.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`;
}
