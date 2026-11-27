import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const id = "acquittal-legal-certainty-paradox";

test("acquittal–legal certainty paradox: verified holdings, thought experiment and no invitation to publish the words", async () => {
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.category, "legal-study");
  assert.equal(p.title, "The acquittal–legal certainty paradox");
  assert.equal(p.checked, "2026-11-27");
  assert.match(p.summary, /without inviting anyone to repeat the words|not inviting anyone to repeat the words/);
  assert.match(p.status_note, /transcripts/i);
  assert.match(p.status_note, /Attorney General/);
  assert.ok((p.related ?? []).some((r) => r.id === "speech-offences"));
  assert.ok((p.related ?? []).some((r) => r.id === "hamas-deproscription"));
  assert.ok((p.related ?? []).some((r) => r.id === "frameworks-of-truth"));

  const blob = JSON.stringify(p);
  assert.doesNotMatch(blob, /Review log|Corrections log|confirmed by/);
  assert.match(blob, /the dude was 72 and Jewish/);
  assert.match(blob, /not evidence that those facts caused the acquittal/);
  assert.match(blob, /14 years/);
  assert.match(blob, /Counter-Terrorism and Sentencing Act 2021/);
  assert.doesNotMatch(blob, /14 years imprisonment \(as amended by Counter-Terrorism and Border Security Act 2019\)/);
  assert.match(blob, /section 20D of the Juries Act 1974/);
  assert.doesNotMatch(blob, /Contempt of Court Act 1981 s\. ?8 remains/);
  assert.match(blob, /no need to prove knowledge that the group is proscribed|Knowledge that the organisation was proscribed is part of what must be proved/);
  assert.match(p.sections.map((s) => s.entries.map((e) => e.paragraphs.map((x) => x.text).join(" ")).join(" ")).join(" "), /Knowledge that the organisation was proscribed is part of what must be proved/);
  assert.match(blob, /22 March 2016/);
  assert.match(blob, /paragraph 82/);
  assert.match(blob, /135 to 139|paragraphs 135/);
  assert.match(blob, /section 36\(7\)/);
  assert.match(blob, /90 days beginning with the day after/);
  assert.match(blob, /not reported to be a rabbi himself/);
  assert.match(blob, /incomplete account of what the jury was asked to consider/);
  assert.match(blob, /This page does not pick one/);
  assert.match(blob, /not a route this study recommends or invites/);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.equal(sources.get("uksc-8").url, "https://supremecourt.uk/uploads/uksc_2025_0059_0079_judgment_b1b1beab96.pdf");
  assert.equal(sources.get("choudary").url, "https://caselaw.nationalarchives.gov.uk/ewca/crim/2016/61");
  assert.equal(sources.get("choudary").date, "2016-03-22");
  assert.equal(sources.get("r-v-f").date, "2007-02-16");
  assert.equal(sources.get("si-2006-2299-reg7").url, "https://www.legislation.gov.uk/uksi/2006/2299/regulation/7");
  assert.equal(sources.get("juries-act-20d").url, "https://www.legislation.gov.uk/ukpga/1974/23/section/20D");
  assert.ok(!blob.includes("utm_source=chatgpt"));

  const html = await read(`public/research/${id}/index.html`);
  assert.match(html, /<h1>The acquittal–legal certainty paradox<\/h1>/);
  assert.match(html, /id="mock-trial"/);
  assert.match(html, /id="satire-clause"/);
  assert.ok(html.includes('href="/research/speech-offences/"'));
  assert.ok(html.includes('href="/research/hamas-deproscription/"'));
  assert.ok(html.includes('href="https://supremecourt.uk/uploads/uksc_2025_0059_0079_judgment_b1b1beab96.pdf"'));
  const firstCitations = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
  assert.deepEqual(firstCitations, p.sources.map((_, i) => i + 1));

  const { tiles } = await json("public/data/tiles.json");
  assert.equal(tiles.find((t) => t.id === id).kind, "study");

  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt"]) {
    assert.ok((await read(file)).includes(`/research/${id}/`), file);
  }

  const speech = await json("data/profiles/speech-offences.json");
  assert.ok((speech.related ?? []).some((r) => r.id === id));
  const greenstein = speech.sections.flatMap((s) => s.entries).find((e) => e.id === "greenstein-record");
  assert.ok(greenstein.paragraphs.some((para) => /acquittal–legal certainty paradox/.test(para.text)));

  const category = await json("data/categories/speech-offences.json");
  const hamas = category.chapters.find((c) => c.title === "Supporting Hamas");
  assert.ok(hamas.links.some((l) => l.href === `/research/${id}/`));
});
