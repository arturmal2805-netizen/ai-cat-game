// Original short animations starring SpongeBob, rendered by
// scripts/render-cinema.py. These are new mini-stories, not TV episode excerpts.
export const CINEMA_PLAYLIST = [
  {
    id: "bubbles",
    title: "Губка Боб · Пузырь для Гэри",
    src: "./media/cinema/sponge-bubbles.mp4",
    duration: 18,
    cues: [
      { at: 4, emotion: "curious" },
      { at: 10, emotion: "curious" },
      { at: 13, emotion: "delighted", surprise: 0.65 },
    ],
  },
  {
    id: "burger",
    title: "Губка Боб · Большой крабсбургер",
    src: "./media/cinema/sponge-burger.mp4",
    duration: 20,
    cues: [
      { at: 6, emotion: "curious" },
      { at: 11, emotion: "curious", surprise: 0.75 },
      { at: 14, emotion: "delighted", surprise: 0.3 },
    ],
  },
  {
    id: "jellyfish",
    title: "Губка Боб · Танец медуз",
    src: "./media/cinema/sponge-jellyfish.mp4",
    duration: 18,
    cues: [
      { at: 2, emotion: "curious" },
      { at: 7, emotion: "delighted" },
      { at: 13, emotion: "delighted", surprise: 0.25 },
    ],
  },
];

// Audience updates never override an explicit pause.
export function cinemaShouldPlay({ source, visible, audience, open, paused }) {
  return !!(source && visible && (audience > 0 || open) && !paused);
}

export function cinemaReaction(playback, seatIndex = 0) {
  const t = playback?.time || 0,
    stagger = seatIndex * 0.12,
    reaction = {
      headPitch: -0.1,
      crouch: 0.09,
      earRelax: -0.04,
      headRoll: 0,
      tailSway: 0,
    };
  if (!playback?.playing) return reaction;
  reaction.headPitch += Math.sin(t * 1.8 + stagger) * 0.018;
  reaction.headRoll = Math.sin(t * 0.85 + stagger) * 0.045;
  reaction.tailSway = Math.sin(t * 2 + stagger) * 0.07;
  const cues = playback.clip?.cues || [];
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i],
      age = t - cue.at - stagger;
    if (age < 0 || age > 2.5) continue;
    const envelope = Math.sin((Math.PI * age) / 2.5) ** 2;
    reaction.surprise = envelope * (cue.surprise || 0);
    reaction.paw = cue.emotion === "delighted" ? envelope * 0.2 : 0;
    reaction.headRoll += envelope * 0.1 * (seatIndex % 2 ? -1 : 1);
    reaction.emotion = cue.emotion;
    reaction.cue = `${playback.sequence}:${playback.clip?.id}:${i}`;
    break;
  }
  return reaction;
}
