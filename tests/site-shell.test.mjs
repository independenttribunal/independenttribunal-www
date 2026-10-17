import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { renderSiteHeader, renderSiteFooter } from "../shared/site-shell.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const navigation = JSON.parse(await read("data/navigation.json"));
const site = JSON.parse(await read("data/site.json"));

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(new URL(directory, root), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

test("every generated page shares the same header, footer and stylesheet", async () => {
  const files = (await Promise.all(["research", "legal", "nuances", "independent-tribunals", "uk-timeline"].map((dir) => htmlFiles(`public/${dir}`)))).flat();
  assert.ok(files.length > 20);
  for (const file of files) {
    const html = await read(file);
    const path = file.replace(/^public/, "").replace(/index\.html$/, "");
    assert.ok(html.includes(renderSiteHeader({ navigation, path })), `${path}: shared header`);
    assert.ok(html.includes(renderSiteFooter({ navigation, site })), `${path}: shared footer`);
    assert.match(html, /href="\/site-shell.css"/);
    assert.equal((html.match(/<header class="global-header">/g) ?? []).length, 1, file);
    assert.equal((html.match(/<footer\b/g) ?? []).length, 1, file);
    assert.equal((html.match(/id="main-content"/g) ?? []).length, 1, file);
    assert.doesNotMatch(html, /\{\{SITE_(HEADER|FOOTER)\}\}/);
  }
});

test("shared navigation distinguishes a current page from its parent section", () => {
  assert.match(renderSiteHeader({ navigation, path: "/about/" }), /href="\/about" aria-current="page"/);
  assert.match(renderSiteHeader({ navigation, path: "/research/roger-hallam/" }), /href="\/research\/" aria-current="location"/);
  assert.doesNotMatch(renderSiteHeader({ navigation, path: "/" }), /aria-current/);
  const maliciousLabel = structuredClone(navigation);
  maliciousLabel.links[0].label = '<img src=x onerror="alert(1)">';
  const html = renderSiteHeader({ navigation: maliciousLabel });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test("footer has one consistent set of community links and no placeholder contact", () => {
  const html = renderSiteFooter({ navigation, site });
  for (const url of [site.contact.telegram, site.contact.x, site.source_repo, site.contact.issues]) assert.ok(html.includes(`href="${url}"`));
  assert.doesNotMatch(html, /mailto:|private contact address is being set up|not a court/i);
  assert.match(html, /Agreement between models is not proof/);
});
