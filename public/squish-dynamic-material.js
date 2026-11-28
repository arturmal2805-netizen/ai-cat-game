// V22 local constitutive parameters. Artistic game calibration; native proof pending.
// Forces N; stiffness N/m; viscosity N*s/m; depth m; time s.
// Ratios below are deliberately artistic, dimensionless tuning controls.
const base = {
  materialClass: "elastic-solid",
  compliance: 0.02,
  damping: 1.5,
  density: 800,
  effectiveStiffness: 60,
  elasticRecovery: 1,
  viscosity: 0,
  creepRate: 0,
  creepTimeConstant: 1,
  creepStiffness: Infinity,
  yieldStress: Infinity,
  plasticFlowRate: 0,
  plasticStrainLimit: 0.35,
  buoyancyMode: "none",
  effectiveBuoyancy: 0,
  surfaceAdhesion: 0,
  surfaceTension: 0.5,
  friction: 0.65,
  contactRadius: 0.65,
  impactResponse: 0.24,
  reboundStrength: 0.35,
  maximumCompression: 0.3,
  maximumImmersion: 0.3,
  shapeRecoverySpeed: 4,
  volumePreservation: 0.99,
  fractureThreshold: Infinity,
  fractureAccumulation: 0,
  strandFormationThreshold: 0.2,
  strandBreakThreshold: 3,
  restShape: "existing-volume",
  collisionMode: "same-rendered-surface",
};
const profile = (id, values) =>
  Object.freeze({ ...base, materialId: id, ...values });
export const DYNAMIC_MATERIAL_PROFILES_V2 = Object.freeze({
  jelly: profile("jelly", {
    materialClass: "elastic-solid",
    effectiveStiffness: 60,
    reboundStrength: 0.68,
    shapeRecoverySpeed: 5,
  }),
  foam: profile("foam", {
    compliance: 0.008,
    damping: 24,
    materialClass: "retarded-compressible-solid",
    effectiveStiffness: 90,
    creepRate: 1 / 4.5,
    creepTimeConstant: 4.5,
    creepStiffness: 110,
    viscosity: 495,
    maximumCompression: 0.45,
    maximumImmersion: 0.45,
    reboundStrength: 0.01,
    shapeRecoverySpeed: 0.16,
    volumePreservation: 0.55,
  }),
  cloud: profile("cloud", {
    compliance: 0.006,
    damping: 24,
    materialClass: "retarded-compressible-solid",
    effectiveStiffness: 55,
    creepRate: 1 / 3.5,
    creepTimeConstant: 3.5,
    creepStiffness: 75,
    viscosity: 262.5,
    maximumCompression: 0.55,
    maximumImmersion: 0.55,
    reboundStrength: 0.01,
    shapeRecoverySpeed: 0.7,
    volumePreservation: 0.55,
  }),
  butter: profile("butter", {
    compliance: 0.0018,
    damping: 12,
    materialClass: "elastoplastic-solid",
    effectiveStiffness: 250,
    yieldStress: 350,
    plasticFlowRate: 0.035,
    creepRate: 0.14,
    creepTimeConstant: 7,
    creepStiffness: 180,
    viscosity: 1260,
    maximumCompression: 0.4,
    maximumImmersion: 0.4,
    shapeRecoverySpeed: 0.4,
    fractureThreshold: 0.22,
    fractureAccumulation: 0.8,
    volumePreservation: 0.94,
  }),
  crunchy: profile("crunchy", {
    compliance: 0.0004,
    damping: 10,
    materialClass: "granular-filled-solid",
    effectiveStiffness: 220,
    creepRate: 0.12,
    creepTimeConstant: 8,
    creepStiffness: 300,
    viscosity: 2400,
    maximumCompression: 0.28,
    maximumImmersion: 0.28,
    shapeRecoverySpeed: 1.6,
    volumePreservation: 0.94,
  }),
  "slime-soft": profile("slime-soft", {
    compliance: 0.004,
    damping: 15,
    materialClass: "viscoplastic-solid",
    effectiveStiffness: 85,
    creepRate: 1 / 3.2,
    creepTimeConstant: 3.2,
    creepStiffness: 90,
    viscosity: 288,
    yieldStress: 220,
    plasticFlowRate: 0.02,
    surfaceAdhesion: 0.85,
    maximumCompression: 0.45,
    maximumImmersion: 0.45,
    shapeRecoverySpeed: 0.32,
    reboundStrength: 0.02,
  }),
  "slime-gooey": profile("slime-gooey", {
    compliance: 0.004,
    damping: 15,
    materialClass: "viscoplastic-solid",
    effectiveStiffness: 55,
    creepRate: 1 / 2.8,
    creepTimeConstant: 2.8,
    creepStiffness: 50,
    viscosity: 140,
    yieldStress: 110,
    plasticFlowRate: 0.05,
    surfaceAdhesion: 0.95,
    maximumCompression: 0.6,
    maximumImmersion: 0.65,
    shapeRecoverySpeed: 0.24,
    reboundStrength: 0.01,
  }),
  "slime-ultra": profile("slime-ultra", {
    compliance: 0.004,
    damping: 15,
    materialClass: "viscous-immersion",
    density: 1020,
    effectiveStiffness: 30,
    creepRate: 0.5,
    creepTimeConstant: 2,
    creepStiffness: 35,
    viscosity: 110,
    yieldStress: 0,
    plasticFlowRate: 0.08,
    buoyancyMode: "displaced-contact-volume",
    effectiveBuoyancy: 1,
    surfaceAdhesion: 0.8,
    maximumCompression: 0.65,
    maximumImmersion: 0.75,
    shapeRecoverySpeed: 0.2,
    reboundStrength: 0,
  }),
});
export const dynamicSquishProfile = (id) =>
  DYNAMIC_MATERIAL_PROFILES_V2[id === "slime" ? "slime-soft" : id] ||
  DYNAMIC_MATERIAL_PROFILES_V2.jelly;

