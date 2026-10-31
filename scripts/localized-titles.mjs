const supportedLanguages = new Set(["it", "de", "en"]);

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

const attribute = (attributes, name) => {
  const match = attributes.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? decodeHtml(match[1]) : null;
};

const pageTitle = (html) => stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");

const alternatePages = (html, pageUrl) => {
  const pages = new Map();
  for (const match of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attributes = match[1];
    const relations = (attribute(attributes, "rel") || "").toLowerCase().split(/\s+/);
    if (!relations.includes("alternate")) continue;
    const language = (attribute(attributes, "hreflang") || "").toLowerCase().split("-")[0];
    const href = attribute(attributes, "href");
    if (!supportedLanguages.has(language) || !href) continue;
    try {
      pages.set(language, new URL(href, pageUrl).href);
    } catch {
      // Ignore malformed alternate links.
    }
  }
  return pages;
};

export const fetchLocalizedTitles = async ({ html, pageUrl, fetchHtml }) => {
  const foundTitles = new Map();
  const pages = alternatePages(html, pageUrl);
  await Promise.all([...pages].map(async ([language, url]) => {
    try {
      const localizedHtml = url === pageUrl ? html : await fetchHtml(url);
      const title = pageTitle(localizedHtml);
      if (title && !/^404\b/.test(title)) foundTitles.set(language, title);
    } catch {
      // A missing language must not invalidate the event or other translations.
    }
  }));
  return Object.fromEntries(
    ["it", "de", "en"].filter((language) => foundTitles.has(language)).map((language) => [language, foundTitles.get(language)]),
  );
};
