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

test("server-renders the Independent Tribunal experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Independent Tribunal — A fair decision, fast<\/title>/i);
  assert.match(html, /A fair decision/);
  assert.match(html, /12 independent jurors/);
  assert.match(html, /Give both sides equal space/);
  assert.match(html, /Independent human judgment/);
  assert.match(html, /applicable local minimum wage/);
  assert.match(html, /Not just a verdict/);
  assert.match(html, /Good judgment/);
  assert.match(html, /Independent Tribunal is being built in public/);
  assert.match(html, /Not a court and not legal advice/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
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

test("removes the temporary starter preview", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Independent Tribunal home/);
  assert.match(page, /https:\/\/t\.me\/IndependentTribunal/);
  assert.match(page, /https:\/\/x\.com\/independentTrib/);
  assert.match(page, /https:\/\/github\.com\/independenttribunal\/independenttribunal-www/);
  assert.match(page, /The application itself is being developed separately/);
  assert.match(layout, /Independent Tribunal — A fair decision, fast/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
