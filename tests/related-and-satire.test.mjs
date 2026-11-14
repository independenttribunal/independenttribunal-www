import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

const trio = [
  ["absurdity-paradox", "Randy Fine", "The game theory of suing for defamation"],
  ["randy-fine", "“Your mother was raped by a dog”: the absurdity paradox", "The game theory of suing for defamation"],
  ["defamation-game-theory", "“Your mother was raped by a dog”: the absurdity paradox", "Randy Fine"],
];

test("the three companion pages cross-link in a Related block, and Randy Fine carries the defamation tag", async () => {
  for (const [id, ...others] of trio) {
    const p = await json(`data/profiles/${id}.json`);
    validateProfile(p, (message) => assert.fail(`${id}: ${message}`));
    const relatedIds = (p.related ?? []).map((r) => r.id);
    if (id !== "absurdity-paradox") assert.ok(relatedIds.includes("absurdity-paradox"), id);
    if (id !== "randy-fine") assert.ok(relatedIds.includes("randy-fine"), id);
    if (id !== "defamation-game-theory") assert.ok(relatedIds.includes("defamation-game-theory"), id);

    const html = await read(`public/research/${id}/index.html`);
    assert.match(html, /<section class="profile-related" id="related">/);
    assert.match(html, /<h2>Related<\/h2>/);
    for (const title of others) {
      assert.ok(html.includes(title), `${id} should list ${title}`);
    }
    const hrefs = {
      "absurdity-paradox": 'href="/research/absurdity-paradox/"',
      "randy-fine": 'href="/research/randy-fine/"',
      "defamation-game-theory": 'href="/research/defamation-game-theory/"',
    };
    for (const [other, href] of Object.entries(hrefs)) {
      if (other !== id) assert.ok(html.includes(href), `${id} should link to ${other}`);
    }
  }

  const fine = await json("data/profiles/randy-fine.json");
  assert.ok(fine.tags.includes("defamation"));
  const { tiles } = await json("public/data/tiles.json");
  assert.ok(tiles.find((t) => t.id === "randy-fine").tags.includes("defamation"));
});

test("every legal study has the shared satire footer; people profiles do not", async () => {
  const files = (await readdir(new URL("../data/profiles", import.meta.url))).filter((f) => f.endsWith(".json"));
  let studies = 0;
  let people = 0;
  for (const file of files) {
    const p = await json(`data/profiles/${file}`);
    const html = await read(`public/research/${p.id}/index.html`);
    const hasFooter = html.includes('id="satire-clause"') && html.includes("Satire clause");
    if (p.category === "legal-study") {
      studies += 1;
      assert.ok(hasFooter, p.id);
      assert.match(html, /militarised satire/);
      assert.match(html, /Get-out-of-jail-free statement/);
      assert.match(html, /You are so ugly because your mother was raped by a dog/);
      assert.match(html, /Mere vulgar abuse, addressed to no one/);
      assert.ok(html.includes('href="/research/absurdity-paradox/">absurdity paradox</a>'), p.id);
      assert.match(html, /does not change the not-legal-advice notes/);
      assert.match(html, /not aimed at any real person/);
      const footer = html.slice(html.indexOf('id="satire-clause"'));
      assert.doesNotMatch(footer, /@|Signal group/i);
    } else {
      people += 1;
      assert.equal(hasFooter, false, p.id);
    }
    assert.match(html, /<section class="profile-related" id="related">/);
  }
  assert.ok(studies >= 30, `expected many legal studies, got ${studies}`);
  assert.ok(people >= 1);
});
