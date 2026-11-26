import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("read-aloud uses distinct play, pause and stop icons, not a square for pause", async () => {
  const js = await read("public/read-aloud.js");
  const css = await read("public/site-shell.css");

  // Pause is two vertical bars; play is a triangle; stop is a square. These must stay distinct.
  assert.match(js, /pause:\s*svg\('<rect x="5" y="3" width="5" height="18"\/><rect x="14" y="3" width="5" height="18"\/>'\)/);
  assert.match(js, /play:\s*svg\('<polygon points="6 3 21 12 6 21"\/>'\)/);
  assert.match(js, /stop:\s*svg\('<rect x="5" y="5" width="14" height="14"\/>'\)/);
  assert.match(js, /ICONS\.pause/);
  assert.match(js, /ICONS\.play/);
  assert.match(js, /ICONS\.stop/);
  // The old pause glyph (heavy vertical rectangles, or a single square) looked like Stop.
  assert.doesNotMatch(js, /❚|■|⏹|BLACK VERTICAL RECTANGLE/);
  assert.match(js, /class="ra-stop"[^>]*>\s*<span class="ra-icon"[^>]*>\$\{ICONS\.stop\}/);
  assert.match(js, /icon\.innerHTML = state === "playing" \? ICONS\.pause : ICONS\.play/);
  assert.match(css, /\.ra-bar \.ra-icon svg/);
  assert.match(css, /fill:currentColor/);
});

test("read-aloud has a keyboard-accessible seek bar that jumps to a text chunk", async () => {
  const js = await read("public/read-aloud.js");
  const css = await read("public/site-shell.css");

  assert.match(js, /<input type="range" class="ra-seek"/);
  assert.match(js, /aria-label="Position in the article"/);
  assert.match(js, /aria-valuetext/);
  assert.match(js, /chunkAtWord/);
  assert.match(js, /speechSynthesis cannot seek mid-utterance/);
  assert.match(js, /seekTo\(Number\(seek\.value\), true\)/);
  assert.match(js, /speakFrom\(i\)/);
  // Starting Listen after a seek must not jump back to the beginning.
  assert.match(js, /speakFrom\(index\)/);
  assert.match(js, /formatClock/);
  assert.match(js, /onboundary/);
  assert.match(css, /\.ra-progress/);
  assert.match(css, /\.ra-seek/);
  assert.match(css, /\.ra-bar input:focus-visible/);
  assert.match(css, /@media\(max-width:580px\)/);
  assert.match(css, /\.ra-bar\.ra-floating:not\(\.ra-active\).*?\.ra-progress/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("read-aloud stays a free in-browser speech player", async () => {
  const js = await read("public/read-aloud.js");
  assert.match(js, /speechSynthesis/);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|https?:\/\//);
});
