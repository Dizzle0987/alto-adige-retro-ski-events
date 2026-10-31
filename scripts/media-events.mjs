import { createHash } from "node:crypto";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { websiteText } from "./website-events.mjs";
import { parseWebsiteDates, parseSocialDates, assessInstagramPost } from "./social-events.mjs";

const exec = promisify(execFile);
const decode = (text = "") => text.replace(/&(?:amp|#0*38);/g, "&").replace(/&quot;/g, '"').replace(/&#0*39;/g, "'");
const attr = (html, name) => decode(html.match(new RegExp(`\\b${name}=(["'])([\\s\\S]*?)\\1`, "i"))?.[2] || "");
const eventWords = /party|après|apres|vintage|retro|opening|festival|dj|krampus|programm|events?|calendar/i;
const hash = (value) => createHash("sha256").update(value).digest("hex");
export const publicAddress = (ip) => {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) || a === 198 || a === 203);
  }
  // IPv6-mapped IPv4 and non-global ranges are intentionally not followed.
  return isIP(ip) === 6 && /^(2|3)/i.test(ip) && !/^2001:db8:/i.test(ip);
};
export const allowedMediaUrl = (raw, source) => {
  try {
    const url = new URL(decode(raw), source.url);
    const hosts = [new URL(source.url).hostname, ...(source.mediaHosts || [])];
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") && !isIP(url.hostname) && hosts.includes(url.hostname) ? url : null;
  } catch { return null; }
};

// Bounded public GETs only. Redirects are checked again, including DNS targets.
export const fetchPublic = async (raw, source, maxBytes = 5 * 1024 * 1024) => {
  let url = allowedMediaUrl(raw, source);
  for (let redirects = 0; redirects < 4; redirects++) {
    if (!url) throw new Error("host-not-approved");
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new Error("non-public-address");
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12000), headers: { "user-agent": "RetroSkiEventRadar/1.0" } });
    if (response.status >= 300 && response.status < 400) {
      url = allowedMediaUrl(new URL(response.headers.get("location") || "", url).href, source);
      continue;
    }
    if (!response.ok) throw new Error(`HTTP-${response.status}`);
    if (Number(response.headers.get("content-length")) > maxBytes) throw new Error("file-too-large");
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxBytes) throw new Error("file-too-large");
      chunks.push(chunk);
    }
    return { bytes: Buffer.concat(chunks), contentType: response.headers.get("content-type") || "", url: url.href };
  }
  throw new Error("too-many-redirects");
};

export const extractMediaLinks = (html, source) => {
  const result = [];
  for (const match of html.matchAll(/<(?:a|img)\b[^>]*>/gi)) {
    const tag = match[0];
    const raw = attr(tag, "href") || attr(tag, "data-src") || attr(tag, "src");
    const url = allowedMediaUrl(raw, source);
    const label = `${attr(tag, "alt")} ${attr(tag, "title")} ${raw}`;
    if (!url || !/\.(ics|pdf|png|jpe?g|webp)(?:$|\?)/i.test(url.href) || !eventWords.test(label) || /logo|icon|placeholder|menu|speisekarte|datenschutz/i.test(label)) continue;
    result.push({ url: url.href, label: websiteText(label).slice(0, 250), kind: /\.ics(?:$|\?)/i.test(url.href) ? "ics" : /\.pdf(?:$|\?)/i.test(url.href) ? "pdf" : "image" });
  }
  return [...new Map(result.map((item) => [item.url, item])).values()].slice(0, 3);
};

