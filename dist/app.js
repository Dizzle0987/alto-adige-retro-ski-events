const eventList = document.querySelector(".event-list");
const socialList = document.querySelector(".social-links");
const filters = [...document.querySelectorAll(".filter")];
const languageButtons = [...document.querySelectorAll(".language-button")];
const emptyState = document.querySelector(".empty-state");
const supportedLanguages = ["it", "de", "en"];

const copy = {
  it: {
    pageTitle: "Retro Ski & Après — Alto Adige",
    description: "Radar aggiornato di feste retro, vintage ski e après-ski in Alto Adige, con date, luoghi e fonti ufficiali.",
    skipLink: "Vai agli eventi", mainNavLabel: "Navigazione principale", brandLabel: "Retro Ski, torna all'inizio",
    methodLink: "Fonti & metodo", languageLabel: "Lingua", posterLabel: "Poster decorativo con sciatore stilizzato", season: "stagione 2026/27",
    heroLine1: "BRUTTI SCI.", heroLine2: "BELLE FESTE.",
    heroLede: "Un radar in continuo aggiornamento per feste retro, vintage ski e après-ski in Alto Adige. Date, luoghi e fonti ufficiali, senza caccia al flyer.",
    eventsCta: "Vedi gli eventi", socialCta: "Radar social", eventsKicker: "Radar eventi live",
    eventsTitle: "Cosa succede sulla neve, adesso.", lastUpdated: "Ultimo aggiornamento",
    autoUpdateBadge: "Automatico · lun, mer, gio · 08:00", filterLabel: "Filtra per atmosfera",
    filterAll: "Tutto", filterRetro: "Retro", filterApres: "Après-ski", filterCostume: "Dress code",
    loadingEvents: "Aggiorno il radar eventi…", emptyEvents: "Nessun evento in questa categoria.",
    loadError: "Radar temporaneamente non disponibile. Riprova tra poco.", socialKicker: "Radar social dinamico",
    socialTitle: "I canali che stanno parlando della neve.",
    socialBody: "Questa lista nasce dagli eventi attualmente visibili e cambia con loro. Apri i profili per lineup, variazioni e aggiornamenti dell’ultimo minuto.",
    noSocial: "Nessun canale social collegato agli eventi attuali.", methodKicker: "Fonti & metodo",
    methodTitle: "Un radar vivo, con fonti chiare.",
    methodBody1: "Il radar controlla periodicamente portali turistici e siti degli organizzatori in italiano, tedesco e inglese. I profili social mostrati sono ricavati dagli eventi presenti in quel momento.",
    methodBody2: "Un evento entra nella lista quando data, luogo e fonte ufficiale sono disponibili. Se una pagina cambia o non risponde, l’ultimo dato verificato resta visibile fino al controllo successivo.",
    methodFinePrint: "Programmi e orari possono cambiare: controlla sempre il link ufficiale prima di partire. Bevi responsabilmente e non sciare dopo aver bevuto.",
    footerNote: "CURATO NELLE DOLOMITI — AGGIORNAMENTO CONTINUO", backToTop: "Torna su",
    officialSource: "Fonte ufficiale", map: "Mappa", instagram: "Instagram",
  },
  de: {
    pageTitle: "Retro Ski & Après — Südtirol",
    description: "Laufend aktualisierter Radar für Retro-Ski- und Après-Ski-Partys in Südtirol – mit Daten, Orten und offiziellen Quellen.",
    skipLink: "Zu den Events", mainNavLabel: "Hauptnavigation", brandLabel: "Retro Ski, zurück zum Anfang",
    methodLink: "Quellen & Methode", languageLabel: "Sprache", posterLabel: "Dekoratives Poster mit stilisiertem Skifahrer", season: "Saison 2026/27",
    heroLine1: "SCHRÄGE SKI.", heroLine2: "GUTE PARTYS.",
    heroLede: "Ein laufend aktualisierter Radar für Retro-Ski-, Vintage- und Après-Ski-Partys in Südtirol. Daten, Orte und offizielle Quellen – ohne Flyer-Suche.",
    eventsCta: "Events ansehen", socialCta: "Social-Radar", eventsKicker: "Live-Event-Radar",
    eventsTitle: "Was jetzt im Schnee passiert.", lastUpdated: "Zuletzt aktualisiert",
    autoUpdateBadge: "Automatisch · Mo, Mi, Do · 08:00", filterLabel: "Nach Stimmung filtern",
    filterAll: "Alle", filterRetro: "Retro", filterApres: "Après-Ski", filterCostume: "Dresscode",
    loadingEvents: "Event-Radar wird aktualisiert…", emptyEvents: "Keine Events in dieser Kategorie.",
    loadError: "Der Radar ist vorübergehend nicht verfügbar. Bitte später erneut versuchen.", socialKicker: "Dynamischer Social-Radar",
    socialTitle: "Die Kanäle, die gerade vom Schnee erzählen.",
    socialBody: "Diese Liste entsteht aus den aktuell sichtbaren Events und ändert sich mit ihnen. In den Profilen findest du Line-ups, Änderungen und kurzfristige Updates.",
    noSocial: "Keine Social-Kanäle mit den aktuellen Events verknüpft.", methodKicker: "Quellen & Methode",
    methodTitle: "Ein lebendiger Radar mit klaren Quellen.",
    methodBody1: "Der Radar prüft regelmäßig Tourismusportale und Veranstalterseiten auf Deutsch, Italienisch und Englisch. Die angezeigten Social-Profile stammen aus den jeweils aktuellen Events.",
    methodBody2: "Ein Event erscheint, sobald Datum, Ort und eine offizielle Quelle verfügbar sind. Ändert sich eine Seite oder ist sie nicht erreichbar, bleibt der zuletzt geprüfte Stand bis zur nächsten Kontrolle sichtbar.",
    methodFinePrint: "Programme und Uhrzeiten können sich ändern: Prüfe vor der Abfahrt immer den offiziellen Link. Trink verantwortungsvoll und fahre nicht Ski, wenn du Alkohol getrunken hast.",
    footerNote: "IN DEN DOLOMITEN KURATIERT — LAUFEND AKTUALISIERT", backToTop: "Nach oben",
    officialSource: "Offizielle Quelle", map: "Karte", instagram: "Instagram",
  },
  en: {
    pageTitle: "Retro Ski & Après — South Tyrol",
    description: "A continuously updated radar for retro ski and après-ski parties in South Tyrol, with dates, places and official sources.",
    skipLink: "Skip to events", mainNavLabel: "Main navigation", brandLabel: "Retro Ski, back to top",
    methodLink: "Sources & method", languageLabel: "Language", posterLabel: "Decorative poster with a stylised skier", season: "2026/27 season",
    heroLine1: "BAD SKIS.", heroLine2: "GREAT PARTIES.",
    heroLede: "A continuously updated radar for retro ski, vintage and après-ski parties in South Tyrol. Dates, places and official sources — no flyer hunting required.",
    eventsCta: "See the events", socialCta: "Social radar", eventsKicker: "Live event radar",
    eventsTitle: "What’s happening on the snow now.", lastUpdated: "Last updated",
    autoUpdateBadge: "Automatic · Mon, Wed, Thu · 08:00", filterLabel: "Filter by mood",
    filterAll: "All", filterRetro: "Retro", filterApres: "Après-ski", filterCostume: "Dress code",
    loadingEvents: "Updating the event radar…", emptyEvents: "No events in this category.",
    loadError: "The radar is temporarily unavailable. Please try again shortly.", socialKicker: "Dynamic social radar",
    socialTitle: "The channels talking about the snow right now.",
    socialBody: "This list is generated from the events currently on display and changes with them. Open the profiles for line-ups, changes and last-minute updates.",
    noSocial: "No social channels are linked to the current events.", methodKicker: "Sources & method",
    methodTitle: "A live radar with clear sources.",
    methodBody1: "The radar regularly checks tourism portals and organiser websites in Italian, German and English. The social profiles shown come from the events currently listed.",
    methodBody2: "An event is listed when its date, place and official source are available. If a page changes or becomes unavailable, the latest verified information remains visible until the next check.",
    methodFinePrint: "Programmes and times may change: always check the official link before setting off. Drink responsibly and never ski after drinking.",
    footerNote: "CURATED IN THE DOLOMITES — CONTINUOUSLY UPDATED", backToTop: "Back to top",
    officialSource: "Official source", map: "Map", instagram: "Instagram",
  },
};

