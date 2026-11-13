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

  assert.match(text("thanks-for-the-pic"), /user-supplied screenshot/);
  assert.match(text("thanks-for-the-pic"), /checked against the still-public/);
  assert.match(text("thanks-for-the-pic"), /photograph of the child has been blurred/);
  assert.doesNotMatch(text("thanks-for-the-pic"), /does not reproduce the image/);
  assert.match(text("bilzerian-primary"), /51,109/);
  assert.match(text("bilzerian-primary"), /16,776/);
  assert.match(text("bilzerian-primary"), /57\.6%/);
  assert.match(text("bilzerian-primary"), /18\.9%/);
  assert.match(text("bilzerian-primary"), /Republican primary/);
  assert.match(text("bilzerian-primary"), /not as an independent/);
  assert.equal(sources.get("fl-doe-2026-primary").url, "https://results.elections.myflorida.com/SummaryRpt.asp?ElectionDate=8%2F18%2F2026&Party=REP&Race=FED");
  assert.match(text("authors-statement"), /I supported Dan Bilzerian/);
  assert.match(text("authors-statement"), /provisional and temporary/);
  assert.match(text("authors-statement"), /I refuse to call myself, or be labelled, a Nazi supporter/);
  assert.match(text("authors-statement"), /not a finding of this page/);
  assert.match(text("authors-statement"), /Paris based Ghislaine Maxwell/);
  assert.match(text("authors-statement"), /according to Wikipedia|Wikipedia article|Wikipedia attaches|quotes Wikipedia/i);
  assert.match(text("authors-statement"), /She recruited women into Epstein's trafficking network/);
  assert.match(text("authors-statement"), /my own view, not a finding/);
  assert.match(text("authors-statement"), /8 October 2026/);
  assert.match(text("authors-statement"), /David Stansell/);
  assert.doesNotMatch(text("authors-statement"), /Polanski stood in Holborn and St Pancras in 2024/);
  assert.equal(sources.get("verge-epstein-bitcoin").url, "https://www.theverge.com/tech/885252/jeffrey-epstein-bitcoin-cryptocurrency-connections");
  assert.equal(sources.get("x-mars-support").url, "https://x.com/MarsitaTheUltra/status/2120137598794694744");
  assert.equal(sources.get("wikipedia-prusakova").url, "https://en.wikipedia.org/wiki/Mariya_Prusakova_(snowboarder)");
  assert.equal(p.sections.find((s) => s.id === "authors-disclosure").intro.includes("not a finding of this page"), true);

  const tweetImage = (p.artworks ?? []).find((image) => image.src === "/images/randy-fine-quite-well-2021.webp");
  assert.equal(tweetImage.after_entry, "thanks-for-the-pic");
  assert.equal(tweetImage.width, 1174);
  assert.equal(tweetImage.height, 1848);
  assert.match(tweetImage.content_warning, /graphic image of a child in rubble/i);
  assert.match(tweetImage.alt, /Quite well, actually/);
  assert.match(tweetImage.caption, /User-supplied screenshot/);
  assert.match(tweetImage.caption, /checked against the still-public/);
  const tweetFile = await stat(new URL("../public/images/randy-fine-quite-well-2021.webp", import.meta.url));
  assert.ok(tweetFile.size > 20_000 && tweetFile.size < 400_000);
  const vergeFile = await stat(new URL("../public/images/verge-epstein-madam.webp", import.meta.url));
  assert.ok(vergeFile.size > 10_000 && vergeFile.size < 400_000);

  assert.ok(html.includes('src="/images/randy-fine-quite-well-2021.webp"'));
  assert.ok(html.includes('src="/images/verge-epstein-madam.webp"'));
  assert.match(html, /profile-content-warning/);
  assert.match(html, /Graphic image of a child in rubble/);
  assert.match(html, /Author’s disclosure/);
  assert.match(html, /51,109/);
  // Official portrait remains the Open Graph image.
  assert.ok(html.includes('property="og:image" content="https://independenttribunal.org/images/randy-fine-official-portrait.webp"'));
});
