import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("Craig Wright docket: court findings verified, fraud framing tied to the judgments, questions not charges", async () => {
  const id = "craig-wright-docket";
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));

  assert.equal(p.id, id);
  assert.equal(p.category, "legal-study");
  assert.equal(p.title, "The Craig Wright docket");
  assert.equal(p.checked, "2026-11-12");
  assert.match(p.subtitle, /court record on his claim to be Satoshi Nakamoto/);
  assert.match(p.status_note, /has not been charged with, or convicted of, a criminal offence of perjury or forgery/);
  assert.match(p.status_note, /Planetary Council/);
  assert.match(p.summary, /\[2024\] EWHC 1198 \(Ch\)/);
  assert.match(p.summary, /vehicle for fraud/);
  assert.match(p.summary, /Those are the court’s words, not this site’s allegation/);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.equal(sources.get("copa-1198").url, "https://www.judiciary.uk/wp-content/uploads/2024/05/COPA-v-Wright-Judgment.pdf");
  assert.equal(sources.get("copa-1809").url, "https://www.judiciary.uk/wp-content/uploads/2024/07/COPA-v-Wright-Judgment.pdf");
  assert.equal(sources.get("copa-appx").url, "https://www.judiciary.uk/wp-content/uploads/2024/05/COPAv-Wright-Judgment-Appendix.pdf");
  assert.equal(sources.get("gcro-1139").url, "https://caselaw.nationalarchives.gov.uk/ewhc/ch/2025/1139");
  assert.equal(sources.get("mccormack-3343").url, "https://www.judiciary.uk/wp-content/uploads/2022/12/Wright-v-McCormack-Final-Judgment-for-Hand-Down.pdf");
  assert.equal(sources.get("ver-2094").url, "https://caselaw.nationalarchives.gov.uk/ewhc/qb/2019/2094");
  assert.equal(sources.get("pc-original").url, "https://planetarycouncil.org/bitcoin-movie-craig-wright-is-a-fraud.html");

  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (id) => entries.get(id).paragraphs.map((x) => x.text).join(" ");

  assert.match(text("mellor-quote"), /lied to the Court extensively and repeatedly/);
  assert.match(text("mellor-quote"), /biggest lie: his claim to be Satoshi Nakamoto/);
  assert.match(text("declarations"), /not the author of the Bitcoin White Paper/);
  assert.match(text("vehicle-for-fraud"), /forged on a grand scale/);
  assert.match(text("vehicle-for-fraud"), /use the Courts as a vehicle for fraud/);
  assert.match(text("vehicle-for-fraud"), /Those are the words of the judge/);
  assert.match(text("cps-referral"), /wholescale perjury and forgery of documents/);
  assert.match(text("cps-referral"), /All those matters are to be decided by the CPS/);
  assert.match(text("mccormack"), /deliberately false evidence on oath/);
  assert.match(text("cobra"), /judgment was entered by default/);
  assert.match(text("cobra"), /won against an empty chair/);
  assert.match(text("granath"), /ample factual basis/);
  assert.match(text("granath"), /as reported/);
  assert.equal(entries.get("red-carpet").kind, "Our proposal — not legal advice");
  assert.equal(entries.get("what-satoshi-would-do").kind, "Our commentary");
  assert.equal(entries.get("why-guess").kind, "Our commentary");
  assert.match(text("ask-the-cps"), /has not been charged with or convicted of perjury/);
  assert.match(text("the-film"), /is not a finding of fact|A screenplay is not evidence/);
  assert.match(text("the-film"), /second-hand accounts/);
  assert.match(text("method"), /first published on Planetary Council/);
  assert.equal(entries.get("limits").kind, "Coverage limitation");

  const all = JSON.stringify(p);
  assert.doesNotMatch(all, /has been convicted of (a criminal offence of )?(fraud|perjury|forgery)/i);
  assert.match(all, /not been charged with, or convicted of, a criminal offence of perjury or forgery/);

  const html = await read(`public/research/${id}/index.html`);
  assert.ok(html.includes(`<h1>${p.title}</h1>`));
  assert.ok(html.includes(`rel="canonical" href="https://independenttribunal.org/research/${id}/"`));
  const firstCitations = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
  assert.deepEqual(firstCitations, p.sources.map((_, i) => i + 1));
  for (const s of p.sources) {
    assert.ok(html.includes(`href="${s.url.replaceAll("&", "&amp;")}" target="_blank" rel="noopener noreferrer"`), s.id);
  }
  assert.ok(html.includes('src="/images/craig-wright-preview.jpg"'));
  assert.match(html, /illustrative commentary, not a court document/);
  assert.ok(html.includes('property="og:image" content="https://independenttribunal.org/images/craig-wright-preview.jpg"'));
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  await readFile(new URL("../public/images/craig-wright-preview.jpg", import.meta.url));

  const anchors = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(anchors).size, anchors.length);
  for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(anchors.includes(m[1]), m[1]);

  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) {
    assert.ok((await read(file)).includes(`/research/${id}/`), file);
  }
  const { tiles } = await json("public/data/tiles.json");
  assert.equal(tiles.find((t) => t.id === id).kind, "study");
  assert.ok(p.related.some((r) => r.id === "calling-fraud-a-fraud"));
});
