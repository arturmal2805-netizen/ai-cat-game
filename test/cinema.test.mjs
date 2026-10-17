import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CINEMA_PLAYLIST,
  cinemaShouldPlay,
  cinemaReaction,
} from "../public/cinema-playlist.js";
import { createCourtRuntime } from "../public/foodcourt-runtime.js";
import { courtObject } from "../public/foodcourt-data.js";
import { newGame, unlockBiome, loadGame, saveGame } from "../public/economy.js";
import {
  collectIncome,
  incomeFor,
  upgradeBusiness,
} from "../public/business.js";
import { xpForLevel } from "../public/progression.js";
import { mergeSharedWorld } from "../shared-world.mjs";
import {
  createCat,
  animateCat,
  emoteCat,
  disposeCat,
} from "../public/cat-model.js";

test("a cinema NPC's existing face rig animates requested expressions and restores its approved resting face", () => {
  const cat = createCat("happy", {
      detail: "npc",
      breed: "tabby",
      color: 0xba9f84,
    }),
    d = cat.userData;
  assert.equal(d.reference, false);
  const geometries = new Set();
  cat.traverse((o) => {
    if (o.isMesh) geometries.add(o.geometry);
  });
  animateCat(cat, 0);
  emoteCat(cat, "delighted", { crowd: true });
  animateCat(cat, 1);
  animateCat(cat, 2.4);
  assert.equal(d.expression.name, "delighted");
  assert.ok(d.expressionFrame.blep > 0.9);
  assert.ok(d.expressionFrame.eyes < 1);
  animateCat(cat, 4);
  assert.equal(d.expression, null);
  assert.equal(d.expressionFrame.eyes, 1);
  assert.equal(d.expressionFrame.blep, 0);
  cat.traverse((o) => {
    if (o.isMesh) assert.ok(geometries.has(o.geometry));
  });
  disposeCat(cat);
});

test("three real compact MP4 shorts are shipped, with independent story cues", () => {
  assert.equal(CINEMA_PLAYLIST.length, 3);
  const files = new Set();
  let total = 0;
  for (const entry of CINEMA_PLAYLIST) {
    assert.ok(entry.title.includes("Губка Боб"));
    const data = fs.readFileSync(
      new URL(`../public/${entry.src}`, import.meta.url),
    );
    assert.equal(data.subarray(4, 8).toString(), "ftyp");
    assert.ok(data.includes(Buffer.from("moov")));
    assert.ok(
      data.indexOf("moov") < data.indexOf("mdat"),
      "mobile fast-start metadata comes before frames",
    );
    assert.ok(data.length > 100000);
    assert.ok(entry.duration >= 18);
    assert.ok(entry.cues.every((cue) => cue.at < entry.duration && cue.at > 0));
    files.add(entry.src);
    total += data.length;
  }
  assert.equal(files.size, 3);
  assert.ok(total < 3 * 1024 * 1024);
});

test("a seated audience starts playback outside the interior camera; user pause, hidden page and empty cinema stop it", () => {
  const s = {
    source: true,
    visible: true,
    audience: 2,
    open: false,
    paused: false,
  };
  assert.equal(cinemaShouldPlay(s), true);
  for (const patch of [
    { source: false },
    { visible: false },
    { paused: true },
    { audience: 0 },
  ])
    assert.equal(cinemaShouldPlay({ ...s, ...patch }), false);
  assert.equal(cinemaShouldPlay({ ...s, audience: 0, open: true }), true);
});

test("cat reactions follow the actual story, stagger by seat, and stop when paused", () => {
  const playback = {
    playing: true,
    time: 14.25,
    sequence: 3,
    clip: CINEMA_PLAYLIST[0],
  };
  const a = cinemaReaction(playback, 0),
    b = cinemaReaction(playback, 4);
  assert.equal(a.emotion, "delighted");
  assert.ok(a.surprise > 0.6 && a.paw > 0.15);
  assert.notEqual(a.headRoll, b.headRoll);
  assert.notEqual(a.paw, b.paw);
  assert.equal(
    cinemaReaction({ ...playback, playing: false }).emotion,
    undefined,
  );
  assert.equal(cinemaReaction({ ...playback, time: 17 }).cue, undefined);
});

test("cinema viewers face the real screen, reserve separate poufs and count only decoded playback", () => {
  let playing = false;
  const done = [],
    r = createCourtRuntime({
      getCinema: () => ({
        playing,
        time: 14.25,
        sequence: 1,
        clip: CINEMA_PLAYLIST[0],
      }),
      onComplete: (v) => done.push(v),
    });
  const o = courtObject("court-cinema");
  const v = r.start({
    catId: "chichi",
    objectId: o.id,
    position: { x: -12, z: 28 },
  });
  assert.ok(v);
  for (let i = 0; i < 3000 && v.phase !== "consume"; i++)
    r.step(1 / 30, i / 30);
  assert.equal(v.phase, "consume");
  const other = r.start({
    catId: "friend",
    objectId: o.id,
    position: { x: -8, z: 28 },
  });
  assert.ok(other);
  assert.notEqual(v.seatIndex, other.seatIndex);
  for (let i = 0; i < 1200; i++) r.step(1 / 30, i / 30);
  assert.equal(v.watched, 0);
  assert.equal(v.phase, "consume");
  assert.equal(v.reaction.emotion, undefined);
  assert.equal(v.yaw, Math.atan2(o.x - v.seat.x, o.z - 6.15 - v.seat.z));
  playing = true;
  r.step(1 / 30, 42);
  assert.equal(v.reaction.emotion, "delighted");
  for (let i = 0; i < 3000 && r.visits.size; i++) r.step(1 / 30, i / 30);
  assert.equal(done.length, 2);
  assert.equal(r.visits.size, 0);
});

test("cinema earns 480 ordinary coins and 182 XP hourly, survives reload and shared collection, and upgrades both rates", () => {
  const now = Date.UTC(2026, 9, 17);
  let g = newGame(now);
  g.coins = 20000;
  g.progression.xp = xpForLevel(6);
  g = unlockBiome(g, "foodcourt", now);
  assert.equal(incomeFor(g, "court-cinema", now + 3600000), 480);
  const result = collectIncome(g, "court-cinema", now + 3600000);
  assert.equal(result.amount, 480);
  assert.equal(result.xp, 182);
  assert.equal(incomeFor(result.game, "court-cinema", now + 3600000), 0);
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
      removeItem: (k) => data.delete(k),
    };
  saveGame(storage, result.game);
  const restored = loadGame(storage, now + 3600000, { advance: false });
  assert.equal(restored.coins, result.game.coins);
  assert.equal(restored.progression.xp, result.game.progression.xp);
  assert.equal(incomeFor(restored, "court-cinema", now + 3600000), 0);
  assert.throws(
    () => collectIncome(restored, "court-cinema", now + 3600000),
    /копятся/,
  );
  assert.throws(
    () => mergeSharedWorld(g, result.game, result.game),
    (e) => e.code === "SHARED_CONFLICT",
  );
  const upgraded = upgradeBusiness(
    result.game,
    "court-cinema",
    now + 3600000,
  ).game;
  const second = collectIncome(upgraded, "court-cinema", now + 7200000);
  assert.ok(second.amount > result.amount);
  assert.ok(second.xp > result.xp);
});
