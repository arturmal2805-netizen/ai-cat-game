// Stable identity metadata, independent of meshes, coats, names and AI choices.
// Existing saves acquire the same value on every device, even before Job City.
const known = {
  chichi: "female",
  nimbus: "male",
  "adopt-nimbus": "male",
  "adopt-marshmallow": "male",
  "adopt-doughnut": "male",
  "adopt-cloudberry": "female",
};
export function catSex(cat) {
  const id = typeof cat === "string" ? cat : cat?.id || "";
  if (known[id]) return known[id];
  const hash = [...id].reduce((n, c) => Math.imul(n, 31) + c.charCodeAt(0), 17);
  return (hash >>> 0) % 2 ? "male" : "female";
}
export const sexSymbol = (cat) => (catSex(cat) === "male" ? "♂" : "♀");
export const sexLabel = (cat) => (catSex(cat) === "male" ? "Котик" : "Кішечка");
