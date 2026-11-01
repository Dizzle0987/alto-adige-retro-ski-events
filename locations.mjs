const venueText = (venue, language) => typeof venue === "string" ? venue.trim()
  : venue?.[language]?.trim() || venue?.de?.trim() || venue?.it?.trim() || venue?.en?.trim() || "";

// Use a language-independent identity so switching language preserves the filter.
export const locationKeyFor = (event) => {
  const venue = venueText(event.venue, "de");
  const value = venue || event.place || "";
  return `${venue ? "venue" : "place"}:${value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase()}`;
};

export const locationLabelFor = (event, language, translatePlace = (place) => place) =>
  venueText(event.venue, language) || translatePlace(event.place || "", language);

export const locationOptions = (events, language, translatePlace) => {
  const options = new Map();
  for (const event of events) {
    const key = locationKeyFor(event);
    const existing = options.get(key);
    if (existing) existing.count += 1;
    else options.set(key, { key, label: locationLabelFor(event, language, translatePlace), count: 1 });
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, language));
};
