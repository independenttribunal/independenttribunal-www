import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("the Thames Water study keeps findings, allegations and commentary apart", async () => {
  const p = await json("data/profiles/thames-water.json");
  validateProfile(p, (message) => assert.fail(message));
  const sources = new Map(p.sources.map((s) => [s.id, s]));
  for (const id of ["ewhc", "ewca", "crim2015", "sequana", "msc", "roberts"]) assert.match(sources.get(id).url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\//);
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (id) => entries.get(id).paragraphs.map((x) => x.text).join(" ");
  // The record the page is built on, verbatim from the primary sources.
  assert.ok(entries.get("convictions").paragraphs.some((x) => x.quote && x.text === "Since 1991, the Appellant has been convicted on 106 occasions of 162 environmental offences."));
  assert.ok(entries.get("not-blame").paragraphs.some((x) => x.quote && x.text === "It is not for this Court to attribute blame for the financial position in which the Plan Company now finds itself."));
  assert.ok(entries.get("zero").paragraphs.some((x) => x.quote && x.text.startsWith("No prison sentences have been handed to water executives since privatisation")));
  // Figures corrected from the briefs.
  assert.match(text("dividends"), /about £5\.95bn/);
  assert.match(text("interest"), /£809\.6m/);
  // Commentary stays labelled, an allegation stays an allegation, and the appeal amendment survives.
  for (const id of ["plain-sight", "directors", "oversight-table"]) assert.equal(entries.get(id).kind, "Our analysis");
  assert.equal(entries.get("dossier").kind, "Allegation, not a finding");
  assert.match(text("release"), /no reason to conclude there had been any breach of duty/);
  assert.match(p.status_note, /no person or company named here has been convicted of fraud/);
  assert.match(text("status"), /do not themselves provide the extra £2\.4bn/);
  // The "dreadful results" remark is the judge's, and Macquarie's reply stays on the page.
  assert.match(text("sick"), /Judge Sheridan said/);
  assert.match(text("macquarie"), /£879m in dividends/);
  // The page opens with the plain-English story, and its numbers stay tied to the record.
  assert.equal(p.sections[0].id, "story");
  assert.equal(p.highlights[1].target, "the-bill");
  assert.match(text("money-in-out"), /profit before tax of £226m/);
  assert.match(text("money-in-out"), /£1,129m short/);
  assert.match(text("money-in-out"), /£1,570m after fees/);
  await readFile(new URL(`../public${p.evidence_image.src}`, import.meta.url));
  assert.match(text("the-bill"), /about 22p of every £1/);
  assert.match(text("the-bill"), /about £2\.2m every day/);
  assert.match(text("rivers"), /298,081 hours in 2024 and 107,822 hours in 2025/);
  assert.match(text("rivers"), /time, not volume/);
  assert.match(text("summer-day"), /not medical findings/);
  assert.match(text("other-side"), /covers all of England, not Thames Water alone/);
  // "Fraudulent" appears once as our word, aimed at the whole arrangement, inside labelled analysis.
  assert.equal(entries.get("whole-picture").kind, "Our analysis");
  assert.equal(entries.get("whole-picture").paragraphs[1].withheld, true);
  assert.match(entries.get("whole-picture").paragraphs[1].text, /fraudulent/);
  assert.equal(entries.get("whole-picture").paragraphs[2].withheld, undefined);
  assert.match(text("whole-picture"), /not a statement that any person or company lied, acted dishonestly or committed a crime/);
  const own = p.sections.flatMap((s) => s.entries).filter((e) => e.paragraphs.some((x) => /fraudulent(?! trading| purpose)/i.test(x.text)));
  assert.deepEqual(own.map((e) => e.id), ["whole-picture"]);
  // The audit office can scrutinise the regulators, and the page says it welcomes that.
  assert.match(text("scrutiny"), /We intend to ask it, along with the companies and individuals involved, what should be done with this work/);
  assert.match(p.status_note, /National Audit Office/);
  assert.equal((await json("public/data/tiles.json")).tiles[0].id, "thames-water");
  assert.equal(entries.get("rational").kind, "Our analysis");
  assert.match(text("rational"), /does not say that any person or company committed fraud/);
  // The 22.5% figure is one side's evidence, and the judge doubted it.
  assert.match(text("two-loans"), /not fully convinced/);
  assert.match(text("interest"), /£200\.8m of capitalised borrowing costs/);
  const html = await read("public/research/thames-water/index.html");
  assert.ok(html.includes("This part is not published"));
  assert.ok(html.includes('href="/research/private-prosecution-staying-in-control/"'));
  assert.ok((await read("public/research/private-prosecution-staying-in-control/index.html")).includes('href="/research/thames-water/"'));
});
