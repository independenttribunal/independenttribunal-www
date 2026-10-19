"use client";

import { useMemo, useSyncExternalStore } from "react";

type Tile = { kind: string; id: string; title: string; label: string; summary: string; tags: string[]; href: string; external?: boolean; image?: { src: string; alt: string; width: number; height: number } };

const KIND_LABEL: Record<string, string> = { petition: "Petition", forensics: "Forensic comparison", collection: "Research collection", study: "Legal study", commentary: "Commentary", profile: "Public-record profile", research: "Research dossier", nuance: "Legal nuance", tribunal: "Independent tribunal", timeline: "Timeline" };

// The selected tag lives in the URL (?tag=), so filtered views can be linked to and shared.
// Static export has no server-side query string, so the server snapshot is always "all".
const URL_CHANGE = "tilegrid:url";
const subscribe = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  window.addEventListener(URL_CHANGE, notify);
  return () => { window.removeEventListener("popstate", notify); window.removeEventListener(URL_CHANGE, notify); };
};

export function TileGrid({ tiles }: { tiles: Tile[] }) {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => "");
  const tag = new URLSearchParams(search).get("tag");

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tiles) for (const x of t.tags) counts.set(x, (counts.get(x) ?? 0) + 1);
    return [...counts].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([x]) => x);
  }, [tiles]);

  const choose = (next: string | null) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("tag", next); else url.searchParams.delete("tag");
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(URL_CHANGE));
  };

  const shown = tag ? tiles.filter((t) => t.tags.includes(tag)) : tiles;

  return (
    <>
      <div className="hub-filters" role="group" aria-label="Filter by topic">
        <button type="button" aria-pressed={tag === null} onClick={() => choose(null)}>All</button>
        {tags.map((x) => <button type="button" key={x} aria-pressed={tag === x} onClick={() => choose(x)}>#{x}</button>)}
        {tag && !tags.includes(tag) && <button type="button" aria-pressed onClick={() => choose(null)}>#{tag} ×</button>}
      </div>
      <div className="hub-tiles">
        {shown.map((t) => (
          <a className={`hub-tile hub-tile--${t.kind}`} href={t.href} target={t.external ? "_blank" : undefined} rel={t.external ? "noopener noreferrer" : undefined} key={`${t.kind}-${t.id}`}>
            <span className="hub-tile-kind">{KIND_LABEL[t.kind] ?? t.kind}</span>
            {t.image && <img className="hub-tile-image" src={t.image.src} alt={t.image.alt} width={t.image.width} height={t.image.height} />}
            <small>{t.label}</small>
            <h3>{t.title}</h3>
            <p>{t.summary}</p>
            {t.external && <small className="hub-tile-external">View {t.kind} ↗ · opens in a new tab</small>}
            <span className="hub-tile-tags">{t.tags.slice(0, 4).map((x) => `#${x}`).join("  ")}</span>
          </a>
        ))}
      </div>
    </>
  );
}
