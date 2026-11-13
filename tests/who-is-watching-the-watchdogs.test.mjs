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
  assert.match(text("mandelson"), /co-founder of Global Counsel/);
  assert.match(text("mandelson"), /ambassador from 10 February 2025 to 11 September 2025/);
  assert.match(text("mandelson"), /January to March 2025, the quarter in which the Washington visit took place/);
  assert.match(text("mandelson"), /27 February 2025/);
  assert.match(text("mandelson"), /not a formal meeting, therefore we do not hold any minutes/);
  assert.match(text("mandelson"), /it does not itself name the other people listed in the question/);
  assert.match(text("mandelson"), /relationship with Jeffrey Epstein is materially different/);
  assert.match(text("mandelson"), /The stated reason was that relationship, not the Palantir visit/);
  assert.match(text("mandelson"), /not a finding, on this page, that he lobbied on the visit/);
  assert.equal(sources.get("mandelson-appoint").url, "https://www.gov.uk/government/news/appointment-of-lord-mandelson-as-the-next-british-ambassador-to-the-united-states-of-america");
  assert.equal(sources.get("mandelson-bio").url, "https://www.gov.uk/government/people/peter-mandelson");
  assert.match(sources.get("orcl-palantir").url, /orcl\.my\.site\.com/);
  assert.match(sources.get("pq-77563").url, /questions-statements\.parliament\.uk/);
  assert.match(sources.get("pq-112839").url, /questions-statements\.parliament\.uk/);
  assert.equal(sources.get("fcdo-withdraw").url, "https://www.gov.uk/government/news/fcdo-statement-hma-washington");
  assert.ok(p.highlights.some((h) => h.target === "mandelson" && h.value.includes("27 February 2025")));
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

  assert.equal(p.evidence_image.src, "/images/cressida-dick-palantir-adviser.webp");
  assert.equal(p.evidence_image.width, 1200);
  assert.equal(p.evidence_image.height, 1200);
  assert.match(p.evidence_image.alt, /Dame Cressida Dick/);
  assert.match(p.evidence_image.caption, /campaign graphic/i);
  assert.match(p.evidence_image.caption, /not evidence/i);
  assert.equal(p.artworks[0].src, "/images/independent-tribunal-campaign-poster.webp");
  assert.equal(p.artworks[0].after_section, "gaza");
  assert.match(p.artworks[0].caption, /campaign graphic/i);
  assert.match(p.artworks[0].caption, /not evidence/i);
  assert.match(p.artworks[0].transcript, /WE DO NOT FORGET/);
  assert.match(text("limits"), /illustrative commentary, not evidence/);
  assert.doesNotMatch(text("limits"), /not available/);

  assert.ok(html.includes('src="/images/cressida-dick-palantir-adviser.webp"'));
  assert.ok(html.includes('src="/images/independent-tribunal-campaign-poster.webp"'));
  assert.ok(html.includes('loading="lazy"'));
  assert.ok(html.includes('property="og:image" content="https://independenttribunal.org/images/cressida-dick-palantir-adviser.webp"'));
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  assert.ok(html.includes('name="twitter:image" content="https://independenttribunal.org/images/cressida-dick-palantir-adviser.webp"'));
  await readFile(new URL("../public/images/cressida-dick-palantir-adviser.webp", import.meta.url));
  await readFile(new URL("../public/images/independent-tribunal-campaign-poster.webp", import.meta.url));


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
