import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const id = "transgender-prisoners-womens-estate-timeline";

test("transgender prisoners women's estate timeline: policy chain, official figures and satire caption", async () => {
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.category, "legal-study");
  assert.equal(p.pinned, undefined);
  assert.equal(p.archived, undefined);
  assert.match(p.title, /Who decides sex in prison/);
  assert.match(p.summary, /does not decide a prisoner's legal or biological sex|does not decide a prisoner’s legal or biological sex/);
  assert.match(p.status_note, /\[2025\] UKSC 16/);
  assert.match(p.status_note, /\[2026\] CSOH 59/);
  assert.ok((p.related ?? []).some((r) => r.id === "frameworks-of-truth"));

  const artwork = (p.artworks ?? [])[0];
  assert.ok(artwork);
  assert.equal(artwork.after_section, "who-decides");
  assert.equal(artwork.src, "/images/minister-for-genitalia-assessment-satire.webp");
  assert.match(artwork.alt, /not a government document/i);
  assert.match(artwork.caption, /not a Ministry of Justice or HMPPS document/);
  assert.match(artwork.caption, /Royal Arms/);
  assert.match(artwork.caption, /no document titled/);

  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (entryId) => entries.get(entryId).paragraphs.map((x) => x.text).join(" ");

  assert.match(text("psi-2011"), /senior manager above establishment level/);
  assert.match(text("karen-white"), /HMP New Hall/);
  assert.match(text("karen-white"), /outside prison/);
  assert.match(text("lewis-2022"), /Brandon Lewis/);
  assert.match(text("raab-2023"), /express approval of Ministers/);
  assert.match(text("fws-2025"), /biological sex, biological woman and biological man/);
  assert.match(text("framework-2024-reissue"), /We did not find one/);
  assert.match(text("csoh-2026"), /Prisons Guidance is unlawful/);
  assert.match(text("the-actual-rule"), /Secretary of State for Justice for a final decision/);
  assert.match(text("not-legal-sex"), /not accurate to say that the minister decides/);
  assert.match(text("womens-estate-composition"), /fewer than five transgender women/);
  assert.match(text("womens-estate-composition"), /50 were trans men/);
  assert.match(text("sexual-assaults-answers"), /122 sexual assaults/);
  assert.match(text("rape-distinction"), /no reported incident of rape or attempted rape/);
  assert.match(text("later-assaults"), /no assaults or sexual assaults committed by transgender women in the general women's estate in the last five years/);
  assert.match(text("exemptions-granted"), /9 in 2023/);
  assert.match(text("what-is-not-settled"), /full official text of PSI 17\/2016/);
  assert.doesNotMatch(JSON.stringify(p), /Review log|Corrections log|confirmed by/);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.match(sources.get("hmpps-pf-2024").url, /^https:\/\/assets\.publishing\.service\.gov\.uk\/media\/67360999/);
  assert.match(sources.get("fws-uksc").url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\/uksc\/2025\/16/);
  assert.match(sources.get("csoh-59").url, /2026csoh59/);
  assert.match(sources.get("hl4104").url, /HL4104/);
  assert.match(sources.get("equalities-2025-26").url, /hmpps-offender-equalities-annual-report-2025-to-2026/);

  const html = await read(`public/research/${id}/index.html`);
  assert.match(html, /<h1>Who decides sex in prison\? A timeline of transgender prisoner placement in England and Wales<\/h1>/);
  assert.match(html, /<section class="profile-related" id="related">/);
  assert.ok(html.includes('href="/research/frameworks-of-truth/"'));
  assert.match(html, /id="satire-clause"/);
  assert.match(html, /minister-for-genitalia-assessment-satire\.webp/);
  assert.match(html, /not a Ministry of Justice or HMPPS document/);
  assert.doesNotMatch(html, /class="profile-archived"/);

  const { tiles } = await json("public/data/tiles.json");
  const tile = tiles.find((t) => t.id === id);
  assert.equal(tile.kind, "study");
  assert.ok(tiles[0].id !== id, "not pinned at the top of the homepage grid");

  const sitemap = await read("public/sitemap.xml");
  assert.ok(sitemap.includes(`/research/${id}/`));
});
