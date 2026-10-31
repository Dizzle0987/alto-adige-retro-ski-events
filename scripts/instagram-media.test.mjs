import test from "node:test";
import assert from "node:assert/strict";
import { assessInstagramFlyer, createInstagramMediaScanner, instagramImageUrl, instagramImages } from "./instagram-media.mjs";

const source = { id: "ganis", name: "Ganischgeralm", url: "https://www.instagram.com/ganischgeralm_voliera/", ownerId: "123", autoPublish: true, venue: "Ganischgeralm · Obereggen", venueAliases: ["Ganischgeralm"] };
const item = { ownerUsername: "ganischgeralm_voliera", ownerId: "123", inputUrl: source.url, url: "https://www.instagram.com/p/Fixture/", timestamp: "2026-10-30T12:00:00Z", caption: "Ready for the Winter Opening? Share the flyer! #ganischgeralm", type: "Image", displayUrl: "https://scontent.cdninstagram.com/flyer.jpg?signature=one" };
const parsed = (text = "Ganischgeralm\nWINTER\nOpening\nPARTY\nSUNDAY\n29.11.2026") => ({ text, method: "instagram-image-ocr", words: text.split(/\s+/).map((text) => ({ text, confidence: 96 })) });

test("official flyer completes the missing date and retains the original caption", () => {
  const result = assessInstagramFlyer(item, source, parsed());
  assert.equal(result.status, "confirmed");
  assert.equal(result.start, "2026-11-29");
  assert.equal(result.title, "WINTER Opening PARTY");
  assert.equal(result.evidence.caption, item.caption);
  assert.match(result.evidence.flyer.text, /29.11.2026/);
});
test("year inference needs a weekday and still respects the shared parser", () => {
  assert.equal(assessInstagramFlyer(item, source, parsed("Ganischgeralm\nWinter Opening Party\nSUNDAY\n29.11")).status, "confirmed");
  assert.equal(assessInstagramFlyer(item, source, parsed("Ganischgeralm\nWinter Opening Party\n29.11")).reason, "flyer-year-needs-review");
  assert.equal(assessInstagramFlyer(item, source, parsed("Ganischgeralm\nWinter Opening Party\nSATURDAY\n29.11.2026")).reason, "flyer-weekday-conflict");
});
test("bad dates, multiple dates and poor OCR are held", () => {
  assert.equal(assessInstagramFlyer(item, source, parsed("Ganischgeralm\nWinter Opening Party\n31.11.2026")).status, "review");
  assert.equal(assessInstagramFlyer(item, source, parsed("Ganischgeralm\nWinter Opening Party\n29.11.2026\n06.12.2026")).status, "review");
  const low = parsed(); low.words.at(-1).confidence = 40;
  assert.equal(assessInstagramFlyer(item, source, low).reason, "flyer-low-confidence");
});
test("other venues and uncorroborated event titles cannot publish", () => {
  assert.equal(assessInstagramFlyer(item, source, parsed("Other hut\nWinter Opening Party\n29.11.2026")).reason, "flyer-missing-venue");
  assert.equal(assessInstagramFlyer({ ...item, caption: "Party info #ganischgeralm" }, source, parsed("Ganischgeralm\nVintage Festival\n29.11.2026")).reason, "flyer-title-not-corroborated");
});
test("unverified authors, owner mismatches and collaborations never cause a download", async () => {
  let calls = 0;
  const scanner = createInstagramMediaScanner({ fetcher: async () => { calls++; throw Error(); } });
  await scanner.scan({ ...item, ownerUsername: "private.person" }, [source]);
  await scanner.scan({ ...item, ownerId: "wrong" }, [source]);
  await scanner.scan({ ...item, coauthorProducers: [{ username: "other" }] }, [source]);
  assert.equal(calls, 0);
});
test("only Instagram image CDN hosts are accepted; videos and foreign carousel authors are excluded", () => {
  for (const url of ["http://scontent.cdninstagram.com/x.jpg", "https://cdninstagram.com.evil.example/x.jpg", "https://127.0.0.1/x.jpg", "https://user:pass@scontent.cdninstagram.com/x.jpg", "https://scontent.cdninstagram.com:8888/x.jpg"]) assert.equal(instagramImageUrl(url), null);
  assert.ok(instagramImageUrl(item.displayUrl));
  assert.equal(instagramImages({ ...item, type: "Video" }).length, 0);
  assert.equal(instagramImages({ ...item, childPosts: [{ ownerUsername: "other", displayUrl: item.displayUrl }] }).length, 0);
});
test("post cache ignores refreshed signed query parameters and enforces global limits", async () => {
  let downloads = 0; let reads = 0;
  const options = { maxNew: 1, fetcher: async () => { downloads++; return { bytes: Buffer.from("flyer"), contentType: "image/jpeg" }; }, reader: async () => { reads++; return parsed(); } };
  const scanner = createInstagramMediaScanner(options);
  assert.equal((await scanner.scan(item, [source])).status, "confirmed");
  const cached = createInstagramMediaScanner({ ...options, maxNew: 0, cache: scanner.snapshot() });
  assert.equal((await cached.scan({ ...item, displayUrl: item.displayUrl.replace("one", "two") }, [source])).status, "confirmed");
  const limited = await cached.scan({ ...item, url: "https://www.instagram.com/p/Other/" }, [source]);
  assert.equal(limited.media[0].status, "run-limit");
  assert.equal(downloads, 1); assert.equal(reads, 1);
  assert.ok(!JSON.stringify(scanner.snapshot()).includes("signature="));
});
test("conflicting dates on two carousel flyers stay in review", async () => {
  let reads = 0;
  const scanner = createInstagramMediaScanner({ fetcher: async (url) => ({ bytes: Buffer.from(url), contentType: "image/png" }), reader: async () => parsed(`Ganischgeralm\nWinter Opening Party\n${reads++ ? "06.12.2026" : "29.11.2026"}`) });
  const result = await scanner.scan({ ...item, type: "Sidecar", childPosts: [{ type: "Image", displayUrl: item.displayUrl }, { type: "Image", displayUrl: item.displayUrl.replace("flyer", "second") }] }, [source]);
  assert.equal(result.reason, "flyer-carousel-conflict");
});
