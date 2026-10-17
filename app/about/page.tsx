/* eslint-disable @next/next/no-html-link-for-pages */

import type { Metadata } from "next";
import { SiteFrame } from "../site-frame";

export const metadata: Metadata = {
  title: "Origins of the idea — Independent Tribunal",
  description: "Why Independent Tribunal exists, the independent tribunals we support, and the work that inspires our approach to modern justice.",
  openGraph: {
    title: "Origins of the idea — Independent Tribunal",
    description: "Who watches the watchers—and who judges the judges? The ideas and institutions behind Independent Tribunal.",
    images: [],
  },
  twitter: {
    title: "Origins of the idea — Independent Tribunal",
    description: "Who watches the watchers—and who judges the judges? The ideas and institutions behind Independent Tribunal.",
    images: [],
  },
};

const tribunals = [
  { number: "01", name: "The Gaza Tribunal", href: "https://thegazatribunal.uk/" },
  { number: "02", name: "Uyghur Tribunal", href: "https://www.uyghurtribunal.com/" },
  { number: "03", name: "The Belmarsh Tribunal", href: "https://progressive.international/movement/campaign/the-belmarsh-tribunal-49b20783-1491-4b86-b02a-eef879e26318/en/" },
];

export default function About() {
  return (
    <SiteFrame path="/about"><main className="about-page" id="main-content">
      <section className="about-hero" id="origins">
        <div className="shell about-hero-grid">
          <div>
            <p className="overline"><span /> About · Origins of the idea</p>
            <h1>Who judges<br /><em>the judges?</em></h1>
          </div>
          <div className="about-intro">
            <p>Every system of authority eventually meets the same question: what happens when the institutions entrusted with accountability must themselves be examined?</p>
            <span>Independent scrutiny is not an attack on legitimacy. It is one of its foundations.</span>
          </div>
        </div>
      </section>

      <section className="watchers-section">
        <div className="shell watchers-grid">
          <div className="watchers-label">
            <span>THE QUESTION</span>
            <p>A chain of accountability should never end simply because the next link is powerful.</p>
          </div>
          <div className="watchers-questions">
            <p><span>01</span>Who is watching the watchers?</p>
            <p><span>02</span>Who is regulating the regulators?</p>
            <p><span>03</span>Who is judging judges? <a href="https://www.complaints.judicialconduct.gov.uk/" target="_blank" rel="noreferrer">Judicial Conduct Investigations Office ↗</a></p>
            <p><span>04</span>Who is judging judges judging judges?</p>
          </div>
        </div>
        <div className="shell answer-panel">
          <p>THE ANSWER</p>
          <h2>Us.<br /><em>Independent Tribunal.</em></h2>
          <span>Not authority without accountability. Judgment made visible, contestable, and human.</span>
        </div>
      </section>

      <section className="support-section shell" id="tribunals">
        <div className="section-heading">
          <div><p className="overline"><span /> Independent tribunals</p><h2>Support the work.<br /><em>Study the precedent.</em></h2></div>
          <p>Independent Tribunal supports the existence and development of independent tribunals: forums created to examine evidence, hear testimony, and place difficult questions into public view.</p>
        </div>
        <div className="tribunal-links">
          {tribunals.map((tribunal) => (
            <a href={tribunal.href} target="_blank" rel="noreferrer" key={tribunal.name}>
              <span>{tribunal.number}</span>
              <h3>{tribunal.name}</h3>
              <p>Visit the tribunal</p>
              <i aria-hidden="true">↗</i>
            </a>
          ))}
        </div>
        <p className="affiliation-note">These organizations are listed as examples of independent tribunal practice. Independent Tribunal is a separate project; no affiliation or endorsement is implied.</p>
      </section>

      <section className="kleros-section" id="kleros">
        <div className="shell kleros-grid">
          <div>
            <p className="overline light"><span /> Inspiration</p>
            <h2>Credit where<br /><em>credit is due.</em></h2>
          </div>
          <div className="kleros-statement">
            <span>KLEROS</span>
            <blockquote>“Kleros is at the forefront of innovation in modern approaches to justice.”</blockquote>
            <p>Independent Tribunal is greatly inspired by Kleros. We state that openly. Its work demonstrates the seriousness and possibility of rethinking how disputes can be resolved.</p>
            <a href="https://kleros.io/" target="_blank" rel="noreferrer">Explore Kleros <span>↗</span></a>
            <small>Independent Tribunal is an independent project and is not affiliated with or endorsed by Kleros.</small>
          </div>
        </div>
      </section>

      <section className="about-closing shell">
        <p className="overline"><span /> Our conviction</p>
        <h2>Institutions earn trust<br />when judgment can be <em>examined.</em></h2>
        <p>We are building a practical layer of independent human judgment—small enough for everyday disputes, structured enough to be fair, and open enough to improve in public.</p>
        <a href="https://t.me/IndependentTribunal" target="_blank" rel="noreferrer">Build it with us <span>↗</span></a>
      </section>

    </main></SiteFrame>
  );
}
