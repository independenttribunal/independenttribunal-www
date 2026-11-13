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
  assert.match(text("article-42"), /The parties shall be represented by agents/);
  assert.match(text("article-42"), /The Statute says nothing about who counsel and advocates must be/);
  assert.match(text("who-appoints"), /all steps on behalf of the parties after proceedings have been instituted shall be taken by agents/);
  assert.match(text("who-appoints"), /its agent, without recapitulation of the arguments, shall read that party’s final submissions/);
  assert.match(text("who-appoints"), /the number of counsel and advocates to be heard on behalf of each party/);
  assert.match(text("who-appoints"), /These are rules about the role of the agent/);
  assert.match(text("who-appoints"), /Who is appointed, and by what domestic process, is left to each state under its own arrangements/);
  assert.match(text("who-appoints"), /it does not regulate how a state makes that choice/);
  assert.match(text("no-code"), /not subject under international law to any compulsory code of conduct/);
  assert.match(text("icty"), /prevail in respect of counsel’s conduct before the Tribunal/);
  assert.match(text("essex"), /we allege none/);
  assert.equal(entries.get("court-lever").kind, "Our analysis");
  assert.ok(entries.get("interventions").table.rows.some((r) => r[1] === "Mexico"));
  assert.doesNotMatch(JSON.stringify(p), /NOT RETRIEVED|Vagts/);
  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.match(sources.get("statute").url, /^https:\/\/www\.icj-cij\.org\//);
  assert.equal(sources.get("rules").url, "https://www.icj-cij.org/rules");
  assert.equal(sources.get("rules").type, "Official rules");
  assert.equal(p.checked, "2026-11-12");
  const html = await read("public/research/who-speaks-at-the-world-court/index.html");
  assert.ok(html.includes('id="who-appoints"'));
  assert.ok(html.includes('href="https://www.icj-cij.org/rules" target="_blank" rel="noopener noreferrer"'));
});
