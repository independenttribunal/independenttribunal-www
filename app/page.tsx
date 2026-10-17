import tileData from "../public/data/tiles.json";
import { TileGrid } from "./tile-grid";
import navigation from "../data/navigation.json";

// Tiles are generated from /data (nuances, tribunals, timelines) by scripts/build-data.mjs,
// which runs before dev and build. Edit the JSON in /data, not this file.

const APP_URL = navigation.app.href;

const principles = [
  ["Primary sources first", "Follow the statute, judgment or official record. Historical research imports are clearly dated and marked for review."],
  ["Findings attributed", "A tribunal's findings are quoted as its own. We never present an accusation as a verdict."],
  ["Open data, AI first", "Everything here is structured JSON, regenerated on every change, free to reuse."],
];

export default function Home() {
  return (
    <main id="top">
      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="Independent Tribunal home">
          <span className="brand-seal">IT</span>
          <span>Independent Tribunal<small>The law, shown openly</small></span>
        </a>
        <nav aria-label="Primary">
          {navigation.links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>
        <a className="header-action" href={APP_URL}>{navigation.app.label} <span>↗</span></a>
      </header>

      <section className="hub-hero">
        <div className="shell">
          <p className="overline"><span /> United Kingdom first · open data</p>
          <h1>The law,<br /><em>shown openly.</em></h1>
          <p className="hub-intro">Legal nuances, people&apos;s tribunals and case research, brought into the open. Follow the sources, distinguish the commentary, and learn how to navigate the system yourself.</p>
          <p className="hub-agents">Built for people and for AI: <a href="/llms.txt">llms.txt</a> · <a href="/data/index.json">open data</a> · <a href="/data/tiles.json">tiles.json</a></p>
        </div>
      </section>

      <section className="hub-grid shell" aria-label="Research dossiers, legal nuances, tribunals and timelines">
        <TileGrid tiles={tileData.tiles} />
      </section>

      <section className="hub-principles shell" aria-label="How we work">
        {principles.map(([title, body]) => <div key={title}><h2>{title}</h2><p>{body}</p></div>)}
        <a href="/legal/editorial-standards/">Our editorial standards <i>→</i></a>
      </section>

      <footer className="site-footer shell">
        <div className="brand"><span className="brand-seal">IT</span><span>Independent Tribunal<small>The law, shown openly</small></span></div>
        <p>Evidence and law, analysed from first principles.<small>Fact-check with multiple frontier AI models—and verify against the original sources.</small></p>
        <nav>
          <a href="/research/">Research</a>
          <a href="/nuances/">Nuances</a>
          <a href="/independent-tribunals/">Tribunals</a>
          <a href="/legal/">Legal</a>
          <a href="/llms.txt">For AI agents</a>
          <a href={APP_URL}>The app ↗</a>
          <a href="https://t.me/IndependentTribunal" target="_blank" rel="noreferrer">Telegram ↗</a>
          <a href="https://github.com/independenttribunal/independenttribunal-www" target="_blank" rel="noreferrer">GitHub ↗</a>
        </nav>
        <span>© 2026</span>
      </footer>
    </main>
  );
}
