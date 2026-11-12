import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// Categories group existing pages into ordered chapters. They hold no facts of
// their own: every chapter links to a sourced page, and every link is checked.
export async function loadCategories(dataDir) {
  const dir = join(dataDir, "categories");
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json")).sort();
  return Promise.all(files.map(async (file) => ({ file, ...JSON.parse(await readFile(join(dir, file), "utf8")) })));
}

// `targets` maps each internal page path to the set of anchor ids on that page.
export function validateCategory(c, targets, fail) {
  const where = `categories/${c.file}`;
  if (c.file !== `${c.id}.json` || !/^[a-z0-9-]+$/.test(c.id)) fail(where, "file name must match a safe id");
  if (c.path !== `/${c.id}/`) fail(where, "path must be /<id>/");
  for (const key of ["title", "lede", "intro"]) if (typeof c[key] !== "string" || !c[key].trim()) fail(where, `missing ${key}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.checked)) fail(where, "checked date required");
  if (!Array.isArray(c.chapters) || !c.chapters.length) fail(where, "chapters must be a nonempty array");
  const check = (href) => {
    const [path, anchor] = href.split("#");
    if (!targets.has(path)) return fail(where, `unknown page ${href}`);
    if (anchor !== undefined && !targets.get(path).has(anchor)) fail(where, `unknown anchor ${href}`);
  };
  for (const ch of c.chapters ?? []) {
    if (!ch.title?.trim() || !ch.summary?.trim()) fail(where, "chapter requires a title and summary");
    check(ch.href ?? "");
    for (const link of ch.links ?? []) {
      if (!link.label?.trim()) fail(where, `link without label in ${ch.title}`);
      check(link.href ?? "");
    }
  }
  for (const link of c.related ?? []) {
    if (!link.label?.trim()) fail(where, "related link without label");
    check(link.href ?? "");
  }
  if (c.image) {
    const image = c.image;
    if (!/^\/images\/[a-z0-9-]+\.(png|jpg|webp)$/.test(image.src) || !image.alt?.trim() || !image.caption?.trim()) fail(where, "category image requires a local image path, alt text and caption");
    if (![image.width, image.height].every((n) => Number.isInteger(n) && n > 0)) fail(where, "category image requires positive integer dimensions");
  }
}

export function categoryText(c, abs) {
  return [
    `## ${c.title} — ${c.lede}\nURL: ${abs(c.path)}\nReviewed: ${c.checked}\n${c.intro}`,
    ...c.chapters.map((ch, i) => `${i + 1}. ${ch.title} <${abs(ch.href)}>\n${ch.summary}${(ch.links ?? []).map((l) => `\n   - ${l.label} <${abs(l.href)}>`).join("")}`),
  ].join("\n\n");
}

export async function publishCategory({ category: c, put, page, escapeHtml: e }) {
  const image = c.image;
  const imageHtml = image ? `<figure class="category-evidence"><a href="${e(image.src)}" target="_blank" rel="noopener noreferrer" aria-label="Open image at full size (opens in a new tab)"><img src="${e(image.src)}" alt="${e(image.alt)}" width="${image.width}" height="${image.height}"></a><figcaption>${e(image.caption)}</figcaption></figure>` : "";
  await put(`${c.id}/index.html`, page({
    title: c.title,
    path: c.path,
    description: `${c.lede} ${c.intro}`,
    image,
    meta: `<p class="meta">Reviewed ${e(c.checked)} · <a href="/data/categories/${c.id}.json">Download JSON</a></p>`,
    body: `<style>
      .chapter-list { list-style:none; padding:0; margin:2rem 0; counter-reset:chapter; }
      .chapter-list > li { counter-increment:chapter; border-top:1px solid var(--line); padding:1.2rem 0 1.2rem 3.2rem; position:relative; }
      .chapter-list > li::before { content:counter(chapter); position:absolute; left:0; top:1.1rem; width:2.2rem; height:2.2rem; display:grid; place-items:center; border:1px solid var(--gold); color:var(--navy); font:600 14px/1 ui-sans-serif,system-ui,sans-serif; }
      .chapter-list h2 { margin:0 0 .4rem; font-size:1.3rem; }
      .chapter-list p { margin:.3rem 0; }
      .chapter-links { display:flex; flex-wrap:wrap; gap:.3rem 1rem; padding:0; margin:.5rem 0 0; list-style:none; font:600 13px/1.6 ui-sans-serif,system-ui,sans-serif; }
      .category-evidence { margin:1.5rem 0; }
      .category-evidence img { display:block; width:100%; height:auto; border:1px solid var(--line); }
      .category-evidence figcaption { margin-top:.65rem; color:var(--muted); font:12px/1.6 ui-sans-serif,system-ui,sans-serif; }
      @media(max-width:560px) { .chapter-list > li { padding-left:2.8rem; } }
    </style>
    <p class="kicker">Independent Tribunal · Research category</p><h1>${e(c.title)}</h1><p class="lede">${e(c.lede)}</p>${imageHtml}<p>${e(c.intro)}</p>
    <ol class="chapter-list">${c.chapters.map((ch) => `<li><h2><a href="${e(ch.href)}">${e(ch.title)} →</a></h2><p>${e(ch.summary)}</p>${ch.links?.length ? `<ul class="chapter-links">${ch.links.map((l) => `<li><a href="${e(l.href)}">${e(l.label)}</a></li>`).join("")}</ul>` : ""}</li>`).join("")}</ol>
    ${c.related?.length ? `<h2>Related</h2><ul>${c.related.map((l) => `<li><a href="${e(l.href)}">${e(l.label)}</a></li>`).join("")}</ul>` : ""}
    <p><a href="/research/">All research</a></p>`,
  }));
}
