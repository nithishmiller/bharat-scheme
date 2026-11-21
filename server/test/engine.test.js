import test from 'node:test';
import assert from 'node:assert/strict';
import { evalRule, evaluateMember, evaluateAll } from '../src/engine.js';

const L = (en) => ({ en, ta: en });
const scheme = (rules, extra = {}) => ({ id: 's1', name: L('S1'), category: 'farmer', level: 'central', rules, ...extra });
const household = { state: 'Tamil Nadu', annualIncome: 180000, area: 'rural', category: 'obc', rationCard: true, bplCard: false };
const farmer = { id: 'm1', name: 'A', age: 44, occupation: 'farmer', landHoldingAcres: 1.5, consentGiven: true };

test('eligible: all rules met', () => {
  const s = scheme([
    { id: 'r1', field: 'occupation', op: 'eq', value: 'farmer', label: L('farmer') },
    { id: 'r2', field: 'annualIncome', op: 'lte', value: 250000, label: L('income') },
    { id: 'r3', field: 'landHoldingAcres', op: 'gt', value: 0, label: L('land') },
  ]);
  const r = evaluateMember(farmer, household, s);
  assert.equal(r.status, 'eligible');
  assert.equal(r.score, 100);
  assert.deepEqual(r.checks.map((c) => c.result), ['met', 'met', 'met']);
});

test('likely: nothing unmet but a field is unknown', () => {
  const s = scheme([
    { id: 'r1', field: 'occupation', op: 'eq', value: 'farmer', label: L('farmer') },
    { id: 'r2', field: 'isWidow', op: 'true', value: null, label: L('widow') },
  ]);
  const r = evaluateMember(farmer, household, s); // isWidow undefined
  assert.equal(r.status, 'likely');
  assert.ok(r.score >= 50 && r.score < 100);
  assert.equal(r.checks[1].result, 'unknown');
});

test('not-eligible: any unmet rule wins over unknowns', () => {
  const s = scheme([
    { id: 'r1', field: 'age', op: 'gte', value: 60, label: L('60+') },
    { id: 'r2', field: 'isWidow', op: 'true', value: null, label: L('widow') },
  ]);
  const r = evaluateMember(farmer, household, s);
  assert.equal(r.status, 'not-eligible');
  assert.ok(r.score < 50);
});

test('unknown field is never met', () => {
  assert.equal(evalRule({ field: 'age', op: 'gte', value: 0 }, {}), 'unknown');
  assert.equal(evalRule({ field: 'age', op: 'gte', value: 0 }, { age: null }), 'unknown');
});

test('operators: eq neq lt gt lte gte in true false', () => {
  const s = { age: 30, occupation: 'Farmer', rationCard: true, ownsHouse: false };
  assert.equal(evalRule({ field: 'occupation', op: 'eq', value: 'farmer' }, s), 'met');
  assert.equal(evalRule({ field: 'occupation', op: 'neq', value: 'farmer' }, s), 'unmet');
  assert.equal(evalRule({ field: 'age', op: 'lt', value: 30 }, s), 'unmet');
  assert.equal(evalRule({ field: 'age', op: 'lte', value: 30 }, s), 'met');
  assert.equal(evalRule({ field: 'age', op: 'gt', value: 29 }, s), 'met');
  assert.equal(evalRule({ field: 'age', op: 'gte', value: 31 }, s), 'unmet');
  assert.equal(evalRule({ field: 'occupation', op: 'in', value: ['student', 'farmer'] }, s), 'met');
  assert.equal(evalRule({ field: 'occupation', op: 'in', value: ['student'] }, s), 'unmet');
  assert.equal(evalRule({ field: 'rationCard', op: 'true' }, s), 'met');
  assert.equal(evalRule({ field: 'ownsHouse', op: 'false' }, s), 'met');
  assert.equal(evalRule({ field: 'ownsHouse', op: 'true' }, s), 'unmet');
  assert.equal(evalRule({ field: 'age', op: 'weird', value: 1 }, s), 'unknown');
});

test('household fields are copied onto each member (member wins on clash)', () => {
  const s = scheme([{ id: 'r1', field: 'annualIncome', op: 'lte', value: 200000, label: L('income') }]);
  assert.equal(evaluateMember({ id: 'm', name: 'x' }, household, s).status, 'eligible');
});

test('consent-skip: members with consentGiven=false are skipped and reported', () => {
  const s = scheme([{ id: 'r1', field: 'occupation', op: 'eq', value: 'farmer', label: L('farmer') }]);
  const out = evaluateAll({
    household,
    members: [farmer, { id: 'm2', name: 'Hidden', age: 40, occupation: 'farmer', consentGiven: false }],
    schemes: [s],
  });
  assert.equal(out.results.length, 1);
  assert.equal(out.results[0].member.id, 'm1');
  assert.deepEqual(out.skipped, [{ memberId: 'm2', name: 'Hidden', reason: 'consent-not-given' }]);
});

test('sensitive-consent: disability rules stay unknown without sensitiveConsent, even if the value is present', () => {
  const s = scheme([{ id: 'r1', field: 'hasDisability', op: 'true', value: null, label: L('disability') }]);
  const noConsent = { id: 'm', name: 'x', hasDisability: true, sensitiveConsent: false };
  const consent = { id: 'm', name: 'x', hasDisability: true, sensitiveConsent: true };
  assert.equal(evaluateMember(noConsent, household, s).checks[0].result, 'unknown');
  assert.equal(evaluateMember(noConsent, household, s).status, 'likely');
  assert.equal(evaluateMember(consent, household, s).status, 'eligible');
  const pct = scheme([{ id: 'r1', field: 'disabilityPercent', op: 'gte', value: 40, label: L('40%') }]);
  assert.equal(evaluateMember({ ...noConsent, disabilityPercent: 60 }, household, pct).checks[0].result, 'unknown');
  assert.equal(evaluateMember({ ...consent, disabilityPercent: 60 }, household, pct).status, 'eligible');
});

test('state schemes get an implicit residency check', () => {
  const s = scheme([], { level: 'state', state: 'Kerala' });
  const r = evaluateMember(farmer, household, s);
  assert.equal(r.status, 'not-eligible');
  assert.equal(r.checks[0].ruleId, '_state');
  assert.equal(evaluateMember(farmer, household, scheme([], { level: 'state', state: 'Tamil Nadu' })).status, 'eligible');
});

test('evaluateAll ranks eligible before likely and hides not-eligible by default', () => {
  const sElig = scheme([{ id: 'r1', field: 'occupation', op: 'eq', value: 'farmer', label: L('f') }], { id: 'a' });
  const sLikely = scheme([{ id: 'r1', field: 'isWidow', op: 'true', value: null, label: L('w') }], { id: 'b' });
  const sNo = scheme([{ id: 'r1', field: 'age', op: 'gte', value: 60, label: L('60') }], { id: 'c' });
  const out = evaluateAll({ household, members: [farmer], schemes: [sNo, sLikely, sElig] });
  assert.deepEqual(out.results[0].matches.map((m) => m.schemeId), ['a', 'b']);
  const all = evaluateAll({ household, members: [farmer], schemes: [sNo, sLikely, sElig], includeNotEligible: true });
  assert.deepEqual(all.results[0].matches.map((m) => m.schemeId), ['a', 'b', 'c']);
});
