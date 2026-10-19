import {
  JOB_BUSINESSES,
  JOB_CARS,
  jobBusiness,
  jobCar,
} from "./jobcity-data.js";
import { cityClock, catProducts } from "./jobcity-system.js";
const money = (n) => new Intl.NumberFormat("uk-UA").format(n || 0);
const text = (tag, value, className) => {
  const e = document.createElement(tag);
  e.textContent = value;
  if (className) e.className = className;
  return e;
};
export function createJobCityUI({
  getGame,
  buy,
  drive,
  view,
  follow,
  onError = () => {},
}) {
  const dialog = document.createElement("dialog");
  dialog.id = "jobcity-dialog";
  dialog.className = "shop-dialog jobcity-dialog";
  document.body.append(dialog);
  const close = text("button", "×", "close");
  close.setAttribute("aria-label", "Закрити Cat Job City");
  close.onclick = () => dialog.close();
  dialog.append(
    close,
    text("p", "CAT JOB CITY", "eyebrow"),
    text("h2", "Професії та монетки котиків"),
  );
  const clock = text("p", "", "dialog-copy");
  dialog.append(clock);
  const selects = document.createElement("select");
  selects.id = "jobcity-cat";
  selects.setAttribute("aria-label", "Вибрати котика");
  dialog.append(selects);
  const body = document.createElement("div");
  body.className = "jobcity-profile";
  dialog.append(body);
  let selected = "chichi",
    business = null,
    productCategory = "cars",
    lastKey = "";
  selects.onchange = () => {
    selected = selects.value;
    render();
  };
  function action(label, fn, disabled = false) {
    const b = text("button", label, "small-button");
    b.disabled = disabled;
    b.onclick = () => {
      try {
        fn();
        render();
      } catch (e) {
        onError(e.message);
      }
    };
    return b;
  }
  function render() {
    if (!dialog.open) return;
    const game = getGame(),
      state = game.jobCity;
    if (!state) {
      body.replaceChildren();
      clock.textContent =
        "Відкрийте Cat Job City в магазині островів, щоб котики обрали професії та заробляли власні монетки.";
      selects.hidden = true;
      return;
    }
    selects.hidden = false;
    const cats = Object.values(state.profiles);
    if (!state.profiles[selected]) selected = cats[0]?.id;
    if (selects.options.length !== cats.length) {
      selects.replaceChildren(
        ...cats.map((p) => {
          const o = document.createElement("option");
          o.value = p.id;
          o.textContent = p.name;
          return o;
        }),
      );
    }
    selects.value = selected;
    const p = state.profiles[selected],
      c = cityClock(state);
    clock.textContent = `День ${c.day + 1} · ${c.label} · робочі години 12:00–19:00 · план: ${state.plan?.source === "ai" ? "Cloudflare AI" : state.plan?.source === "pending" ? "місцевий, AI обирає" : "місцевий"}`;
    const key = JSON.stringify([selected, p, state.plan?.source]);
    if (key === lastKey) return;
    lastKey = key;
    body.replaceChildren();
    const title = text(
      "h3",
      p.name + " · " + (jobBusiness(p.profession)?.name || "Обирає професію"),
    );
    body.append(title);
    const balances = text(
      "p",
      `${money(p.coins)} 🐾 власних монеток · зароблено ${money(p.earnedTotal)} · витрачено ${money(p.spentTotal)}`,
      "jobcity-balance",
    );
    body.append(balances);
    body.append(
      text(
        "p",
        `${p.personality} · ${p.professionReason || "Знайомиться зі своїми здібностями"} · змін професії ${p.professionChanges}/3`,
      ),
    );
    body.append(
      text(
        "p",
        p.schedule?.job && p.schedule.job !== "rest"
          ? `Сьогодні: ${jobBusiness(p.schedule.job).name} · ${jobBusiness(p.schedule.job).wage} 🐾/ігрову годину · оплата о 19:00 за фактично відпрацьований час`
          : "Сьогодні відпочиває; професія залишається з котиком.",
      ),
    );
    const controls = document.createElement("div");
    controls.className = "jobcity-actions";
    controls.append(
      action("📷 Знайти котика", () => {
        dialog.close();
        follow(p.id);
      }),
      action("🏙️ Подивитися місто", () => {
        dialog.close();
        view(business);
      }),
    );
    body.append(controls);
    const skills = document.createElement("div");
    skills.className = "jobcity-skills";
    for (const b of JOB_BUSINESSES)
      skills.append(text("span", `${b.icon} ${b.name}: ${p.skills[b.kind]}`));
    body.append(skills);
    body.append(text("h3", "Власний інвентар"));
    const inventory = document.createElement("div");
    inventory.className = "jobcity-inventory";
    for (const [id, count] of Object.entries(p.inventory)) {
      const product = catProducts(game).find((x) => x.id === id);
      if (!product) continue;
      const row = text(
        "div",
        `${product.icon} ${product.name} ×${count}`,
        "jobcity-item",
      );
      if (jobCar(id))
        row.append(
          action("🚗 Вибрати машину й точку", () => {
            dialog.close();
            drive(p.id, id);
          }),
        );
      inventory.append(row);
    }
    if (!inventory.children.length)
      inventory.append(text("p", "Перші покупки ще попереду."));
    body.append(inventory);
    body.append(text("h3", "Покупки за монетки цього котика"));
    const products = document.createElement("div");
    products.className = "jobcity-products";
    const filter = document.createElement("select");
    filter.setAttribute("aria-label", "Категорія покупки");
    for (const [v, n] of [
      ["cars", "Машинки"],
      ["comfort", "Меблі"],
      ["toys", "Іграшки"],
      ["rides", "Атракціони"],
      ["business", "Бізнеси"],
    ]) {
      const o = text("option", n);
      o.value = v;
      filter.append(o);
    }
    filter.value = productCategory;
    body.append(filter, products);
    const showProducts = () => {
      products.replaceChildren();
      for (const product of catProducts(game).filter(
        (x) => x.category === filter.value,
      )) {
        const row = document.createElement("div");
        row.className = "jobcity-item";
        row.append(
          text(
            "span",
            `${product.icon} ${product.name} · ${money(product.price)} 🐾`,
          ),
          action(
            "Купити",
            () => buy(p.id, product.id),
            p.coins < product.price,
          ),
        );
        products.append(row);
      }
    };
    filter.onchange = () => {
      productCategory = filter.value;
      showProducts();
    };
    showProducts();
    body.append(text("h3", "Історія доходів і витрат"));
    for (const t of [...p.transactions].reverse())
      body.append(
        text(
          "p",
          `${t.amount > 0 ? "+" : ""}${money(t.amount)} 🐾 · ${t.kind === "wage" ? "Зміна: " + jobBusiness(t.job)?.name : catProducts(game).find((x) => x.id === t.item)?.name || "Покупка"}`,
          "jobcity-history",
        ),
      );
    body.append(text("h3", "Кар’єра"));
    for (const h of p.career)
      body.append(
        text(
          "p",
          `День ${h.day + 1} · ${jobBusiness(h.job)?.name} · ${h.reason}`,
        ),
      );
  }
  return {
    dialog,
    render,
    open(id = null) {
      business = id;
      lastKey = "";
      for (const d of document.querySelectorAll("dialog[open]")) d.close();
      dialog.showModal();
      render();
    },
    destroy() {
      dialog.remove();
    },
  };
}
