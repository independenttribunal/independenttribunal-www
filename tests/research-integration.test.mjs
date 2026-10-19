import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("selective research integration is discoverable with sequential citations", async () => {
  for (const id of ["public-order", "hansard-record"]) {
    const profile = await json(`data/profiles/${id}.json`);
    validateProfile(profile, (message) => assert.fail(message));
    const html = await read(`public/research/${id}/index.html`);
    const numbers = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
    assert.deepEqual(numbers, profile.sources.map((_, i) => i + 1));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(ids.length, new Set(ids).size);
    for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]));
    for (const source of profile.sources) assert.ok(html.includes(`href="${source.url}" target="_blank" rel="noopener noreferrer"`));
    for (const path of ["public/research/index.html", "public/research/palestine-action/index.html", "public/sitemap.xml", "public/llms-full.txt"]) {
      assert.ok((await read(path)).includes(`/research/${id}/`), path);
    }
    const tiles = (await json("public/data/tiles.json")).tiles;
    assert.equal(tiles.find((tile) => tile.id === id).kind, "study");
  }
});

test("import corrections retain the later evidence and procedural limits", async () => {
  const hansard = await read("data/profiles/hansard-record.json");
  assert.match(hansard, /7 January 2026/);
  assert.match(hansard, /4 September 2025/);
  assert.match(hansard, /section 34 parliamentary privilege/);
  const ansari = await read("data/profiles/hamas-deproscription.json");
  assert.match(ansari, /CLOSED hearing on 27 January/);
  assert.match(ansari, /not a final determination that the stop was lawful/);
  assert.match(ansari, /not an absolute, exceptionless ban/);
  assert.match(ansari, /Section 10 is an evidence rule, not blanket immunity/);
  const nuance = await read("data/nuances/proscription-support.json");
  assert.match(nuance, /section 13\(1\).*strict-liability/);
  assert.match(nuance, /section 13\(1A\), not section 13A/);
  const log = await json("data/reviews/not-on-our-watch.json");
  assert.equal(log.briefs.length, 8);
  assert.equal(new Set(log.briefs.map((brief) => brief.id)).size, 8);
  assert.match(log.source.sha256, /^[a-f0-9]{64}$/);
});