const eventTranslations = {
  it: {},
  de: {
    "3-zinnen-schlager": { summary: "Eine Woche voller Schlager, Hüttenpartys und Themenabende: Ganz in Weiß, Tiroler Abend und LED-Party.", place: "Toblach · Gebiet 3 Zinnen", tags: ["Après-Ski", "Dresscode"] },
    "lockenfest-funes": { title: "Lockenfest mit Retro Party", summary: "Ski, Rodeln, Snowboards und Vintage-Looks auf dem Eis; danach Aftershow-Party in der Feuerwehrhalle.", place: "Skilift Filler · St. Magdalena, Villnöss", tags: ["Retro", "Alles, was rutscht"] },
    "rock-meets-beats": { summary: "Gitarren, Hits und DJ-Sets beim kostenlosen Après-Ski am Fuße der Dolomiten, von 16:00 bis 23:00 Uhr.", place: "Str. Mëisules 145 · Wolkenstein in Gröden", tags: ["Live + DJ", "Eintritt frei"] },
    "val-gardena-winter-finals": { summary: "Opening-Party, sechs Hütten an sechs Tagen und ein großes Open-Air-Finale an der Ciampinoi-Bahn.", place: "Wolkenstein in Gröden · Hütten und Dorfzentrum", tags: ["8 Tage", "Electronic"] },
    "oldschool-skiday-solda": { summary: "Klassische Ski, Omas Holzlatten, Neon-Stirnbänder und Retro-Après-Ski. Von 09:00 Uhr bis in die Nacht.", place: "Seilbahn Sulden · Stilfs", tags: ["Old School", "80er-Skianzüge"] },
    "ski-carousel-vintage-party": { summary: "Zwei Tage zwischen Hütten, Vintage Village in La Villa, Rennen auf alten Skiern und Afterparty in Corvara.", place: "Alta Badia · La Villa, La Para und Corvara", tags: ["Vintage", "No carving", "Top-Tipp"] },
  },
  en: {
    "3-zinnen-schlager": { summary: "A week of Schlager, mountain-hut parties and themed nights: all in white, Tyrolean style and LED.", place: "Dobbiaco / Toblach · 3 Zinnen area", tags: ["Après-ski", "Dress code"] },
    "lockenfest-funes": { title: "Locken Festival with Retro Party", summary: "Skis, sledges, snowboards and vintage looks on the ice, followed by an aftershow party at the fire station.", place: "Filler ski lift · Santa Maddalena, Funes", tags: ["Retro", "Anything that slides"] },
    "rock-meets-beats": { summary: "Guitars, hits and DJ sets at a free après-ski party beneath the Dolomites, from 4 pm to 11 pm.", place: "Str. Mëisules 145 · Selva di Val Gardena", tags: ["Live + DJ", "Free entry"] },
    "val-gardena-winter-finals": { summary: "An opening party, six mountain huts in six days and a big open-air finale at the Ciampinoi gondola.", place: "Selva di Val Gardena · mountain huts and village centre", tags: ["8 days", "Electronic"] },
    "oldschool-skiday-solda": { summary: "Classic skis, grandma’s wooden planks, neon headbands and retro après-ski. From 9 am until late.", place: "Solda cable car · Stelvio", tags: ["Old school", "80s ski suits"] },
    "ski-carousel-vintage-party": { summary: "Two days of mountain huts, the Vintage Village in La Villa, a race on old skis and an afterparty in Corvara.", place: "Alta Badia · La Villa, La Para and Corvara", tags: ["Vintage", "No carving", "Top pick"] },
  },
};

