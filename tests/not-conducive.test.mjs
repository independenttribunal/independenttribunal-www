import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("the exclusion study keeps official counts, reported cases and our views apart", async () => {
  const p = await json("data/profiles/not-conducive-to-the-public-good.json");
  validateProfile(p, (message) => assert.fail(message));
  const sources = new Map(p.sources.map((s) => [s.id, s]));
  for (const id of ["carlile", "naik"]) assert.match(sources.get(id).url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\//);
  assert.match(sources.get("appendix-eta").url, /^https:\/\/www\.gov\.uk\//);
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (id) => entries.get(id).paragraphs.map((x) => x.text).join(" ");
  // Official figures cover personal exclusions only; ETA refusals are uncounted.
  assert.match(text("official-count"), /10 individuals were excluded/);
  assert.match(text("uncounted"), /no data is available for refusals by immigration officials/);
  assert.match(text("carlile"), /four to one/);
  // A call for a ban is not a ban.
  assert.match(entries.get("macklemore").title, /not a decision/);
  for (const id of ["pattern", "claims-table"]) assert.equal(entries.get(id).kind, "Our analysis");
  assert.match(entries.get("proposal").kind, /not current law/);
  assert.match(p.artworks[0].caption, /Satire/);
  assert.match(p.evidence_image.caption, /not an official record/);
  const html = await read("public/research/not-conducive-to-the-public-good/index.html");
  assert.ok(html.includes('href="/research/public-order/"'));
});

test("Not welcome to the UK: pinned, carries the academics' letter, and the timeline links to it", async () => {
  const p = await json("data/profiles/not-conducive-to-the-public-good.json");
  assert.match(p.title, /^Not welcome to the UK/);
  assert.equal(p.pinned, true);
  const malm = p.sections.flatMap((s) => s.entries).find((e) => e.id === "malm");
  const letter = malm.paragraphs.find((x) => /open letter/.test(x.text));
  assert.ok(letter.sources.some((s) => s.id === "openletter-malm"));
  assert.match(malm.paragraphs.map((x) => x.text).join(" "), /not a ban on coming to the UK/);
  const tiles = (await json("public/data/tiles.json")).tiles;
  assert.ok(tiles.slice(0, 3).some((t) => t.id === p.id), "pinned near the top of the homepage grid");
  const t = await json("data/timelines/uk-ratchet.json");
  const entry = t.sections.flatMap((s) => s.entries ?? []).find((e) => e.id === "not-conducive-malm-2026");
  assert.ok(entry.body.includes("(/research/not-conducive-to-the-public-good/)"));
  const html = await read("uk-timeline/index.html").catch(() => read("public/uk-timeline/index.html"));
  assert.ok(html.includes('href="/research/not-conducive-to-the-public-good/"'));
});
