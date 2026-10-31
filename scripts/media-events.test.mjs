import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { allowedMediaUrl, publicAddress, extractMediaLinks, extractEmbeddedPosts, mediaAssessment, corroborateMedia, calendarAssessments, createMediaScanner, readDocument } from "./media-events.mjs";

const source = { id: "venue", url: "https://official.example/events", venue: "K1 · Reischach", venueName: "K1" };
test("only approved HTTPS media hosts, no IPs, credentials or private addresses", () => {
  assert.ok(allowedMediaUrl("/party.png", source));
  for (const url of ["http://official.example/party.png", "https://unknown.example/party.png", "https://user:pass@official.example/party.png", "https://127.0.0.1/party.png", "https://official.example:8443/party.png"]) assert.equal(allowedMediaUrl(url, source), null);
  for (const ip of ["127.0.0.1", "169.254.169.254", "10.1.2.3", "172.20.1.2", "192.168.1.1", "::1", "::ffff:127.0.0.1", "fe80::1"]) assert.equal(publicAddress(ip), false);
  assert.equal(publicAddress("8.8.8.8"), true);
});
test("only event media, not menus, logos, maps or foreign images", () => {
  const html = `<img src="/logo-party.png"><img src="/party-2026.jpg"><a href="/event-program.pdf">Programme</a><a href="/calendar.ics">Calendar</a><img src="https://foreign.example/party.jpg"><img src="/menu-party.jpg"><img src="/Pulverfass-Opening-4.jpg"><img src="/apres-ski-photo.jpg">`;
  assert.deepEqual(extractMediaLinks(html, source).map((item) => item.kind), ["image", "pdf", "ics"]);
});
test("embedded posts retain their real old publication year and apostrophes", () => {
  const html = `<div class="sbi_item" data-date="1733067736"><a class="sbi_photo" href="https://www.instagram.com/p/Official/"><img alt="It's Retro Party\n06.12.2024"></a></div>`;
  const posts = extractEmbeddedPosts(html, { ...source, embeddedInstagram: "official" });
  assert.equal(posts[0].publishedAt.slice(0, 4), "2024");
  assert.ok(posts[0].caption.startsWith("It's"));
  assert.equal(extractEmbeddedPosts(html, source).length, 0);
});
test("OCR never auto-publishes or borrows the current year", () => {
  const assessment = mediaAssessment("Retro Party\n20.11.2025\nK1", source, {});
  assert.equal(assessment.start, "2025-11-20");
  assert.equal(assessment.status, "review");
  assert.equal(mediaAssessment("Retro Party\n20.11\nK1", source, {}).start, undefined);
  assert.equal(mediaAssessment("Retro Party\n03/04/2026\nK1", source, {}).start, undefined);
});
test("calendar recurrences stay in review without expanding invented dates", () => {
  const result = calendarAssessments("BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Retro Party\nDTSTART;VALUE=DATE:20261120\nRRULE:FREQ=WEEKLY\nEND:VEVENT\nEND:VCALENDAR", source, {});
  assert.equal(result.length, 1);
  assert.equal(result[0].reason, "calendar-recurrence-needs-review");
  assert.equal(result[0].status, "review");
});
test("global limit and weekly cache prevent repeated downloads and OCR", async () => {
  let reads = 0; let downloads = 0;
  const fetcher = async () => { downloads++; return { bytes: Buffer.from("image") }; };
  const reader = async () => { reads++; return { text: "Retro Party\n20.11.2027\nK1", method: "image-ocr" }; };
  const scanner = createMediaScanner({ maxNew: 1, fetcher, reader });
  const html = `<img src="/retro-party-2027.png"><img src="/vintage-party-2027.png">`;
  const first = await scanner.scan(html, source);
  assert.equal(reads, 1); assert.equal(downloads, 1);
  assert.ok(first.reports.some((entry) => entry.status === "run-limit"));
  const next = createMediaScanner({ cache: scanner.snapshot(), maxNew: 0, fetcher, reader });
  await next.scan(html, source);
  assert.equal(reads, 1); assert.equal(downloads, 1);
});
test("identical bytes at another URL use the hash cache", async () => {
  let reads = 0;
  const scanner = createMediaScanner({ fetcher: async () => ({ bytes: Buffer.from("same-image") }), reader: async () => { reads++; return { text: "Retro Party\n20.11.2027", method: "image-ocr" }; } });
  await scanner.scan('<img src="/retro-party-2027-1.png"><img src="/retro-party-2027-2.png">', source);
  assert.equal(reads, 1);
});
test("flyer publication requires independent title, full date and venue on the official page", () => {
  const assessment = mediaAssessment("Retro Party Night\n20.11.2027\nK1", source, {});
  const html = "<h1>K1</h1><h2>Retro Party Night</h2><p>20.11.2027</p>";
  assert.equal(corroborateMedia(assessment, html, source).status, "confirmed");
  assert.equal(corroborateMedia(assessment, html.replace("2027", "2026"), source), null);
  assert.equal(corroborateMedia(assessment, html.replace("Retro Party Night", "Different Party"), source), null);
  assert.equal(corroborateMedia(assessment, html.replace("K1", "Other club"), source), null);
  assert.equal(corroborateMedia({ ...assessment, excerpt: assessment.excerpt.replace("K1", "K12") }, html, source), null);
});
test("public Curator posts require the official author, profile URL and pinned owner ID", async () => {
  const official = { id: "k1", name: "K1", url: "https://www.instagram.com/k1.kronplatz/", ownerId: "5849734189", autoPublish: true, venue: "K1 · Reischach", venueAliases: ["K1"] };
  const post = { id: 1, user_screen_name: "k1.kronplatz", user_url: official.url, source_identifier: "123_5849734189", text: "Retro Party\n20.11.2027\nK1", source_created_at: "2027-11-01T12:00:00Z", url: "https://www.instagram.com/p/Official/" };
  const scanner = createMediaScanner({ instagram: [official], fetcher: async () => ({ bytes: Buffer.from(JSON.stringify({ posts: [post, { ...post, id: 2, user_screen_name: "private.person" }, { ...post, id: 3, source_identifier: "123_999" }] })) }) });
  const result = await scanner.scan("public-feed-id", { ...source, curatorFeed: "public-feed-id", embeddedInstagram: "k1" });
  assert.equal(result.candidates.filter((entry) => entry.status === "confirmed").length, 1);
  assert.equal(result.candidates.length, 1);
});
test("videos/maps are never followed as calendar frames", async () => {
  let calls = 0;
  await createMediaScanner({ fetcher: async () => { calls++; throw new Error(); } }).scan('<iframe src="https://youtube.com/embed/123"></iframe><iframe src="/calendar"></iframe>', source);
  assert.equal(calls, 0);
});

const fixturePdf = () => {
  const stream = "BT /F1 24 Tf 40 300 Td (RETRO PARTY) Tj 0 -45 Td (20.11.2027) Tj 0 -45 Td (K1 REISCHACH) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 400] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((value, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${value}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
};
test("real free tools: native PDF text and OCR of a rendered flyer", { skip: process.env.MEDIA_TOOLS_REQUIRED !== "1" }, async () => {
  const pdf = fixturePdf();
  const native = await readDocument(pdf, "pdf");
  assert.equal(native.method, "pdf-text");
  assert.ok(native.text.includes("20.11.2027"));
  const directory = await mkdtemp(path.join(tmpdir(), "retro-real-ocr-"));
  try {
    const input = path.join(directory, "fixture.pdf"); const output = path.join(directory, "flyer");
    await writeFile(input, pdf);
    await promisify(execFile)("pdftoppm", ["-singlefile", "-scale-to", "1600", "-png", input, output], { timeout: 20000 });
    const ocr = await readDocument(await readFile(`${output}.png`), "image");
    assert.equal(ocr.method, "image-ocr");
    assert.match(ocr.text, /RETRO PARTY/i);
    assert.match(ocr.text, /20[.\s]+11[.\s]+2027/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
