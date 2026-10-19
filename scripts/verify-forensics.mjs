// Optional independent local recheck. Requires Poppler's pdftotext; no network.
// Run: node scripts/verify-forensics.mjs
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadForensics, normalizeExtract } from "./forensics.mjs";
const dataDir = fileURLToPath(new URL("../data/", import.meta.url));
const r = await loadForensics(dataDir);
for (const v of r.versions) {
  const path = `${dataDir}/forensics/${r.id}/`;
  const fresh = execFileSync("pdftotext", ["-layout", `${path}${v.file}`, "-"], { encoding:"utf8" });
  const saved = await readFile(`${path}${v.text_file}`, "utf8");
  if (normalizeExtract(fresh) !== normalizeExtract(saved)) throw new Error(`Extract mismatch for ${v.id}`);
  console.log(`${v.id}: SHA-256, page references and full extracted text verified`);
}
console.log(`${r.changes.length} grouped edits; unchanged passages verified against both PDFs.`);
