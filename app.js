const eventList = document.querySelector(".event-list");
const socialList = document.querySelector(".social-links");
const filters = [...document.querySelectorAll(".filter")];
const valleySelect = document.querySelector("#valley-select");
const languageButtons = [...document.querySelectorAll(".language-button")];
const emptyState = document.querySelector(".empty-state");
const supportedLanguages = ["it", "de", "en"];

const copy = {
  it: {
    pageTitle: "Retro Ski & Après — Alto Adige",
    description: "Radar aggiornato di feste retro, vintage ski e après-ski in Alto Adige, con date, luoghi e fonti ufficiali.",
    skipLink: "Vai agli eventi", mainNavLabel: "Navigazione principale", brandLabel: "Retro Ski, torna all'inizio",
    languageLabel: "Lingua", posterLabel: "Poster decorativo con sciatore stilizzato", season: "stagione 2026/27",
    heroLine1: "BRUTTI SCI.", heroLine2: "BELLE FESTE.",
    heroLede: "Un radar in continuo aggiornamento per feste retro, vintage ski e après-ski in Alto Adige. Date, luoghi e fonti ufficiali, senza caccia al flyer.",
    eventsCta: "Vedi gli eventi", socialCta: "Radar social", eventsKicker: "Radar eventi live",
    eventsTitle: "Cosa succede sulla neve, adesso.", lastUpdated: "Ultimo aggiornamento",
    autoUpdateBadge: "Automatico · lun, mer, gio · 08:00", filterLabel: "Filtra per atmosfera",
    filterAll: "Tutto", filterRetro: "Retro", filterApres: "Après-ski", filterCostume: "Dress code",
    valleyLabel: "Valle", valleyFilterLabel: "Filtra per valle", allValleys: "Tutte le valli",
    loadingEvents: "Aggiorno il radar eventi…", emptyEvents: "Nessun evento in questa categoria.",
    loadError: "Radar temporaneamente non disponibile. Riprova tra poco.", socialKicker: "Radar social dinamico",
    socialTitle: "I canali che stanno parlando della neve.",
    socialBody: "Questa lista nasce dagli eventi attualmente visibili e cambia con loro. Apri i profili per lineup, variazioni e aggiornamenti dell’ultimo minuto.",
    noSocial: "Nessun canale social collegato agli eventi attuali.",
    autoSummaryApres: "Musica e atmosfera après-ski sulla neve. Il programma completo è nella fonte ufficiale.",
    autoSummaryRetro: "Sci d’epoca, look vintage e atmosfera nostalgica. Il programma completo è nella fonte ufficiale.",
    autoSummaryCostume: "Evento sulla neve con dress code e atmosfera a tema. Il programma completo è nella fonte ufficiale.",
    autoSummaryGeneric: "Evento sulla neve con programma e dettagli nella fonte ufficiale.",
    footerNote: "Idee und Umsetzung von zwoa geile Typen", backToTop: "Torna su",
    officialSource: "Fonte ufficiale", map: "Mappa", instagram: "Instagram",
  },
  de: {
    pageTitle: "Retro Ski & Après — Südtirol",
    description: "Laufend aktualisierter Radar für Retro-Ski- und Après-Ski-Partys in Südtirol – mit Daten, Orten und offiziellen Quellen.",
    skipLink: "Zu den Events", mainNavLabel: "Hauptnavigation", brandLabel: "Retro Ski, zurück zum Anfang",
    languageLabel: "Sprache", posterLabel: "Dekoratives Poster mit stilisiertem Skifahrer", season: "Saison 2026/27",
    heroLine1: "SCHRÄGE SKI.", heroLine2: "GUTE PARTYS.",
    heroLede: "Ein laufend aktualisierter Radar für Retro-Ski-, Vintage- und Après-Ski-Partys in Südtirol. Daten, Orte und offizielle Quellen – ohne Flyer-Suche.",
    eventsCta: "Events ansehen", socialCta: "Social-Radar", eventsKicker: "Live-Event-Radar",
    eventsTitle: "Was jetzt im Schnee passiert.", lastUpdated: "Zuletzt aktualisiert",
    autoUpdateBadge: "Automatisch · Mo, Mi, Do · 08:00", filterLabel: "Nach Stimmung filtern",
    filterAll: "Alle", filterRetro: "Retro", filterApres: "Après-Ski", filterCostume: "Dresscode",
    valleyLabel: "Tal", valleyFilterLabel: "Nach Tal filtern", allValleys: "Alle Täler",
    loadingEvents: "Event-Radar wird aktualisiert…", emptyEvents: "Keine Events in dieser Kategorie.",
    loadError: "Der Radar ist vorübergehend nicht verfügbar. Bitte später erneut versuchen.", socialKicker: "Dynamischer Social-Radar",
    socialTitle: "Die Kanäle, die gerade vom Schnee erzählen.",
    socialBody: "Diese Liste entsteht aus den aktuell sichtbaren Events und ändert sich mit ihnen. In den Profilen findest du Line-ups, Änderungen und kurzfristige Updates.",
    noSocial: "Keine Social-Kanäle mit den aktuellen Events verknüpft.",
    autoSummaryApres: "Musik und Après-Ski-Stimmung im Schnee. Das vollständige Programm findest du in der offiziellen Quelle.",
    autoSummaryRetro: "Historische Ski, Vintage-Looks und nostalgische Stimmung. Das vollständige Programm findest du in der offiziellen Quelle.",
    autoSummaryCostume: "Schnee-Event mit Dresscode und besonderem Motto. Das vollständige Programm findest du in der offiziellen Quelle.",
    autoSummaryGeneric: "Schnee-Event mit Programm und Details in der offiziellen Quelle.",
    footerNote: "Idee und Umsetzung von zwoa geile Typen", backToTop: "Nach oben",
    officialSource: "Offizielle Quelle", map: "Karte", instagram: "Instagram",
  },
  en: {
    pageTitle: "Retro Ski & Après — South Tyrol",
    description: "A continuously updated radar for retro ski and après-ski parties in South Tyrol, with dates, places and official sources.",
    skipLink: "Skip to events", mainNavLabel: "Main navigation", brandLabel: "Retro Ski, back to top",
    languageLabel: "Language", posterLabel: "Decorative poster with a stylised skier", season: "2026/27 season",
    heroLine1: "BAD SKIS.", heroLine2: "GREAT PARTIES.",
    heroLede: "A continuously updated radar for retro ski, vintage and après-ski parties in South Tyrol. Dates, places and official sources — no flyer hunting required.",
    eventsCta: "See the events", socialCta: "Social radar", eventsKicker: "Live event radar",
    eventsTitle: "What’s happening on the snow now.", lastUpdated: "Last updated",
    autoUpdateBadge: "Automatic · Mon, Wed, Thu · 08:00", filterLabel: "Filter by mood",
    filterAll: "All", filterRetro: "Retro", filterApres: "Après-ski", filterCostume: "Dress code",
    valleyLabel: "Valley", valleyFilterLabel: "Filter by valley", allValleys: "All valleys",
    loadingEvents: "Updating the event radar…", emptyEvents: "No events in this category.",
    loadError: "The radar is temporarily unavailable. Please try again shortly.", socialKicker: "Dynamic social radar",
    socialTitle: "The channels talking about the snow right now.",
    socialBody: "This list is generated from the events currently on display and changes with them. Open the profiles for line-ups, changes and last-minute updates.",
    noSocial: "No social channels are linked to the current events.",
    autoSummaryApres: "Music and après-ski atmosphere on the snow. See the official source for the full programme.",
    autoSummaryRetro: "Vintage skis, retro looks and a nostalgic atmosphere. See the official source for the full programme.",
    autoSummaryCostume: "A themed snow event with a dress code. See the official source for the full programme.",
    autoSummaryGeneric: "A snow event with the full programme and details in the official source.",
    footerNote: "Idee und Umsetzung von zwoa geile Typen", backToTop: "Back to top",
    officialSource: "Official source", map: "Map", instagram: "Instagram",
  },
};

