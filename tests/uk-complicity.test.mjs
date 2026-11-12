import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateCategory } from "../scripts/categories.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("the UK complicity category links only to pages and anchors that exist", async () => {
  const c = await json("data/categories/uk-complicity.json");
  assert.equal(c.id, "uk-complicity");
  assert.equal(c.path, "/uk-complicity/");
  assert.equal(c.title, "UK complicity");
  assert.equal(c.checked, "2026-11-12");
  assert.deepEqual(c.chapters.map((ch) => ch.title), [
    "Palantir, a former Met commissioner and Lord Mandelson",
    "Thames Water: how a stable monopoly reached about 86% gearing",
    "Gaza: official findings and people’s tribunals",
    "Who gets to speak at the World Court?",
  ]);
  const hrefs = [c.chapters, c.chapters.flatMap((ch) => ch.links ?? []), c.related].flat().map((x) => x.href);
  for (const href of [
    "/research/who-is-watching-the-watchdogs/#palantir",
    "/research/who-is-watching-the-watchdogs/#mandelson",
    "/research/who-is-watching-the-watchdogs/#palantir-role",
    "/research/thames-water/",
    "/research/thames-water/#plain-words",
    "/independent-tribunals/gaza-tribunal/",
    "/independent-tribunals/gaza-tribunal-uk/",
    "/research/who-speaks-at-the-world-court/",
    "/research/who-speaks-at-the-world-court/#who-appoints",
  ]) assert.ok(hrefs.includes(href), href);

  const html = await read("public/uk-complicity/index.html");
  for (const href of hrefs) assert.ok(html.includes(`href="${href}"`), href);
  assert.ok(html.includes(`<h1>${c.title}</h1>`));
  assert.match(html, /This hub does not allege that any named person has broken the law/);
  assert.ok(html.includes('src="/images/independent-tribunal-campaign-poster.webp"'));
  assert.match(html, /campaign graphic/i);
  assert.match(html, /not evidence/i);
  assert.ok(html.includes('property="og:image" content="https://independenttribunal.org/images/independent-tribunal-campaign-poster.webp"'));
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  assert.ok(html.includes('rel="canonical" href="https://independenttribunal.org/uk-complicity/"'));
  await readFile(new URL("../public/images/independent-tribunal-campaign-poster.webp", import.meta.url));

  assert.ok((await read("public/sitemap.xml")).includes("https://independenttribunal.org/uk-complicity/"));
  assert.ok((await read("public/llms.txt")).includes("[UK complicity](https://independenttribunal.org/uk-complicity/)"));
  assert.ok((await read("public/llms-full.txt")).includes("Who gets to speak at the World Court?"));
  assert.equal((await json("public/data/categories/uk-complicity.json")).chapters.length, 4);
  assert.ok((await json("data/navigation.json")).links.some((l) => l.href === "/uk-complicity/" && l.label === "UK complicity"));
  const research = await read("public/research/index.html");
  assert.ok(research.includes("Research categories"));
  assert.ok(research.includes('href="/uk-complicity/"'));
  assert.ok(research.includes('href="/speech-offences/"'));

  const worldHtml = await read("public/research/who-speaks-at-the-world-court/index.html");
  assert.ok(worldHtml.includes('id="who-appoints"'));
  assert.match(worldHtml, /left to each state under its own arrangements/);

  const errors = [];
  const targets = new Map([["/research/who-is-watching-the-watchdogs/", new Set(["mandelson"])]]);
  validateCategory({ ...c, file: "uk-complicity.json", chapters: [{ title: "x", summary: "y", href: "/research/who-is-watching-the-watchdogs/#nowhere" }, { title: "x", summary: "y", href: "/research/missing/" }], related: [] }, targets, (_, m) => errors.push(m));
  assert.deepEqual(errors, ["unknown anchor /research/who-is-watching-the-watchdogs/#nowhere", "unknown page /research/missing/"]);
});
