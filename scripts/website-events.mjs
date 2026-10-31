import { parseWebsiteDates } from "./social-events.mjs";

export const websiteText = (html = "") => html
  .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|amp|quot|apos|#0*39|#8217|#8211|#8212);/g, (value) => ({ "&nbsp;": " ", "&amp;": "&", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&#8217;": "’", "&#8211;": "–", "&#8212;": "—" })[value] || " ")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/\s+/g, " ").trim();

const namedMonths = { january: "01", february: "02", march: "03", april: "04", may: "05", june: "06", july: "07", august: "08", september: "09", october: "10", november: "11", december: "12" };
const checkedDate = (year, month, day) => {
  const value = `${year}-${month}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${value}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
};

// Fallbacks are tied to event containers and explicit source metadata, never to
// arbitrary dates elsewhere in the page (copyright, booking widgets, news, etc.).
export const extractWebsiteEvents = (html, source) => {
  const events = [];
  const review = [];
  const add = (event) => {
    if (!event.start || !event.end || !event.title) return;
    try {
      const url = new URL(event.url || source.url, source.url);
      if (url.origin !== new URL(source.url).origin || !/^https?:$/.test(url.protocol)) return;
      events.push({ ...event, url: url.href, venue: event.venue || source.venueName, location: event.location || source.venue, extraction: source.htmlAdapter || "html-article" });
    } catch { /* malformed links must not enter the agenda */ }
  };
  if (source.htmlAdapter === "k1-announcements") {
    const text = websiteText(html);
    const year = text.match(/(\d{4})\s*[–/-]\s*\d{2,4}\s+season/i)?.[1];
    const opening = text.match(/\(Season Opening:\s*([^)]*)\)/i)?.[1];
    if (year && opening) {
      const date = parseWebsiteDates(`${opening}, ${year}`);
      if (date.status === "confirmed") add({ title: "K1 Season Opening", start: date.start, end: date.end,
        summaries: { it: "Due giorni per festeggiare l’apertura della stagione al K1. Orari e programma in aggiornamento.", de: "Zwei Tage zum Saisonauftakt im K1. Uhrzeiten und Programm folgen.", en: "Two days celebrating the season opening at K1. Times and programme to follow." } });
      else review.push({ title: "K1 Season Opening", reason: date.reason });
    }
    const halloween = text.match(/OPENING HOURS\s+(October\s+\d{1,2},\s+\d{4})/i)?.[1];
    if (halloween && /Halloween Open Air/i.test(text)) {
      const date = parseWebsiteDates(halloween);
      if (date.status === "confirmed") add({ title: "K1 Halloween Open Air", start: date.start, end: date.end });
    }
  } else if (source.htmlAdapter === "moritzino-calendar") {
    for (const block of html.split(/<!--\s*event-loop-end\s*-->/i)) {
      const link = block.match(/<h2[^>]*class=["'][^"']*ect-list-title[^"']*["'][^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!link) continue;
      const title = websiteText(link[2]);
      if (!/après|apres|party|vintage|dj|disco|techno|opening|closing/i.test(title)) continue;
      const day = block.match(/class=["']ev-day["'][^>]*>(\d{1,2})/i)?.[1];
      const month = websiteText(block.match(/class=["']ev-mo["'][^>]*>([^<]+)/i)?.[1] || "").toLowerCase();
      const year = block.match(/class=["']ev-yr["'][^>]*>(\d{4})/i)?.[1];
      const venueText = websiteText(block.match(/class=["'][^"']*ect-venue-details[^"']*["'][^>]*>([\s\S]*)/i)?.[1] || "");
      // This calendar also contains external gigs: don't relocate them to Alta Badia.
      if (!/Club Moritzino|Piz La Ila/i.test(`${venueText} ${title}`)) continue;
      const start = year && namedMonths[month] && day ? checkedDate(year, namedMonths[month], day) : null;
      if (start) add({ title, start, end: start, url: link[1], summaries: {
        it: /vintage/i.test(title) ? "Party vintage di chiusura stagione al Club Moritzino." : "Appuntamento musicale e après-ski al Club Moritzino, in quota al Piz La Ila.",
        de: /vintage/i.test(title) ? "Vintage-Party zum Saisonabschluss im Club Moritzino." : "Musik und Après-Ski im Club Moritzino am Piz La Ila.",
        en: /vintage/i.test(title) ? "Vintage season-closing party at Club Moritzino." : "Music and après-ski at Club Moritzino on Piz La Ila.",
      } });
    }
  } else if (source.htmlAdapter === "winklparade-announcement") {
    const text = websiteText(html);
    const title = text.match(/Winklparade Madness\s+\d{4}/i)?.[0];
    const explicit = text.match(/(\d{2})\.(\d{2})\.(\d{4})\s*\/\/\s*(\d{1,2})\s*Uhr/i);
    const start = explicit ? checkedDate(explicit[3], explicit[2], explicit[1]) : null;
    if (title && start && title.includes(explicit[3])) add({ title, start, end: start, hours: { start: `${explicit[4].padStart(2, "0")}:00` }, summaries: {
      it: "Festival con musica dal vivo e party al padiglione musicale di Campo Tures.", de: "Festival mit Livemusik und Party am Musikpavillon in Sand in Taufers.", en: "Live music and party at the music pavilion in Sand in Taufers.",
    } });
  }
  // Standard article fallback: require its own title, explicit year and date.
  for (const match of html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)) {
    const block = match[1];
    const title = websiteText(block.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] || "");
    const text = websiteText(block);
    if (!title || !/party|après|apres|vintage|retro|dj|festival|opening/i.test(title) || !/\b20\d{2}\b/.test(text)) continue;
    const date = parseWebsiteDates(text);
    if (date.status !== "confirmed" || !source.venue) { review.push({ title, reason: date.reason || "venue-not-verified" }); continue; }
    const url = block.match(/<a[^>]*href=["']([^"']+)["']/i)?.[1];
    add({ title, start: date.start, end: date.end, url });
  }
  return { events, review };
};
