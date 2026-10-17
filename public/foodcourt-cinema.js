import * as THREE from "three";
import { CINEMA_PLAYLIST } from "./cinema-playlist.js";
export function createCourtCinema(container) {
  const video = document.createElement("video");
  video.playsInline = true;
  video.loop = true;
  video.preload = "metadata";
  video.crossOrigin = "anonymous";
  // Playback starts only from an explicit tap, including on mobile Safari.
  const controls = document.createElement("div");
  controls.className = "court-cinema-controls";
  controls.hidden = true;
  const message = document.createElement("span"),
    play = document.createElement("button"),
    choose = document.createElement("button"),
    input = document.createElement("input");
  play.className = choose.className = "soft";
  play.textContent = "▶ Смотреть";
  choose.textContent = "Выбрать видео";
  input.type = "file";
  input.accept = "video/mp4,video/webm,video/quicktime";
  input.hidden = true;
  controls.append(message, play, choose, input);
  container.append(controls);
  let texture = null,
    surface = null,
    blob = null,
    hasSource = false;
  function status() {
    play.textContent = video.paused ? "▶ Смотреть" : "Ⅱ Пауза";
    play.disabled = !hasSource;
  }
  function load(src, title = "Мультфильм") {
    video.pause();
    if (blob) {
      URL.revokeObjectURL(blob);
      blob = null;
    }
    video.src = src;
    hasSource = true;
    message.textContent = title;
    if (!texture) {
      texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
    }
    if (surface) {
      surface.material.map = texture;
      surface.material.color.set(0xffffff);
      surface.material.needsUpdate = true;
    }
    status();
  }
  play.onclick = async () => {
    if (!video.paused) video.pause();
    else
      try {
        await video.play();
      } catch {
        message.textContent = "Нажмите ещё раз, чтобы включить видео.";
      }
    status();
  };
  choose.onclick = () => input.click();
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    load(url, file.name);
    blob = url;
    play.click();
  };
  video.addEventListener("play", status);
  video.addEventListener("pause", status);
  video.addEventListener("error", () => {
    message.textContent = "Не удалось открыть это видео. Выберите другой файл.";
  });
  if (CINEMA_PLAYLIST.length)
    load(
      new URL(CINEMA_PLAYLIST[0].src, document.baseURI).href,
      CINEMA_PLAYLIST[0].title,
    );
  else
    message.textContent =
      "Мультфильм ещё не добавлен. Можно выбрать своё видео.";
  status();
  return {
    video,
    controls,
    load,
    setSurface(mesh) {
      surface = mesh;
      if (surface && texture) {
        surface.material.map = texture;
        surface.material.color.set(0xffffff);
        surface.material.needsUpdate = true;
      }
    },
    show(value) {
      controls.hidden = !value;
      if (!value) video.pause();
    },
    pause: () => video.pause(),
    dispose() {
      video.pause();
      video.removeAttribute("src");
      video.load();
      texture?.dispose();
      if (blob) URL.revokeObjectURL(blob);
      controls.remove();
    },
  };
}
