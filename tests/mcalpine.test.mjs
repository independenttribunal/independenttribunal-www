import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("McAlpine v Bercow: quotes the judgment exactly and keeps findings, reports and views apart", async () => {
  const p = await json("data/profiles/mcalpine-v-bercow.json");
  validateProfile(p, (message) => assert.fail(message));
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (id) => entries.get(id).paragraphs.map((x) => x.text).join(" ");
  assert.ok(text("what-happened").includes("“Why is Lord McAlpine trending? *Innocent face*”"));
  assert.match(text("what-happened"), /entirely innocent/);
  assert.match(text("the-reader"), /The intention of the publisher is irrelevant/);
  assert.match(text("jigsaw"), /the last piece in the jigsaw/);
  assert.match(text("level"), /I see no room on these facts for any less serious meaning/);
  assert.match(text("spelling"), /IS \[sic\] not taking sides/);
  for (const section of ["praise", "against", "intention"]) for (const e of p.sections.find((s) => s.id === section).entries) assert.equal(e.kind, "Our analysis");
  assert.match(p.status_note, /allegation against Lord McAlpine was false/);
  const sources = new Map(p.sources.map((s) => [s.id, s]));
  for (const id of ["mcalpine", "stocker"]) assert.match(sources.get(id).url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\//);
  const html = await read("public/research/mcalpine-v-bercow/index.html");
  assert.ok(html.includes('href="/research/calling-fraud-a-fraud/"'));
  const fraud = await read("public/research/calling-fraud-a-fraud/index.html");
  assert.ok(fraud.includes('href="/research/mcalpine-v-bercow/"'));
});