let currentLanguage = "it";
let currentFilter = "all";
let cachedEvents = [];
let lastChecked = "";

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

const localizedEvent = (event) => ({ ...event, ...(eventTranslations[currentLanguage]?.[event.id] || {}) });

const dateParts = (event) => {
  const start = new Date(`${event.start}T12:00:00`);
  const end = new Date(`${event.end}T12:00:00`);
  const locale = currentLanguage === "de" ? "de-DE" : currentLanguage === "en" ? "en-GB" : "it-IT";
  const day = (date) => new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(date);
  const month = (date) => new Intl.DateTimeFormat(locale, { month: "short" }).format(date).replace(".", "").toUpperCase();
  return {
    days: event.start === event.end ? day(start) : `${day(start)}–${day(end)}`,
    months: start.getMonth() === end.getMonth() ? month(start) : `${month(start)}/${month(end)}`,
    year: String(start.getFullYear()),
  };
};

const renderEvent = (rawEvent) => {
  const event = localizedEvent(rawEvent);
  const formattedDate = dateParts(event);
  const article = element("article", `event-card${event.featured ? " featured" : ""}`);
  article.dataset.categories = event.categories.join(" ");
  article.style.setProperty("--accent", event.accent);
  const date = element("div", "date-block");
  date.append(element("span", "", formattedDate.days), element("strong", "", formattedDate.months), element("small", "", formattedDate.year));
  const main = element("div", "event-main");
  const tags = element("div", "tags");
  event.tags.forEach((tag) => tags.append(element("span", "", tag)));
  main.append(tags, element("h3", "", event.title), element("p", "", event.summary), element("p", "place", event.place));
  const links = element("div", "event-links");
  links.append(externalLink(copy[currentLanguage].officialSource, event.source));
  if (event.social) links.append(externalLink(copy[currentLanguage].instagram, event.social));
  links.append(externalLink(copy[currentLanguage].map, event.map));
  article.append(date, main, links);
  return article;
};

