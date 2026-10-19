import { NEIGHBORS, byBiome } from "./game-data.js";
import { catAvailable } from "./cat-roster.js";
import { relationshipStage, stageLabel } from "./social-system.js";
import { catSexBadge } from "./cat-card-ui.js";

const text = (node, value) => {
  if (node.textContent !== String(value)) node.textContent = value;
};
function element(tag, className = "", value = "") {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = value;
  return node;
}
function nameNode(n) {
  const node = element("h3");
  const label = document.createTextNode(n.name);
  node.append(label, catSexBadge(n));
  return { node, label };
}

// Earnings and autosave commits do not replace hundreds of unchanged DOM
// nodes below the canvas. Retain focus/scroll and update only visible values.
export function createFriendCards(neighbors, list, onOpen) {
  const records = new Map();
  return (game) => {
    const available = new Set();
    let previousRow = null,
      previousCard = null;
    for (const n of NEIGHBORS) {
      const unlocked = catAvailable(game, n);
      if ((n.adoption || n.venue) && !unlocked) continue;
      available.add(n.id);
      let v = records.get(n.id);
      if (!v) {
        const row = element("div", "friend-list-row");
        row.dataset.friend = n.id;
        const face = element("span", "neighbor-face");
        face.style.setProperty(
          "--tint",
          "#" + n.color.toString(16).padStart(6, "0") + "44",
        );
        const content = element("div"),
          name = nameNode(n);
        const description = element("p"),
          meter = element("div", "friend-meter");
        const fill = element("i"),
          history = element("p", "friend-history");
        meter.append(fill);
        content.append(name.node, description, meter, history);
        const wellbeing = element("div", "neighbor-needs"),
          needs = [];
        for (const [key, label] of [
          ["hunger", "Голод"],
          ["happiness", "Счастье"],
        ]) {
          const line = element("label"),
            caption = document.createTextNode("");
          const progress = element("progress", "neighbor-" + key);
          progress.max = 100;
          progress.setAttribute("aria-label", n.name + " · " + label);
          line.append(caption, progress);
          wellbeing.append(line);
          needs.push({ key, label, caption, progress });
        }
        content.append(wellbeing);
        row.append(face, content);
        list.append(row);
        v = { row, face, name, description, fill, history, wellbeing, needs };
        records.set(n.id, v);
      }
      if (unlocked && !v.card) {
        const card = element("button", "neighbor");
        card.setAttribute("aria-label", "Дружба с " + n.name);
        const face = v.face.cloneNode(true),
          content = element("div"),
          name = nameNode(n);
        const stage = element("p"),
          meter = element("div", "friend-meter"),
          fill = element("i");
        meter.append(fill);
        content.append(name.node, stage, meter);
        card.append(face, content);
        card.onclick = onOpen;
        neighbors.append(card);
        Object.assign(v, {
          card,
          cardFace: face,
          cardStage: stage,
          cardFill: fill,
        });
      } else if (!unlocked && v.card) {
        v.card.remove();
        v.card = null;
      }
      const nextRow = previousRow ? previousRow.nextSibling : list.firstChild;
      if (nextRow !== v.row) list.insertBefore(v.row, nextRow);
      previousRow = v.row;
      if (v.card) {
        const nextCard = previousCard
          ? previousCard.nextSibling
          : neighbors.firstChild;
        if (nextCard !== v.card) neighbors.insertBefore(v.card, nextCard);
        previousCard = v.card;
      }
      const r = game.social.relationships[n.id],
        stage = relationshipStage(r, n.id === game.social.bestFriendId),
        icon = stage === "best" ? "💞" : n.hat ? "🐱" : "🐈";
      v.row.classList.toggle("locked", !unlocked);
      text(v.face, icon);
      const name = r.meetings ? n.name : "Незнакомый котик · " + n.name;
      if (v.name.label.data !== name) v.name.label.data = name;
      text(
        v.description,
        unlocked
          ? n.personality + " · " + stageLabel(stage)
          : "Откройте " + byBiome(n.biome).name,
      );
      const width = r.points + "%";
      if (v.fill.style.width !== width) v.fill.style.width = width;
      text(
        v.history,
        r.meetings
          ? r.meetings +
              " встреч · " +
              r.plays +
              " игр · доверие " +
              r.points +
              "/100"
          : "Начните с настоящей встречи на карте.",
      );
      v.wellbeing.hidden = !unlocked;
      if (unlocked) {
        const needs = game.care.residents[n.id];
        for (const p of v.needs) {
          const value = needs[p.key],
            caption =
              (p.key === "hunger" ? "🥣 " : "💛 ") +
              p.label +
              " " +
              Math.round(value) +
              "%";
          if (p.caption.data !== caption) p.caption.data = caption;
          if (p.progress.value !== value) p.progress.value = value;
        }
        text(v.cardFace, icon);
        text(v.cardStage, stageLabel(stage));
        if (v.cardFill.style.width !== width) v.cardFill.style.width = width;
      }
    }
    for (const [id, v] of records)
      if (!available.has(id)) {
        v.row.remove();
        v.card?.remove();
        records.delete(id);
      }
  };
}
