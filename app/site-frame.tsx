import type { ReactNode } from "react";
import navigation from "../data/navigation.json";
import site from "../data/site.json";
import { renderSiteHeader, renderSiteFooter } from "../shared/site-shell.mjs";

// The same escaped, configuration-only markup is used by the static page builder.
export function SiteFrame({ path, children }: { path: string; children: ReactNode }) {
  return <div id="top">
    <div dangerouslySetInnerHTML={{ __html: renderSiteHeader({ navigation, path }) }} />
    {children}
    <div dangerouslySetInnerHTML={{ __html: renderSiteFooter({ navigation, site }) }} />
  </div>;
}
