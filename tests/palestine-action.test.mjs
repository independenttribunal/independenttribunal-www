import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadPalestineAction, normalizeSupplement } from "../scripts/palestine-action.mjs";
import { fileURLToPath } from "node:url";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const collection = await loadPalestineAction(fileURLToPath(new URL("../data", import.meta.url)));

test("collection retains all input records without inventing verification", () => {
  assert.equal(collection.base.cases.length, 46);
  assert.equal(collection.supplement.new_cases.length, 6);
  assert.equal(Object.keys(collection.supplement.case_enrichments).length, 5);
  assert.equal(collection.supplement.judicial_interference_and_lobbying_matrix.length, 7);
  assert.equal(collection.issues.length, 2);
  assert.deepEqual(collection.issues.map((i) => [i.reported_total, i.subtotal_sum]), [[70, 71], [104, 107]]);
  assert.throws(() => JSON.parse(collection.rawSupplement));
  assert.doesNotMatch(JSON.stringify(collection.supplement), /\[cite:|"verified_/);
  assert.deepEqual(normalizeSupplement('{"age":26[cite: 20]}'), { age: 26 });
  assert.throws(() => normalizeSupplement('{"age":undefined}'));
});

test("source downloads are lossless and derived data carries provenance", async () => {
  assert.equal(await read("public/data/collections/palestine-action/original-cases.json"), collection.original);
  assert.equal(await read("public/data/collections/palestine-action/original-supplement.txt"), collection.rawSupplement);
  const data = JSON.parse(await read("public/data/collections/palestine-action.json"));
  assert.equal(data.verification, "imported-claims-not-independently-verified");
  assert.equal(data.legal_status_checked, "2026-10-19");
  assert.equal(data.cases.length + data.supplementary_cases.length, 52);
  assert.equal(data.quality_issues.length, 2);
});

test("hub is linked, accessible without JS, and uses explicit source status", async () => {
  const html = await read("public/research/palestine-action/index.html");
  assert.equal((html.match(/data-case data-category=/g) ?? []).length, 52);
  for (const id of ["legal-status", "research", "report", "cases", "institutions", "method"]) assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /not findings of judicial interference/);
  assert.match(html, /predates those judgments/);
  assert.match(html, /original “verified” labels are not our verification/);
  assert.doesNotMatch(html, /\[cite:/);
  assert.match(html, /<div class="pa-controls" hidden>/);
  for (const link of html.matchAll(/<a href="(https:[^"]*|\/publications\/[^"]*)"([^>]*)>/g)) {
    // Shared shell links follow the site's existing policy, collection sources open separately.
    if (link.index > html.indexOf('<main') && link.index < html.indexOf('</main>')) assert.match(link[2], /target="_blank" rel="noopener noreferrer"/);
  }
  assert.ok((await read("public/research/index.html")).includes('/research/palestine-action/'));
  assert.ok((await read("public/sitemap.xml")).includes('/research/palestine-action/'));
  assert.ok(JSON.parse(await read("public/data/tiles.json")).tiles.some((t) => t.id === "palestine-action"));
});
