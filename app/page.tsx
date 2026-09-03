"use client";

import { useEffect, useState } from "react";

const standards = [
  { number: "01", value: "1 page", label: "Evidence per side", detail: "The most relevant material, presented with equal limits." },
  { number: "02", value: "1 minute", label: "Statement per side", detail: "A direct, uninterrupted account in each person’s own words." },
  { number: "03", value: "5 minutes", label: "Independent review", detail: "Focused time to listen, evaluate, decide, and recommend." },
  { number: "04", value: "Randomized", label: "Jury selection", detail: "Eligible jurors selected without influence from either party." },
];

const safeguards = [
  ["Identity checked", "Every participant is verified before taking part."],
  ["Conflicts screened", "Jurors attest that they have no connection to the case."],
  ["Votes remain blind", "No juror sees another opinion before submitting."],
  ["Rates locked upfront", "Compensation cannot change after a case is accepted."],
];

export default function Home() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [pages, setPages] = useState(1);
  const [statementMinutes, setStatementMinutes] = useState(1);
  const [reviewMinutes, setReviewMinutes] = useState(5);
  const [juryType, setJuryType] = useState<"random" | "specialist">("random");
  const [expertRate, setExpertRate] = useState(60);
  const hourlyRate = juryType === "specialist" ? expertRate : 10;
  const juryCompensation = (12 * (reviewMinutes / 60) * hourlyRate).toFixed(2);

  useEffect(() => {
    if (!isDemoOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDemoOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isDemoOpen]);

  return (
    <main>
      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="Independent Tribunal home">
          <span className="brand-seal" aria-hidden="true">IT</span>
          <span>Independent Tribunal<small>Rapid peer resolution</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#process">Process</a>
          <a href="#standard">Standards</a>
          <a href="#jurors">For jurors</a>
        </nav>
        <button className="header-action" type="button" onClick={() => setIsDemoOpen(true)}>Start a tribunal <span>→</span></button>
      </header>

      <button className="demo-notice" type="button" onClick={() => setIsDemoOpen(true)}>
        <span>EARLY DEMO</span> Independent Tribunal is being built in public. Join the founding community <b>→</b>
      </button>

      <section className="hero" id="top">
        <div className="hero-grid shell">
          <div className="hero-copy">
            <p className="overline"><span /> Independent human judgment, on demand</p>
            <h1>A fair decision.<br /><em>While it still matters.</em></h1>
            <p className="hero-intro">Give both sides equal space. Let an independent jury evaluate the evidence and recommend a practical way forward—in minutes, not months.</p>
            <div className="hero-actions">
              <button className="primary-action" type="button" onClick={() => setIsDemoOpen(true)}>Start a tribunal <span>→</span></button>
              <a className="quiet-action" href="#process">How it works <span>↓</span></a>
            </div>
            <div className="trust-points" aria-label="Core safeguards">
              <span>Equal limits</span><span>Blind voting</span><span>Random selection</span>
            </div>
          </div>

          <div className="tribunal-builder" id="builder" aria-label="Tribunal settings calculator">
            <div className="builder-heading">
              <div><small>TRIBUNAL BUILDER</small><h2>Set the scope</h2></div>
              <span>Recommended defaults</span>
            </div>
            <label className="slider-row">
              <span>Evidence per side <strong>{pages} {pages === 1 ? "page" : "pages"}</strong></span>
              <input aria-label="Evidence pages per side" type="range" min="1" max="5" value={pages} onChange={(event) => setPages(Number(event.target.value))} />
              <i><b style={{width: `${((pages - 1) / 4) * 100}%`}} /></i>
            </label>
            <label className="slider-row">
              <span>Statement per side <strong>{statementMinutes} {statementMinutes === 1 ? "minute" : "minutes"}</strong></span>
              <input aria-label="Statement minutes per side" type="range" min="1" max="5" value={statementMinutes} onChange={(event) => setStatementMinutes(Number(event.target.value))} />
              <i><b style={{width: `${((statementMinutes - 1) / 4) * 100}%`}} /></i>
            </label>
            <label className="slider-row">
              <span>Juror review <strong>{reviewMinutes} minutes</strong></span>
              <input aria-label="Juror review minutes" type="range" min="5" max="30" step="5" value={reviewMinutes} onChange={(event) => setReviewMinutes(Number(event.target.value))} />
              <i><b style={{width: `${((reviewMinutes - 5) / 25) * 100}%`}} /></i>
            </label>
            <fieldset className="jury-choice">
              <legend>Jury composition</legend>
              <div>
                <button type="button" className={juryType === "random" ? "active" : ""} onClick={() => setJuryType("random")} aria-pressed={juryType === "random"}><strong>Randomized</strong><small>Any eligible juror</small></button>
                <button type="button" className={juryType === "specialist" ? "active" : ""} onClick={() => setJuryType("specialist")} aria-pressed={juryType === "specialist"}><strong>Specialist</strong><small>Verified expertise</small></button>
              </div>
            </fieldset>
            {juryType === "specialist" && (
              <label className="slider-row specialist-rate">
                <span>Expert hourly rate <strong>${expertRate} / hour</strong></span>
                <input aria-label="Expert hourly rate" type="range" min="25" max="150" step="5" value={expertRate} onChange={(event) => setExpertRate(Number(event.target.value))} />
                <i><b style={{width: `${((expertRate - 25) / 125) * 100}%`}} /></i>
              </label>
            )}
            <div className="builder-total">
              <div><small>ESTIMATED JURY COMPENSATION</small><strong>${juryCompensation}</strong></div>
              <p>12 jurors · ${hourlyRate}/hour floor<br /><span>or applicable local minimum wage, if higher</span></p>
            </div>
            <button className="builder-button" type="button" onClick={() => setIsDemoOpen(true)}>Continue with these settings <span>→</span></button>
          </div>
        </div>
      </section>

      <div className="confidence-bar">
        <div className="shell">
          <span>12 independent jurors</span>
          <span>Same rules for both sides</span>
          <span>Human review, never automated judgment</span>
          <span>Compensation shown upfront</span>
        </div>
      </div>

      <section className="standards shell" id="standard">
        <div className="section-heading">
          <div><p className="overline"><span /> The standard format</p><h2>Discipline creates<br /><em>clarity.</em></h2></div>
          <p>Conflict expands to fill the space given to it. Independent Tribunal starts small on purpose, then lets either party increase the limits when a case genuinely requires more.</p>
        </div>
        <div className="standards-grid">
          {standards.map((item) => (
            <article key={item.number}>
              <span>{item.number}</span><strong>{item.value}</strong><h3>{item.label}</h3><p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="process" id="process">
        <div className="process-grid shell">
          <div className="case-file">
            <div className="file-top"><span>ILLUSTRATIVE CASE</span><span>REF. 0248</span></div>
            <h3>What is a fair resolution of the disputed deposit?</h3>
            <div className="side-summary"><span>A</span><p><small>PARTY A · 01:00</small><strong>The property was returned in the agreed condition.</strong></p><i>1 PAGE</i></div>
            <div className="side-summary"><span>B</span><p><small>PARTY B · 01:00</small><strong>Documented repairs were required after checkout.</strong></p><i>1 PAGE</i></div>
            <div className="jury-status"><span>JURY</span><div><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><strong>12 / 12</strong></div>
          </div>
          <div className="process-copy">
            <p className="overline"><span /> What the jury produces</p>
            <h2>Not just a verdict.<br /><em>A way forward.</em></h2>
            <p className="process-intro">Listening to conflict is serious work. Jurors consider both accounts, test the evidence, and produce a useful resolution—not performative paperwork.</p>
            <ol>
              <li><span>01</span><div><strong>A clear decision</strong><p>A direct answer to the question both parties agreed to submit.</p></div></li>
              <li><span>02</span><div><strong>A concise rationale</strong><p>The facts and principles that most influenced the jury’s judgment.</p></div></li>
              <li><span>03</span><div><strong>A practical recommendation</strong><p>Specific next steps designed to resolve the situation, not prolong it.</p></div></li>
            </ol>
            <p className="legal-note">Independent Tribunal provides structured peer judgment and recommendations. It is not a court, arbitral body, or substitute for legal advice.</p>
          </div>
        </div>
      </section>

      <section className="juror-section" id="jurors">
        <div className="shell">
          <div className="juror-heading">
            <div><p className="overline light"><span /> For independent jurors</p><h2>Good judgment<br /><em>deserves fair pay.</em></h2></div>
            <p>Jurors listen to difficult accounts, evaluate evidence, exercise judgment, and propose solutions. The work is compensated by time and expertise, with the full rate shown before acceptance.</p>
          </div>
          <div className="pay-grid">
            <article className="pay-card">
              <span>DEFAULT JURY</span><h3>$10<small> / hour</small></h3><p>Or the applicable minimum wage in the juror’s location—whichever is higher.</p><ul><li>Randomized eligible jury</li><li>General everyday disputes</li><li>Rate confirmed before review</li></ul>
            </article>
            <article className="pay-card specialist">
              <span>SPECIALIST PANEL</span><h3>$25–150<small> / hour</small></h3><p>A higher rate set upfront for verified subject-matter expertise.</p><ul><li>Credentials checked</li><li>Profession-specific disputes</li><li>Expert opinion, plainly explained</li></ul>
            </article>
            <article className="principle-card">
              <span>THE PRINCIPLE</span><blockquote>“No race to the bottom. No hidden rate. No unpaid deliberation.”</blockquote><p>Compensation is based on the configured review time. Local wage protections always take precedence over the platform floor.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="safeguards shell">
        <div className="section-heading compact">
          <div><p className="overline"><span /> Designed for confidence</p><h2>Trust is a<br /><em>system requirement.</em></h2></div>
          <p>Independence is protected through simple, visible controls that apply to every case.</p>
        </div>
        <div className="safeguard-grid">
          {safeguards.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </section>

      <section className="final-cta">
        <div className="shell cta-grid">
          <div><p className="overline light"><span /> A useful decision, quickly</p><h2>Bring the question.<br /><em>Leave with direction.</em></h2></div>
          <div><p>Start with the recommended format. Adjust only what the dispute requires.</p><button type="button" onClick={() => setIsDemoOpen(true)}>Configure a tribunal <span>→</span></button></div>
        </div>
      </section>

      <footer className="site-footer shell">
        <div className="brand"><span className="brand-seal">IT</span><span>Independent Tribunal<small>Rapid peer resolution</small></span></div>
        <p>Independent human judgment for everyday disputes.<small>Not a court and not legal advice.</small></p>
        <nav><a href="#process">Process</a><a href="#standard">Standards</a><a href="#jurors">Jurors</a></nav>
        <span>© 2026</span>
      </footer>

      {isDemoOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsDemoOpen(false); }}>
          <section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="demo-title">
            <button className="modal-close" type="button" onClick={() => setIsDemoOpen(false)} aria-label="Close dialog">×</button>
            <div className="modal-seal" aria-hidden="true">IT</div>
            <p className="modal-overline">WORK IN PROGRESS · BUILDING IN PUBLIC</p>
            <h2 id="demo-title">Help us build<br /><em>the institution.</em></h2>
            <p className="modal-intro">This is the public Independent Tribunal landing page. The application itself is being developed separately, and there is no backend or active juror network yet.</p>
            <p>If this idea resonates, join our Telegram chat. It is the most up-to-date place to follow progress and help shape the real service with future jurors, early users, subject experts, advisors, and builders.</p>
            <div className="community-list"><span>Future jurors</span><span>Early cases</span><span>Builders &amp; advisors</span></div>
            <div className="modal-actions">
              <a href="https://t.me/IndependentTribunal" target="_blank" rel="noreferrer">Join Telegram · most current <span>↗</span></a>
              <button type="button" onClick={() => setIsDemoOpen(false)}>Continue exploring</button>
            </div>
            <div className="secondary-social">
              <p>ALSO FOLLOW THE WORK</p>
              <a href="https://x.com/independentTrib" target="_blank" rel="noreferrer"><span><b>X / Twitter</b><small>@independentTrib</small></span><i>↗</i></a>
              <a href="https://github.com/independenttribunal/independenttribunal-www" target="_blank" rel="noreferrer"><span><b>GitHub</b><small>WWW source</small></span><i>↗</i></a>
            </div>
            <small>t.me/IndependentTribunal</small>
          </section>
        </div>
      )}
    </main>
  );
}