const eventTranslations = {
  it: {
    "auto-2026-12-11-bruning-krampus-the-after-show-party": { summary: "After-party della sfilata dei Krampus con DJ set, musica e scenografie a tema fino all’una." },
    "auto-2027-01-02-back-to-1976-giornata-di-sci-old-school-con-simon-mac-live": { summary: "Giornata sugli sci in stile 1976, con outfit vintage, alba in pista e musica live di Simon & Mac." },
    "auto-2027-01-09-dj-armino-live": { summary: "DJ set e musica live alla Malga Ausser Schwemmalm, con ingresso gratuito." },
    "auto-2027-02-24-kronplatz-ski-music-festival-dj-edition": { summary: "Quattro giorni di musica elettronica sulle piste con DJ internazionali e après-ski in quota." },
    "auto-2027-02-27-gare-di-sci-alla-vecchia-maniera": { summary: "Gara goliardica con sci di legno e abbigliamento d’epoca, tra curve improbabili e atmosfera rétro." },
    "auto-2027-03-06-invito-alla-gara-internazionale-all-insegna-di-divertimento-e-nostalgi": { summary: "Gara internazionale sulla neve dedicata al divertimento, ai look vintage e alla nostalgia." },
    "auto-2027-03-07-dolomites-dirndl-ski-day": { summary: "Giornata sugli sci riservata alle donne, con dirndl, colori e una sfida sportiva per la Festa della Donna." },
    "auto-2027-03-18-rock-the-dolomites-winter-music-festival": { summary: "Dieci giorni di musica live, sci e sole primaverile nel Winter Music Festival delle Dolomiti." },
    "auto-2027-03-20-spring-race-party-ortisei": { summary: "Competizione primaverile di sci e snowboard con festa finale nel centro di Ortisei." },
    "auto-2027-03-20-gara-della-nostalgia": { summary: "Giornata rétro in tutto il comprensorio, con attrezzatura d’epoca e atmosfera nostalgica." },
    "auto-2027-03-29-schwemmalm-open-air": { summary: "Open air di fine stagione alla stazione a monte, con musica e festa per il cinquantenario." },
  },
  de: {
    "auto-2026-12-11-bruning-krampus-the-after-show-party": { summary: "Afterparty des Krampusumzugs mit DJ-Set, Musik und passender Gruselkulisse bis 1 Uhr." },
    "auto-2027-01-02-back-to-1976-giornata-di-sci-old-school-con-simon-mac-live": { summary: "Skitag im Stil von 1976 mit Vintage-Outfits, Sonnenaufgang auf der Piste und Livemusik von Simon & Mac." },
    "auto-2027-01-09-dj-armino-live": { summary: "DJ-Set und Livemusik auf der Ausser-Schwemmalm – bei freiem Eintritt." },
    "auto-2027-02-24-kronplatz-ski-music-festival-dj-edition": { summary: "Vier Tage elektronische Musik auf den Pisten mit internationalen DJs und Après-Ski am Berg." },
    "auto-2027-02-27-gare-di-sci-alla-vecchia-maniera": { summary: "Gaudirennen mit Holzskiern und historischer Skikleidung – schräge Kurven und Retro-Stimmung inklusive." },
    "auto-2027-03-06-invito-alla-gara-internazionale-all-insegna-di-divertimento-e-nostalgi": { summary: "Internationales Schneerennen mit Spaß, Vintage-Looks und einer guten Portion Nostalgie." },
    "auto-2027-03-07-dolomites-dirndl-ski-day": { summary: "Skitag nur für Frauen mit Dirndl, viel Farbe und sportlicher Challenge zum Weltfrauentag." },
    "auto-2027-03-18-rock-the-dolomites-winter-music-festival": { summary: "Zehn Tage Livemusik, Skifahren und Frühlingssonne beim Winter Music Festival in den Dolomiten." },
    "auto-2027-03-20-spring-race-party-ortisei": { summary: "Frühlingsrennen für Ski und Snowboard mit Abschlussparty im Zentrum von St. Ulrich." },
    "auto-2027-03-20-gara-della-nostalgia": { summary: "Retro-Tag im gesamten Skigebiet mit historischer Ausrüstung und nostalgischer Stimmung." },
    "auto-2027-03-29-schwemmalm-open-air": { summary: "Open-Air-Saisonfinale an der Bergstation mit Musik und Jubiläumsparty zum 50-jährigen Bestehen." },
    "3-zinnen-schlager": { summary: "Eine Woche voller Schlager, Hüttenpartys und Themenabende: Ganz in Weiß, Tiroler Abend und LED-Party.", place: "Toblach · Gebiet 3 Zinnen", tags: ["Après-Ski", "Dresscode"] },
    "lockenfest-funes": { title: "Lockenfest mit Retro Party", summary: "Ski, Rodeln, Snowboards und Vintage-Looks auf dem Eis; danach Aftershow-Party in der Feuerwehrhalle.", place: "Skilift Filler · St. Magdalena, Villnöss", tags: ["Retro", "Alles, was rutscht"] },
    "rock-meets-beats": { summary: "Gitarren, Hits und DJ-Sets beim kostenlosen Après-Ski am Fuße der Dolomiten, von 16:00 bis 23:00 Uhr.", place: "Str. Mëisules 145 · Wolkenstein in Gröden", tags: ["Live + DJ", "Eintritt frei"] },
    "val-gardena-winter-finals": { summary: "Opening-Party, sechs Hütten an sechs Tagen und ein großes Open-Air-Finale an der Ciampinoi-Bahn.", place: "Wolkenstein in Gröden · Hütten und Dorfzentrum", tags: ["8 Tage", "Electronic"] },
    "oldschool-skiday-solda": { summary: "Klassische Ski, Omas Holzlatten, Neon-Stirnbänder und Retro-Après-Ski. Von 09:00 Uhr bis in die Nacht.", place: "Seilbahn Sulden · Stilfs", tags: ["Old School", "80er-Skianzüge"] },
    "ski-carousel-vintage-party": { summary: "Zwei Tage zwischen Hütten, Vintage Village in La Villa, Rennen auf alten Skiern und Afterparty in Corvara.", place: "Alta Badia · La Villa, La Para und Corvara", tags: ["Vintage", "No carving"] },
  },
  en: {
    "auto-2026-12-11-bruning-krampus-the-after-show-party": { summary: "Krampus parade afterparty with DJ sets, music and spooky themed décor until 1 am." },
    "auto-2027-01-02-back-to-1976-giornata-di-sci-old-school-con-simon-mac-live": { summary: "A 1976-style ski day with vintage outfits, sunrise skiing and live music from Simon & Mac." },
    "auto-2027-01-09-dj-armino-live": { summary: "DJ sets and live music at the Ausser Schwemmalm hut, with free admission." },
    "auto-2027-02-24-kronplatz-ski-music-festival-dj-edition": { summary: "Four days of electronic music on the slopes with international DJs and high-altitude après-ski." },
    "auto-2027-02-27-gare-di-sci-alla-vecchia-maniera": { summary: "A playful race on wooden skis with period outfits, wild turns and plenty of retro atmosphere." },
    "auto-2027-03-06-invito-alla-gara-internazionale-all-insegna-di-divertimento-e-nostalgi": { summary: "An international snow race centred on fun, vintage looks and a generous dose of nostalgia." },
    "auto-2027-03-07-dolomites-dirndl-ski-day": { summary: "A women-only ski day with dirndls, colour and a sporting challenge for International Women’s Day." },
    "auto-2027-03-18-rock-the-dolomites-winter-music-festival": { summary: "Ten days of live music, skiing and spring sunshine at the Dolomites Winter Music Festival." },
    "auto-2027-03-20-spring-race-party-ortisei": { summary: "A spring ski and snowboard competition followed by a party in the centre of Ortisei." },
    "auto-2027-03-20-gara-della-nostalgia": { summary: "A resort-wide retro day with vintage equipment and a nostalgic atmosphere." },
    "auto-2027-03-29-schwemmalm-open-air": { summary: "End-of-season open-air party at the top station, with music and a 50th-anniversary celebration." },
    "3-zinnen-schlager": { summary: "A week of Schlager, mountain-hut parties and themed nights: all in white, Tyrolean style and LED.", place: "Dobbiaco / Toblach · 3 Zinnen area", tags: ["Après-ski", "Dress code"] },
    "lockenfest-funes": { title: "Locken Festival with Retro Party", summary: "Skis, sledges, snowboards and vintage looks on the ice, followed by an aftershow party at the fire station.", place: "Filler ski lift · Santa Maddalena, Funes", tags: ["Retro", "Anything that slides"] },
    "rock-meets-beats": { summary: "Guitars, hits and DJ sets at a free après-ski party beneath the Dolomites, from 4 pm to 11 pm.", place: "Str. Mëisules 145 · Selva di Val Gardena", tags: ["Live + DJ", "Free entry"] },
    "val-gardena-winter-finals": { summary: "An opening party, six mountain huts in six days and a big open-air finale at the Ciampinoi gondola.", place: "Selva di Val Gardena · mountain huts and village centre", tags: ["8 days", "Electronic"] },
    "oldschool-skiday-solda": { summary: "Classic skis, grandma’s wooden planks, neon headbands and retro après-ski. From 9 am until late.", place: "Solda cable car · Stelvio", tags: ["Old school", "80s ski suits"] },
    "ski-carousel-vintage-party": { summary: "Two days of mountain huts, the Vintage Village in La Villa, a race on old skis and an afterparty in Corvara.", place: "Alta Badia · La Villa, La Para and Corvara", tags: ["Vintage", "No carving"] },
  },
};

