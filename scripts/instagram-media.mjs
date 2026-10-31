import { createHash } from "node:crypto";
import { fetchPublic, readDocument } from "./media-events.mjs";
import { assessInstagramPost, officialInstagramSource, parseSocialDates } from "./social-events.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const normalize = (value) => String(value).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const contains = (text, phrase) => ` ${normalize(text)} `.includes(` ${normalize(phrase)} `);
export const instagramImageUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")
      || !/(?:^|\.)(?:cdninstagram\.com|fbcdn\.net)$/.test(url.hostname)) return null;
    return url;
  } catch { return null; }
};

export const instagramImages = (item) => {
  if (item.type === "Video" || item.videoUrl) return [];
  const children = Array.isArray(item.childPosts) ? item.childPosts : [];
  const urls = children.length
    ? children.filter((child) => child.type !== "Video" && !child.videoUrl
      && (!child.ownerUsername || child.ownerUsername.toLowerCase() === item.ownerUsername?.toLowerCase()))
      .map((child) => child.displayUrl)
    : [item.displayUrl];
  return [...new Set(urls.filter(Boolean))].map(instagramImageUrl).filter(Boolean).slice(0, 2);
};

export const assessInstagramFlyer = (item, source, parsed) => {
  const original = assessInstagramPost(item, [source]);
  if (original.status !== "review" || !["missing-date", "unclear-event-title"].includes(original.reason)) return original;
  const text = String(parsed.text || "").slice(0, 12000);
  const dateText = String(parsed.dateText || text);
  const date = parseSocialDates(dateText, item.timestamp);
  const hold = (reason) => ({ ...original, status: "review", reason,
    evidence: { ...original.evidence, flyer: { method: parsed.method, text, dateText, dateEvidence: date } } });
  if (date.status !== "confirmed") return hold(`flyer-${date.reason}`);
  const captionDate = parseSocialDates(item.caption || "", item.timestamp);
  if (captionDate.status === "confirmed" && (captionDate.start !== date.start || captionDate.end !== date.end)) return hold("flyer-caption-date-conflict");
  // A missing year needs an explicit matching weekday; the shared parser also
  // bounds inference to 180 days from publication and checks weekday conflicts.
  if (date.inferredYear) {
    const weekdayNames = ["sunday|sonntag|domenica", "monday|montag|lunedi", "tuesday|dienstag|martedi", "wednesday|mittwoch|mercoledi", "thursday|donnerstag|giovedi", "friday|freitag|venerdi", "saturday|samstag|sabato"];
    const mentioned = weekdayNames.flatMap((names, day) => new RegExp(`\\b(?:${names})\\b`).test(normalize(text)) ? [day] : []);
    if (mentioned.length !== 1) return hold("flyer-year-needs-review");
    if (mentioned[0] !== new Date(`${date.start}T12:00:00Z`).getUTCDay()) return hold("flyer-weekday-conflict");
  }
  const words = parsed.words || [];
  const dateDigits = date.evidence.match(/\d+/g) || [];
  const dateWords = (parsed.dateWords || words).filter((word) => (word.text.match(/\d+/g) || []).some((number) => dateDigits.includes(number)));
  const readableWords = words.filter((word) => /[\p{L}]{3,}/u.test(word.text));
  if (!words.length || !dateWords.length || dateWords.some((word) => word.confidence < 90)
    || !readableWords.length || readableWords.reduce((sum, word) => sum + word.confidence, 0) / readableWords.length < 85) return hold("flyer-low-confidence");
  if (!source.venueAliases?.some((alias) => contains(text, alias))) return hold("flyer-missing-venue");
  // Join adjacent title words, retaining their original spelling/order.
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const index = lines.findIndex((line) => /\b(party|opening|closing|festival|retro|vintage|skitag|ski day)\b/i.test(line));
  if (index < 0) return hold("flyer-unclear-title");
  const titleLine = (line) => line && line.length < 70 && !/\d|https?:|@/.test(line)
    && !source.venueAliases.some((alias) => contains(line, alias))
    && !/\b(sunday|samstag|sonntag|sabato|domenica|free|entry|doors)\b/i.test(line);
  let start = index; let end = index;
  if (titleLine(lines[index - 1]) && /\b(winter|summer|season|halloween|retro|vintage|ski)\b/i.test(lines[index - 1])) start--;
  while (end < index + 2 && titleLine(lines[end + 1]) && /^(opening|closing|party|festival)$/i.test(lines[end + 1])) end++;
  const title = lines.slice(start, end + 1).join(" ");
  const titleTokens = normalize(title).split(" ").filter((word) => word.length > 3 && !["party", "event", "live"].includes(word));
  if (title.length > 110 || !titleTokens.length || !titleTokens.some((word) => contains(item.caption || "", word))) return hold("flyer-title-not-corroborated");
  const combined = `${title}\n${dateText}\n${item.caption || ""}`;
  const result = assessInstagramPost({ ...item, caption: combined }, [source]);
  return { ...result, ...(result.status === "confirmed" ? { title, reason: "official-flyer-ocr" } : {}),
    evidence: { ...original.evidence, flyer: { method: parsed.method, text, confidence: Math.min(...dateWords.map((word) => word.confidence)), dateEvidence: date } } };
};

