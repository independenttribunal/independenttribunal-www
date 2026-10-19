import tileData from "../public/data/tiles.json";
import { TileGrid } from "./tile-grid";
import { SiteFrame } from "./site-frame";

// Tiles are generated from /data (nuances, tribunals, timelines) by scripts/build-data.mjs,
// which runs before dev and build. Edit the JSON in /data, not this file.

const principles = [
  ["Primary sources first", "Follow the statute, judgment or official record. Historical research imports are clearly dated and marked for review."],
  ["Findings attributed", "A tribunal's findings are quoted as its own. We never present an accusation as a verdict."],
  ["Open data, AI first", "Everything here is structured JSON, regenerated on every change, free to reuse."],
];

export default function Home() {
  return (
    <SiteFrame path="/"><main id="main-content">
      <section className="hub-hero">
        <div className="shell">
          <p className="overline"><span /> United Kingdom first · open data</p>
          <h1>The law,<br /><em>shown openly.</em></h1>
          <p className="hub-intro">Legal nuances, people&apos;s tribunals and case research, brought into the open. Follow the sources, distinguish the commentary, and learn how to navigate the system yourself.</p>
          <p className="hub-agents">Built for people and for AI: <a href="/llms.txt">llms.txt</a> · <a href="/data/index.json">open data</a> · <a href="/data/tiles.json">tiles.json</a></p>
          <p className="hub-agents">Explore: <a href="/people/">People &amp; public records</a> · <a href="/research/">Research library</a></p>
        </div>
      </section>

      <section className="hub-grid shell" aria-label="Research dossiers, legal nuances, petitions, tribunals and timelines">
        <TileGrid tiles={tileData.tiles} />
      </section>

      <section className="hub-principles shell" aria-label="How we work">
        {principles.map(([title, body]) => <div key={title}><h2>{title}</h2><p>{body}</p></div>)}
        <a href="/legal/editorial-standards/">Our editorial standards <i>→</i></a>
      </section>

    </main></SiteFrame>
  );
}
