import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("the citizen’s statement is a formal statement of concern, not a finding, and uses the Palantir poster as the share image", async () => {
  const id = "citizens-statement-of-concern";
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));

  assert.equal(p.id, id);
  assert.equal(p.category, "legal-study");
  assert.equal(p.checked, "2026-11-13");
  assert.equal(p.title, "A citizen’s statement of concern");
  assert.match(p.subtitle, /I refuse to accept “shocking and appalling” as the new normal/);
  assert.match(p.summary, /not a court/);
  assert.match(p.scope, /does not find criminal or civil wrongdoing/);
  assert.match(p.status_note, /does not allege that any named person has broken the law/);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.equal(
    sources.get("tbij").url,
    "https://www.thebureauinvestigates.com/stories/2026-11-10/revealed-palantir-employing-cressida-dick-as-paid-adviser",
  );
  assert.equal(sources.get("tbij").date, "2026-11-10");
  assert.equal(p.featured_source, "tbij");
  assert.match(sources.get("gov-suspend").url, /^https:\/\/www\.gov\.uk\//);
  assert.match(sources.get("lammy").url, /^https:\/\/www\.gov\.uk\//);
  assert.match(sources.get("tw-page").url, /\/research\/thames-water\/$/);
  assert.match(sources.get("watchdogs-page").url, /\/research\/who-is-watching-the-watchdogs\/$/);
  assert.match(sources.get("editorial").url, /\/legal\/editorial-standards\/$/);
  assert.match(sources.get("site-gaza").url, /\/independent-tribunals\/gaza-tribunal\/$/);
  assert.match(sources.get("site-gaza-uk").url, /\/independent-tribunals\/gaza-tribunal-uk\/$/);

  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (entryId) => entries.get(entryId).paragraphs.map((x) => x.text).join(" ");

  assert.match(text("the-refusal"), /desensitised to repeated institutional controversies|Familiarity is not a defence/);
  assert.match(text("palantir-role"), /paid adviser/);
  assert.match(text("palantir-role"), /September 2025/);
  assert.match(text("palantir-role"), /have not ever lobbied or advocated for Palantir/);
  assert.match(text("palantir-role"), /not a finding that she was required to apply and failed to do so/);
  assert.match(text("thames-record"), /about 86%/);
  assert.match(text("thames-record"), /£19\.8 billion/);
  assert.match(text("gaza-licences"), /around 30/);
  assert.match(text("gaza-licences"), /approximately 350/);
  assert.match(text("gaza-licences"), /clear risk/);
  assert.match(text("gaza-licences"), /forthcoming/);
  assert.match(text("oversight-question"), /genuinely equipped, sufficiently independent and willing/);
  assert.match(text("no-presumption"), /I do not presume criminal wrongdoing/);
  assert.match(text("no-presumption"), /suspicion with proof/);
  assert.match(text("test-the-question"), /complainant’s assumptions/);
  assert.match(text("test-the-question"), /exculpatory evidence/);
  assert.match(text("not-a-court"), /independent public-interest research and accountability initiative/);
  assert.match(text("not-a-court"), /not a court with coercive or judicial powers/);
  assert.match(text("the-centre-line"), /Shocking and appalling is not a standard of governance/);
  assert.match(text("the-centre-line"), /repetition does not constitute justification/);

  const all = p.sections.flatMap((s) => s.entries).flatMap((e) => e.paragraphs).map((x) => x.text).join(" ");
  assert.doesNotMatch(all, /guilty of|criminal offence|broke the law|lobbied for Palantir/);
  assert.ok(p.related.some((r) => r.id === "who-is-watching-the-watchdogs"));
  assert.ok(p.related.some((r) => r.id === "thames-water"));

  assert.equal(p.evidence_image.src, "/images/cressida-dick-palantir-shocking-appalling.webp");
  assert.equal(p.evidence_image.width, 1200);
  assert.equal(p.evidence_image.height, 1200);
  assert.equal(p.evidence_image.after_section, undefined);
  assert.match(p.evidence_image.alt, /Dame Cressida Dick/);
  assert.match(p.evidence_image.alt, /Shocking and appalling became the new normal/i);
  assert.match(p.evidence_image.caption, /campaign graphic/i);
  assert.match(p.evidence_image.caption, /not evidence/i);
  const image = await stat(new URL("../public/images/cressida-dick-palantir-shocking-appalling.webp", import.meta.url));
  assert.ok(image.size > 80_000 && image.size < 600_000);

  const html = await read(`public/research/${id}/index.html`);
  assert.match(html, /A citizen’s statement of concern/);
  assert.ok(html.includes('src="/images/cressida-dick-palantir-shocking-appalling.webp"'));
  assert.ok(html.includes('property="og:image" content="https://independenttribunal.org/images/cressida-dick-palantir-shocking-appalling.webp"'));
  assert.match(html, /thebureauinvestigates\.com\/stories\/2026-11-10\/revealed-palantir-employing-cressida-dick-as-paid-adviser/);
  assert.match(html, /Shocking and appalling is not a standard of governance/);
  assert.match(html, /not a court with coercive or judicial powers/);
  assert.match(html, /href="\/research\/who-is-watching-the-watchdogs\/"/);
  assert.match(html, /href="\/research\/thames-water\/"/);

  const people = await read("public/people/index.html");
  assert.doesNotMatch(people, /citizens-statement-of-concern/);

  const complicity = await json("data/categories/uk-complicity.json");
  assert.ok(complicity.related.some((r) => r.href === `/research/${id}/`));
});