export const createInstagramMediaScanner = ({ cache = {}, maxNew = 8, fetcher = fetchPublic, reader = readDocument } = {}) => {
  let remaining = maxNew;
  const entries = cache.entries || {};
  const documents = cache.documents || {};
  const scan = async (item, sources) => {
    const source = officialInstagramSource(item, sources);
    const original = assessInstagramPost(item, sources);
    if (!source || original.status !== "review" || !["missing-date", "unclear-event-title"].includes(original.reason)) return original;
    const results = []; const media = [];
    for (const url of instagramImages(item)) {
      // Signed CDN query strings are neither identity nor persisted evidence.
      const key = hash(`${source.id}|${original.url}|${url.hostname}${url.pathname}`);
      let parsed = entries[key];
      if (!parsed || (parsed.pipelineVersion || 1) < 3 || Date.now() - Date.parse(parsed.checkedAt) >= 7 * 86400000) {
        if (remaining <= 0) { media.push({ status: "run-limit" }); continue; }
        remaining--;
        try {
          const raw = await fetcher(url.href, { url: source.url, mediaHosts: [url.hostname] });
          if (!/^image\/(?:jpeg|png|webp)(?:;|$)/i.test(raw.contentType || "")) throw Error("not-an-image");
          const signature = hash(raw.bytes);
          const old = documents[signature];
          parsed = old?.pipelineVersion >= 3 ? old : { ...await reader(raw.bytes, "instagram-image"), pipelineVersion: 3, checkedAt: new Date().toISOString(), sha256: signature };
          documents[signature] = parsed;
          entries[key] = parsed;
        } catch (error) { media.push({ status: "unavailable", reason: error.code === "ENOENT" ? "ocr-tools-unavailable" : error.message.slice(0, 100) }); continue; }
      }
      const variants = (parsed.variants || [parsed]).map((variant) => assessInstagramFlyer(item, source, variant));
      const accepted = variants.filter((variant) => variant.status === "confirmed");
      const variantDates = new Set(accepted.map((variant) => `${variant.start}/${variant.end}`));
      const review = variants.find((variant) => variant.evidence?.flyer?.dateEvidence?.status === "confirmed") || variants[0];
      const assessment = variantDates.size > 1 ? { ...original, reason: "flyer-ocr-pass-conflict" } : accepted[0] || review;
      if (assessment.evidence?.flyer) assessment.evidence.flyer.sha256 = parsed.sha256;
      results.push(assessment);
      media.push({ status: assessment.status, reason: assessment.reason });
    }
    const confirmed = results.filter((result) => result.status === "confirmed");
    const dates = new Set(confirmed.map((result) => `${result.start}/${result.end}`));
    if (dates.size > 1 || (confirmed.length && results.some((result) => /conflict|multiple-dates/.test(result.reason)))) return { ...original, reason: "flyer-carousel-conflict", media };
    return { ...(confirmed[0] || results[0] || original), media };
  };
  const trim = (value) => Object.fromEntries(Object.entries(value).sort((a, b) => b[1].checkedAt.localeCompare(a[1].checkedAt)).slice(0, 120));
  return { scan, snapshot: () => ({ version: 1, entries: trim(entries), documents: trim(documents) }) };
};
