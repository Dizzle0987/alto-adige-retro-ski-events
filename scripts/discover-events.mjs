import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fetchLocalizedTitles } from "./localized-titles.mjs";
import { assessInstagramPost, sameSocialEvent, mergeSocialAnnouncement } from "./social-events.mjs";
import { checkApifyFreeBudget } from "./apify-budget.mjs";

const repositoryRoot = process.env.DISCOVERY_DATA_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcesPath = path.join(repositoryRoot, "data", "discovery-sources.json");
const candidatesPath = path.join(repositoryRoot, "data", "event-candidates.json");
const eventsPath = path.join(repositoryRoot, "dist", "events.json");
const offline = process.env.AUTO_UPDATE_OFFLINE === "1";
const apifyToken = process.env.APIFY_TOKEN?.trim();
const replayPath = process.env.SOCIAL_REPLAY_PATH;
const replayLast = process.env.APIFY_REPLAY_LAST === "1";
const monthLabels = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"];

const todayInRome = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const cleanText = (value = "") => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const titleScore = (expected, candidate) => {
  const expectedTokens = new Set(cleanText(expected).split(" ").filter((token) => token.length > 2));
  const candidateTokens = new Set(cleanText(candidate).split(" ").filter((token) => token.length > 2));
  if (!expectedTokens.size || !candidateTokens.size) return 0;
  const matches = [...expectedTokens].filter((token) => candidateTokens.has(token)).length;
  return matches / expectedTokens.size;
};

const relevanceTerms = [
  "retro", "vintage", "oldschool", "old school", "bad taste", "ugly outfit",
  "80er", "90er", "anni 80", "anni 90", "tekknoalpin", "schlager",
  "apres ski", "ski party", "snow party", "mountain party", "hut party",
  "huttenparty", "party", "techno", "tekkno", "dj", "live music",
  "music festival", "festival dj", "season opening", "season closing", "winter finals",
  "nostalgia", "nostalgie", "nostalgisch", "vecchia maniera", "dirndl",
  "spring race", "open air", "skifasching", "carnevale sugli sci"
].map(cleanText);

const isRelevant = (value) => {
  const text = cleanText(value);
  return relevanceTerms.some((term) => text.includes(term));
};

const isEventType = (type) => {
  const types = Array.isArray(type) ? type : [type];
  return types.some((value) => typeof value === "string" && value.toLowerCase() === "event");
};

const collectEvents = (value, results = []) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEvents(item, results));
  } else if (value && typeof value === "object") {
    if (isEventType(value["@type"])) results.push(value);
    Object.values(value).forEach((item) => collectEvents(item, results));
  }
  return results;
};

const parseJsonLdEvents = (html) => {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const events = [];
  for (const script of scripts) {
    try {
      collectEvents(JSON.parse(script[1].trim()), events);
    } catch {
      // A malformed metadata block must not stop the rest of the source scan.
    }
  }
  return events;
};

const isoDate = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const labelsFor = (startIso, endIso) => {
  const start = new Date(`${startIso}T12:00:00Z`);
  const end = new Date(`${endIso}T12:00:00Z`);
  const startDay = String(start.getUTCDate()).padStart(2, "0");
  const endDay = String(end.getUTCDate()).padStart(2, "0");
  const startMonth = monthLabels[start.getUTCMonth()];
  const endMonth = monthLabels[end.getUTCMonth()];
  return {
    dateLabel: startIso === endIso ? startDay : `${startDay}–${endDay}`,
    monthLabel: start.getUTCMonth() === end.getUTCMonth() ? startMonth : `${startMonth}/${endMonth}`,
    year: start.getUTCFullYear() === end.getUTCFullYear()
      ? String(start.getUTCFullYear())
      : `${start.getUTCFullYear()}/${String(end.getUTCFullYear()).slice(-2)}`
  };
};

const locationName = (location) => {
  if (Array.isArray(location)) return location.map(locationName).filter(Boolean).join(" · ") || null;
  if (typeof location === "string") return location;
  if (!location || typeof location !== "object") return null;
  const address = location.address;
  const parts = [
    location.name,
    typeof address === "string" ? address : address?.streetAddress,
    typeof address === "object" ? address?.addressLocality : null
  ].filter(Boolean);
  return [...new Set(parts)].join(" · ") || null;
};

