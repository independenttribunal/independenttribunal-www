import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("World Court study: verified texts, labelled analysis, no unverified record claims", async () => {
  const p = JSON.parse(await read("data/profiles/who-speaks-at-the-world-court.json"));
  validateProfile(p, (message) => assert.fail(message));
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (id) => entries.get(id).paragraphs.map((x) => x.text).join(" ");
  assert.match(text("states-only"), /Only states may be parties/);
  assert.match(text("no-code"), /not subject under international law to any compulsory code of conduct/);
  assert.match(text("icty"), /prevail in respect of counsel’s conduct before the Tribunal/);
  assert.match(text("essex"), /we allege none/);
  assert.equal(entries.get("court-lever").kind, "Our analysis");
  assert.ok(entries.get("interventions").table.rows.some((r) => r[1] === "Mexico"));
  assert.doesNotMatch(JSON.stringify(p), /NOT RETRIEVED|Vagts/);
  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.match(sources.get("statute").url, /^https:\/\/www\.icj-cij\.org\//);
});
