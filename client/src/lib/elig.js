// Helpers that turn engine output + scheme data into a readable family story.
// Pure functions only: no API calls, no rule evaluation (the server engine decides eligibility).

export const HOUSEHOLD_FIELDS = new Set(['state', 'district', 'annualIncome', 'familySize', 'area', 'category', 'bplCard', 'ownsHouse', 'rationCard']);
export const RANK = { eligible: 0, likely: 1, 'not-eligible': 2 };
// Savings / insurance products most adults qualify for: shown compactly, not as headline wins.
export const BASIC_CATS = new Set(['financial']);
const CAT_WEIGHT = { farmer: 0, senior: 0, women: 0, education: 1, housing: 1, health: 1, disability: 1, employment: 2, financial: 3 };

export const k = (mid, sid) => `${mid}::${sid}`;

// A scheme is household-level when every rule is about the household, or its benefit is per household/family.
export function isHouseholdScheme(s) {
  if (!s) return false;
  const rules = s.rules || [];
  if (rules.length && rules.every((r) => HOUSEHOLD_FIELDS.has(r.field))) return true;
  return /per (household|family)/i.test((s.benefits?.en || []).join(' '));
}

export const ruleOf = (scheme, check) => scheme?.rules?.find((r) => r.id === check.ruleId) || null;

const ENUM_PREFIX = { gender: 'gender', occupation: 'occ', education: 'edu', studyLevel: 'lvl', area: 'area', category: 'cat', relation: 'rel' };

// Plain-words version of a recorded profile value.
export function fmtValue(field, v, t) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? t('val.yes') : t('val.no');
  if (field === 'age') return t('val.years', { n: v });
  if (field === 'annualIncome') return `₹${Number(v).toLocaleString('en-IN')}`;
  if (field === 'landHoldingAcres') return t('val.acres', { n: v });
  if (field === 'disabilityPercent') return `${v}%`;
  if (ENUM_PREFIX[field]) return t(`${ENUM_PREFIX[field]}.${v}`);
  return String(v);
}

// First benefit line, used as the one-line "what you get".
export const benefitLine = (scheme, LA) => (scheme ? LA(scheme.benefits)[0] || '' : '');
export const hasAmount = (scheme) => /₹/.test((scheme?.benefits?.en || []).join(' '));

// Pick the single most telling reason for a match.
export function keyReason(match, scheme) {
  const checks = match.checks || [];
  if (match.status === 'not-eligible') return { kind: 'unmet', check: checks.find((c) => c.result === 'unmet') };
  if (match.status === 'likely') return { kind: 'unknown', check: checks.find((c) => c.result === 'unknown') };
  // the most specific met rule: prefer one that is not just state/age
  const generic = new Set(['state', 'age', 'area']);
  const specific = checks.find((c) => c.result === 'met' && !generic.has(ruleOf(scheme, c)?.field));
  return { kind: 'met', check: specific || checks.find((c) => c.result === 'met') };
}

export const priority = (scheme) => (CAT_WEIGHT[scheme?.category] ?? 2) - (hasAmount(scheme) ? 0.5 : 0);

