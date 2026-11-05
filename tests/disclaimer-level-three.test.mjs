import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Disclaimer Level Three: labelled satire, verified law, names nobody", async () => {
  const p = JSON.parse(await read("data/profiles/disclaimer-level-three.json"));
  validateProfile(p, (message) => assert.fail(message));
  assert.match(p.subtitle, /^SATIRE\./);
  const all = JSON.stringify(p);
  assert.doesNotMatch(all, /NOT RETRIEVED|\bEssex\b|\bShaw\b|\bLowe\b|nudity|detransition/i);
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  assert.equal(entries.get("the-author").paragraphs[0].quote, true);
  assert.match(entries.get("the-author").paragraphs[0].text, /I actually mean it/);
  assert.equal(entries.get("seven-gates").table.rows.length, 7);
  assert.match(entries.get("meaning").paragraphs[0].text, /The intention of the publisher is irrelevant/);
  assert.ok(p.sections.find((s) => s.id === "what-works").title.includes("not satire"));
});

test("Frameworks of truth: lying to your barrister is not a loophole", async () => {
  const p = JSON.parse(await read("data/profiles/frameworks-of-truth.json"));
  validateProfile(p, (message) => assert.fail(message));
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  assert.match(entries.get("client-consequences").paragraphs[1].text, /reasonable diligence should not be imposed/);
  assert.match(entries.get("pollute-the-other-side").kind, /^Hypothetical/);
  assert.doesNotMatch(JSON.stringify(entries.get("pollute-the-other-side")), /Essex|Shaw|Lowe|Israel|South Africa/);
  assert.match(entries.get("at-the-world-court").paragraphs[1].text, /not due to negligence/);
  assert.ok(p.related.some((r) => r.id === "who-speaks-at-the-world-court"));
});
