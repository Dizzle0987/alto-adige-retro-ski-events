const eventList = document.querySelector(".event-list");
const filters = [...document.querySelectorAll(".filter")];
const emptyState = document.querySelector(".empty-state");

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const externalLink = (label, href) => {
  const link = element("a", "", `${label} ↗`);
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  return link;
};

const renderEvent = (event) => {
  const article = element("article", `event-card${event.featured ? " featured" : ""}`);
  article.dataset.categories = event.categories.join(" ");
  article.style.setProperty("--accent", event.accent);

  const date = element("div", "date-block");
  date.append(element("span", "", event.dateLabel));
  date.append(element("strong", "", event.monthLabel));
  date.append(element("small", "", event.year));

  const main = element("div", "event-main");
  const tags = element("div", "tags");
  event.tags.forEach((tag) => tags.append(element("span", "", tag)));
  main.append(tags);
  main.append(element("h3", "", event.title));
  main.append(element("p", "", event.summary));
  main.append(element("p", "place", event.place));

  const links = element("div", "event-links");
  links.append(externalLink("Fonte ufficiale", event.source));
  if (event.social) links.append(externalLink("Instagram", event.social));
  links.append(externalLink("Mappa", event.map));

  article.append(date, main, links);
  return article;
};

const updateCounts = (events) => {
  filters.forEach((button) => {
    const category = button.dataset.filter;
    const count = category === "all"
      ? events.length
      : events.filter((event) => event.categories.includes(category)).length;
    button.querySelector("span").textContent = count;
  });
};

const applyFilter = (selected) => {
  let visible = 0;
  filters.forEach((button) => {
    const active = button.dataset.filter === selected;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll(".event-card").forEach((card) => {
    const show = selected === "all" || card.dataset.categories.split(" ").includes(selected);
    card.hidden = !show;
    if (show) visible += 1;
  });
  emptyState.hidden = visible !== 0;
};

const formatCheckedDate = (isoDate) => {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
};

const loadEvents = async () => {
  try {
    const response = await fetch("events.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const events = [...data.events].sort((a, b) => a.start.localeCompare(b.start));
    eventList.replaceChildren(...events.map(renderEvent));
    document.querySelector("[data-last-checked]").textContent = formatCheckedDate(data.lastChecked);
    updateCounts(events);
    applyFilter("all");
    filters.forEach((button) => button.addEventListener("click", () => applyFilter(button.dataset.filter)));
  } catch (error) {
    eventList.replaceChildren(element("p", "loading-state", "Agenda temporaneamente non disponibile. Riprova tra poco."));
    console.error("Impossibile caricare gli eventi", error);
  }
};

loadEvents();
