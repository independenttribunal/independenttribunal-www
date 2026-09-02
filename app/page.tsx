"use client";

import { useState } from "react";

const jurors = [
  ["MK", "#ffc65c"],
  ["AS", "#f2a2bb"],
  ["JL", "#9ee7d8"],
  ["TN", "#b9a8ff"],
  ["+8", "#efefeb"],
];

export default function Home() {
  const [mode, setMode] = useState<"case" | "juror">("case");

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Independent Tribunal home">
          <span className="brand-mark" aria-hidden="true">IT</span>
          <span>Independent<br />Tribunal</span>
        </a>
        <div className="nav-center">
          <a href="#process">How it works</a>
          <a href="#standard">The standard</a>
          <a href="#jurors">For jurors</a>
        </div>
        <button className="nav-action" onClick={() => setMode("case")}>Open a case <span>↗</span></button>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> Now assembling juries</div>
          <h1>Resolve the argument.<br /><em>Keep the relationship.</em></h1>
          <p className="hero-lede">
            Put both sides in front of 12 independent people. Equal time, equal space, one clear decision—in about 10 minutes.
          </p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => setMode("case")}>Bring a dispute <span>→</span></button>
            <button className="button secondary" onClick={() => setMode("juror")}>Earn $10 as a juror</button>
          </div>
          <div className="trust-line">
            <div className="avatar-stack" aria-hidden="true">
              {jurors.map(([label, color]) => <span key={label} style={{background: color}}>{label}</span>)}
            </div>
            <p><strong>People, not algorithms.</strong><br />Jurors never see how others voted.</p>
          </div>
        </div>

        <div className="case-stage" aria-label="Example live tribunal">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="case-card">
            <div className="case-topline">
              <span className="case-id">CASE 0248</span>
              <span className="live"><i /> LIVE</span>
            </div>
            <p className="case-question">Should the full<br />deposit be returned?</p>
            <div className="parties">
              <div><span className="party-dot party-a">A</span><p><small>CLAIMANT</small>Maya R.</p></div>
              <b>vs.</b>
              <div><span className="party-dot party-b">B</span><p><small>RESPONDENT</small>Joel K.</p></div>
            </div>
            <div className="assembly">
              <div className="assembly-label"><span>Jury assembling</span><strong>8 / 12</strong></div>
              <div className="progress"><span /></div>
              <small>Estimated start: under 60 seconds</small>
            </div>
            <div className="case-footer">
              <span>1 min video</span><span>1 page evidence</span><span>Blind vote</span>
            </div>
          </div>
          <div className="floating-note note-top"><span>⚡</span><p><strong>4 jurors needed</strong><br />$10 · 10 min</p></div>
          <div className="floating-note note-bottom"><span>✓</span><p><strong>Same rules</strong><br />for both sides</p></div>
        </div>
      </section>

      <section className="principle-strip" id="standard">
        <div className="shell strip-grid">
          <p className="strip-intro">A small format<br />for big disagreements.</p>
          <div><strong>01:00</strong><span>to tell your side</span></div>
          <div><strong>1 page</strong><span>of essential evidence</span></div>
          <div><strong>12</strong><span>independent jurors</span></div>
          <div><strong>10 min</strong><span>from review to vote</span></div>
        </div>
      </section>

      <section className="process shell" id="process">
        <div className="section-kicker">The format</div>
        <div className="process-heading">
          <h2>Less theatre.<br /><em>More clarity.</em></h2>
          <p>Every case is deliberately constrained. The same limits apply to each side, so jurors can focus on the disagreement—not the performance.</p>
        </div>
        <div className="steps">
          <article><span>01</span><div className="step-art video-art"><i>60</i><small>SECONDS</small></div><h3>Say what happened</h3><p>Record one uninterrupted minute. No editing, no interruptions.</p></article>
          <article><span>02</span><div className="step-art page-art"><i /><i /><i /><b>1</b></div><h3>Show what matters</h3><p>Attach one page with the single strongest piece of supporting evidence.</p></article>
          <article><span>03</span><div className="step-art vote-art"><i>7</i><b>5</b></div><h3>Receive the decision</h3><p>Twelve jurors review both sides independently, then cast a blind vote.</p></article>
        </div>
      </section>

      <section className="choice-section" id="jurors">
        <div className="shell choice-inner">
          <div className="choice-copy">
            <div className="section-kicker light">Choose your side of the table</div>
            <h2>{mode === "case" ? "Have a disagreement that needs daylight?" : "Good judgment should be worth something."}</h2>
            <p>{mode === "case" ? "Invite the other party, submit your side, and let a neutral jury move things forward." : "Review two short, equally structured submissions. Vote independently. Earn $10 for about 10 minutes."}</p>
            <div className="mode-tabs" role="tablist" aria-label="Choose your role">
              <button className={mode === "case" ? "active" : ""} onClick={() => setMode("case")} role="tab" aria-selected={mode === "case"}>Open a case</button>
              <button className={mode === "juror" ? "active" : ""} onClick={() => setMode("juror")} role="tab" aria-selected={mode === "juror"}>Join the jury</button>
            </div>
          </div>
          <div className="start-card">
            <span className="card-number">{mode === "case" ? "A / B" : "01—12"}</span>
            <h3>{mode === "case" ? "Start with the question" : "Bring your judgment"}</h3>
            <p>{mode === "case" ? "Describe the decision you want the jury to make. You’ll invite the other side next." : "Join the on-call juror pool. We’ll notify you when a case matches your profile."}</p>
            <button>{mode === "case" ? "Create a tribunal" : "Become a juror"}<span>→</span></button>
            <small>{mode === "case" ? "Both parties approve the final case file before it goes live." : "Independent votes · identity checked · paid after submission"}</small>
          </div>
        </div>
      </section>

      <footer className="shell">
        <div className="brand footer-brand"><span className="brand-mark">IT</span><span>Independent<br />Tribunal</span></div>
        <p>Fast peer decisions for everyday disputes.<br /><small>Not a court and not legal advice.</small></p>
        <div><a href="#process">Process</a><a href="#standard">Standards</a><a href="#jurors">Jurors</a></div>
        <span>© 2026</span>
      </footer>
    </main>
  );
}
