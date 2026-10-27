// Every water attraction must declare its water contract here. Geometry is
// authored beside its real rider route; this list is checked against CATALOG.
import { REFERENCE_SLIDES } from "./reference-slide-data.js";
import { ATOLL_SLIDES } from "./atoll-slide-data.js";
export const WATER_RIDE_RULE_VERSION = 1;
export const WATER_RIDES = [
  ["waterslide", "flume", 1],
  ["water-river", "channel", 1],
  ["water-whirlpool", "vortex", 1],
  ["water-extreme", "flume", 1],
  ["slide-royal-cascade", "flume", 1],
  ["slide-vortex-bowl", "vortex", 1],
  ["ride-crystal-slide", "flume", 1],
  ["slide-marshmallow", "flume", 3],
  ["slide-glass-corkscrew", "flume", 1],
  ["slide-sky-cannon", "flume", 1],
  ["slide-titan-funnel", "vortex", 3],
  ["slide-jungle-titan", "flume", 1],
  ["slide-rainbow-tsunami", "flume", 6],
  ["slide-abyss-capsule", "flume", 1],
  ["dive-triple-sky", "dive", 0],
  ...REFERENCE_SLIDES.map((s) => [s.id, "flume", s.channels]),
  ...ATOLL_SLIDES.map(s => [s.id, "flume", s.channels]),
].map(([id, kind, channels]) => ({
  id,
  kind,
  channels,
  version: WATER_RIDE_RULE_VERSION,
}));
export const waterRideSpec = (id) => WATER_RIDES.find((r) => r.id === id);
