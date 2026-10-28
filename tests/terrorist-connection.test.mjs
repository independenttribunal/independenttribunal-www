import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const entriesOf = (p) => new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
const textOf = (entry) => entry.paragraphs.map((x) => x.text).join(" ");

test("the section 69 study rests on the primary rulings and keeps analysis labelled", async () => {
  const p = await json("data/profiles/terrorist-connection-add-on.json");
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.title, "Terrorist connection add-on");
  const sources = new Map(p.sources.map((s) => [s.id, s]));
  for (const id of ["filton-ruling", "filton-remarks", "barclays-ruling"]) assert.match(sources.get(id).url, /^https:\/\/www\.judiciary\.uk\//);
  const entries = entriesOf(p);
  assert.match(textOf(entries.get("judge-not-jury")), /jury is not asked about terrorism/);
  assert.match(textOf(entries.get("scotland")), /stated in the indictment and proved/);
  assert.match(textOf(entries.get("filton")), /None was charged with, or convicted of, a terrorist offence/);
  assert.match(textOf(entries.get("barclays")), /did not apply/);
  assert.equal(entries.get("filton-sentences").table.rows.length, 4);
  for (const id of ["charging", "why-different", "proportionality"]) assert.equal(entries.get(id).kind, "Our analysis");
  // Appeal status comes from reporting: never present filing as permission.
  assert.match(textOf(entries.get("filton-appeal")), /not the same as being given permission/);
  assert.match(textOf(entries.get("commentary")), /do not endorse any call to action/);
});

test("the Czech page attributes allegations and does not name the accused", async () => {
  const p = await json("data/profiles/czech-elbit-10.json");
  validateProfile(p, (message) => assert.fail(message));
  assert.match(p.status_note, /presumed innocent/);
  assert.match(p.summary, /never went ahead/);
  assert.match(JSON.stringify(p.sections), /accused, not convicted/);
  // Only the UK comparison may speak of convictions; nothing about the Czech accused may.
  const czech = [...entriesOf(p).values()].filter((e) => e.id !== "uk-comparison").map(textOf).join(" ");
  assert.doesNotMatch(czech, /\b(guilty of|convicted of)\b/);
});

test("the dossiers point to the new study and carry dated, sourced updates", async () => {
  const filton = await json("public/data/research/filton6.json");
  const u = filton.updates[0];
  assert.equal(u.date, "2026-06-12");
  assert.ok(u.sources.some((s) => s.url.endsWith("R-v-Charlotte-Head-and-others-sentencing-remarks.pdf")));
  for (const page of ["filton6", "barclays5", "terrorist-connection"]) {
    const html = await read(`public/research/${page}/index.html`);
    assert.ok(html.includes('href="/research/terrorist-connection-add-on/"'), page);
  }
  const fil = await read("public/research/filton6/index.html");
  assert.ok(fil.includes('href="/research/czech-elbit-10/"'));
  assert.ok(fil.includes("https://aftershock.media/judge-johnson-and-executioner/"));
  const study = await read("public/research/terrorist-connection-add-on/index.html");
  assert.ok(study.includes('href="/research/czech-elbit-10/"'));
  assert.ok(study.includes('href="/research/terrorist-connection/"'));
  const collection = await read("public/research/palestine-action/index.html");
  for (const id of ["terrorist-connection-add-on", "czech-elbit-10"]) assert.ok(collection.includes(`href="/research/${id}/"`), id);
});