const placeTranslations = {
  de: {
    "San Vigilio, Regione dolomitica Plan de Corones": "St. Vigil, Dolomitenregion Kronplatz",
    "Ultimo, Merano e dintorni": "Ulten, Meran und Umgebung",
    "Fiè allo Sciliar, Regione dolomitica Alpe di Siusi": "Völs am Schlern, Dolomitenregion Seiser Alm",
    "Ortisei, Regione dolomitica Val Gardena": "St. Ulrich in Gröden, Dolomitenregion Gröden",
    "Selva/Sëlva, Selva di Val Gardena, Regione dolomitica Val Gardena": "Wolkenstein in Gröden, Dolomitenregion Gröden",
    "Ortisei · Str. Rezia 1": "St. Ulrich · Rezia-Straße 1",
    "Area sciistica di Watles": "Skigebiet Watles",
  },
  en: {
    "San Vigilio, Regione dolomitica Plan de Corones": "San Vigilio, Kronplatz Dolomites Region",
    "Ultimo, Merano e dintorni": "Ultimo, Merano and environs",
    "Fiè allo Sciliar, Regione dolomitica Alpe di Siusi": "Fiè allo Sciliar, Alpe di Siusi Dolomites Region",
    "Ortisei, Regione dolomitica Val Gardena": "Ortisei, Val Gardena Dolomites Region",
    "Selva/Sëlva, Selva di Val Gardena, Regione dolomitica Val Gardena": "Selva di Val Gardena, Val Gardena Dolomites Region",
    "Ortisei · Str. Rezia 1": "Ortisei · 1 Rezia Street",
    "Area sciistica di Watles": "Watles ski area",
  },
};

