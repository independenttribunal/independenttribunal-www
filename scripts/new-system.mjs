// The New System — minimal viable law, built from first principles.
// Source of truth: data/new-system/onepager.html (synced from the new-system repo).
// The page's CSS is scoped under .ns so it cannot touch the shared header and footer.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const newSystemPath = "/new-system/";

const scope = (css) => css.replace(/([^{}]+)\{/g, (_, sel) => {
  const scoped = sel.split(",").map((s) => {
    s = s.trim();
    if (!s) return s;
    if (s === ":root" || s === "html" || s === "body") return ".ns";
    return `.ns ${s}`;
  }).join(", ");
  return `\n${scoped} {`;
}).replace(/color-scheme:[^;]+;/g, "");

export async function loadNewSystem(dataDir) {
  const src = await readFile(join(dataDir, "new-system", "onepager.html"), "utf8");
  const css = src.match(/<style>([\s\S]*?)<\/style>/)[1];
  const start = src.indexOf('<div class="sheet">');
  if (start < 0) throw new Error("new-system: .sheet not found");
  const body = src.slice(start).replace(/\s*$/, "");
  return { css: scope(css), body };
}

export function newSystemPage({ ns, head, siteHeader, siteFooter }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
${head}
<style>${ns.css}
.ns { min-height: 60vh; }
.ns-banner { max-width: 46rem; margin: 0 auto; padding: 1.4rem 1.5rem 0; font: 13px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; color: #5C6785; text-align: center; }
.ns-banner a { color: #2F7BFF; }
</style>
<link rel="stylesheet" href="/site-shell.css">
</head>
<body>
${siteHeader}
<main id="main-content" class="ns">
<p class="ns-banner">Part of the <a href="https://planetarycouncil.org/">Planetary Council</a> · The method behind <a href="/">Independent Tribunal</a></p>
${body(ns)}
</main>
${siteFooter}
</body>
</html>
`;
}
const body = (ns) => ns.body;
