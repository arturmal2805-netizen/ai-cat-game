import {richestCats} from "./cat-wealth.js";
import {createInvestmentsPanel} from "./crypto-ui.js";
import { cityAIFamilyMessage, cityAIHousingMessage } from "./city-ai-schedule.js";
import { catProfileCard } from "./cat-card-ui.js";
import { leisureOffers } from "./leisure-data.js";
import {
  familyCalendar,
  familyReview,
  familyPartner,
} from "./family-system.js";
import { ownedHomes, availableRoommates } from "./housing-system.js";
import { houseType } from "./housing-data.js";
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
  getAIStatus = () => null,
  buy,
  drive,
  view,
  follow,
  buyHome,
  viewHome,
  liveHome,
  roommate: updateRoommate,
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
    text("p", "ЇХНІ МАЛЕНЬКІ ІСТОРІЇ", "eyebrow"),
    text("h2", "Життя та монетки котиків"),
  );
  const clock = text("p", "", "dialog-copy");
  dialog.append(clock);
  const wealth=document.createElement('section');
  wealth.className='cat-wealth';wealth.setAttribute('aria-label','Три найбагатші котики');
  dialog.append(wealth);
  let wealthKey='';
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
    lastKey = "",
    propertyLimit = 20,
    investmentsPanel=null;
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
      wealth.hidden=true;
      return;
    }
    selects.hidden = false;wealth.hidden=false;
    const leaders=richestCats(state),ranking=JSON.stringify(leaders.map(p=>[p.id,p.name,p.coins]));
    if(ranking!==wealthKey){
      wealthKey=ranking;
      const podium=document.createElement('div');podium.className='cat-wealth-podium';
      for(const [rank,cat] of leaders.entries()){
        const card=catProfileCard(cat,{subtitle:['🥇','🥈','🥉'][rank]+' '+money(cat.coins)+' 🐾',onSelect:id=>{selected=id;lastKey='';render();}});
        card.classList.add('cat-wealth-card','cat-wealth-rank-'+rank);
        card.setAttribute('aria-label',`${rank+1} місце · ${cat.name} · ${money(cat.coins)} власних монеток`);
        podium.append(card);
      }
      wealth.replaceChildren(text('h3','Найбагатші котики ✨'),text('p','Їхні власні зароблені монетки','dialog-copy'),podium);
    }
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
    for (const option of selects.options)
      option.textContent = state.profiles[option.value]?.name || option.value;
    selects.value = selected;
    const p = state.profiles[selected],
      c = cityClock(state),
      housingMessage = cityAIHousingMessage(game, selected, getAIStatus());
    clock.textContent = `${familyCalendar(game, c.day).label} · ${c.label} · робочі години 12:00–19:00 · план: ${state.plan?.source === "ai" ? "Cloudflare AI" : state.plan?.source === "pending" ? "місцевий, AI обирає" : "місцевий"}`;
    const key = JSON.stringify([
      selected,
      p,
      state.plan?.source,
      game.housing,
      game.family,
      getAIStatus(),
      housingMessage,
    ]);
    if (key === lastKey) {
      investmentsPanel?.update(p,c.day);return;
    }
    lastKey = key;
    body.replaceChildren();
    const navigation = document.createElement("nav");
    navigation.className = "cat-life-nav";
    navigation.setAttribute("aria-label", "Розділи життя котика");
    const sections = new Map();
    for (const [id, label] of [
      ["overview", "Огляд"],
      ["family", "Сім’я"],
      ["inventory", "Інвентар"],
      ["investments", "Інвестиції"],
      ["property", "Нерухомість"],
      ["shopping", "Покупки"],
      ["history", "Історія"],
      ["career", "Кар’єра"],
    ]) {
      const section = document.createElement("section");
      section.className = "cat-life-section";
      section.id = "cat-life-" + id;
      sections.set(id, section);
      const button = text("button", label);
      button.type = "button";
      button.onclick = () =>
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      navigation.append(button);
    }
    body.append(navigation, ...sections.values());
    let content = sections.get("overview");
    const portrait = catProfileCard(p, {
      subtitle: jobBusiness(p.profession)?.name || "Обирає професію",
    });
    portrait.classList.add("cat-profile-hero");
    content.append(portrait);
    const title = text("h3", p.name);
    content.append(title);
    const balances = text(
      "p",
      `${money(p.coins)} 🐾 власних монеток · зароблено ${money(p.earnedTotal)} · витрачено ${money(p.spentTotal)}`,
      "jobcity-balance",
    );
    content.append(balances);
    content.append(
      text(
        "p",
        `${p.personality} · ${p.professionReason || "Знайомиться зі своїми здібностями"} · змін професії ${p.professionChanges}/3`,
      ),
    );
    content.append(
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
    content.append(controls);
    const skills = document.createElement("div");
    skills.className = "jobcity-skills";
    for (const b of JOB_BUSINESSES)
      skills.append(text("span", `${b.icon} ${b.name}: ${p.skills[b.kind]}`));
    content.append(skills);
    content = sections.get("family");
    content.append(text("h3", "Сім’я"));
    const partnerId = familyPartner(game, p.id),
      partner = state.profiles[partnerId];
    if (partner) {
      const pair = Object.values(game.family.couples).find((pair) =>
        [pair.male, pair.female].includes(p.id),
      );
      const couple = document.createElement("div");
      couple.className = "cat-family-couple";
      const select = (id) => {
        selected = id;
        lastKey = "";
        render();
      };
      const heart = text("span", "♥", "cat-family-heart");
      heart.setAttribute("aria-hidden", "true");
      couple.append(
        catProfileCard(p, {
          onSelect: select,
          subtitle: jobBusiness(p.profession)?.name || "Мріє про професію",
        }),
        heart,
        catProfileCard(partner, {
          onSelect: select,
          subtitle:
            jobBusiness(partner.profession)?.name || "Мріє про професію",
        }),
      );
      content.append(
        couple,
        text(
          "p",
          `Разом із ${familyCalendar(game, pair.formedDay).label.toLowerCase()} · назавжди`,
          "cat-family-since",
        ),
        text("p", pair.reason, "cat-family-reason"),
        text(
          "p",
          "Працюють кожен за своєю професією, а гуляють, відпочивають і повертаються додому разом.",
          "dialog-copy",
        ),
      );
      const home = game.housing?.residences[p.id];
      if (home && home === game.housing.residences[partnerId])
        content.append(
          action("🏡 Наш спільний дім", () => {
            dialog.close();
            viewHome(home);
          }),
        );
      else
        content.append(
          text(
            "p",
            "Поки мріють про спільний дім. Коли хтось із пари придбає оселю, вони житимуть разом.",
            "dialog-copy",
          ),
        );
    } else {
      const review = familyReview(game, c.day);
      const aiMessage = cityAIFamilyMessage(game, getAIStatus());
      content.append(
        text(
          "p",
          "Знайомиться, дружить і шукає свою близьку душу.",
          "cat-family-empty",
        ),
        text(
          "p",
          `Кожен котик може знайти свою сім’ю. AI знайомить котиків поступово, раз на 14 ігрових днів; створені пари залишаються разом назавжди. ${review.due ? aiMessage : "Наступний вибір: день " + familyCalendar(game, review.nextDay).number + "."}`,
          "dialog-copy",
        ),
      );
    }
    const planner = partner
      ? p.id === "chichi" || partner.id === "chichi"
        ? state.profiles.chichi
        : p.sex === "male"
          ? p
          : partner
      : p;
    if (planner.schedule?.outings?.length) {
      const names = new Map(leisureOffers(game).map((o) => [o.id, o.name]));
      content.append(text("h4", "Плани на вільний час"));
      for (const id of planner.schedule.outings)
        content.append(
          text(
            "p",
            names.get(id) || "Відпочинок на острові",
            "cat-outing-plan",
          ),
        );
    }
    content = sections.get("inventory");
    content.append(text("h3", "Власний інвентар"));
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
    content.append(inventory);
    content = sections.get("property");
    content.append(text("h3", "Нерухомість"));
    content.append(text("p", housingMessage, "dialog-copy housing-ai-status"));
    const homes = ownedHomes(game, p.id);
    content.append(
      text(
        "p",
        `${homes.length} власних будинків · нова покупка не змінює активний дім`,
      ),
    );
    for (const home of homes.slice(0, propertyLimit)) {
      const row = document.createElement("div");
      row.className = "jobcity-item housing-item";
      const active = game.housing.residences[p.id] === home.id;
      row.append(
        action(
          `${houseType(home.type).name} · №${home.plot + 1}${active ? " · 💤 Ваш дім" : ""}`,
          () => {
            dialog.close();
            viewHome(home.id);
          },
        ),
      );
      row.append(
        text(
          "p",
          `Співмешканець: ${state.profiles[home.roommate]?.name || "вільне місце"} · ${money(home.price)} 🐾 · ${home.source === "ai" ? "обрав AI" : "ручна покупка"}`,
        ),
      );
      if (!active)
        row.append(action("Оселитися тут", () => liveHome(p.id, home.id)));
      const cohabit = document.createElement("select");
      cohabit.setAttribute(
        "aria-label",
        "Співмешканець будинку " + (home.plot + 1),
      );
      const empty = text("option", "Вільне місце");
      empty.value = "";
      cohabit.append(empty);
      for (const cat of Object.values(state.profiles).filter(
        (c) =>
          c.id === home.roommate ||
          availableRoommates(game, p.id).some((f) => f.id === c.id),
      )) {
        const o = text("option", cat.name);
        o.value = cat.id;
        cohabit.append(o);
      }
      cohabit.value = home.roommate || "";
      cohabit.disabled =
        !!familyPartner(game, home.owner) &&
        game.housing.residences[home.owner] === home.id;
      cohabit.onchange = () => {
        try {
          updateRoommate(home.id, cohabit.value || null);
          render();
        } catch (e) {
          onError(e.message);
        }
      };
      row.append(cohabit);
      content.append(row);
    }
    if (homes.length > propertyLimit)
      content.append(
        action("Показати ще будинки", () => {
          propertyLimit += 20;
          lastKey = "";
        }),
      );
    if (!homes.length)
      content.append(
        text(
          "p",
          "AI може сам обрати будинок у щоденному плані. Можна також купити його нижче за власні монетки котика.",
        ),
      );
    content = sections.get("shopping");
    content.append(text("h3", "Покупки за монетки цього котика"));
    const products = document.createElement("div");
    products.className = "jobcity-products";
    const filter = document.createElement("select");
    filter.setAttribute("aria-label", "Категорія покупки");
    for (const [v, n] of [
      ["property", "Будинки"],
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
    content.append(filter, products);
    const showProducts = () => {
      products.replaceChildren();
      for (const product of catProducts(game).filter(
        (x) => x.category === filter.value,
      )) {
        const row = document.createElement("div");
        row.className = "jobcity-item";
        let roomChoice = null;
        if (houseType(product.id)) {
          roomChoice = document.createElement("select");
          roomChoice.setAttribute(
            "aria-label",
            "Співмешканець для нового будинку",
          );
          const none = text("option", "Підібрати співмешканця");
          none.value = "";
          roomChoice.append(none);
          for (const cat of availableRoommates(game, p.id)) {
            const o = text("option", cat.name);
            o.value = cat.id;
            roomChoice.append(o);
          }
          if (roomChoice.options.length > 1) roomChoice.selectedIndex = 1;
          row.append(roomChoice);
        }
        row.append(
          text(
            "span",
            `${product.icon} ${product.name} · ${money(product.price)} 🐾`,
          ),
          action(
            "Купити",
            () =>
              houseType(product.id)
                ? buyHome(p.id, product.id, roomChoice.value || null)
                : buy(p.id, product.id),
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
    investmentsPanel=createInvestmentsPanel(sections.get('investments'),{labelDay:d=>familyCalendar(game,d).label});
    investmentsPanel.update(p,c.day);
    content = sections.get("history");
    content.append(text("h3", "Історія доходів і витрат"));
    for (const t of [...p.transactions].reverse())
      content.append(
        text(
          "p",
          `${t.amount > 0 ? "+" : ""}${money(t.amount)} 🐾 · ${t.kind === "wage" ? "Зміна: " + jobBusiness(t.job)?.name : t.kind === "crypto-margin" ? "Маржа криптоугоди" : t.kind === "crypto-close" ? "Закриття криптоугоди" : catProducts(game).find((x) => x.id === t.item)?.name || "Покупка"}`,
          "jobcity-history",
        ),
      );
    content = sections.get("career");
    content.append(text("h3", "Кар’єра"));
    for (const h of p.career)
      content.append(
        text(
          "p",
          `${h.day < (game.family?.calendar.startDay || 0) ? "Раніше" : "День " + familyCalendar(game, h.day).number} · ${jobBusiness(h.job)?.name} · ${h.reason}`,
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