const placeReplacements = {
  de: [
    ["Regione dolomitica Plan de Corones", "Dolomitenregion Kronplatz"],
    ["Regione dolomitica Val Gardena", "Dolomitenregion Gröden"],
    ["Regione dolomitica Alpe di Siusi", "Dolomitenregion Seiser Alm"],
    ["Regione dolomitica Alta Badia", "Dolomitenregion Alta Badia"],
    ["Regione dolomitica 3 Cime", "Dolomitenregion 3 Zinnen"],
    ["Merano e dintorni", "Meran und Umgebung"],
    ["Selva di Val Gardena", "Wolkenstein in Gröden"],
    ["Fiè allo Sciliar", "Völs am Schlern"],
    ["San Vigilio", "St. Vigil"],
    ["Ortisei", "St. Ulrich in Gröden"],
    ["Ultimo", "Ulten"],
    ["Area sciistica di", "Skigebiet"],
  ],
  en: [
    ["Regione dolomitica Plan de Corones", "Kronplatz Dolomites Region"],
    ["Regione dolomitica Val Gardena", "Val Gardena Dolomites Region"],
    ["Regione dolomitica Alpe di Siusi", "Alpe di Siusi Dolomites Region"],
    ["Regione dolomitica Alta Badia", "Alta Badia Dolomites Region"],
    ["Regione dolomitica 3 Cime", "3 Zinnen Dolomites Region"],
    ["Merano e dintorni", "Merano and environs"],
    ["Area sciistica di", "ski area"],
  ],
};

