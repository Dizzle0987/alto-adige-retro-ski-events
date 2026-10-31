export const normalizeSocialText = (value = "") => String(value).normalize("NFKC")
  .replace(/\u00a0/g, " ").replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
const folded = (text) => normalizeSocialText(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const months = [
  ["january", "januar", "gennaio", "jan", "gen"], ["february", "februar", "febbraio", "feb"],
  ["march", "marz", "maerz", "marzo", "mar"], ["april", "aprile", "apr"],
  ["may", "mai", "maggio", "mag"], ["june", "juni", "giugno", "jun", "giu"],
  ["july", "juli", "luglio", "jul", "lug"], ["august", "agosto", "aug", "ago"],
  ["september", "settembre", "sept", "sep", "set"], ["october", "oktober", "ottobre", "oct", "okt", "ott"],
  ["november", "novembre", "nov"], ["december", "dezember", "dicembre", "dec", "dez", "dic"],
];
const monthLookup = new Map(months.flatMap((names, index) => names.map((name) => [name, index + 1])));
const monthPattern = [...monthLookup.keys()].sort((a, b) => b.length - a.length).join("|");
const iso = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10) : null;
};
const addDays = (date, days) => new Date(new Date(`${date}T12:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
const romeDate = (timestamp) => {
  if (typeof timestamp !== "string" || !timestamp) return null;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const parseSocialDates = (caption, publishedAt) => {
  const text = folded(caption);
  const publication = romeDate(publishedAt);
  if (!publication) return { status: "review", reason: "missing-publication-date" };
  if (/\b\d{1,2}[./]\d{1,2}[./]\d{2}\b/.test(text)) return { status: "review", reason: "ambiguous-year" };
  if (/\b(throwback|ruckblick|ricordi|l['’]anno scorso|last year|letztes jahr|recap|was a blast)\b/.test(text)) {
    return { status: "review", reason: "retrospective" };
  }
  // Ticket sale dates and multiple programmes require contextual review.
  if (/\b(prevendita|vorverkauf|presale|ticket sales|verschoben|postponed|rinviat[oa]|abgesagt|cancelled|canceled|annullat[oa])\b/.test(text)) {
    return { status: "review", reason: "schedule-or-ticket-update" };
  }
  const matches = [];
  const occupied = [];
  const add = (match, day, endDay, month, year, format) => {
    if (occupied.some(([start, end]) => match.index >= start && match.index < end)) return;
    occupied.push([match.index, match.index + match[0].length]);
    matches.push({ day: Number(day), endDay: Number(endDay || day), month: Number(month), year: year ? Number(year) : null, format, evidence: match[0], index: match.index });
  };
  for (const m of text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) add(m, m[3], null, m[2], m[1], "iso");
  for (const m of text.matchAll(new RegExp(`\\b(\\d{1,2})\\.?\\s*(?:(?:[-–—]|bis|to|al)\\s*(\\d{1,2})\\.?\\s*)?(?:di\\s+)?(${monthPattern})\\.?(?:\\s*,?\\s*(20\\d{2}))?\\b`, "g"))) {
    add(m, m[1], m[2], monthLookup.get(m[3]), m[4], "named");
  }
  for (const m of text.matchAll(new RegExp(`\\b(${monthPattern})\\.?\\s+(\\d{1,2})(?:\\s*(?:[-–—]|to)\\s*(\\d{1,2}))?(?:\\s*,?\\s*(20\\d{2}))?\\b`, "g"))) {
    add(m, m[2], m[3], monthLookup.get(m[1]), m[4], "named");
  }
  for (const m of text.matchAll(/\b(\d{1,2})\.?\s*[-–—]\s*(\d{1,2})[./](\d{1,2})(?:[./](20\d{2}))?\.?/g)) add(m, m[1], m[2], m[3], m[4], "numeric");
  for (const m of text.matchAll(/\b(\d{1,2})([./])(\d{1,2})(?:\2(20\d{2}))?\b/g)) {
    // A dotted clock such as 18.00 Uhr is not a date.
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 8);
    if (!m[4] && (/^\s*(?:uhr|h\b)/.test(tail) || Number(m[3]) === 0)) continue;
    add(m, m[1], null, m[3], m[4], m[2] === "/" ? "slash" : "numeric");
  }
  const relative = [...text.matchAll(/\b(tomorrow|morgen|domani|today|heute|oggi)\b/g)];
  const dates = [];
  for (const value of matches) {
    if (value.format === "slash" && value.month > 12 && value.day <= 12) {
      [value.day, value.month] = [value.month, value.day];
      value.endDay = value.day;
    }
    if (value.format === "slash" && value.day <= 12 && value.month <= 12 && value.day !== value.month) {
      return { status: "review", reason: "ambiguous-date", evidence: value.evidence };
    }
    let year = value.year || Number(publication.slice(0, 4));
    let start = iso(year, value.month, value.day);
    let end = iso(year, value.month, value.endDay);
    if (!start || !end || end < start) return { status: "review", reason: "invalid-date", evidence: value.evidence };
    if (!value.year && end < addDays(publication, -7)) {
      year += 1;
      start = iso(year, value.month, value.day);
      end = iso(year, value.month, value.endDay);
    }
    if (!start || !end || (!value.year && start > addDays(publication, 180))) {
      return { status: "review", reason: "uncertain-year", evidence: value.evidence };
    }
    if (end < publication) return { status: "review", reason: "past-at-publication", evidence: value.evidence };
    const weekdays = ["sonntag|sunday|domenica", "montag|monday|lunedi", "dienstag|tuesday|martedi", "mittwoch|wednesday|mercoledi", "donnerstag|thursday|giovedi", "freitag|friday|venerdi", "samstag|saturday|sabato"];
    const preceding = text.slice(Math.max(0, value.index - 20), value.index);
    const weekday = weekdays.findIndex((names) => new RegExp(`(?:${names})[,\\s]*$`).test(preceding));
    if (weekday !== -1 && new Date(`${start}T12:00:00Z`).getUTCDay() !== weekday) {
      return { status: "review", reason: "weekday-conflict", evidence: value.evidence };
    }
    dates.push({ start, end, evidence: value.evidence, inferredYear: !value.year });
  }
  if (!dates.length && relative.length) {
    for (const match of relative) {
      const date = addDays(publication, /tomorrow|morgen|domani/.test(match[1]) ? 1 : 0);
      dates.push({ start: date, end: date, evidence: match[0], relative: true });
    }
  }
  if (dates.length && relative.length && relative.some((match) => {
    const date = addDays(publication, /tomorrow|morgen|domani/.test(match[1]) ? 1 : 0);
    return !dates.some((range) => range.start <= date && range.end >= date);
  })) return { status: "review", reason: "relative-date-conflict" };
  const unique = [...new Map(dates.map((date) => [`${date.start}/${date.end}`, date])).values()];
  if (unique.length !== 1) return { status: "review", reason: unique.length ? "multiple-dates" : "missing-date" };
  return { status: "confirmed", ...unique[0] };
};

export const parseSocialTimes = (caption) => {
  const text = folded(caption);
  const time = (hour, minute = "00", period) => {
    let h = Number(hour);
    if (period) { if (h < 1 || h > 12) return null; h = h % 12 + (period === "pm" ? 12 : 0); }
    return h <= 23 && Number(minute) <= 59 ? `${String(h).padStart(2, "0")}:${minute.padStart(2, "0")}` : null;
  };
  // Multiple programmes (indoor/outdoor etc.) stay in the source, never flatten into one time.
  const ranges = [...text.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]|bis|to|alle|a)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|uhr)?\b/g)]
    .filter((m) => m[0].includes(":") || /uhr|am|pm/.test(m[0]));
  if (ranges.length === 1) {
    const m = ranges[0];
    const period = m[6] === "uhr" ? undefined : m[6];
    const start = time(m[1], m[2], m[3] || period);
    const end = time(m[4], m[5], period);
    return start && end ? { start, end, overnight: end < start } : null;
  }
  if (ranges.length > 1) return null;
  const m = text.match(/\b(?:ab|dalle|ore|from|starts? at|inizio)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|uhr)?\b/);
  const start = m && time(m[1], m[2], m[3] === "uhr" ? undefined : m[3]);
  return start ? { start } : null;
};

const eventWords = /\b(party|festival|open air|opening|closing|ski ?day|skitag|rennen|race|gara|retro|vintage|schlager|dirndl|bad taste|ugly ski|apres.?ski|dj|live)\b/i;
const eventTitle = (caption, date) => {
  const lines = normalizeSocialText(caption).split(/[\n!]/).map((line) => line
    .replace(/^[^\p{L}\p{N}]+/u, "").replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(new RegExp(date.evidence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "")
    .replace(/\b(?:ab|dalle|ore|from)\s+\d{1,2}(?::\d{2})?\s*(?:uhr|am|pm)?\b.*$/i, "")
    .replace(/\b(?:noch \d+ tage|all the details|hier nochmal).*$/i, "")
    .replace(/[\s:|–—-]+$/g, "").trim());
  const usable = (line) => line.length >= 5 && line.length <= 110
    && !/\b(noch|days? until|tage bis|see you|tomorrow|morgen|domani|winter plans|every weekend|jedes wochenende)\b/i.test(line);
  const strongTitle = lines.find((line) => usable(line) && /\b(party|festival|open air|opening|closing|ski ?day|skitag|rennen|race|gara|retro|vintage|schlager|dirndl|bad taste|ugly ski)\b/i.test(folded(line)));
  // A DJ lineup later in the caption is not the event name.
  const first = lines[0];
  return strongTitle || (first && usable(first) && eventWords.test(folded(first)) && !/[,;&].*\bdj\b/i.test(first) ? first : null);
};

export const officialInstagramSource = (item, sources) => {
  const author = String(item.ownerUsername || "").toLowerCase();
  if (!author) return null;
  const source = sources.find((entry) => new URL(entry.url).pathname.split("/").filter(Boolean)[0]?.toLowerCase() === author);
  if (!source || (source.ownerId && String(item.ownerId || "") !== source.ownerId)) return null;
  if (item.inputUrl) {
    try {
      const input = new URL(item.inputUrl);
      const requested = input.pathname.split("/").filter(Boolean);
      if (!/^(www\.)?instagram\.com$/.test(input.hostname)) return null;
      if (requested.length === 1 && requested[0].toLowerCase() !== author) return null;
    } catch { return null; }
  }
  return source;
};

export const assessInstagramPost = (item, sources) => {
  const source = officialInstagramSource(item, sources);
  if (!source) return { status: "rejected", reason: "unverified-author" };
  const caption = String(item.caption || "").trim();
  let url;
  try {
    const parsed = new URL(item.url || `https://www.instagram.com/p/${item.shortCode || ""}/`);
    if (!/^(www\.)?instagram\.com$/.test(parsed.hostname) || !/^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(parsed.pathname)) throw new Error();
    url = `https://www.instagram.com${parsed.pathname.replace(/\/?$/, "/")}`;
  } catch { return { status: "rejected", reason: "invalid-post-url" }; }
  const evidence = {
    url, author: item.ownerUsername, ownerId: item.ownerId ? String(item.ownerId) : null,
    publishedAt: item.timestamp || null, caption: caption.slice(0, 12000),
  };
  const base = { sourceId: source.id, sourceName: source.name, evidence, url, kind: "instagram" };
  if (!caption || !eventWords.test(folded(caption))) return { ...base, status: "ignored", reason: "not-an-event" };
  if (item.isRepost || item.isSharedPost || (Array.isArray(item.coauthorProducers) && item.coauthorProducers.length)) {
    return { ...base, status: "review", reason: "repost-or-collaboration" };
  }
  const date = parseSocialDates(caption, item.timestamp);
  if (date.status !== "confirmed") return { ...base, status: date.status, reason: date.reason, dateEvidence: date };
  const title = eventTitle(caption, date);
  if (!title) return { ...base, status: "review", reason: "unclear-event-title", date };
  if (!source.venue || !source.autoPublish) return { ...base, status: "review", reason: "venue-not-verified", title, date };
  if (source.venueAliases?.length && item.locationName && !source.venueAliases.some((alias) => folded(item.locationName).includes(folded(alias)))) {
    return { ...base, status: "review", reason: "venue-conflict", title, date };
  }
  const venueMention = caption.match(/\b(?:at|presso|beim|location|venue|veranstaltungsort|luogo)\s*[:@]?\s+([^\n.!?]{2,80})/i);
  if (venueMention && !/^\d/.test(venueMention[1]) && !source.venueAliases?.some((alias) => folded(venueMention[1]).includes(folded(alias)))) {
    return { ...base, status: "review", reason: "explicit-venue-needs-review", title, date };
  }
  // Require the venue in the post's own location or text, not merely the account bio.
  if (!item.locationName && !source.venueAliases?.some((alias) => folded(caption).includes(folded(alias)))) {
    return { ...base, status: "review", reason: "missing-venue-evidence", title, date };
  }
  const hours = parseSocialTimes(caption);
  return {
    ...base, status: "confirmed", reason: "official-announcement", title,
    start: date.start, end: date.end, location: source.venue,
    venue: source.venueName || source.venue.split(" · ")[0], dateEvidence: date,
    hours, ...(hours?.overnight ? { endsAtDate: addDays(date.end, 1) } : {}),
    excerpt: caption, publishedAt: item.timestamp,
  };
};

