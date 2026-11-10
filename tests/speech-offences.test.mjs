import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateProfile } from '../scripts/profiles.mjs';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const recordsOf = p => p.sections.flatMap(s => s.entries).filter(e => e.case_record);

test('speech register preserves jurisdiction, source dates and evidence for every case', async () => {
  const p = await json('data/profiles/speech-offences.json');
  validateProfile(p, message => assert.fail(message));
  const records = recordsOf(p);
  assert.ok(records.length >= 44, 'retains the expanded expression, meeting and border cases');
  assert.equal(p.register_metadata.source_count, p.sources.length);
  assert.equal(p.register_metadata.unique_proceedings_verified, false);
  const scopes = {};
  for (const e of records) scopes[e.case_record.scope] = (scopes[e.case_record.scope] ?? 0) + 1;
  assert.deepEqual(p.register_metadata.by_scope, scopes);
  assert.equal(new Set(p.sources.map(s => s.id)).size, p.sources.length);
  assert.equal(p.register_metadata.record_count, records.length);
  assert.equal(p.register_metadata.exhaustive, false);
  assert.equal(p.register_metadata.jersey_in_uk_count, false);
  const outcomes = new Set(['acquittal', 'charge-dropped', 'charged', 'hung-jury', 'investigation', 'no-further-action', 'search-ruling', 'conviction', 'procedural-termination']);
  for (const e of records) {
    const r = e.case_record;
    assert.ok(r.name && r.jurisdiction && r.scope && r.last_sourced_position, e.id);
    assert.ok(r.provisions.length, e.id);
    assert.ok(outcomes.has(r.outcome_type), e.id);
    assert.ok(e.paragraphs.every(para => para.sources.length), e.id);
    if (r.status_as_of !== null) {
      assert.match(r.status_as_of, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(r.status_as_of <= p.checked, e.id);
      assert.ok(e.kind.includes(r.status_as_of), 'dated position visible on page');
    }
  }
});

test('speech register does not convert hung juries, procedural decisions or searches into acquittals', async () => {
  const p = await json('data/profiles/speech-offences.json');
  const records = new Map(recordsOf(p).map(e => [e.id, e.case_record]));
  for (const [id, outcome] of Object.entries({
    'greenstein-verdict': 'acquittal', 'cotte-verdict': 'acquittal',
    'majid-freeman': 'hung-jury', 'kneecap-liam': 'procedural-termination',
    'asa-winstanley': 'search-ruling', 'mick-napier': 'charge-dropped',
    'khaled-hajsaad': 'conviction', 'mohammed-adil': 'conviction',
    'aladwan-prosecution': 'charged', 'richard-medhurst': 'no-further-action',
    'greta-thunberg-placard': 'investigation', 'craig-murray-border': 'investigation',
    'muhammad-abu-jweid': 'charged', 'marian-milenovic': 'charged',
    'zahir-khan': 'conviction', 'feras-al-jayoosi': 'conviction',
    'tatchell-nakba': 'no-further-action', 'tatchell-intifada': 'no-further-action',
    'jamal-nineham': 'conviction', 'pwr-akdogan-demir': 'conviction',
  })) assert.equal(records.get(id).outcome_type, outcome, id);
  assert.equal(records.get('kneecap-liam').scope, 'other-proscribed-organisation');
  assert.equal(records.get('fiona-ryan').scope, 'related-speech');
  assert.equal(records.get('natalie-strecker').scope, 'jersey-comparator');
  assert.match(records.get('mick-napier').jurisdiction, /^Scotland$/);
  assert.ok(records.has('bob-vylan-glastonbury') && records.has('bobby-vylan-london'));
});

test('speech register retains case metadata and resolved citations in published outputs', async () => {
  const p = await json('data/profiles/speech-offences.json');
  const exported = await json('public/data/profiles/speech-offences.json');
  const html = await read('public/research/speech-offences/index.html');
  assert.deepEqual(exported.register_metadata, p.register_metadata);
  assert.deepEqual(exported.coverage_audit, p.coverage_audit);
  assert.deepEqual(exported.current_focus, p.current_focus);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), id);
  for (const e of recordsOf(exported)) {
    assert.ok(ids.includes(e.id), e.id);
    for (const para of e.paragraphs) for (const s of para.sources) {
      assert.ok(s.publisher && s.type && s.checked, s.id);
      assert.match(s.url, /^https:\/\//);
    }
  }
  for (const file of ['public/research/index.html', 'public/sitemap.xml', 'public/llms.txt', 'public/llms-full.txt']) assert.ok((await read(file)).includes('/research/speech-offences/'), file);
});


