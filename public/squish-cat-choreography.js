const smooth = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
const sequences = {
  butter: [
    ["PawPress", 2],
    ["DoublePawPress", 2],
    ["SoftKnead", 3],
    ["AlternatingKnead", 4],
    ["SquishTwist", 3],
    ["ButterCrackReaction", 1],
    ["PawShake", 1],
    ["RelaxedSquishRest", 2],
  ],
  slime: [
    ["PawPress", 1],
    ["SlimePull", 2],
    ["SlimeStretch", 3],
    ["SlimeFold", 2],
    ["SquishTwist", 3],
    ["SlimeRelease", 1],
    ["SlimeStickyPaw", 1.5],
    ["PawShake", 1.5],
  ],
  jelly: [
    ["JellyBounce", 2],
    ["HappyBounce", 2],
    ["AlternatingKnead", 4],
    ["SquishTwist", 2],
    ["RelaxedSquishRest", 3],
  ],
  cloud: [
    ["FoamSink", 3],
    ["SquishSit", 2],
    ["SquishLieDown", 2],
    ["RelaxedSquishRest", 5],
    ["SquishRoll", 2],
    ["SoftKnead", 2],
  ],
  foam: [
    ["FoamSink", 3],
    ["PawPress", 2],
    ["DoublePawPress", 2],
    ["SquishSit", 2],
    ["SquishLieDown", 2],
    ["RelaxedSquishRest", 4],
  ],
  crunchy: [
    ["PawPress", 2],
    ["DoublePawPress", 2],
    ["AlternatingKnead", 3],
    ["SquishTwist", 2],
    ["ButterCrackReaction", 1],
    ["RelaxedSquishRest", 2],
  ],
  mochi: [
    ["SlimeStretch", 2],
    ["SquishTwist", 3],
    ["SlimeFold", 2],
    ["SlimeRelease", 1],
    ["AlternatingKnead", 3],
    ["RelaxedSquishRest", 2],
  ],
  giant: [
    ["JellyBounce", 2],
    ["DoublePawPress", 2],
    ["SquishRoll", 3],
    ["SquishSit", 2],
    ["RelaxedSquishRest", 3],
  ],
};
export const SQUISH_CAT_STATES = Object.freeze([
  "SquishInspect",
  "SquishApproach",
  "SquishJump",
  ...new Set(
    Object.values(sequences)
      .flat()
      .map((s) => s[0]),
  ),
]);
export function squishCatActing(material, elapsed, reduced = false) {
  const seq = sequences[material] || sequences.jelly;
  let start = 0;
  for (const [state, duration] of seq) {
    if (elapsed < start + duration) {
      const age = Math.max(0, elapsed - start),
        u = age / duration,
        blend = smooth(age / 0.22) * smooth((duration - age) / 0.25),
        reaction = {
          ride: true,
          crouch: 0.06,
          eyeClose: 0.12,
          earRelax: -0.04,
          headPitch: 0.05,
          tailSway: reduced ? 0 : Math.sin(elapsed * 2) * 0.06,
        };
      if (["FoamSink", "SquishSit"].includes(state)) {
        reaction.rideSit = 0.6 * blend;
        reaction.crouch = 0.12;
        reaction.eyeClose = 0.35;
      }
      if (
        ["SquishLieDown", "RelaxedSquishRest", "SquishRoll"].includes(state)
      ) {
        reaction.waterProne =
          (state === "RelaxedSquishRest" && ["cloud", "foam"].includes(material)
            ? 0.8
            : 0.6) * blend;
        reaction.eyeClose = 0.75 * blend;
        reaction.earRelax = 0.12;
        if (state === "SquishRoll" && !reduced)
          reaction.bodyLean = Math.sin(u * Math.PI * 2) * 0.16 * blend;
      }
      if (state === "ButterCrackReaction") {
        reaction.headPitch = -0.16 * blend;
        reaction.earRelax = 0.1 * blend;
        reaction.eyeClose = 0.7 * Math.max(0, 1 - age / 0.18);
      }
      if (state === "PawShake") {
        reaction.frontLift = 0.2 * blend;
        reaction.headRoll = reduced ? 0 : Math.sin(age * 22) * 0.06 * blend;
      }
      if (state.startsWith("Slime")) {
        reaction.headPitch = 0.12 * blend;
        reaction.frontLift = (state === "SlimeStickyPaw" ? 0.12 : 0.03) * blend;
      }
      return {
        state,
        age,
        blend,
        reaction,
        done: false,
        bounce: ["JellyBounce", "HappyBounce"].includes(state),
        bodyContact: [
          "FoamSink",
          "SquishSit",
          "SquishLieDown",
          "RelaxedSquishRest",
          "SquishRoll",
        ].includes(state),
      };
    }
    start += duration;
  }
  return {
    state: "RelaxedSquishRest",
    age: 0,
    blend: 0,
    reaction: { ride: true },
    done: true,
    bounce: false,
    bodyContact: false,
  };
}
