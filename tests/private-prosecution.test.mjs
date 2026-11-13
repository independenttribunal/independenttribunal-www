import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const id = "private-prosecution-staying-in-control";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("private prosecution page separates current law from our proposal and the optional improvement", async () => {
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.title, "Private prosecution and staying in control");
  assert.equal(p.jurisdiction, "England and Wales");
  assert.match(p.status_note, /our reform proposal, not current law/);
  const sections = new Map(p.sections.map((s) => [s.id, s]));
  for (const s of ["proposal", "today", "accuracy", "cps-first-hearing", "objections", "control"]) assert.ok(sections.has(s), s);
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  for (const e of ["proposal-steps", "cps-invite-mechanism", "presumption"]) assert.match(entries.get(e).kind, /not current law/);
  assert.match(entries.get("illustrative-clause").kind, /not legislation/);
  assert.match(entries.get("dpp-takeover").paragraphs.map((x) => x.text).join(" "), /any stage/);
  assert.equal(entries.get("control-table").table.columns.length, 4);
  assert.ok(p.related.some((r) => r.id === "craig-wright-docket"));
  assert.match(entries.get("wright-civil-illustration").kind, /civil proceedings/);
  const illustration = entries.get("wright-civil-illustration").paragraphs.map((x) => x.text).join(" ");
  assert.match(illustration, /use the Courts as a vehicle for fraud/);
  assert.match(illustration, /not a private prosecution/);
  assert.match(illustration, /General Civil Restraint Order/);
  const html = await read(`public/research/${id}/index.html`);
  assert.ok(html.includes('href="/research/craig-wright-docket/"'));
});

test("the infographic matches the reviewed file and its corrected text", async () => {
  const p = await json(`data/profiles/${id}.json`);
  const review = await json("data/reviews/private-prosecution.json");
  const [art] = p.artworks;
  const bytes = await readFile(new URL(`../public${art.src}`, import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), review.input.images[0].sha256);
  assert.doesNotMatch(art.caption, /user-supplied|reproduced unchanged/i);
  assert.match(art.transcript, /CURRENT LAW \(E&W\)/);
  assert.match(art.transcript, /to stop or continue/);
  assert.match(art.transcript, /Defendant rarely heard before summons/);
  assert.doesNotMatch(art.transcript, /CURRENT UK LAW|no chance to respond/);
  const html = await read(`public/research/${id}/index.html`);
  assert.ok(html.includes(art.src));
});

test("the CPS determination poster appears after the optional improvement and is the share image", async () => {
  const p = await json(`data/profiles/${id}.json`);
  const poster = p.artworks.find((a) => a.src === "/images/cps-binding-preliminary-determination.webp");
  assert.ok(poster);
  assert.equal(poster.after_section, "cps-first-hearing");
  assert.equal(poster.width, 1024);
  assert.equal(poster.height, 1280);
  assert.equal(poster.og, true);
  assert.match(poster.alt, /binding preliminary CPS determination/i);
  assert.match(poster.caption, /not current law/i);
  assert.match(poster.caption, /Act of Parliament/);
  assert.match(poster.transcript, /CERTAINTY AT THE START/);
  assert.match(poster.transcript, /IF CPS DECLINES: NO LATER TAKEOVER/);
  assert.match(poster.transcript, /TAKE OVER & CONTINUE/);
  const bytes = await readFile(new URL("../public/images/cps-binding-preliminary-determination.webp", import.meta.url));
  assert.ok(bytes.length > 10000);
  const html = await read(`public/research/${id}/index.html`);
  assert.ok(html.includes('src="/images/cps-binding-preliminary-determination.webp"'));
  assert.ok(html.includes('property="og:image" content="https://independenttribunal.org/images/cps-binding-preliminary-determination.webp"'));
  const cpsIdx = html.indexOf('id="cps-first-hearing"');
  const imgIdx = html.indexOf('src="/images/cps-binding-preliminary-determination.webp"');
  const researchIdx = html.indexOf('id="research"');
  assert.ok(cpsIdx !== -1 && imgIdx > cpsIdx, "poster should appear after the CPS section heading");
  assert.ok(researchIdx === -1 || imgIdx < researchIdx, "poster should appear before the next section");
});

