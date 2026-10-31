// One escaped HTML renderer for React pages and build-time research pages.
// Inputs are maintained site configuration, never article HTML or user input.
const e = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const brand = () => `<a class="global-brand" href="/" aria-label="Independent Tribunal home"><span class="global-seal" aria-hidden="true">IT</span><span>Independent Tribunal<small>The law, shown openly</small></span></a>`;
const normalize = (path) => path.replace(/\/+$/, "") || "/";

export function renderSiteHeader({ navigation, path = "/" }) {
  return `<div class="global-header-surface" data-site-header><a class="global-skip" href="#main-content">Skip to content</a><header class="global-header">
    ${brand()}
    <nav aria-label="Primary">${navigation.links.map((link) => {
      const href = normalize(link.href);
      const current = normalize(path) === href;
      const section = !current && href !== "/" && normalize(path).startsWith(`${href}/`);
      return `<a href="${e(link.href)}"${current ? ' aria-current="page"' : section ? ' aria-current="location"' : ""}>${e(link.label)}</a>`;
    }).join("")}</nav>
    <a class="global-app" href="${e(navigation.app.href)}">${e(navigation.app.label)} <span aria-hidden="true">↗</span></a>
  </header></div>`;
}

export function renderSiteFooter({ navigation, site }) {
  const links = (items) => items.map((link) => `<a href="${e(link.href)}">${e(link.label)}</a>`).join("");
  return `<div class="global-footer-surface" data-site-footer><footer class="global-footer">
    <div class="global-footer-intro">${brand()}<p class="global-footer-statement">Evidence and law, analysed from first principles.</p><p>Independent Tribunal analyses evidence, law and public records from first principles. Follow the references, question the reasoning, and check the evidence.</p><p>We encourage you to fact-check with multiple frontier AI models, then verify their answers against the original sources. Agreement between models is not proof.</p></div>
    <nav aria-label="Footer navigation"><h2>Explore</h2>${links(navigation.links)}${links([navigation.app])}</nav>
    <nav aria-label="Open data and standards"><h2>Open by design</h2>${links([{label:"Open data",href:"/data/index.json"},{label:"For AI agents",href:"/llms.txt"},{label:"Editorial standards and legal framework",href:"/legal/editorial-standards/"},{label:"Privacy",href:"/legal/privacy/"}])}</nav>
    <nav aria-label="Community and contact"><h2>Contact</h2>${links([{label:"Telegram · most current",href:site.contact.telegram},{label:"X / Twitter",href:site.contact.x},{label:"GitHub",href:site.source_repo},{label:"Corrections and sources",href:site.contact.issues}])}${site.contact.private ? `<a href="mailto:${e(site.contact.private)}">Private contact</a>` : ""}<p>Do not post private case material publicly.</p></nav>
    <div class="global-footer-bottom"><span>© 2026 Independent Tribunal</span><a href="${e(site.license.url)}">Our text and data: ${e(site.license.name)}</a></div>
  </footer></div><script src="/read-aloud.js" defer></script>`;
}