const valleyLabels = {
  kronplatz: { it: "Plan de Corones", de: "Kronplatz", en: "Kronplatz" },
  ultimo: { it: "Val d’Ultimo", de: "Ultental", en: "Ultimo Valley" },
  gardena: { it: "Val Gardena", de: "Gröden", en: "Val Gardena" },
  threeZinnen: { it: "3 Cime", de: "3 Zinnen", en: "3 Zinnen" },
  funes: { it: "Val di Funes", de: "Villnößtal", en: "Funes Valley" },
  siusi: { it: "Alpe di Siusi", de: "Seiser Alm", en: "Alpe di Siusi" },
  venosta: { it: "Val Venosta", de: "Vinschgau", en: "Venosta Valley" },
  altaBadia: { it: "Alta Badia", de: "Alta Badia", en: "Alta Badia" },
  other: { it: "Altre zone", de: "Andere Gebiete", en: "Other areas" },
};

let currentLanguage = "it";
let currentFilter = "all";
let currentValley = "all";
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

const localizedPlace = (place, language) => {
  if (language === "it") return place;
  const exactTranslation = placeTranslations[language]?.[place];
  if (exactTranslation) return exactTranslation;
  return (placeReplacements[language] || []).reduce(
    (localized, [source, translated]) => localized.split(source).join(translated),
    place,
  );
};