const absoluteUrl = (value, base) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || !raw.trim()) return base;
  try {
    return new URL(raw, base).href;
  } catch {
    return base;
  }
};

const decodeHtml = (value = "") => value
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&apos;|&#39;/gi, "'")
  .replace(/&nbsp;/gi, " ")
  .replace(/&auml;/gi, "ä")
  .replace(/&ouml;/gi, "ö")
  .replace(/&uuml;/gi, "ü")
  .replace(/&szlig;/gi, "ß");

const stripHtml = (value = "") => decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

const localizedMonths = new Map([
  ["gennaio", "01"], ["febbraio", "02"], ["marzo", "03"], ["aprile", "04"],
  ["maggio", "05"], ["giugno", "06"], ["luglio", "07"], ["agosto", "08"],
  ["settembre", "09"], ["ottobre", "10"], ["novembre", "11"], ["dicembre", "12"],
  ["january", "01"], ["february", "02"], ["march", "03"], ["april", "04"],
  ["may", "05"], ["june", "06"], ["july", "07"], ["august", "08"],
  ["september", "09"], ["october", "10"], ["november", "11"], ["december", "12"],
  ["januar", "01"], ["februar", "02"], ["märz", "03"], ["mai", "05"],
  ["juni", "06"], ["juli", "07"], ["oktober", "10"], ["dezember", "12"]
]);

const localizedDate = (value) => {
  const match = stripHtml(value).toLowerCase().match(/(\d{1,2})\s+([a-zà-ÿ]+)\s+(\d{4})/i);
  const month = match ? localizedMonths.get(match[2]) : null;
  return match && month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : null;
};

const isSkiSeasonDate = (value) => {
  const month = Number(value?.slice(5, 7));
  return month >= 11 || month <= 4;
};

const attr = (attributes, name) => {
  const match = attributes.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? decodeHtml(match[1]) : null;
};

