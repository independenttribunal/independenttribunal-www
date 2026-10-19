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
  assert.equal(data.verification, "source-accounts-with-targeted-editorial-corrections");
  assert.equal(data.legal_status_checked, "2026-10-19");
  assert.equal(data.schema, "independent-tribunal/palestine-action-collection/2.0");
  assert.equal(data.cases.length, 52);
  assert.equal(data.supplementary_cases, undefined);
  assert.equal(data.case_enrichments, undefined);
  assert.equal(new Set(data.cases.map((c) => c.id)).size, 52);
  assert.deepEqual(new Set(data.cases.map((c) => c.id)), new Set([...collection.base.cases, ...collection.supplement.new_cases].map((c) => c.id)));
  assert.equal(data.cases.filter((c) => c.reported_details).length, 5);
  assert.equal(data.cases.find((c) => c.id === "elbit-lobbying-foi").lobbying_accounts.length, 7);
  for (const record of data.cases) assert.ok(record.provenance.inputs.length);
  const dates = data.cases.map((c) => [...c.action_dates].sort()[0]);
  assert.deepEqual(dates, [...dates].sort());
  assert.equal(data.quality_issues.length, 2);
});

test("hub is linked, accessible without JS, and uses explicit source status", async () => {
  const html = await read("public/research/palestine-action/index.html");
  assert.equal((html.match(/data-case data-category=/g) ?? []).length, 52);
  for (const id of ["history", "legal-status", "research", "report", "cases", "institutions", "method"]) assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /This began before 7 October 2023/);
  assert.doesNotMatch(html, /46 base records|6 supplementary records|Base dataset|data-origin=/);
  for (const anchor of html.matchAll(/href="#(case-[^"]+)"/g)) assert.ok(html.includes(`id="${anchor[1]}"`), `Missing record anchor ${anchor[1]}`);
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

test("targeted corrections replace overstated claims while retaining archival inputs", async () => {
  const get = (id) => collection.cases.find((c) => c.id === id);
  const watchkeeper = get("mod-watchkeeper-scrapping");
  assert.deepEqual(watchkeeper.action_dates, ["2024-11-20"]);
  assert.match(watchkeeper.action_details.cost, /£1.351 billion/);
  assert.match(watchkeeper.action_details.retirement_timetable, /March 2027/);
  assert.match(watchkeeper.action_details.context, /causal link is not established/);
  assert.match(get("hydrafeed-severance").outcome.company_response, /never supplied/);
  assert.match(get("hydrafeed-severance").outcome.assessment, /disputed/);
  assert.match(get("elbit-bristol-hq-lockdown-2024").action_details.context, /85%.*Israel.*80%.*Israel/);
  assert.equal(get("moog-aircraft-wolverhampton").legal_proceedings.sentencing_enhancement, undefined);
  assert.match(get("moog-aircraft-wolverhampton").legal_proceedings.terrorism_connection, /intention.*not evidence/);
  assert.match(get("banksy-rcj-mural").disposition.removal_rationale, /Grade II, not Grade I/);
  const reviewed = collection.cases.filter((c) => c.editorial_review);
  assert.equal(reviewed.length, 5);
  for (const record of reviewed) {
    assert.match(record.editorial_review.scope, /does not verify every field/);
    assert.ok(record.editorial_review.sources.every((s) => s.url.startsWith("https://")));
  }
  assert.match(collection.rawSupplement, /Terrorism connection attached/);
  const html = await read("public/research/palestine-action/index.html");
  for (const removed of ["Terrorism connection attached", "cancelling a contract valued at over", "supplies 85% of drone and land-based equipment", "complete termination of all business ties"]) assert.ok(!html.includes(removed));
});
