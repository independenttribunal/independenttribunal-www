// Gate 3, for real. The recording never leaves this browser tab: there is no upload code here.
(() => {
  const root = document.getElementById("bark-gate");
  if (!root) return;
  const MAX_SECONDS = 5;
  const REASONS = [
    "I have no microphone.",
    "I refused the microphone permission, and I meant it.",
    "My browser or device cannot record.",
    "I am in a library, an office, a courtroom or a quiet carriage.",
    "Someone nearby is asleep: a baby, a partner, a flatmate or a dog.",
    "I cannot make the sound, for reasons that are mine.",
    "I am unwilling to bark. Dignity is a choice.",
    "My dog is willing to bark on my behalf. (Bark by proxy.)",
    "I am a cat person and this is a matter of conscience.",
    "My lawyer advised me not to bark.",
    "A bark could be read as a statement of fact.",
    "I barked at a previous disclaimer and rely on that bark.",
  ];

  const style = document.createElement("style");
  style.textContent = `
    .profile-interactive { margin:1.5rem 0; padding:1.25rem; border:1px solid var(--line, #d8d2c4); border-left:3px solid var(--gold, #b08d3c); background:#f7f3ea; }
    .profile-interactive h3 { margin-top:0; }
    .bark-row { display:flex; flex-wrap:wrap; gap:.6rem; align-items:center; margin:.8rem 0; }
    .bark-row button, .honour button { font:600 15px/1.2 ui-sans-serif,system-ui,sans-serif; padding:.7rem 1.1rem; border:0; border-radius:4px; background:var(--navy, #14213d); color:#fff; cursor:pointer; }
    .bark-row button.secondary { background:transparent; color:var(--navy, #14213d); border:1px solid currentColor; }
    .bark-row button:disabled { opacity:.5; cursor:default; }
    .bark-status { font:14px/1.5 ui-sans-serif,system-ui,sans-serif; min-height:1.5em; }
    .bark-verdict { font-weight:700; }
    .profile-interactive audio { width:100%; max-width:24rem; }
    .honour { margin-top:1rem; }
    .honour summary { cursor:pointer; font-weight:600; }
    .honour fieldset { border:0; padding:0; margin:.8rem 0; }
    .honour label { display:flex; gap:.6rem; align-items:flex-start; margin:.45rem 0; }
    .honour input[type=checkbox] { margin-top:.3rem; flex:none; }
    .honour input[type=text] { width:100%; box-sizing:border-box; padding:.55rem; font:inherit; border:1px solid var(--line, #d8d2c4); }
    .honour .oath { font-weight:600; margin-top:1rem; }
    .bark-small { font-size:.9rem; color:var(--muted, #5f6470); }
  `;
  document.head.append(style);

  const supported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder && window.isSecureContext);
  root.innerHTML = `
    <h3>Gate 3, for real: canine consent</h3>
    <p>Press <strong>Bark</strong>, allow the microphone and bark for up to ${MAX_SECONDS} seconds. The recording stays in this browser tab. Nothing is uploaded, stored or sent to us: this page has no code that could send it. Close the tab and it is gone. You can listen to it and save it to your own device as a WAV file.</p>
    <div class="bark-row">
      <button type="button" data-act="record">Bark</button>
      <button type="button" data-act="stop" class="secondary" disabled>Stop</button>
    </div>
    <p class="bark-status" role="status" aria-live="polite"></p>
    <div class="bark-result" hidden>
      <p class="bark-verdict">Bark recorded as a statement of fact.</p>
      <audio controls></audio>
      <div class="bark-row">
        <button type="button" data-act="save">Save as WAV</button>
        <button type="button" data-act="discard" class="secondary">Delete</button>
      </div>
      <p class="bark-small">You confirm you have read and misunderstood this disclaimer. Gate 3 passed.</p>
    </div>
    <details class="honour">
      <summary>Cannot bark, or will not? Give your word of honour instead.</summary>
      <p class="bark-small">Tick any number of reasons, including none. Nothing you tick or type leaves this page.</p>
      <fieldset>
        <legend class="bark-small">Reasons I cannot or will not bark</legend>
        ${REASONS.map((r, i) => `<label><input type="checkbox" name="reason" value="${i}"> <span>${r}</span></label>`).join("")}
        <label><input type="checkbox" name="reason" value="other"> <span>Another reason:</span></label>
        <input type="text" name="other" aria-label="Another reason" maxlength="200" placeholder="State your reason">
      </fieldset>
      <label class="oath"><input type="checkbox" name="oath"> <span>On my word of honour, I would have barked.</span></label>
      <button type="button" data-act="honour">Continue without barking</button>
      <p class="bark-status honour-result" role="status" aria-live="polite"></p>
    </details>`;

  const $ = (sel) => root.querySelector(sel);
  const status = $(".bark-status");
  const result = $(".bark-result");
  const audio = $("audio");
  const honour = $(".honour");
  const btn = (act) => root.querySelector(`[data-act="${act}"]`);
  let recorder, stream, chunks = [], blob, url, timer;

  const openHonour = (reasonIndex, message) => {
    honour.open = true;
    if (reasonIndex !== undefined) root.querySelector(`input[name=reason][value="${reasonIndex}"]`).checked = true;
    status.textContent = message;
  };

  if (!supported) {
    btn("record").disabled = true;
    openHonour(2, "This browser cannot record here. The word of honour below is open, with the reason ticked for you.");
  }

  const stopAll = () => {
    clearTimeout(timer);
    stream?.getTracks().forEach((t) => t.stop());
    stream = undefined;
  };

  btn("record").addEventListener("click", async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (err) {
      const name = err?.name;
      if (name === "NotAllowedError" || name === "SecurityError") openHonour(1, "Microphone refused. Your refusal has been read as a bark. Or use the word of honour below.");
      else if (name === "NotFoundError" || name === "OverconstrainedError") openHonour(0, "No microphone found. The word of honour below is open.");
      else openHonour(2, "Recording failed on this device. The word of honour below is open.");
      return;
    }
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stopAll();
      btn("record").disabled = false;
      btn("stop").disabled = true;
      if (!chunks.length) { status.textContent = "Nothing was recorded. Silence has been noted."; return; }
      blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      audio.src = url;
      result.hidden = false;
      status.textContent = "Recording finished. It exists only in this tab.";
    };
    recorder.start();
    btn("record").disabled = true;
    btn("stop").disabled = false;
    let left = MAX_SECONDS;
    status.textContent = `Recording: bark now. ${left} s`;
    const tick = () => {
      left -= 1;
      if (left <= 0) { if (recorder.state === "recording") recorder.stop(); return; }
      status.textContent = `Recording: bark now. ${left} s`;
      timer = setTimeout(tick, 1000);
    };
    timer = setTimeout(tick, 1000);
  });

  btn("stop").addEventListener("click", () => recorder?.state === "recording" && recorder.stop());

  btn("discard").addEventListener("click", () => {
    if (url) URL.revokeObjectURL(url);
    url = blob = undefined;
    audio.removeAttribute("src");
    result.hidden = true;
    status.textContent = "Deleted. The bark is withdrawn, though the reasonable reader heard it.";
  });

  // Decode whatever the browser recorded and write 16-bit PCM WAV, which any audio editor opens.
  btn("save").addEventListener("click", async () => {
    if (!blob) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
      ctx.close();
      const ch = buf.numberOfChannels, len = buf.length, rate = buf.sampleRate;
      const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
      const str = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
      str(0, "RIFF"); data.setUint32(4, 36 + len * ch * 2, true); str(8, "WAVE"); str(12, "fmt ");
      data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
      data.setUint32(24, rate, true); data.setUint32(28, rate * ch * 2, true); data.setUint16(32, ch * 2, true);
      data.setUint16(34, 16, true); str(36, "data"); data.setUint32(40, len * ch * 2, true);
      const chans = [...Array(ch)].map((_, c) => buf.getChannelData(c));
      let o = 44;
      for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
        const s = Math.max(-1, Math.min(1, chans[c][i]));
        data.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: "audio/wav" }));
      a.download = `bark-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      const a = document.createElement("a");
      a.href = url;
      a.download = "bark.webm";
      a.click();
    }
  });

  btn("honour").addEventListener("click", () => {
    const out = root.querySelector(".honour-result");
    const ticked = [...root.querySelectorAll("input[name=reason]:checked")];
    if (!root.querySelector("input[name=oath]").checked) { out.textContent = "Reasons noted. The word of honour is not yet given."; return; }
    const n = ticked.length;
    out.textContent = n === 0
      ? "Word of honour accepted, with no reason given. The reasonable reader respects that, and draws an inference anyway. Gate 3 passed."
      : n === 1
        ? "Word of honour accepted. One reason, plainly stated: the reasonable reader is satisfied. Gate 3 passed."
        : `Word of honour accepted. You gave ${n} reasons, which is ${n - 1} more than an honest person needs. The reasonable reader has noticed. Gate 3 passed.`;
  });
})();
