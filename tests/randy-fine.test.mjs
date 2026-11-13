import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("Randy Fine profile quotes his Gaza statements, attributes labels, and does not adopt them as findings", async () => {
  const id = "randy-fine";
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));

  assert.equal(p.id, id);
  assert.equal(p.category, undefined);
  assert.equal(p.title, "Randy Fine");
  assert.equal(p.checked, "2026-11-13");
  assert.match(p.subtitle, /Public statements about Gaza, in his own words/);
  assert.match(p.summary, /not a finding that any crime has been committed/);
  assert.match(p.scope, /not a verdict and not a court/);
  assert.doesNotMatch(p.title, /psycho|genocidal/i);
  assert.doesNotMatch(p.subtitle, /psycho|genocidal/i);
  assert.doesNotMatch(p.summary, /psycho|genocidal/i);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.equal(sources.get("youtube").url, "https://www.youtube.com/watch?v=xCQN25HBbGw");
  assert.equal(sources.get("youtube").date, "2025-04-03");
  assert.equal(sources.get("x-starve").url, "https://x.com/RepFine/status/1947635219869139083");
  assert.equal(sources.get("x-bibas").url, "https://x.com/VoteRandyFine/status/1892277453101338696");
  assert.equal(sources.get("x-hilz-denial").url, "https://x.com/VoteRandyFine/status/1927118679554093369");
  assert.match(sources.get("house-bio").url, /fine\.house\.gov/);
  assert.match(sources.get("clerk").url, /clerk\.house\.gov\/Members\/F000484/);
  assert.match(sources.get("convention").url, /ohchr\.org/);
  assert.match(sources.get("usc-1091").url, /uscode\.house\.gov/);

  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (entryId) => entries.get(entryId).paragraphs.map((x) => x.text).join(" ");

  assert.match(text("the-office"), /sworn in as a member of the U\.S\. House/);
  assert.match(text("the-office"), /2 April 2025/);
  assert.match(text("the-office"), /1 April 2025 special general election/);
  assert.match(text("florida-legislature"), /District 33/);
  assert.match(text("florida-legislature"), /District 19/);
  assert.match(text("florida-legislature"), /resigned on 31 March 2025/);
  assert.match(text("owen-jones-video"), /Owen Jones/);
  assert.match(text("owen-jones-video"), /machine-generated/);
  assert.match(text("owen-jones-video"), /not a human-reviewed transcript/);
  assert.match(text("starve-post"), /Until then, starve away/);
  assert.match(text("ajc-and-followups"), /Implying that starvation is a legitimate tactic is unacceptable/);
  assert.match(text("fox-quotes"), /We nuked the Japanese twice/);
  assert.match(text("fox-quotes"), /fabricated quote/);
  assert.match(text("his-denial"), /would be a stupid idea on multiple levels/);
  assert.match(text("his-denial"), /denied that he wants to see the territory nuked/);
  assert.match(text("unverified-screenshots"), /did not locate a still-public post containing those exact texts/);
  assert.match(text("article-iii"), /Direct and public incitement to commit genocide/);
  assert.match(text("article-iii"), /does not answer as a finding/);
  assert.match(text("article-iii"), /not a court with coercive or judicial powers/);
  assert.equal(entries.get("unverified-screenshots").kind, "Coverage limitation");

  const ourVoice = [p.title, p.subtitle, p.summary, p.scope, p.status_note].join(" ");
  assert.doesNotMatch(ourVoice, /genocidal psycho/i);

  assert.equal(p.evidence_image.src, "/images/randy-fine-official-portrait.webp");
  assert.equal(p.evidence_image.width, 600);
  assert.equal(p.evidence_image.height, 750);
  assert.match(p.evidence_image.alt, /Official portrait of U\.S\. Representative Randy Fine/);
  assert.match(p.evidence_image.caption, /Public domain/);
  assert.match(p.evidence_image.caption, /U\.S\. House of Representatives/);
  const image = await stat(new URL("../public/images/randy-fine-official-portrait.webp", import.meta.url));
  assert.ok(image.size > 20_000 && image.size < 400_000);

  const html = await read(`public/research/${id}/index.html`);
  assert.match(html, /Randy Fine/);
  assert.ok(html.includes('src="/images/randy-fine-official-portrait.webp"'));
  assert.ok(html.includes('property="og:image" content="https://independenttribunal.org/images/randy-fine-official-portrait.webp"'));
  assert.match(html, /https:\/\/x\.com\/RepFine\/status\/1947635219869139083/);
  assert.match(html, /https:\/\/www\.youtube\.com\/watch\?v=xCQN25HBbGw/);
  assert.match(html, /href="\/people\/"/);

  const people = await read("public/people/index.html");
  assert.match(people, /href="\/research\/randy-fine\/"/);
});
