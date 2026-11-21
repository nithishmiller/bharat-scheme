// Pure rules engine. No I/O, no clock, no randomness: same input -> same output.
// eligible = all rules met; likely = none unmet but >=1 unknown; not-eligible = >=1 unmet.

export const SENSITIVE_FIELDS = new Set(['hasDisability', 'disabilityPercent']);

const isNil = (v) => v === null || v === undefined || v === '';
const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

/** Evaluate one rule against a flat subject (member merged with household). */
export function evalRule(rule, subject) {
  // Sensitive fields are never read without the member's sensitive-data consent.
  if (SENSITIVE_FIELDS.has(rule.field) && subject.sensitiveConsent !== true) return 'unknown';
  const actual = subject[rule.field];
  if (isNil(actual)) return 'unknown';
  const a = norm(actual);
  const v = norm(rule.value);
  switch (rule.op) {
    case 'eq':
      return a === v ? 'met' : 'unmet';
    case 'neq':
      return a !== v ? 'met' : 'unmet';
    case 'in':
      return Array.isArray(rule.value) && rule.value.map(norm).includes(a) ? 'met' : 'unmet';
    case 'true':
      return typeof actual === 'boolean' ? (actual === true ? 'met' : 'unmet') : 'unknown';
    case 'false':
      return typeof actual === 'boolean' ? (actual === false ? 'met' : 'unmet') : 'unknown';
    case 'lte':
    case 'gte':
    case 'lt':
    case 'gt': {
      const x = num(actual);
      const y = num(rule.value);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return 'unknown';
      const ok = rule.op === 'lte' ? x <= y : rule.op === 'gte' ? x >= y : rule.op === 'lt' ? x < y : x > y;
      return ok ? 'met' : 'unmet';
    }
    default:
      return 'unknown'; // unsupported operator never counts as met
  }
}

/** Rules for a scheme, plus an implicit state check for state schemes that carry no explicit state rule. */
export function effectiveRules(scheme) {
  const rules = Array.isArray(scheme.rules) ? scheme.rules : [];
  if (scheme.level === 'state' && scheme.state && !rules.some((r) => r.field === 'state')) {
    return [
      {
        id: '_state',
        field: 'state',
        op: 'eq',
        value: scheme.state,
        label: { en: `Resident of ${scheme.state}`, ta: `${scheme.state} குடியிருப்பாளர்` },
      },
      ...rules,
    ];
  }
  return rules;
}

export function evaluateMember(member, household, scheme) {
  const subject = { ...(household || {}), ...member };
  const checks = effectiveRules(scheme).map((rule) => ({
    ruleId: rule.id,
    label: rule.label,
    result: evalRule(rule, subject),
  }));
  const met = checks.filter((c) => c.result === 'met').length;
  const unmet = checks.filter((c) => c.result === 'unmet').length;
  const unknown = checks.filter((c) => c.result === 'unknown').length;
  let status;
  let score;
  if (unmet > 0) {
    status = 'not-eligible';
    score = Math.round((met / checks.length) * 49);
  } else if (unknown > 0) {
    status = 'likely';
    score = 50 + Math.round((met / (met + unknown)) * 49);
  } else {
    status = 'eligible';
    score = 100;
  }
  return { schemeId: scheme.id, memberId: member.id, status, score, checks };
}

export function schemeSummary(s) {
  return {
    id: s.id,
    name: s.name,
    ministry: s.ministry,
    level: s.level,
    state: s.state ?? null,
    category: s.category,
    summary: s.summary,
    officialUrl: s.officialUrl,
    deadline: s.deadline ?? null,
    lastVerified: s.lastVerified,
    dataStatus: s.dataStatus,
  };
}

const STATUS_RANK = { eligible: 0, likely: 1, 'not-eligible': 2 };

/**
 * Evaluate every consenting member against every scheme.
 * Members with consentGiven === false are skipped and reported in `skipped`.
 */
export function evaluateAll({ household, members, schemes, includeNotEligible = false }) {
  const results = [];
  const skipped = [];
  for (const member of members) {
    if (member.consentGiven === false) {
      skipped.push({ memberId: member.id, name: member.name, reason: 'consent-not-given' });
      continue;
    }
    const matches = [];
    for (const scheme of schemes) {
      const out = evaluateMember(member, household, scheme);
      if (out.status === 'not-eligible' && !includeNotEligible) continue;
      matches.push({ ...out, scheme: schemeSummary(scheme) });
    }
    matches.sort(
      (x, y) =>
        STATUS_RANK[x.status] - STATUS_RANK[y.status] ||
        y.score - x.score ||
        String(x.scheme.name?.en).localeCompare(String(y.scheme.name?.en)),
    );
    results.push({ member, matches });
  }
  return { generatedAt: new Date().toISOString(), results, skipped };
}
