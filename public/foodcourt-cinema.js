import * as THREE from "three";
import { CINEMA_PLAYLIST, cinemaShouldPlay } from "./cinema-playlist.js";
export function createCourtCinema(container) {
  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;
  video.preload = "metadata";
  video.crossOrigin = "anonymous";
  video.setAttribute("playsinline", "");
  const controls = document.createElement("div");
  controls.className = "court-cinema-controls";
  controls.hidden = true;
  const message = document.createElement("span"),
    income = document.createElement("span"),
    play = document.createElement("button"),
    next = document.createElement("button"),
    sound = document.createElement("button"),
    choose = document.createElement("button"),
    input = document.createElement("input");
  for (const b of [play, next, sound, choose]) b.className = "soft";
  play.textContent = "▶ Смотреть";
  next.textContent = "Следующий ▶";
  sound.textContent = "🔇 Звук";
  sound.setAttribute("aria-label", "Включить звук кинотеатра");
  choose.textContent = "Своё видео";
  income.className = "court-cinema-income";
  input.type = "file";
  input.accept = "video/mp4,video/webm,video/quicktime";
  input.hidden = true;
  controls.append(message, income, play, next, sound, choose, input);
  container.append(controls);
  let texture = null,
    surface = null,
    blob = null,
    hasSource = false,
    index = 0,
    sequence = 0,
    clip = null,
    audience = 0,
    visible = true,
    open = false,
    userPaused = false,
    pending = false,
    disposed = false,
    blocked = false;
  function status() {
    play.textContent = video.paused ? "▶ Смотреть" : "Ⅱ Пауза";
    play.disabled = !hasSource;
    next.disabled = !CINEMA_PLAYLIST.length;
    sound.textContent = video.muted ? "🔇 Звук" : "🔊 Звук";
    sound.setAttribute(
      "aria-label",
      video.muted ? "Включить звук кинотеатра" : "Выключить звук кинотеатра",
    );
    message.textContent = `${clip?.title || "Мультфильм"}${audience ? ` · Зрителей: ${audience}` : ""}`;
  }
  function attach() {
    if (!surface || !texture) return;
    surface.material.map = texture;
    surface.material.color.set(0xffffff);
    surface.material.needsUpdate = true;
  }
  function load(src, title = "Мультфильм", entry = null) {
    video.pause();
    if (blob) {
      URL.revokeObjectURL(blob);
      blob = null;
    }
    video.src = src;
    video.loop = !entry;
    clip = entry || { id: "local", title, cues: [] };
    hasSource = true;
    blocked = false;
    sequence++;
    if (!texture) {
      texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
    }
    attach();
    status();
  }
  function select(i) {
    index = (i + CINEMA_PLAYLIST.length) % CINEMA_PLAYLIST.length;
    const entry = CINEMA_PLAYLIST[index];
    if (entry)
      load(new URL(entry.src, document.baseURI).href, entry.title, entry);
  }
  async function reconcile() {
    const wants = cinemaShouldPlay({
      source: hasSource,
      visible,
      audience,
      open,
      paused: userPaused,
    });
    if (!wants) {
      if (!video.paused) video.pause();
      return;
    }
    if (!video.paused || pending || blocked || disposed) return;
    pending = true;
    try {
      await video.play();
    } catch (e) {
      // Source switches/backgrounding can legitimately cancel a pending play.
      if (e.name !== "AbortError") blocked = true;
    } finally {
      pending = false;
      if (
        !cinemaShouldPlay({
          source: hasSource,
          visible,
          audience,
          open,
          paused: userPaused,
        })
      )
        video.pause();
      status();
    }
  }
  play.onclick = () => {
    userPaused = !video.paused;
    blocked = false;
    reconcile();
  };
  next.onclick = () => {
    select(index + 1);
    userPaused = false;
    reconcile();
  };
  sound.onclick = () => {
    video.muted = !video.muted;
    blocked = false;
    status();
    reconcile();
  };
  choose.onclick = () => input.click();
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    load(url, file.name);
    blob = url;
    userPaused = false;
    reconcile();
  };
  video.addEventListener("play", status);
  video.addEventListener("pause", status);
  video.addEventListener("ended", () => {
    if (clip?.id !== "local") select(index + 1);
    reconcile();
  });
  video.addEventListener("loadeddata", () => {
    blocked = false;
    reconcile();
  });
  video.addEventListener("error", () => {
    blocked = true;
    message.textContent = "Не удалось открыть видео. Выберите следующий ролик.";
  });
  status();
  return {
    video,
    controls,
    load,
    get playback() {
      return {
        playing: !video.paused && !video.ended && video.readyState >= 2,
        time: video.currentTime,
        duration: video.duration,
        clip,
        sequence,
      };
    },
    setSurface(mesh) {
      surface = mesh;
      if (!hasSource && CINEMA_PLAYLIST.length) select(0);
      attach();
    },
    show(value) {
      controls.hidden = !value;
      open = value;
      if (value && !hasSource && CINEMA_PLAYLIST.length) select(0);
      reconcile();
    },
    update({ viewers = 0, active = true, coins = 480, xp = 182 } = {}) {
      if (audience !== viewers) {
        audience = viewers;
        status();
      }
      const line = `Кинотеатр · ${coins} монет + ${xp} XP/ч · сбор над зданием`;
      if (income.textContent !== line) income.textContent = line;
      visible = active;
      reconcile();
    },
    pause() {
      visible = false;
      video.pause();
    },
    dispose() {
      disposed = true;
      video.pause();
      video.removeAttribute("src");
      video.load();
      texture?.dispose();
      if (blob) URL.revokeObjectURL(blob);
      controls.remove();
    },
  };
}