const socialHandle = (url) => {
  try { return new URL(url).pathname.split("/").filter(Boolean)[0]; }
  catch { return url; }
};

const renderSocialRadar = () => {
  const urls = [...new Set(cachedEvents.map((event) => event.social).filter(Boolean))];
  if (!urls.length) {
    socialList.replaceChildren(element("p", "social-empty", copy[currentLanguage].noSocial));
    return;
  }
  socialList.replaceChildren(...urls.map((url) => {
    const link = externalLink(socialHandle(url), url);
    link.prepend(element("span", "", "@"));
    return link;
  }));
};

const updateCounts = () => {
  filters.forEach((button) => {
    const category = button.dataset.filter;
    const count = category === "all" ? cachedEvents.length : cachedEvents.filter((event) => event.categories.includes(category)).length;
    button.querySelector(".filter-count").textContent = count;
  });
};

const applyFilter = (selected) => {
  currentFilter = selected;
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
  if (!isoDate) return "—";
  const locale = currentLanguage === "de" ? "de-DE" : currentLanguage === "en" ? "en-GB" : "it-IT";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${isoDate}T12:00:00`));
};

const renderEvents = () => {
  eventList.replaceChildren(...cachedEvents.map(renderEvent));
  updateCounts();
  applyFilter(currentFilter);
  renderSocialRadar();
};

const translatePage = () => {
  const dictionary = copy[currentLanguage];
  document.documentElement.lang = currentLanguage;
  document.title = dictionary.pageTitle;
  document.querySelector('meta[name="description"]').content = dictionary.description;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const value = dictionary[node.dataset.i18n];
    if (value) node.textContent = value;
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    const value = dictionary[node.dataset.i18nAriaLabel];
    if (value) node.setAttribute("aria-label", value);
  });
  languageButtons.forEach((button) => {
    const active = button.dataset.language === currentLanguage;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelector("[data-last-checked]").textContent = formatCheckedDate(lastChecked);
};

const setLanguage = (language, persist = false) => {
  currentLanguage = supportedLanguages.includes(language) ? language : "en";
  if (persist) localStorage.setItem("retro-ski-language", currentLanguage);
  translatePage();
  if (cachedEvents.length) renderEvents();
};

const preferredLanguage = () => {
  const saved = localStorage.getItem("retro-ski-language");
  if (supportedLanguages.includes(saved)) return saved;
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return browserLanguages.map((language) => language.toLowerCase().split("-")[0]).find((language) => supportedLanguages.includes(language)) || "en";
};

const loadEvents = async () => {
  try {
    const response = await fetch("events.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    cachedEvents = [...data.events].sort((a, b) => a.start.localeCompare(b.start));
    lastChecked = data.lastChecked;
    translatePage();
    renderEvents();
  } catch (error) {
    eventList.replaceChildren(element("p", "loading-state", copy[currentLanguage].loadError));
    console.error("Unable to load events", error);
  }
};

filters.forEach((button) => button.addEventListener("click", () => applyFilter(button.dataset.filter)));
languageButtons.forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.language, true)));
setLanguage(preferredLanguage());
loadEvents();
