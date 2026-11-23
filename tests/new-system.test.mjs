import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderSiteHeader, renderSiteFooter } from "../shared/site-shell.mjs";

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");

test("New System page uses the shared shell and scoped styles", async () => {
  const [html, navigation, site] = await Promise.all([read("public/new-system/index.html"), read("data/navigation.json").then(JSON.parse), read("data/site.json").then(JSON.parse)]);
  assert.ok(html.includes(renderSiteHeader({ navigation, path: "/new-system/" })));
  assert.ok(html.includes(renderSiteFooter({ navigation, site })));
  assert.match(html, /href="\/new-system\/" aria-current="page"/);
  assert.match(html, /Part of the <a href="https:\/\/planetarycouncil\.org\/">Planetary Council<\/a>/);
  assert.match(html, /Life comes first/);
  assert.match(html, /Form MVL-1/);
  // No unscoped element rules that could restyle the shared header/footer.
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  for (const [, sel] of css.matchAll(/([^{}]+)\{/g)) for (const s of sel.split(",")) assert.match(s.trim(), /^\.ns(\b|-)/, `unscoped selector: ${s.trim()}`);
});

test("Homepage highlights the New System and the Planetary Council", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /href="\/new-system\/"/);
  assert.match(page, /planetarycouncil\.org/);
});
