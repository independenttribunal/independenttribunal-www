import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("the riot study rests on primary sources and keeps the staged-riot moot labelled", async () => {
  const p = await json("data/profiles/regulated-riots.json");
  validateProfile(p, (message) => assert.fail(message));
  const sources = new Map(p.sources.map((s) => [s.id, s]));
  // The supplied brief cited a non-existent Yarl's Wood citation; keep the real one.
  assert.match(sources.get("yarls").title, /\[2009\] EWCA Civ 1110/);
  for (const id of ["mitsui-uksc", "mitsui-ca", "yarls", "nw"]) assert.match(sources.get(id).url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\//);
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (id) => entries.get(id).paragraphs.map((x) => x.text).join(" ");
  assert.equal(entries.get("phantom").paragraphs[0].text, "No person of reasonable firmness need actually be, or be likely to be, present at the scene.");
  assert.match(text("money"), /£1 million per claim/);
  assert.match(text("deadlines"), /43 days.*91 days/);
  for (const id of ["rival-groups", "staged"]) assert.equal(entries.get(id).kind, "Our analysis");
  assert.match(p.sections.find((s) => s.id === "moot").intro, /not guidance/);
  assert.match(text("riots-2024"), /£272,336\.20/);
  const html = await read("public/research/regulated-riots/index.html");
  for (const id of ["public-order", "aggressive-begging"]) assert.ok(html.includes(`href="/research/${id}/"`), id);
  assert.ok((await read("public/research/public-order/index.html")).includes('href="/research/regulated-riots/"'));
});