export const extractEmbeddedPosts = (html, source) => {
  if (!source.embeddedInstagram) return [];
  const blocks = html.split(/<div\b[^>]*class=["'][^"']*\bsbi_item\b[^"']*["']/i).slice(1, 7);
  return blocks.flatMap((block) => {
    const url = attr(block.match(/<a\b[^>]*class=["'][^"']*\bsbi_photo\b[^"']*["'][^>]*>/i)?.[0] || "", "href");
    const caption = attr(block.match(/<img\b[\s\S]*?>/i)?.[0] || "", "alt");
    const timestamp = Number(attr(block, "data-date"));
    if (!caption || !/^https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+\/?$/.test(url)) return [];
    return [{ caption, url, publishedAt: timestamp ? new Date(timestamp * 1000).toISOString() : null }];
  });
};

export const mediaAssessment = (text, source, evidence) => {
  const normalized = text.replace(/\r/g, "").slice(0, 12000);
  const title = normalized.split("\n").map((line) => line.trim()).find((line) => eventWords.test(line) && line.length >= 5 && line.length <= 120);
  const date = parseWebsiteDates(normalized);
  return { title: title || "Annuncio da verificare", status: "review",
    reason: !title ? "unclear-event-title" : date.status !== "confirmed" ? date.reason : "media-needs-corroboration",
    ...(date.status === "confirmed" ? { start: date.start, end: date.end } : {}),
    venue: source.venueName, location: source.venue, evidence, excerpt: normalized.slice(0, 6000) };
};

export const calendarAssessments = (text, source, evidence) => {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  return [...unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)].slice(0, 30).map((match) => {
    const block = match[1];
    const title = block.match(/^SUMMARY:(.*)$/m)?.[1]?.trim() || "Annuncio da verificare";
    const date = block.match(/^DTSTART(?:;[^:\r\n]*)?:(\d{4})(\d{2})(\d{2})/m);
    const assessment = mediaAssessment(`${title}\n${date ? `${date[1]}-${date[2]}-${date[3]}` : ""}`, source, evidence);
    return { ...assessment, title, reason: /^(RRULE|RECURRENCE-ID|RDATE|EXDATE)/m.test(block) ? "calendar-recurrence-needs-review" : "calendar-needs-verification" };
  });
};

export const readDocument = async (bytes, kind, run = exec) => {
  const directory = await mkdtemp(path.join(tmpdir(), "retro-document-"));
  const file = path.join(directory, kind === "pdf" ? "input.pdf" : "input.img");
  const options = { timeout: 20000, maxBuffer: 1024 * 1024, env: { ...process.env, OMP_THREAD_LIMIT: "1" } };
  const boundedRun = (command, args) => process.platform === "linux"
    ? run("prlimit", ["--as=1073741824", "--cpu=20", "--", command, ...args], options)
    : run(command, args, options);
  try {
    await writeFile(file, bytes);
    if (kind === "pdf") {
      const { stdout } = await boundedRun("pdftotext", ["-f", "1", "-l", "3", "-layout", file, "-"]);
      if (stdout.trim().length >= 30) return { text: stdout, method: "pdf-text" };
      await boundedRun("pdftoppm", ["-f", "1", "-l", "3", "-scale-to", "2000", "-png", file, path.join(directory, "page")]);
      const pages = (await readdir(directory)).filter((name) => /^page-.*\.png$/.test(name)).sort().slice(0, 3);
      const texts = [];
      for (const page of pages) texts.push((await boundedRun("tesseract", [path.join(directory, page), "stdout", "-l", "deu+ita+eng", "--psm", "11"])).stdout);
      return { text: texts.join("\n"), method: "pdf-ocr" };
    }
    const { stdout } = await boundedRun("tesseract", [file, "stdout", "-l", "deu+ita+eng", "--psm", "11"]);
    return { text: stdout, method: "image-ocr" };
  } finally { await rm(directory, { recursive: true, force: true }); }
};

export const createMediaScanner = ({ cache = {}, instagram = [], maxNew = 12, fetcher = fetchPublic, reader = readDocument } = {}) => {
  let remaining = maxNew;
  const entries = cache.entries || {};
  const documents = cache.documents || {};
  const scan = async (html, source) => {
    const candidates = []; const review = []; const reports = [];
    const feedDocuments = [];
    // HTML social mirrors are evidence from the official venue site, not proof
    // of an Instagram author. They never bypass the strict social author checks.
    for (const post of extractEmbeddedPosts(html, source)) {
      const date = post.publishedAt ? parseSocialDates(post.caption, post.publishedAt) : parseWebsiteDates(post.caption);
      review.push({ ...mediaAssessment(post.caption, source, { url: post.url, page: source.url, publishedAt: post.publishedAt }), reason: date.status === "confirmed" ? "embedded-author-needs-verification" : date.reason });
    }
    if (source.curatorFeed && html.includes(source.curatorFeed)) {
      try {
        const raw = await fetcher(`https://api.curator.io/restricted/feeds/${source.curatorFeed}/posts?limit=6`, { ...source, mediaHosts: ["api.curator.io"] }, 1024 * 1024);
        const data = JSON.parse(raw.bytes.toString());
        const expected = instagram.find((entry) => entry.id === source.embeddedInstagram);
        for (const post of (data.posts || []).slice(0, 6)) {
          if (!expected || post.user_screen_name?.toLowerCase() !== new URL(expected.url).pathname.split("/")[1].toLowerCase() || post.user_url?.replace(/\/$/, "") !== expected.url.replace(/\/$/, "")) continue;
          const ownerId = post.source_identifier?.match(/_(\d+)$/)?.[1];
          if (expected.ownerId && ownerId !== expected.ownerId) continue;
          const assessment = assessInstagramPost({ ownerUsername: post.user_screen_name, ownerId, caption: post.text, url: post.url, timestamp: post.source_created_at, isRepost: Boolean(post.is_repost), locationName: post.location_name }, [expected]);
          if (assessment.status !== "rejected" && assessment.status !== "ignored") candidates.push({ ...assessment, id: `${expected.id}-widget-${post.id}`, publishedAt: post.source_created_at, excerpt: post.text });
          if (assessment.status === "review" && !post.has_video && !post.is_repost) {
            const image = allowedMediaUrl(post.image_xlarge || post.image_large || post.image || "", source);
            if (image?.hostname === "curator-assets.b-cdn.net" && image.pathname.startsWith(`/${source.curatorFeed}/`)) feedDocuments.push({ url: image.href, kind: "image" });
          }
        }
        reports.push({ kind: "curator", status: "checked", received: Math.min((data.posts || []).length, 6) });
      } catch (error) { reports.push({ kind: "curator", status: "unavailable", reason: error.message.slice(0, 120) }); }
    }
    const iframeTags = [...html.matchAll(/<iframe\b[^>]*>/gi)].slice(0, 4);
    for (const match of iframeTags) {
      const url = allowedMediaUrl(attr(match[0], "src"), source);
      // Only explicitly approved calendars/documents; never video, maps or login widgets.
      if (!url || !(source.calendarFrames || []).includes(url.href)) continue;
      try {
        const raw = await fetcher(url.href, source, 1024 * 1024);
        const body = raw.bytes.toString();
        const evidence = { url: url.href, page: source.url, method: "iframe-text" };
        review.push(...(body.includes("BEGIN:VCALENDAR") ? calendarAssessments(body, source, evidence) : [mediaAssessment(websiteText(body), source, evidence)]));
        reports.push({ kind: "iframe", status: "read-for-review" });
      } catch (error) { reports.push({ kind: "iframe", status: "unavailable", reason: error.message.slice(0, 120) }); }
    }
    for (const document of [...extractMediaLinks(html, source), ...feedDocuments].slice(0, 3)) {
      const key = hash(`${source.id}|${document.url}`);
      const old = entries[key];
      if (old && Date.now() - Date.parse(old.checkedAt) < 7 * 86400000) {
        if (old.assessment) review.push(old.assessment);
        reports.push({ kind: document.kind, status: "cached" }); continue;
      }
      if (remaining <= 0) { reports.push({ kind: document.kind, status: "run-limit" }); continue; }
      remaining--;
      try {
        const raw = await fetcher(document.url, source);
        if (document.kind === "ics") {
          const assessments = calendarAssessments(raw.bytes.toString(), source, { url: document.url, page: source.url, method: "ics" });
          review.push(...assessments);
          reports.push({ kind: "ics", status: "read-for-review", events: assessments.length });
          continue;
        }
        const signature = hash(raw.bytes);
        let parsed = documents[signature];
        if (!parsed) {
          parsed = await reader(raw.bytes, document.kind);
          documents[signature] = { text: parsed.text.slice(0, 12000), method: parsed.method, checkedAt: new Date().toISOString() };
        }
        const assessment = mediaAssessment(parsed.text, source, { url: document.url, page: source.url, sha256: signature, method: parsed.method });
        entries[key] = { checkedAt: new Date().toISOString(), assessment };
        review.push(assessment);
        reports.push({ kind: document.kind, status: "read-for-review", method: parsed.method });
      } catch (error) {
        const reason = error.code === "ENOENT" ? "ocr-tools-unavailable" : error.message.slice(0, 120);
        reports.push({ kind: document.kind, status: "unavailable", reason });
      }
    }
    return { candidates, review, reports };
  };
  const snapshot = () => ({ version: 1, entries: Object.fromEntries(Object.entries(entries).sort((a, b) => b[1].checkedAt.localeCompare(a[1].checkedAt)).slice(0, 120)), documents: Object.fromEntries(Object.entries(documents).sort((a, b) => b[1].checkedAt.localeCompare(a[1].checkedAt)).slice(0, 120)) });
  return { scan, snapshot };
};
