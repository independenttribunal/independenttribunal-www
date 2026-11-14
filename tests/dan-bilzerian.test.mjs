import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("Dan Bilzerian profile is sourced, attributes the insignia reporting, and does not adopt labels as findings", async () => {
  const id = "dan-bilzerian";
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));

  assert.equal(p.id, id);
  assert.equal(p.category, undefined);
  assert.equal(p.title, "Dan Bilzerian");
  assert.equal(p.checked, "2026-11-14");
  assert.match(p.subtitle, /reported insignia/);
  assert.match(p.summary, /not as a finding of this page/);
  assert.match(p.scope, /not a verdict and not a court/);
  assert.match(p.scope, /does not find that Bilzerian is, or is not, a Nazi/);
  assert.doesNotMatch(p.title, /nazi|psycho|genocidal/i);
  assert.doesNotMatch(p.subtitle, /nazi/i);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.equal(sources.get("fl-doe-2026-primary").url, "https://results.elections.myflorida.com/SummaryRpt.asp?ElectionDate=8%2F18%2F2026&Party=REP&Race=FED");
  assert.equal(sources.get("fec").url, "https://www.fec.gov/data/candidate/H6FL06415/");
  assert.equal(sources.get("forward-paintball").url, "https://forward.com/news/sports/720040/paintball-dan-bilzerian-marcello-margott/");
  assert.equal(sources.get("paintball-post").url, "https://thepaintballpost.com/2025/05/12/does-paintball-have-a-nazi-problem/");
  assert.equal(sources.get("x-profile").url, "https://x.com/DanBilzerian");
  assert.equal(sources.get("youtube-bilzerian").url, "https://www.youtube.com/watch?v=SZjbDpob7zs");
  assert.equal(sources.get("x-mars-insignia").url, "https://x.com/MarsitaTheUltra/status/2120185947610321193");

  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (entryId) => entries.get(entryId).paragraphs.map((x) => x.text).join(" ");

  assert.match(text("public-profile"), /7 December 1980/);
  assert.match(text("public-profile"), /Tampa, Florida/);
  assert.match(text("public-profile"), /2,128,185/);
  assert.match(text("public-profile"), /14 November 2026/);
  assert.match(text("public-profile"), /King of Instagram/);
  assert.match(text("primary-result"), /H6FL06415/);
  assert.match(text("primary-result"), /51,109/);
  assert.match(text("primary-result"), /16,776/);
  assert.match(text("primary-result"), /57\.6%/);
  assert.match(text("primary-result"), /18\.9%/);
  assert.match(text("primary-result"), /Republican/);
  assert.match(text("primary-result"), /not as an independent/);
  assert.match(text("paintball-reporting"), /The Paintball Post/);
  assert.match(text("paintball-reporting"), /Forward/);
  assert.match(text("paintball-reporting"), /Hannah Feuer/);
  assert.match(text("paintball-reporting"), /14 May 2025/);
  assert.match(text("paintball-reporting"), /12 May 2025/);
  assert.match(text("paintball-reporting"), /Nazi insignia/);
  assert.match(text("paintball-reporting"), /I do not condone any symbol of hate, period/);
  assert.match(text("paintball-reporting"), /did not locate a public post|has not located a later public denial/i);
  assert.match(text("paintball-reporting"), /not itself a finding/);
  assert.match(text("paintball-reporting"), /one reported instance/);
  assert.match(text("the-insignia-question"), /Can someone display a Nazi insignia without being a Nazi\?|can someone display a Nazi insignia without being a Nazi\?/);
  assert.match(text("the-insignia-question"), /nothing that follows is a justification or an endorsement/);
  assert.match(text("the-insignia-question"), /author’s view|The author’s view/);
  assert.match(text("the-insignia-question"), /not a conclusion of this page/);
  assert.match(text("authors-statement"), /My support was strategic and conditional/);
  assert.match(text("authors-statement"), /Even after I was made aware of the Nazi insignia, I continued to support Bilzerian/);
  assert.match(text("authors-statement"), /one isolated instance is not decisive/);
  assert.match(text("authors-statement"), /I do not support Nazis/);
  assert.match(text("authors-statement"), /If more Nazi material appears I will re-evaluate/);
  assert.match(text("authors-statement"), /not a finding of this page/);
  assert.match(text("authors-mars-video"), /Why do I support Bilzerian\?/);
  assert.match(text("authors-mars-video"), /Mars Robertson \(genesis\.re\)/);
  assert.equal(entries.get("authors-mars-video").video.id, "SZjbDpob7zs");
  assert.match(text("authors-mars-post"), /10 November 2026 at 16:04:55 UTC/);
  assert.match(text("authors-mars-post"), /Strategic support for independent candidate ≠ supporting a nazi/);
  assert.match(text("authors-mars-post"), /not as an independent/);

  const ourVoice = [p.title, p.subtitle, p.summary, p.scope, p.status_note].join(" ");
  assert.doesNotMatch(ourVoice, /neo-Nazi/i);
  assert.match(p.scope, /does not find that Bilzerian is, or is not, a Nazi/);

  const relatedIds = (p.related ?? []).map((r) => r.id);
  assert.ok(relatedIds.includes("randy-fine"));
  assert.ok(relatedIds.includes("defamation-game-theory"));
  assert.ok(relatedIds.includes("absurdity-paradox"));

  const portrait = await stat(new URL("../public/images/dan-bilzerian-2013.webp", import.meta.url));
  assert.equal(p.evidence_image.src, "/images/dan-bilzerian-2013.webp");
  assert.equal(p.evidence_image.width, 600);
  assert.equal(p.evidence_image.height, 800);
  assert.match(p.evidence_image.caption, /CC BY-SA 2\.0/);
  assert.match(p.evidence_image.caption, /Curtis & Renee/);
  assert.ok(portrait.size > 20_000 && portrait.size < 400_000);

  const meetingImage = (p.artworks ?? []).find((image) => image.src === "/images/author-supplied-meeting.webp");
  assert.equal(meetingImage.after_entry, "authors-mars-video");
  assert.match(meetingImage.caption, /Image supplied by the author/);
  assert.doesNotMatch(meetingImage.alt, /Bilzerian|Fine|Mars|obesity|insignia/i);

  const html = await read(`public/research/${id}/index.html`);
  assert.match(html, /Dan Bilzerian/);
  assert.ok(html.includes('src="/images/dan-bilzerian-2013.webp"'));
  assert.ok(html.includes('src="https://www.youtube-nocookie.com/embed/SZjbDpob7zs"'));
  assert.ok(html.includes('href="https://www.youtube.com/watch?v=SZjbDpob7zs"'));
  assert.ok(html.includes('href="https://x.com/MarsitaTheUltra/status/2120185947610321193"'));
  assert.ok(html.includes('href="https://independenttribunal.org/research/randy-fine/"') || html.includes('href="/research/randy-fine/"'));
  assert.ok(html.includes('src="/images/author-supplied-meeting.webp"'));
  assert.match(html, /Can someone display a Nazi insignia without being a Nazi\?/);
  assert.doesNotMatch(html, /<footer class="profile-satire"/);

  const people = await read("public/people/index.html");
  assert.match(people, /href="\/research\/dan-bilzerian\/"/);
});
