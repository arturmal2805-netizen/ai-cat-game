// Replacing identical text creates a fresh node and invalidates layout/paint.
// Keep the existing node until its visible text actually changes.
export function setText(node, value) {
  const text = value == null ? "" : String(value);
  if (node.textContent === text && (!node.firstChild ||
      (node.childNodes.length === 1 && node.firstChild.nodeType === 3))) return false;
  node.textContent = text;
  return true;
}
