// The player-verified individual renderer retains the approved rigs and native
// uniform palettes. Colony sharing remains an explicit diagnostic comparison;
// a smaller submission count did not establish better Apple GPU performance.
export function catDrawMode(search = globalThis.location?.search || "") {
  const query = new URLSearchParams(search);
  return query.get("profile") === "1" && query.get("catDraw") === "shared"
    ? "automatic" : "individual";
}
