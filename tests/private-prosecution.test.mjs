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
