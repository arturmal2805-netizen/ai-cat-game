import { CHICHI_PORTRAITS } from "./cat-portrait-manifest.js";
import { catPortraits } from "./cat-portraits.js";
import { sexSymbol, sexLabel } from "./cat-sex.js";
export function catSexBadge(cat) {
  const badge = document.createElement("span");
  badge.className = "cat-sex";
  badge.textContent = sexSymbol(cat);
  badge.setAttribute("aria-label", sexLabel(cat));
  badge.title = sexLabel(cat);
  return badge;
}
export function catProfileCard(
  profile,
  { onSelect = null, subtitle = "" } = {},
) {
  const card = document.createElement(onSelect ? "button" : "article");
  card.className = "cat-profile-card";
  if (onSelect) {
    card.type = "button";
    card.onclick = () => onSelect(profile.id);
  }
  const photo = document.createElement("div");
  photo.className = "cat-profile-photo";
  const image = document.createElement("img");
  image.src = catPortraits.get(profile.id) || CHICHI_PORTRAITS.happy;
  image.alt = profile.name;
  image.loading = "eager";
  image.decoding = "async";
  photo.append(image, catSexBadge(profile));
  const name = document.createElement("strong");
  name.textContent = profile.name;
  card.append(photo, name);
  if (subtitle) {
    const detail = document.createElement("small");
    detail.textContent = subtitle;
    card.append(detail);
  }
  return card;
}