const identity = (value) => folded(value).replace(/[^a-z0-9]+/g, " ").trim();
export const sameSocialEvent = (a, b) => {
  if (a.socialSourceId !== b.sourceId || a.start !== b.start) return false;
  const tokens = (value) => identity(value).split(" ").filter((word) => word.length > 2 && !["party", "event", "live"].includes(word));
  const left = tokens(a.title), right = new Set(tokens(b.title));
  return left.length > 0 && left.filter((word) => right.has(word)).length / Math.max(left.length, right.size) >= 0.75;
};

export const mergeSocialAnnouncement = (event, candidate) => {
  const provenance = [...(event.provenance || [])];
  const index = provenance.findIndex((entry) => entry.url === candidate.evidence.url);
  if (index < 0) provenance.push(candidate.evidence); else provenance[index] = candidate.evidence;
  const previousDate = Math.max(0, ...(event.provenance || []).map((entry) => Date.parse(entry.publishedAt) || 0));
  const newer = (Date.parse(candidate.publishedAt) || 0) >= previousDate;
  // Conflicting dates/times require review; adding missing times is safe.
  const updated = { ...event, provenance };
  if (!event.venue && candidate.venue) updated.venue = candidate.venue;
  if (newer && !event.hours && candidate.hours) {
    updated.hours = candidate.hours;
    if (candidate.endsAtDate) updated.endsAtDate = candidate.endsAtDate;
  }
  return updated;
};
