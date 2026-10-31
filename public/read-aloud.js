// Listen: reads the page aloud with the browser's own speech engine (Web Speech API).
// No server, no account, no fees. Loaded on every page by the shared site footer.
(() => {
  if (window.__readAloud || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  window.__readAloud = true;
  const synth = window.speechSynthesis;
  const main = document.getElementById("main-content");
  if (!main) return;

  // Blocks read in document order. Citations, the source register and navigation are skipped.
  const BLOCKS = "h1,h2,h3,h4,p,li,blockquote,caption,th,td,figcaption,dt,dd,summary";
  const SKIP = "nav,script,style,noscript,[hidden],[aria-hidden='true'],.ra-bar,.profile-citations,.profile-sources,#sources,.profile-nav,.meta,.src,.tags,button,select";
  const store = {
    get: (k) => { try { return localStorage.getItem(`readAloud.${k}`); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(`readAloud.${k}`, v); } catch { /* private mode */ } },
  };

  const readable = (el) => {
    if (el.closest(SKIP)) return false;
    const closed = el.closest("details:not([open])");
    if (closed && !el.matches("summary")) return false;
    if (el.parentElement?.closest(BLOCKS)) return false; // its text is read with the enclosing block
    return el.textContent.trim().length > 1;
  };
  const textOf = (el) => {
    const clone = el.cloneNode(true);
    clone.querySelectorAll(SKIP).forEach((n) => n.remove());
    clone.querySelectorAll("br").forEach((n) => n.replaceWith(" "));
    let text = clone.textContent.replace(/\s+/g, " ").trim();
    // Table cells on phones show their column name; say it too.
    if (el.matches("td") && el.dataset.label) text = `${el.dataset.label}: ${text}`;
    return text;
  };
  // Chrome stops long utterances after about 15 seconds, so speak a sentence or two at a time.
  const chunks = (text) => {
    const sentences = text.match(/[^.!?…]+[.!?…]+["”’)\]]*\s*|[^.!?…]+$/g) ?? [text];
    const out = [];
    let buf = "";
    for (const s of sentences) {
      if ((buf + s).length > 220 && buf) { out.push(buf.trim()); buf = ""; }
      buf += s;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  };

  let queue = [];      // [{ el, text }]
  let index = 0;       // current chunk
  let state = "idle";  // idle | playing | paused
  let rate = Number(store.get("rate")) || 1;
  let voiceName = store.get("voice") || "";
  let current = null;

  const build = () => {
    queue = [];
    for (const el of main.querySelectorAll(BLOCKS)) {
      if (!readable(el)) continue;
      for (const text of chunks(textOf(el))) queue.push({ el, text });
    }
  };
  const voices = () => synth.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
  const pickVoice = () => {
    const list = voices();
    return list.find((v) => v.name === voiceName)
      ?? list.find((v) => /en-GB/i.test(v.lang) && /natural|premium|enhanced|neural|google/i.test(v.name))
      ?? list.find((v) => /en-GB/i.test(v.lang))
      ?? list.find((v) => v.default)
      ?? list[0];
  };

  // The bar sits under the page heading and stays at the top of the screen while playing.
  const bar = document.createElement("div");
  bar.className = "ra-bar";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Listen to this page");
  bar.innerHTML = `<button type="button" class="ra-play" aria-pressed="false"><span class="ra-icon" aria-hidden="true">▶</span><span class="ra-label">Listen</span></button>
    <button type="button" class="ra-stop" hidden>Stop</button>
    <span class="ra-time"></span>
    <label class="ra-opt">Speed <select class="ra-rate">${[0.8, 1, 1.15, 1.3, 1.5, 1.75, 2].map((r) => `<option value="${r}">${r}×</option>`).join("")}</select></label>
    <label class="ra-opt ra-voice-wrap" hidden>Voice <select class="ra-voice"></select></label>`;
  // React pages (home, about) own their markup; inserting into it breaks hydration, so float the bar outside.
  const reactPage = Boolean(main.closest("#top"));
  const heading = main.querySelector("h1");
  if (reactPage) { bar.classList.add("ra-floating"); document.body.append(bar); }
  else if (heading) heading.after(bar); else main.prepend(bar);
  const spacer = document.createElement("div");
  spacer.className = "ra-spacer";
  spacer.setAttribute("aria-hidden", "true");
  const play = bar.querySelector(".ra-play");
  const stopBtn = bar.querySelector(".ra-stop");
  const label = bar.querySelector(".ra-label");
  const icon = bar.querySelector(".ra-icon");
  const time = bar.querySelector(".ra-time");
  const rateSel = bar.querySelector(".ra-rate");
  const voiceSel = bar.querySelector(".ra-voice");
  rateSel.value = String(rate);
  if (rateSel.value !== String(rate)) { rate = 1; rateSel.value = "1"; }

  const minutesLeft = () => {
    const words = queue.slice(index).reduce((n, c) => n + c.text.split(" ").length, 0);
    return Math.max(1, Math.round(words / (165 * rate)));
  };
  const render = () => {
    play.setAttribute("aria-pressed", String(state === "playing"));
    label.textContent = state === "playing" ? "Pause" : state === "paused" ? "Resume" : "Listen";
    icon.textContent = state === "playing" ? "❚❚" : "▶";
    stopBtn.hidden = state === "idle";
    // While active the bar is pinned to the bottom of the screen; a spacer holds its place in the page.
    if (!reactPage) {
      if (state !== "idle" && !spacer.isConnected) { spacer.style.height = `${bar.offsetHeight}px`; bar.before(spacer); }
      if (state === "idle") spacer.remove();
    }
    bar.classList.toggle("ra-active", state !== "idle");
    if (!queue.length) build();
    time.textContent = queue.length ? `about ${minutesLeft()} min` : "";
  };
  const fillVoices = () => {
    const list = voices();
    if (!list.length) return;
    const chosen = pickVoice();
    voiceSel.innerHTML = list.map((v) => `<option value="${v.name.replace(/"/g, "&quot;")}">${v.name.replace(/</g, "&lt;")} (${v.lang})</option>`).join("");
    if (chosen) voiceSel.value = chosen.name;
    bar.querySelector(".ra-voice-wrap").hidden = list.length < 2;
  };
  fillVoices();
  synth.addEventListener?.("voiceschanged", fillVoices);

  const mark = (el) => {
    if (current === el) return;
    current?.classList.remove("ra-current");
    current = el;
    if (!el) return;
    el.classList.add("ra-current");
    const r = el.getBoundingClientRect();
    if (r.top < 80 || r.bottom > window.innerHeight - 40) el.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  let token = 0; // ignores callbacks from utterances that were cancelled
  const speakFrom = (i) => {
    const my = ++token;
    synth.cancel();
    index = i;
    if (index >= queue.length) return stop();
    const { el, text } = queue[index];
    mark(el);
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = document.documentElement.lang || "en-GB";
    u.rate = rate;
    u.onend = () => { if (my === token && state === "playing") speakFrom(index + 1); };
    u.onerror = (e) => { if (my === token && state === "playing" && e.error !== "interrupted" && e.error !== "canceled") speakFrom(index + 1); };
    synth.speak(u);
    render();
  };
  const stop = () => {
    token++;
    synth.cancel();
    state = "idle";
    index = 0;
    mark(null);
    render();
  };

  play.addEventListener("click", () => {
    if (state === "playing") { state = "paused"; token++; synth.cancel(); render(); return; }
    if (!queue.length) build();
    const resumeAt = state === "paused" ? index : 0;
    state = "playing";
    speakFrom(resumeAt);
  });
  stopBtn.addEventListener("click", stop);
  rateSel.addEventListener("change", () => {
    rate = Number(rateSel.value) || 1;
    store.set("rate", String(rate));
    if (state === "playing") speakFrom(index); else render();
  });
  voiceSel.addEventListener("change", () => {
    voiceName = voiceSel.value;
    store.set("voice", voiceName);
    if (state === "playing") speakFrom(index);
  });
  // While listening, click any paragraph to jump there. Links and buttons still work as normal.
  main.addEventListener("click", (event) => {
    if (state === "idle" || event.target.closest("a,button,select,input,label,summary,.ra-bar")) return;
    const block = event.target.closest(BLOCKS);
    const at = queue.findIndex((c) => c.el === block || c.el.contains(block) || block?.contains(c.el));
    if (at >= 0) { state = "playing"; speakFrom(at); }
  });
  window.addEventListener("pagehide", () => synth.cancel());
  render();
})();
