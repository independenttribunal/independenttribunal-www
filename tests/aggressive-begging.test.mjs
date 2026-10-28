import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("the begging study separates law, our analysis and the fictional scenario", async () => {
  const p = await json("data/profiles/aggressive-begging.json");
  validateProfile(p, (message) => assert.fail(message));
  const sources = new Map(p.sources.map((s) => [s.id, s]));
  // The supplied brief cited the wrong neutral citation; keep the corrected one.
  assert.match(sources.get("abrook").title, /\[2024\] EWCA Civ 230/);
  assert.match(sources.get("abrook").url, /ewca\/civ\/2024\/230$/);
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  for (const id of ["examples-table", "analysis", "open-questions"]) assert.equal(entries.get(id).kind, "Our analysis");
  assert.match(entries.get("proposal").kind, /not current law/);
  assert.match(p.sections.find((s) => s.id === "hypothetical").intro, /fictional/);
  assert.match(entries.get("lacatus").paragraphs.map((x) => x.text).join(" "), /did not rule separately on freedom of expression/);
  assert.match(entries.get("other-tools").paragraphs.map((x) => x.text).join(" "), /26 October 2026.*£500/);
  const html = await read("public/research/aggressive-begging/index.html");
  assert.ok(html.includes('href="/research/public-order/"'));
});