// Build the family story from recommendations.
export function buildStory(results, sMap) {
  const household = new Map(); // schemeId -> { scheme, entries:[{member, match}] }
  const needInfo = new Map(); // schemeId -> { scheme, entries, fields:Set }
  const notElig = new Map(); // schemeId -> { scheme, entries }
  const people = results.map((r) => ({ member: r.member, main: [], basic: [] }));
  results.forEach((r, i) => {
    r.matches.forEach((m) => {
      const scheme = sMap[m.schemeId] || m.scheme || { id: m.schemeId };
      const entry = { member: r.member, match: m, scheme };
      if (m.status === 'not-eligible') {
        if (!notElig.has(m.schemeId)) notElig.set(m.schemeId, { scheme, entries: [] });
        notElig.get(m.schemeId).entries.push(entry);
      } else if (m.status === 'likely') {
        if (!needInfo.has(m.schemeId)) needInfo.set(m.schemeId, { scheme, entries: [], fields: new Set() });
        const g = needInfo.get(m.schemeId);
        g.entries.push(entry);
        (m.checks || []).filter((c) => c.result === 'unknown').forEach((c) => { const f = ruleOf(scheme, c)?.field; if (f) g.fields.add(f); });
      } else if (isHouseholdScheme(scheme)) {
        if (!household.has(m.schemeId)) household.set(m.schemeId, { scheme, entries: [] });
        household.get(m.schemeId).entries.push(entry);
      } else {
        (BASIC_CATS.has(scheme.category) ? people[i].basic : people[i].main).push(entry);
      }
    });
    people[i].main.sort((a, b) => priority(a.scheme) - priority(b.scheme));
  });
  // a scheme that is not-eligible for everyone stays in notElig; drop from notElig the ones someone qualifies for
  const qualified = new Set([...household.keys(), ...needInfo.keys()]);
  people.forEach((p) => [...p.main, ...p.basic].forEach((e) => qualified.add(e.scheme.id)));
  const notEligible = [...notElig.values()].filter((g) => !qualified.has(g.scheme.id));
  const hh = [...household.values()].sort((a, b) => priority(a.scheme) - priority(b.scheme));
  const individualIds = new Set(); people.forEach((p) => [...p.main, ...p.basic].forEach((e) => individualIds.add(e.scheme.id)));
  return { household: hh, people, needInfo: [...needInfo.values()], notEligible, counts: { household: hh.length, individual: individualIds.size, need: needInfo.size, claimable: hh.length + individualIds.size } };
}

// Choose up to 3 next actions, most useful first.
export function nextActions(story, trackerItems, sMap, mMap) {
  const out = [];
  const tracked = new Set(trackerItems.map((i) => k(i.memberId, i.schemeId)));
  trackerItems.filter((i) => ['interested', 'started'].includes(i.status)).forEach((i) => {
    const s = sMap[i.schemeId] || i.scheme; const docs = s?.documents || [];
    const left = docs.filter((d) => !(i.documentsDone || []).includes(d));
    out.push({ kind: 'finish', scheme: s, member: mMap[i.memberId], left, to: '/tracker' });
  });
  const candidates = [];
  story.household.forEach((g) => { if (!g.entries.some((e) => tracked.has(k(e.member.id, g.scheme.id)))) candidates.push({ scheme: g.scheme, member: null, n: g.entries.length }); });
  story.people.forEach((p) => p.main.forEach((e) => { if (!tracked.has(k(p.member.id, e.scheme.id))) candidates.push({ scheme: e.scheme, member: p.member }); }));
  candidates.sort((a, b) => priority(a.scheme) - priority(b.scheme));
  candidates.slice(0, 2).forEach((c) => out.push({ kind: 'apply', ...c, to: `/schemes/${c.scheme.id}${c.member ? `?m=${c.member.id}` : ''}` }));
  const need = story.needInfo[0];
  if (need) out.push({ kind: 'detail', scheme: need.scheme, fields: [...need.fields], n: need.entries.length, to: '/family' });
  return out.slice(0, 3);
}

// Next step for a tracker item, from its stage and documents.
export function trackerNext(item, scheme) {
  const docs = scheme?.documents || [];
  const left = docs.filter((d) => !(item.documentsDone || []).includes(d));
  if (item.status === 'approved') return { key: 'next.approved' };
  if (item.status === 'rejected') return { key: 'next.rejected' };
  if (['interested', 'started'].includes(item.status) && left.length) return { key: 'next.gather', left };
  if (['interested', 'started'].includes(item.status)) return { key: 'next.submit' };
  if (item.status === 'submitted') return { key: 'next.submitted' };
  return { key: 'next.verification' };
}