const parseSouthTyrolCards = (html, baseUrl) => {
  const cards = [];
  const articles = html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi);
  for (const article of articles) {
    const attributes = article[1];
    if (!/event-experience-card/i.test(attributes)) continue;
    const body = article[2];
    const title = attr(attributes, "aria-label") || stripHtml(body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || "");
    const url = absoluteUrl(attr(attributes, "data-href"), baseUrl);
    const location = stripHtml(body.match(/<p[^>]*class=["'][^"']*location[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || "") || null;
    const dates = [...body.matchAll(/<p[^>]*class=["'][^"']*title\s+date[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => localizedDate(match[1]))
      .filter(Boolean)
      .sort();
    if (title && url && dates.length) cards.push({ title, url, location, start: dates[0], end: dates.at(-1) });
  }
  return cards;
};

const slug = (value) => cleanText(value).replace(/ /g, "-").slice(0, 70) || "candidate";

const fetchHtml = async (url) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "RetroSkiEventsBot/1.1 (+https://github.com/Dizzle0987/alto-adige-retro-ski-events)",
      "accept-language": "de-DE,de;q=0.9,it;q=0.8,en;q=0.7"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
};

const scanWebSource = async (source, today, knownEvents) => {
  if (source.type === "south-tyrol-listing") return scanSouthTyrolListing(source, today, knownEvents);
  if (source.type === "lts-event") return scanLtsEvent(source, today, knownEvents);
  const html = await fetchHtml(source.url);
  const structuredEvents = parseJsonLdEvents(html);
  const titles = structuredEvents.length === 1
    ? await fetchLocalizedTitles({ html, pageUrl: source.url, fetchHtml })
    : {};
  const candidates = structuredEvents
    .map((event) => {
      const start = isoDate(event.startDate);
      const end = isoDate(event.endDate || event.startDate);
      const title = typeof event.name === "string" ? event.name.trim() : "";
      const location = locationName(event.location);
      return {
        id: `${source.id}-${start || "undated"}-${slug(title)}`,
        kind: "web",
        title,
        start,
        end,
        location,
        url: absoluteUrl(event.url || event.mainEntityOfPage, source.url),
        sourceId: source.id,
        sourceName: source.name,
        titles,
        excerpt: typeof event.description === "string" ? event.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500) : null
      };
    })
    .filter((candidate) => candidate.title && candidate.start && candidate.end >= today && isSkiSeasonDate(candidate.start))
    .filter((candidate) => isRelevant(`${candidate.title} ${candidate.excerpt || ""} ${candidate.location || ""}`))
    .filter((candidate) => !knownEvents.some((event) => titleScore(event.title, candidate.title) >= 0.65 && event.start === candidate.start));

  return {
    report: { id: source.id, name: source.name, kind: "web", url: source.url, status: "checked", found: candidates.length },
    candidates
  };
};

const scanLtsEvent = async (source, today, knownEvents) => {
  const html = await fetchHtml(source.url);
  const titles = await fetchLocalizedTitles({ html, pageUrl: source.url, fetchHtml });
  const title = stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  const dates = [...html.matchAll(/data-days=["']([^"']+)["']/gi)]
    .flatMap((match) => match[1].match(/\d{4}-\d{2}-\d{2}/g) || [])
    .sort();
  const description = stripHtml(html.match(/<div class=["']base-slide__block["']>([\s\S]*?)<\/div>/i)?.[1] || "").slice(0, 500) || null;
  const locationBlock = html.match(/<div class=["']sidebar-item__title["']>\s*Luogo\s*<\/div>([\s\S]*?)<\/div>\s*<\/div>/i)?.[1] || "";
  const location = [...locationBlock.matchAll(/<div class=["']sidebar-item__row["'][^>]*>([\s\S]*?)<\/div>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean)
    .join(" · ") || null;
  const start = dates[0] || null;
  const end = dates.at(-1) || start;
  const known = knownEvents.some((event) => event.start === start && titleScore(event.title, title) >= 0.65);
  const candidate = !known && title && start && end >= today && isSkiSeasonDate(start) && isRelevant(`${title} ${description || ""}`)
    ? [{
        id: `${source.id}-${start}-${slug(title)}`,
        kind: "web",
        title,
        start,
        end,
        location,
        url: source.url,
        sourceId: source.id,
        sourceName: source.name,
        titles,
        excerpt: description
      }]
    : [];
  return {
    report: { id: source.id, name: source.name, kind: "web", url: source.url, status: "checked", found: candidate.length },
    candidates: candidate
  };
};

const scanSouthTyrolListing = async (source, today, knownEvents) => {
  const pageCount = Math.max(1, Math.min(Number(source.pages) || 1, 12));
  const pageUrls = Array.from({ length: pageCount }, (_, index) => index === 0 ? source.url : `${source.url}.page${index + 1}`);
  const pages = await Promise.all(pageUrls.map((url) => fetchHtml(url)));
  const cards = [...new Map(pages
    .flatMap((html, index) => parseSouthTyrolCards(html, pageUrls[index]))
    .map((card) => [card.url, card])).values()]
    .filter((card) => card.end >= today && isSkiSeasonDate(card.start) && isRelevant(`${card.title} ${card.location || ""}`))
    .filter((card) => !knownEvents.some((event) => titleScore(event.title, card.title) >= 0.65 && event.start === card.start));

  const candidates = (await Promise.all(cards.map(async (card) => {
    try {
      const detailHtml = await fetchHtml(card.url);
      const titles = await fetchLocalizedTitles({ html: detailHtml, pageUrl: card.url, fetchHtml });
      const detailEvents = parseJsonLdEvents(detailHtml)
        .map((event) => ({ event, score: titleScore(card.title, event.name || "") }))
        .sort((a, b) => b.score - a.score);
      const detail = detailEvents[0]?.event;
      const title = typeof detail?.name === "string" ? detail.name.trim() : card.title;
      const start = isoDate(detail?.startDate) || card.start;
      const end = isoDate(detail?.endDate || detail?.startDate) || card.end;
      return {
        id: `${source.id}-${start}-${slug(title)}`,
        kind: "web",
        title,
        start,
        end,
        location: locationName(detail?.location) || card.location,
        url: absoluteUrl(detail?.url || detail?.mainEntityOfPage, card.url),
        sourceId: source.id,
        sourceName: source.name,
        titles,
        excerpt: typeof detail?.description === "string" ? stripHtml(detail.description).slice(0, 500) : null
      };
    } catch {
      return {
        id: `${source.id}-${card.start}-${slug(card.title)}`,
        kind: "web",
        ...card,
        sourceId: source.id,
        sourceName: source.name,
        excerpt: null
      };
    }
  }))).filter((candidate) => candidate.title && candidate.start && candidate.end && candidate.location && candidate.url);

  return {
    report: { id: source.id, name: source.name, kind: "web", url: source.url, status: "checked", found: candidates.length },
    candidates
  };
};

const instagramUsername = (url) => {
  try {
    return new URL(url).pathname.split("/").filter(Boolean)[0]?.toLowerCase() || "";
  } catch {
    return "";
  }
};

const eventPalette = ["#ff4fa3", "#5b5df0", "#ff7439", "#00bfa6", "#b0ef43", "#f5ec35"];

const socialForCandidate = (candidate) => {
  const value = cleanText(`${candidate.title} ${candidate.location || ""} ${candidate.sourceName || ""}`);
  if (value.includes("kronplatz") || value.includes("plan de corones") || value.includes("brunico")) return "https://www.instagram.com/kronplatz_group/";
  if (value.includes("val gardena") || value.includes("ortisei") || value.includes("selva")) return "https://www.instagram.com/dolomitesvalgardena/";
  if (value.includes("alta badia") || value.includes("corvara") || value.includes("la villa")) return "https://www.instagram.com/alta_badia_official/";
  if (value.includes("3 zinnen") || value.includes("3 cime") || value.includes("dobbiaco") || value.includes("sesto")) return "https://www.instagram.com/3zinnendolomites/";
  if (value.includes("ahrntal") || value.includes("speikboden") || value.includes("klausberg")) return "https://www.instagram.com/skiworldahrntal_official/";
  if (value.includes("obereggen") || value.includes("ganischger")) return "https://www.instagram.com/ganischger.obereggen/";
  return null;
};

const classificationsForCandidate = (candidate) => {
  const value = cleanText(`${candidate.title} ${candidate.excerpt || ""}`);
  const retro = ["retro", "vintage", "oldschool", "old school", "nostalg", "vecchia maniera", "anni 80", "80er"].some((term) => value.includes(cleanText(term)));
  const costume = retro || ["dirndl", "dress code", "ugly outfit", "bad taste", "costume", "carnevale"].some((term) => value.includes(cleanText(term)));
  const apres = ["apres", "party", "music", "musica", "dj", "festival", "schlager", "tekkno", "live", "open air"].some((term) => value.includes(cleanText(term)));
  const categories = [retro && "retro", costume && "costume", apres && "apres"].filter(Boolean);
  if (!categories.length) categories.push("retro");
  const tags = [
    retro && "Retro",
    value.includes("vintage") && "Vintage",
    value.includes("nostalg") && "Nostalgia",
    value.includes("dirndl") && "Dress code",
    value.includes("dj") && "DJ",
    value.includes("live") && "Live music",
    apres && "Après-ski"
  ].filter(Boolean);
  return { categories, tags: [...new Set(tags)].slice(0, 3).length ? [...new Set(tags)].slice(0, 3) : ["Ski event"] };
};

const conciseSummary = (candidate) => {
  const fallback = `Evento sulla neve a ${candidate.location}, con programma e dettagli nella fonte ufficiale.`;
  const text = (candidate.excerpt || fallback).replace(/\s+/g, " ").trim();
  if (text.length <= 240) return text;
  const shortened = text.slice(0, 237).replace(/\s+\S*$/, "");
  return `${shortened}…`;
};

const siteEventFromCandidate = (candidate, index) => {
  const classifications = classificationsForCandidate(candidate);
  return {
    id: candidate.kind === "instagram" ? `auto-${candidate.sourceId}-${candidate.start}-${slug(candidate.title)}` : `auto-${candidate.start}-${slug(candidate.title)}`,
    title: candidate.title,
    ...(candidate.titles && Object.keys(candidate.titles).length ? { titles: candidate.titles } : {}),
    start: candidate.start,
    end: candidate.end,
    ...labelsFor(candidate.start, candidate.end),
    categories: classifications.categories,
    tags: classifications.tags,
    summary: conciseSummary(candidate),
    place: candidate.location,
    source: candidate.url,
    social: candidate.kind === "instagram" ? sources.instagram.find((source) => source.id === candidate.sourceId)?.url : socialForCandidate(candidate),
    ...(candidate.kind === "instagram" ? {
      socialSourceId: candidate.sourceId,
      provenance: [candidate.evidence],
      ...(candidate.hours ? { hours: candidate.hours } : {}),
      ...(candidate.endsAtDate ? { endsAtDate: candidate.endsAtDate } : {}),
    } : {}),
    map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(candidate.location)}`,
    accent: eventPalette[index % eventPalette.length],
    featured: false
  };
};

const scanInstagram = async (sources, knownEvents) => {
  const budget = await checkApifyFreeBudget(apifyToken);
  if (!budget.allowed) return {
    status: budget.reason,
    reports: sources.map((source) => ({ id: source.id, name: source.name, kind: "instagram", url: source.url, status: budget.reason, found: 0 })),
    candidates: [],
  };
  const endpoint = new URL("https://api.apify.com/v2/actors/apify~instagram-scraper/run-sync-get-dataset-items");
  endpoint.searchParams.set("maxTotalChargeUsd", String(budget.maxRunUsd));
  endpoint.searchParams.set("timeout", "120");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apifyToken}` },
    body: JSON.stringify({
      resultsType: "posts",
      directUrls: sources.map((source) => source.url),
      resultsLimit: 6,
      onlyPostsNewerThan: "21 days",
      skipPinnedPosts: false
    }),
    signal: AbortSignal.timeout(130000)
  });
  if (!response.ok) throw new Error(`Apify HTTP ${response.status}`);
  const items = await response.json();
  if (!Array.isArray(items)) throw new Error("Apify response is not a dataset");

  return analyzeInstagramItems(items, sources);
};

const analyzeInstagramItems = (items, sources) => {
  const candidates = items
    .map((item) => {
      const result = assessInstagramPost(item, sources);
      if (["rejected", "ignored"].includes(result.status)) return null;
      return {
        id: `${result.sourceId}-${item.shortCode || slug(result.url)}`,
        title: result.title || "Annuncio da verificare",
        publishedAt: item.timestamp || null,
        excerpt: result.evidence.caption,
        ...result,
      };
    })
    .filter(Boolean);

  const countBySource = new Map();
  candidates.forEach((candidate) => countBySource.set(candidate.sourceId, (countBySource.get(candidate.sourceId) || 0) + 1));
  return {
    status: "checked",
    reports: sources.map((source) => ({
      id: source.id,
      name: source.name,
      kind: "instagram",
      url: source.url,
      status: items.some((item) => String(item.ownerUsername || "").toLowerCase() === instagramUsername(source.url)) ? "checked" : "no-author-data",
      found: countBySource.get(source.id) || 0,
      received: items.filter((item) => String(item.ownerUsername || "").toLowerCase() === instagramUsername(source.url)).length,
    })),
    candidates
  };
};

const replayLastInstagramRun = async () => {
  const get = async (resource) => {
    const response = await fetch(`https://api.apify.com/v2/${resource}`, {
      headers: { authorization: `Bearer ${apifyToken}` }, signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Replay HTTP ${response.status}`);
    return response.json();
  };
  const runs = await get("actors/apify~instagram-scraper/runs?desc=true&limit=1&status=SUCCEEDED");
  const run = runs.data?.items?.[0];
  if (!run?.defaultDatasetId || run.status !== "SUCCEEDED") throw new Error("No successful Instagram run to replay");
  const items = await get(`datasets/${encodeURIComponent(run.defaultDatasetId)}/items?format=json&clean=true`);
  if (!Array.isArray(items)) throw new Error("Replay dataset unavailable");
  return items;
};

const sources = JSON.parse(await readFile(sourcesPath, "utf8"));
const eventsData = JSON.parse(await readFile(eventsPath, "utf8"));
const today = todayInRome();
let previous = { sources: [], candidates: [] };
try {
  previous = JSON.parse(await readFile(candidatesPath, "utf8"));
} catch {
  // First run starts with an empty candidate set.
}

if (offline) {
  console.log(`Discovery skipped in offline mode: web=${sources.web.length}, instagram=${sources.instagram.length}`);
  process.exit(0);
}

const reports = [];
const candidates = [];
const webResults = replayPath || replayLast ? [] : await Promise.all(sources.web.map(async (source) => {
  try {
    return await scanWebSource(source, today, eventsData.events);
  } catch (error) {
    return {
      report: { id: source.id, name: source.name, kind: "web", url: source.url, status: "unavailable", error: error.message },
      candidates: previous.candidates.filter((candidate) => candidate.sourceId === source.id)
    };
  }
}));
webResults.forEach((result) => {
  reports.push(result.report);
  candidates.push(...result.candidates);
});
if (replayPath || replayLast) {
  reports.push(...previous.sources.filter((source) => source.kind === "web").map((source) => ({ ...source, status: "not-checked-replay" })));
  candidates.push(...previous.candidates.filter((candidate) => candidate.kind === "web"));
}

let instagramStatus = "awaiting-token";
if (replayPath || replayLast) {
  if (apifyToken && replayLast) {
    const budget = await checkApifyFreeBudget(apifyToken);
    console.log(`Apify free-credit check (read-only): ${budget.allowed ? "allowed" : "blocked"}, reason=${budget.reason}`);
  }
  const items = replayPath ? JSON.parse(await readFile(replayPath, "utf8")) : await replayLastInstagramRun();
  const replay = analyzeInstagramItems(items, sources.instagram);
  instagramStatus = "replayed";
  reports.push(...replay.reports);
  candidates.push(...replay.candidates);
} else if (!apifyToken) {
  sources.instagram.forEach((source) => reports.push({
    id: source.id,
    name: source.name,
    kind: "instagram",
    url: source.url,
    status: "awaiting-token"
  }));
  candidates.push(...previous.candidates.filter((candidate) => candidate.kind === "instagram"));
} else {
  try {
    const instagram = await scanInstagram(sources.instagram, eventsData.events);
    instagramStatus = instagram.status;
    reports.push(...instagram.reports);
    candidates.push(...instagram.candidates);
  } catch (error) {
    instagramStatus = "unavailable";
    sources.instagram.forEach((source) => reports.push({
      id: source.id,
      name: source.name,
      kind: "instagram",
      url: source.url,
      status: "unavailable",
      error: error.message
    }));
    candidates.push(...previous.candidates.filter((candidate) => candidate.kind === "instagram"));
  }
}

// Keep evidence across runs. Legacy records lack author proof and must never auto-publish.
for (const old of previous.candidates.filter((candidate) => candidate.kind === "instagram")) {
  if (!candidates.some((candidate) => candidate.id === old.id)) {
    candidates.push(old.evidence?.author
      ? old
      : { ...old, status: "review", reason: "legacy-author-unverified" });
  }
}

const uniqueCandidates = [];
for (const candidate of [...new Map(candidates.map((item) => [item.id, item])).values()]
  .sort((a, b) => (a.start || a.publishedAt || "9999").localeCompare(b.start || b.publishedAt || "9999"))) {
  const duplicate = candidate.kind !== "instagram" && uniqueCandidates.some((item) => item.kind !== "instagram" && item.start && item.start === candidate.start && titleScore(item.title, candidate.title) >= 0.7);
  if (!duplicate) uniqueCandidates.push(candidate);
}

const publishable = uniqueCandidates.filter((candidate) => (candidate.kind === "web" || (candidate.kind === "instagram" && candidate.status === "confirmed"))
  && candidate.title && candidate.start && candidate.end && candidate.location && candidate.url);
const beforePrune = eventsData.events.length;
eventsData.events = eventsData.events.filter((event) => !event.id.startsWith("auto-") || isSkiSeasonDate(event.start));
const pruned = beforePrune - eventsData.events.length;
const published = [];
let updated = 0;
for (const candidate of publishable) {
  if (candidate.kind === "instagram") {
    if (candidate.end < today || !isSkiSeasonDate(candidate.start)) continue;
    const source = sources.instagram.find((entry) => entry.id === candidate.sourceId);
    if (!source || !source.autoPublish || candidate.evidence?.author?.toLowerCase() !== instagramUsername(source.url)) continue;
    const matches = eventsData.events.filter((event) => sameSocialEvent(event, candidate)
      || event.provenance?.some((entry) => entry.url === candidate.url));
    if (matches.length) {
      const event = matches[0];
      if (matches.length !== 1 || event.start !== candidate.start || event.end !== candidate.end
        || (event.hours && candidate.hours && JSON.stringify(event.hours) !== JSON.stringify(candidate.hours))) {
        candidate.status = "review";
        candidate.reason = "existing-event-conflict";
        continue;
      }
      const merged = mergeSocialAnnouncement(event, candidate);
      if (JSON.stringify(merged) !== JSON.stringify(event)) {
        eventsData.events[eventsData.events.indexOf(event)] = merged;
        updated += 1;
      }
      candidate.eventId = event.id;
      continue;
    }
    // Cross-channel matches need both a matching date/title and the verified venue.
    const webMatches = eventsData.events.filter((event) => event.start === candidate.start
      && source.venueAliases?.some((alias) => cleanText(event.place).includes(cleanText(alias)))
      && [event.title, ...Object.values(event.titles || {})].some((title) => titleScore(title, candidate.title) >= 0.8));
    if (webMatches.length) {
      if (webMatches.length === 1) {
        const event = webMatches[0];
        eventsData.events[eventsData.events.indexOf(event)] = { ...mergeSocialAnnouncement(event, candidate), socialSourceId: candidate.sourceId };
        candidate.eventId = event.id;
        updated += 1;
      } else { candidate.status = "review"; candidate.reason = "multiple-event-matches"; }
      continue;
    }
  }
  const duplicate = eventsData.events.some((event) => event.start === candidate.start && titleScore(event.title, candidate.title) >= 0.65);
  if (duplicate && candidate.kind !== "instagram") continue;
  const siteEvent = siteEventFromCandidate(candidate, eventsData.events.length + published.length);
  eventsData.events.push(siteEvent);
  candidate.eventId = siteEvent.id;
  published.push(siteEvent.id);
}
if (published.length || pruned || updated) {
  eventsData.lastChecked = today;
  eventsData.events.sort((a, b) => a.start.localeCompare(b.start));
  await writeFile(eventsPath, `${JSON.stringify(eventsData, null, 2)}\n`);
}

uniqueCandidates.forEach((candidate) => {
  candidate.published = Boolean(candidate.eventId && eventsData.events.some((event) => event.id === candidate.eventId))
    || (candidate.kind !== "instagram" && (published.includes(`auto-${candidate.start}-${slug(candidate.title)}`)
    || eventsData.events.some((event) => event.start === candidate.start && titleScore(event.title, candidate.title) >= 0.65)));
});
const output = {
  lastChecked: today,
  summary: {
    webSources: sources.web.length,
    instagramSources: sources.instagram.length,
    instagramStatus,
    candidates: uniqueCandidates.length,
    published: published.length,
    updated,
    pruned
  },
  sources: reports,
  candidates: uniqueCandidates
};

await writeFile(candidatesPath, `${JSON.stringify(output, null, 2)}\n`);
const unavailable = reports.filter((source) => source.status === "unavailable").length;
console.log(`Discovery checked: web=${sources.web.length}, instagram=${instagramStatus}, candidates=${uniqueCandidates.length}, published=${published.length}, pruned=${pruned}, unavailable=${unavailable}`);
