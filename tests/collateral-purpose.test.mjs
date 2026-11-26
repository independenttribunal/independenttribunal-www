import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const id = "collateral-purpose";

test("collateral purpose: doctrine, Johnson quotation, Shand example and neighbouring rules", async () => {
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.category, "legal-study");
  assert.equal(p.title, "Collateral purpose: when a proceeding is brought for the wrong reason");
  assert.match(p.summary, /not the same as/);
  assert.match(p.status_note, /\[2002\] 2 AC 1/);
  assert.ok((p.related ?? []).some((r) => r.id === "shand-v-kemkers"));
  assert.ok((p.related ?? []).some((r) => r.id === "frameworks-of-truth"));

  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (entryId) => entries.get(entryId).paragraphs.map((x) => x.text).join(" ");

  assert.match(text("what-it-means"), /public law proceedings which are pursued in the public interest/);
  assert.match(text("not-every-second-motive"), /not automatically an abuse|not ordinarily debarred/);
  assert.match(text("henderson-johnson"), /twice vexed in the same matter/);
  assert.match(text("henderson-johnson"), /broad, merits-based judgment/);
  assert.match(text("henderson-johnson"), /there will rarely be a finding of abuse unless/);
  assert.equal(entries.get("henderson-johnson").paragraphs.some((para) => para.quote && para.text.includes("twice vexed")), true);
  assert.match(text("how-they-differ"), /can also come apart/);
  assert.match(text("contempt-permission"), /improper collateral purpose/);
  assert.match(text("contempt-permission"), /setting aside the Part 36 settlement/);
  assert.match(text("later-claim-and-ecro"), /not a separate finding labelled “collateral purpose.”/);
  assert.match(text("disclosure"), /CPR 31\.22/);
  assert.match(text("slapp"), /economic crime/);
  assert.match(text("limits"), /Grosvenor Hotel v Hamilton/);
  assert.doesNotMatch(JSON.stringify(p), /Review log|Corrections log|confirmed by/);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.match(sources.get("judgment").url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\/ewhc\/kb\/2026\/341/);
  assert.match(sources.get("johnson").url, /^https:\/\/publications\.parliament\.uk\//);
  assert.match(sources.get("ablyazov").url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\/ewhc\/comm\/2011\/1136/);
  assert.match(sources.get("land-securities").url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\/ewca\/civ\/2009\/1402/);
  assert.match(sources.get("eccta-194").url, /^https:\/\/www\.legislation\.gov\.uk\/ukpga\/2023\/56\/section\/194/);

  const html = await read(`public/research/${id}/index.html`);
  assert.match(html, /<section class="profile-related" id="related">/);
  assert.ok(html.includes('href="/research/shand-v-kemkers/"'));
  assert.ok(html.includes('href="/research/frameworks-of-truth/"'));
  assert.match(html, /id="satire-clause"/);
  assert.doesNotMatch(html, /class="profile-archived"/);

  const { tiles } = await json("public/data/tiles.json");
  assert.equal(tiles.find((t) => t.id === id).kind, "study");
  assert.equal(tiles.find((t) => t.id === "shand-v-kemkers"), undefined);

  const frameworks = await json("data/profiles/frameworks-of-truth.json");
  const fwEntries = new Map(frameworks.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  assert.ok(fwEntries.has("collateral-purpose"));
  const fwHtml = await read("public/research/frameworks-of-truth/index.html");
  assert.ok(fwHtml.includes('href="/research/collateral-purpose/"'));
});

test("archived profiles leave the homepage but keep a working URL and an archive listing", async () => {
  const shand = await json("data/profiles/shand-v-kemkers.json");
  validateProfile(shand, (message) => assert.fail(message));
  assert.equal(shand.archived, true);
  assert.ok((shand.related ?? []).some((r) => r.id === "collateral-purpose"));

  const page = await read("public/research/shand-v-kemkers/index.html");
  assert.match(page, /<h1>A lawyer is not an investigator of the client’s case: Shand v Kemkers<\/h1>/);
  assert.match(page, /class="profile-archived"/);
  assert.ok(page.includes('href="/research/archive/"'));
  assert.ok(page.includes('href="/research/collateral-purpose/"'));

  const archive = await read("public/research/archive/index.html");
  assert.match(archive, /<h1>Archive<\/h1>/);
  assert.ok(archive.includes("/research/shand-v-kemkers/"));
  assert.ok(archive.includes("A lawyer is not an investigator of the client’s case: Shand v Kemkers"));

  const index = await read("public/research/index.html");
  assert.match(index, /id="archive"/);
  assert.ok(index.includes("/research/shand-v-kemkers/"));
  assert.ok(index.includes("/research/archive/"));

  const sitemap = await read("public/sitemap.xml");
  assert.ok(sitemap.includes("/research/shand-v-kemkers/"));
  assert.ok(sitemap.includes("/research/archive/"));
  assert.ok(sitemap.includes("/research/collateral-purpose/"));
});