const automaticSummary = (event) => {
  const languageCopy = copy[currentLanguage];
  if (event.categories.includes("retro")) return languageCopy.autoSummaryRetro;
  if (event.categories.includes("costume")) return languageCopy.autoSummaryCostume;
  if (event.categories.includes("apres")) return languageCopy.autoSummaryApres;
  return languageCopy.autoSummaryGeneric;
};

const localizedEvent = (event) => {
  const translation = eventTranslations[currentLanguage]?.[event.id] || {};
  const place = translation.place || localizedPlace(event.place, currentLanguage);
  const title = event.titles?.[currentLanguage] || translation.title || event.title;
  const localized = { ...event, ...translation, title, place };
  if (currentLanguage !== "it" && event.id.startsWith("auto-") && !translation.summary) {
    localized.summary = automaticSummary(event);
  }
  return localized;
};

const valleyKeyFor = (event) => {
  const value = `${event.title} ${event.place} ${event.source}`.toLowerCase();
  if (/plan de corones|kronplatz|san vigilio|brunico/.test(value)) return "kronplatz";
  if (/ultimo|ulten|schwemmalm/.test(value)) return "ultimo";
  if (/val gardena|selva|sëlva|ortisei|urtijëi|wolkenstein/.test(value)) return "gardena";
  if (/3 cime|3 zinnen|dobbiaco|toblach|sesto|sexten/.test(value)) return "threeZinnen";
  if (/funes|villnöss|villnoess/.test(value)) return "funes";
  if (/fiè|fie allo sciliar|alpe di siusi|seiser alm/.test(value)) return "siusi";
  if (/watles|solda|sulden|stelvio|stilfs|venosta|vinschgau|malles/.test(value)) return "venosta";
  if (/alta badia|la villa|corvara|badia/.test(value)) return "altaBadia";
  return "other";
};

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
  const article = element("article", "event-card");
  article.dataset.categories = event.categories.join(" ");
  article.dataset.valley = valleyKeyFor(rawEvent);
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
    const eventsInValley = cachedEvents.filter((event) => currentValley === "all" || valleyKeyFor(event) === currentValley);
    const count = category === "all" ? eventsInValley.length : eventsInValley.filter((event) => event.categories.includes(category)).length;
    button.querySelector(".filter-count").textContent = count;
  });
};

const renderValleyOptions = () => {
  const keys = [...new Set(cachedEvents.map(valleyKeyFor))]
    .sort((a, b) => valleyLabels[a][currentLanguage].localeCompare(valleyLabels[b][currentLanguage]));
  const allOption = element("option", "", copy[currentLanguage].allValleys);
  allOption.value = "all";
  const options = keys.map((key) => {
    const count = cachedEvents.filter((event) => valleyKeyFor(event) === key).length;
    const option = element("option", "", `${valleyLabels[key][currentLanguage]} · ${count}`);
    option.value = key;
    return option;
  });
  valleySelect.replaceChildren(allOption, ...options);
  if (!keys.includes(currentValley)) currentValley = "all";
  valleySelect.value = currentValley;
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
    const matchesMood = selected === "all" || card.dataset.categories.split(" ").includes(selected);
    const matchesValley = currentValley === "all" || card.dataset.valley === currentValley;
    const show = matchesMood && matchesValley;
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
  renderValleyOptions();
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
valleySelect.addEventListener("change", () => {
  currentValley = valleySelect.value;
  updateCounts();
  applyFilter(currentFilter);
});
languageButtons.forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.language, true)));
setLanguage(preferredLanguage());
loadEvents();
