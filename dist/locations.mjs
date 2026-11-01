const venueText = (venue, language) => typeof venue === "string" ? venue.trim()
  : venue?.[language]?.trim() || venue?.de?.trim() || venue?.it?.trim() || venue?.en?.trim() || "";

const genericVenue = /^(?:sala manifestazioni|veranstaltungssaal|event hall|rifugi(?: e centro paese)?|hütten(?: und dorfzentrum)?|huts(?: and village centre)?|centro paese|dorfzentrum|village cent(?:re|er))$/iu;
const address = /^(?:via|viale|vicolo|piazza|str(?:ada|\.)?|street|road)\s|\b(?:straße|strasse)\s*\d/iu;
const isNamedVenue = (value) => value && !genericVenue.test(value) && !address.test(value);

// A place is geography, not a venue. Only accept an explicitly named ski facility
// as a fallback; never turn a municipality, address or broad area into a location.
const namedFacility = (event) => {
  const place = event.place?.trim() || "";
  return /^(?:area sciistica(?: di)?|skigebiet|ski area|skilift|funivia(?: di)?|seilbahn)\s+\p{L}/iu.test(place)
    ? place.split(/\s+[·|]\s+/u)[0].trim() : "";
};
const filterVenue = (event, language) => {
  const venue = venueText(event.venue, "de");
  return isNamedVenue(venue) ? venueText(event.venue, language) : namedFacility(event);
};

// Use a language-independent identity so switching language preserves the filter.
export const locationKeyFor = (event) => {
  const value = filterVenue(event, "de");
  return value ? `venue:${value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase()}` : null;
};

export const locationLabelFor = (event, language, translatePlace = (place) => place) =>
  locationKeyFor(event) ? (isNamedVenue(venueText(event.venue, "de"))
    ? venueText(event.venue, language) : translatePlace(namedFacility(event), language)) : "";

export const locationOptions = (events, language, translatePlace) => {
  const options = new Map();
  for (const event of events) {
    const key = locationKeyFor(event);
    if (!key) continue;
    const existing = options.get(key);
    if (existing) existing.count += 1;
    else options.set(key, { key, label: locationLabelFor(event, language, translatePlace), count: 1 });
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, language));
};
