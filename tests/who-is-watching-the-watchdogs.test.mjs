import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("who is watching the watchdogs: sourced facts, questions not allegations, Thames and Gaza links", async () => {
  const id = "who-is-watching-the-watchdogs";
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));

  assert.equal(p.id, id);
  assert.equal(p.category, "legal-study");
  assert.equal(p.title, "Who is watching the watchdogs?");
  assert.equal(p.checked, "2026-11-12");
  assert.match(p.subtitle, /questions, not alleged as wrongdoing/);
  assert.match(p.status_note, /not a finding of unlawfulness/);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.match(sources.get("tbij").url, /thebureauinvestigates\.com/);
  assert.equal(sources.get("tbij").date, "2026-11-10");
  assert.match(sources.get("gov-suspend").url, /^https:\/\/www\.gov\.uk\//);
  assert.match(sources.get("lammy").url, /^https:\/\/www\.gov\.uk\//);
  assert.match(sources.get("ihl-summary").url, /^https:\/\/www\.gov\.uk\//);
  assert.match(sources.get("nhs-england").url, /england\.nhs\.uk/);
  assert.match(sources.get("contracts-fdp").url, /contractsfinder\.service\.gov\.uk/);
  assert.match(sources.get("nflms").url, /find-tender\.service\.gov\.uk/);
  assert.match(sources.get("met-pilot").url, /contractsfinder\.service\.gov\.uk/);
  assert.match(sources.get("mopac").url, /london\.gov\.uk/);
  assert.match(sources.get("tw-page").url, /\/research\/thames-water\/$/);
  assert.match(sources.get("site-gaza").url, /\/independent-tribunals\/gaza-tribunal\/$/);
  assert.match(sources.get("site-gaza-uk").url, /\/independent-tribunals\/gaza-tribunal-uk\/$/);

  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (id) => entries.get(id).paragraphs.map((x) => x.text).join(" ");

  assert.match(text("palantir-role"), /paid adviser for the last year/);
  assert.match(text("palantir-role"), /September 2025/);
  assert.match(text("palantir-role"), /did not report how much she is paid/);
  assert.match(text("what-she-says"), /have not ever lobbied or advocated for Palantir/);
  assert.match(text("what-she-says"), /does not contradict it/);
  assert.match(text("acoba-question"), /has not identified a published ACOBA advice letter/);
  assert.match(text("acoba-question"), /not a finding that she was required to apply and failed to do so/);
  assert.match(text("palantir-contracts"), /not evidence that Dame Cressida was involved/);
  assert.match(text("palantir-contracts"), /up to £330 million/);
  assert.match(text("palantir-contracts"), /not a committed amount/);
  assert.match(text("palantir-contracts"), /£9,000,000 including VAT/);
  assert.match(text("palantir-contracts"), /£489,999/);
  assert.match(text("palantir-contracts"), /decision in May 2026 not to enter a UOA Contract/);
  assert.match(text("thames-gearing"), /about 86%/);
  assert.match(text("thames-gearing"), /£19\.8 billion/);
  assert.match(text("thames-distributions"), /Macquarie disputes those figures/);
  assert.match(text("thames-regulators"), /where were the regulators/i);
  assert.equal(entries.get("forthcoming").kind, "Coverage limitation");
  assert.match(text("forthcoming"), /forthcoming/);
  assert.match(text("gaza-licences"), /around 30 licences/);
  assert.match(text("gaza-licences"), /approximately 350/);
  assert.match(text("gaza-licences"), /clear risk/);
  assert.match(text("gaza-licences"), /not an international court/);
  assert.match(text("f35-carve-out"), /excluded from this decision, except where going directly to Israel/);
  assert.match(text("normalised"), /Shocking and appalling became the new normal/);
  assert.equal(entries.get("how-to-read").kind, "Research method");
  assert.equal(entries.get("limits").kind, "Coverage limitation");

  const all = JSON.stringify(p);
  assert.doesNotMatch(all, /broke the law by/);
  assert.doesNotMatch(all, /illegally/);
  assert.match(all, /does not allege that any named person has broken the law/);
  assert.ok(p.related.some((r) => r.id === "thames-water"));

  const html = await read(`public/research/${id}/index.html`);
  assert.ok(html.includes(`<h1>${p.title}</h1>`));
  assert.ok(html.includes(`rel="canonical" href="https://independenttribunal.org/research/${id}/"`));
  const firstCitations = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
  assert.deepEqual(firstCitations, p.sources.map((_, i) => i + 1));
  for (const s of p.sources) {
    assert.ok(html.includes(`href="${s.url.replaceAll("&", "&amp;")}" target="_blank" rel="noopener noreferrer"`), s.id);
  }
  assert.ok(html.includes('href="/research/thames-water/"'));
  assert.ok(html.includes("Shocking and appalling became the new normal"));
  assert.match(html, /under investigation/i);

  const anchors = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(anchors).size, anchors.length);
  for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(anchors.includes(m[1]), m[1]);

  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) {
    assert.ok((await read(file)).includes(`/research/${id}/`), file);
  }
  const { tiles } = await json("public/data/tiles.json");
  assert.equal(tiles.find((t) => t.id === id).kind, "study");

  const thamesHtml = await read("public/research/thames-water/index.html");
  assert.ok(thamesHtml.includes(`href="/research/${id}/"`));

  const exported = await json(`public/data/profiles/${id}.json`);
  for (const section of exported.sections) {
    for (const entry of section.entries) {
      for (const para of entry.paragraphs) {
        for (const ref of para.sources) {
          assert.ok(ref.url && ref.publisher && ref.checked && ref.type, `${entry.id} missing source fields`);
        }
      }
    }
  }
});
