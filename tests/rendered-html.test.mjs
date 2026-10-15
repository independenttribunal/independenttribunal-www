import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the information hub homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Independent Tribunal — The law, shown openly<\/title>/i);
  assert.match(html, /shown openly/);
  assert.match(html, /href="\/nuances\/jury-conscience\/"/);
  assert.match(html, /href="\/independent-tribunals\/uyghur-tribunal\/"/);
  assert.match(html, /href="\/uk-timeline\/"/);
  assert.match(html, /href="https:\/\/app\.independenttribunal\.org\/"/);
  assert.match(html, /Not legal advice|not legal advice/);
  // The dispute product lives in the app repo now.
  assert.doesNotMatch(html, /12 independent jurors|applicable local minimum wage/);
});

test("server-renders the origins and acknowledgements page", async () => {
  const response = await render("/about");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>Origins of the idea — Independent Tribunal<\/title>/i);
  assert.match(html, /Who judges/);
  assert.match(html, /Who is watching the watchers/);
  assert.match(html, /The Gaza Tribunal/);
  assert.match(html, /Uyghur Tribunal/);
  assert.match(html, /The Belmarsh Tribunal/);
  assert.match(html, /Judicial Conduct Investigations Office/);
  assert.match(html, /Credit where/);
  assert.match(html, /Kleros/);
  assert.match(html, /no affiliation or endorsement is implied/i);
});

test("homepage reads its tiles from generated data", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Independent Tribunal home/);
  assert.match(page, /public\/data\/tiles\.json/);
  assert.match(page, /https:\/\/t\.me\/IndependentTribunal/);
  assert.match(page, /https:\/\/github\.com\/independenttribunal\/independenttribunal-www/);
  assert.match(layout, /Independent Tribunal — The law, shown openly/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
