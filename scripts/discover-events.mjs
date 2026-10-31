import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcesPath = path.join(repositoryRoot, "data", "discovery-sources.json");
const candidatesPath = path.join(repositoryRoot, "data", "event-candidates.json");
const eventsPath = path.join(repositoryRoot, "dist", "events.json");
const offline = process.env.AUTO_UPDATE_OFFLINE === "1";
const apifyToken = process.env.APIFY_TOKEN?.trim();

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
  "music festival", "season opening", "season closing", "winter finals"
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

const locationName = (location) => {
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
  const html = await fetchHtml(source.url);
  const structuredEvents = parseJsonLdEvents(html);
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
        excerpt: typeof event.description === "string" ? event.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500) : null
      };
    })
    .filter((candidate) => candidate.title && candidate.start && candidate.end >= today)
    .filter((candidate) => isRelevant(`${candidate.title} ${candidate.excerpt || ""} ${candidate.location || ""}`))
    .filter((candidate) => !knownEvents.some((event) => titleScore(event.title, candidate.title) >= 0.65 && event.start === candidate.start));

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

const scanInstagram = async (sources, knownEvents) => {
  const endpoint = new URL("https://api.apify.com/v2/actors/apify~instagram-scraper/run-sync-get-dataset-items");
  endpoint.searchParams.set("token", apifyToken);
  endpoint.searchParams.set("timeout", "120");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      resultsType: "posts",
      directUrls: sources.map((source) => source.url),
      resultsLimit: 6,
      onlyPostsNewerThan: "21 days",
      skipPinnedPosts: true
    }),
    signal: AbortSignal.timeout(130000)
  });
  if (!response.ok) throw new Error(`Apify HTTP ${response.status}`);
  const items = await response.json();
  if (!Array.isArray(items)) throw new Error("Apify response is not a dataset");

  const sourceByUsername = new Map(sources.map((source) => [instagramUsername(source.url), source]));
  const candidates = items
    .map((item) => {
      const source = sourceByUsername.get(String(item.ownerUsername || "").toLowerCase())
        || sourceByUsername.get(instagramUsername(item.inputUrl || ""));
      const caption = typeof item.caption === "string" ? item.caption.replace(/\s+/g, " ").trim() : "";
      if (!source || !caption || !isRelevant(caption)) return null;
      const publishedAt = typeof item.timestamp === "string" ? item.timestamp : null;
      const url = item.url || (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : source.url);
      const title = caption.split(/[.!?\n]/)[0].slice(0, 120) || `${source.name} social candidate`;
      if (knownEvents.some((event) => titleScore(event.title, title) >= 0.8)) return null;
      return {
        id: `${source.id}-${item.shortCode || slug(`${publishedAt}-${title}`)}`,
        kind: "instagram",
        title,
        start: null,
        end: null,
        location: item.locationName || null,
        publishedAt,
        url,
        sourceId: source.id,
        sourceName: source.name,
        excerpt: caption.slice(0, 500)
      };
    })
    .filter(Boolean);

  const countBySource = new Map();
  candidates.forEach((candidate) => countBySource.set(candidate.sourceId, (countBySource.get(candidate.sourceId) || 0) + 1));
  return {
    reports: sources.map((source) => ({
      id: source.id,
      name: source.name,
      kind: "instagram",
      url: source.url,
      status: "checked",
      found: countBySource.get(source.id) || 0
    })),
    candidates
  };
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
const webResults = await Promise.all(sources.web.map(async (source) => {
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

let instagramStatus = "awaiting-token";
if (!apifyToken) {
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
    instagramStatus = "checked";
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

const uniqueCandidates = [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()]
  .sort((a, b) => (a.start || a.publishedAt || "9999").localeCompare(b.start || b.publishedAt || "9999"));
const output = {
  lastChecked: today,
  summary: {
    webSources: sources.web.length,
    instagramSources: sources.instagram.length,
    instagramStatus,
    candidates: uniqueCandidates.length
  },
  sources: reports,
  candidates: uniqueCandidates
};

await writeFile(candidatesPath, `${JSON.stringify(output, null, 2)}\n`);
const unavailable = reports.filter((source) => source.status === "unavailable").length;
console.log(`Discovery checked: web=${sources.web.length}, instagram=${instagramStatus}, candidates=${uniqueCandidates.length}, unavailable=${unavailable}`);