// Pa = N/m²; creepStiffness/effectiveStiffness = N/m; viscosity = N*s/m.
// Recovery/flow/rate = 1/s; tau = s; density = kg/m³. Compression/immersion,
// restitution, tension, adhesion, fracture and strain limits are normalized.
// The liquid profile uses a submerged cross-section in m² supplied by contact
// geometry proxy (not its deliberately expanded coarse-cage footprint).
// Native submerged-volume calibration and liquid wrapping remain unverified.
export const DYNAMIC_MATERIAL_UNITS = Object.freeze({
  density: "kg/m3",
  effectiveStiffness: "N/m",
  compliance: "m/N",
  viscosity: "N*s/m",
  damping: "1/s",
  creepRate: "1/s",
  creepTimeConstant: "s",
  yieldStress: "Pa",
  plasticFlowRate: "1/s",
  plasticStrainLimit: "normalized",
  contactRadius: "m",
  shapeRecoverySpeed: "1/s",
  ratios: "all other numeric properties are normalized artistic tuning",
});
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function materialLoadDepth(
  profile,
  force,
  thickness,
  area = 0.035,
  submergedArea = 0.0025,
  out = {},
) {
  const limit = Math.max(
    0,
    thickness * Math.min(profile.maximumCompression, profile.maximumImmersion),
  );
  const F = Math.max(0, force),
    stiffness = profile.effectiveStiffness;
  const elastic =
    limit * (1 - Math.exp(-F / Math.max(0.001, stiffness * limit)));
  const drive =
    profile.materialClass === "retarded-compressible-solid" ||
    profile.materialClass === "granular-filled-solid"
      ? F
      : Math.max(0, F - profile.yieldStress * area);
  const resistance =
    profile.creepStiffness +
    (profile.buoyancyMode === "displaced-contact-volume"
      ? profile.effectiveBuoyancy * profile.density * 9.81 * submergedArea
      : 0);
  const creep = profile.creepRate
    ? clamp(drive / resistance, 0, Math.max(0, limit - elastic))
    : 0;
  out.elastic = elastic;
  out.creep = creep;
  out.limit = limit;
  out.resistance = resistance;
  return out;
}
export function createDynamicContactState() {
  return {
    contactStartTime: 0,
    contactDuration: 0,
    accumulatedCreep: 0,
    accumulatedPlasticStrain: 0,
    equilibriumDepth: 0,
    sinkVelocity: 0,
    impactImpulse: 0,
    pendingImpactImpulse: 0,
    impactEvents: 0,
    impactOffset: 0,
    impactVelocity: 0,
  };
}
