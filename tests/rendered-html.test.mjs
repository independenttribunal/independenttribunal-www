import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { renderSiteHeader, renderSiteFooter } from "../shared/site-shell.mjs";

const navigation = JSON.parse(await readFile(new URL("../data/navigation.json", import.meta.url), "utf8"));
const site = JSON.parse(await readFile(new URL("../data/site.json", import.meta.url), "utf8"));

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
  assert.match(html, /href="\/research\/"/);
  assert.match(html, /href="\/research\/barclays5\/"/);
  assert.match(html, /href="\/research\/roger-hallam\/"/);
  assert.match(html, /href="\/research\/rajiv-menon-kc\/"/);
  assert.match(html, /Rajiv Menon KC/);
  assert.match(html, /href="\/research\/hamas-deproscription\/"/);
  assert.match(html, /Hamas deproscription/);
  assert.match(html, /Public-record profile/);
  assert.match(html, /href="\/people\/"/);
  assert.match(html, /href="\/forensics\/sovereign-ai\/"/);
  assert.match(html, /Forensic comparison/);
  assert.match(html, /href="\/research\/richard-heart\/"/);
  assert.match(html, /#people/);
  assert.match(html, /href="\/research\/mental-health-uk\/"/);
  assert.match(html, /Mental health in the UK/);
  assert.match(html, /Commentary/);
  assert.match(html, /href="\/research\/prairieland\/"/);
  assert.match(html, /href="\/nuances\/jury-conscience\/"/);
  assert.match(html, /href="\/independent-tribunals\/uyghur-tribunal\/"/);
  assert.match(html, /href="\/uk-timeline\/"/);
  for (const title of ["Terrorist connection add-on", "Proscription litigation", "The hunger strikes", "The definition of terrorism", "UK timeline"]) {
    assert.ok(html.includes(title), title);
  }
  assert.doesNotMatch(html, /The Ratchet|The loaded gun|Terrorist Connection Add-on|Proscription Litigation|The Hunger Strikes/);
  assert.match(html, /href="https:\/\/app\.independenttribunal\.org\/"/);
  assert.match(html, /analysed from first principles/);
  assert.match(html, /multiple frontier AI models/);
  assert.doesNotMatch(html, /Independent Tribunal is not a court/);
  // The dispute product lives in the app repo now.
  assert.doesNotMatch(html, /12 independent jurors|applicable local minimum wage/);
});

test("homepage petition tile includes the supplied image and a safe external link", async () => {
  const html = await (await render()).text();
  const card = html.match(/<a class="hub-tile hub-tile--petition"[\s\S]*?<\/a>/)?.[0];
  assert.ok(card, "petition is present in the unfiltered homepage");
  assert.match(card, /href="https:\/\/petition.parliament.uk\/petitions\/778631"/);
  assert.match(card, /target="_blank"/);
  assert.match(card, /rel="noopener noreferrer"/);
  assert.match(card, /Create a taskforce to review laws containing the term “reasonable”/);
  assert.match(card, /src="\/images\/uk-parliament-petitions.png"/);
  assert.match(card, /alt="Petitions — UK Parliament and UK Government"/);
  assert.match(card, /opens in a new tab/);
  const { tiles } = JSON.parse(await readFile(new URL("../public/data/tiles.json", import.meta.url), "utf8"));
  const petition = tiles.find((tile) => tile.id === "reasonable-laws-petition");
  assert.equal(petition.kind, "petition");
  assert.ok(petition.tags.includes("uk"));
  assert.equal(petition.external, true);
  const image = await readFile(new URL(`../public${petition.image.src}`, import.meta.url));
  assert.equal(image.readUInt32BE(16), petition.image.width);
  assert.equal(image.readUInt32BE(20), petition.image.height);
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

  assert.match(page, /SiteFrame/);
  assert.match(page, /public\/data\/tiles\.json/);
  assert.match(layout, /site-shell\.css/);
  assert.match(layout, /Independent Tribunal — The law, shown openly/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});

test("React pages use the exact shared site header and footer", async () => {
  for (const path of ["/", "/about"]) {
    const html = await (await render(path)).text();
    assert.ok(html.includes(renderSiteHeader({ navigation, path })), `${path} header`);
    assert.ok(html.includes(renderSiteFooter({ navigation, site })), `${path} footer`);
    assert.equal((html.match(/<header class="global-header">/g) ?? []).length, 1);
    assert.equal((html.match(/<footer class="global-footer">/g) ?? []).length, 1);
    assert.match(html, /id="main-content"/);
    assert.doesNotMatch(html, /Rapid peer resolution|Not a court and not legal advice/);
  }
});