test('coverage audit reconciles supplied leads without inflating the case count', async () => {
  const p = await json('data/profiles/speech-offences.json');
  const records = new Map(recordsOf(p).map(e => [e.id, e]));
  const audit = p.coverage_audit;
  assert.equal(audit.supplied_note_review.additional_identifiable_cases, 0);
  assert.equal(audit.supplied_note_review.unidentified_leads_counted, false);
  assert.equal(audit.statistical_totals_are_additive, false);
  for (const id of audit.supplied_note_review.matched_record_ids) assert.ok(records.has(id), id);
  assert.equal(records.get('defend-our-juries-six').case_record.subjects.length, 6);
  assert.equal(records.get('paraglider-three').case_record.subjects.length, 3);
  assert.equal(records.get('pwr-akdogan-demir').case_record.subjects.length, 3);
  assert.equal(records.get('pwr-akdogan-demir').case_record.scope, 'other-proscribed-organisation');
  assert.equal(records.get('jamal-nineham').case_record.subjects.length, 2);
  assert.equal(records.get('defend-our-juries-six').case_record.scope, 'palestine-action');
  assert.equal(records.get('mohamed-hassn').case_record.scope, 'related-speech');
  const entries = p.sections.flatMap(s => s.entries);
  for (const id of ['palestine-action-official-scale', 'northern-ireland-referrals']) {
    assert.ok(entries.some(e => e.id === id));
    assert.equal(records.has(id), false, 'aggregate statistics must not count as individual cases');
  }
  assert.ok(audit.known_gaps.length >= 5);
});


test('current focus distinguishes a RIPA notice allegation from the separate proscription appeal and statistical cohort', async () => {
  const p = await json('data/profiles/speech-offences.json');
  const entries = p.sections.flatMap(s => s.entries);
  const records = new Map(recordsOf(p).map(e => [e.id, e]));
  assert.ok(records.has(p.current_focus.record_id));
  assert.equal(p.current_focus.current_listing_verified, false);
  assert.equal(p.current_focus.notice_and_charge_particulars_obtained, false);
  assert.equal(p.sections[0].id, p.current_focus.section_id);
  const focusSources = new Set(p.sections[0].entries.flatMap(e => e.paragraphs.flatMap(q => q.sources.map(s => s.id))));
  for (const id of ['wilkinson-bbc-focus', 'ripa-part-three', 'ripa-section-fifty-three']) assert.ok(focusSources.has(id), id);
  const process = entries.find(e => e.id === 'palestine-action-proscription-appeal');
  assert.equal(process.legal_process_record.status, 'awaiting-judgment');
  assert.equal(process.legal_process_record.counted_in_individual_case_register, false);
  assert.equal(records.has(process.id), false);
  const cohort = entries.find(e => e.id === 'palestine-action-official-scale').statistical_record;
  assert.equal(cohort.additive_to_named_records, false);
  assert.equal(cohort.charged_detailed, cohort.section_13_detailed + cohort.section_12_detailed + cohort.section_57_detailed);
  assert.notEqual(cohort.headline_section_12_13, cohort.section_13_detailed + cohort.section_12_detailed);
  assert.equal(cohort.internal_discrepancy_unresolved, true);
});
