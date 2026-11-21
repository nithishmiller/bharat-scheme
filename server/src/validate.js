// Input validation at the API boundary. Only known fields survive.

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const bad = (message) => new HttpError(400, 'validation_error', message);

const str = (max = 200) => (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= max && v.trim();
const bool = (v) => typeof v === 'boolean';
const intRange = (lo, hi) => (v) => Number.isInteger(v) && v >= lo && v <= hi;
const numRange = (lo, hi) => (v) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const oneOf = (...vals) => (v) => vals.includes(v);
const nullable = (fn) => (v) => v === null || fn(v);

export const ENUMS = {
  area: ['rural', 'urban'],
  category: ['general', 'obc', 'sc', 'st', 'ews'],
  relation: ['self', 'spouse', 'child', 'parent', 'sibling', 'other'],
  gender: ['male', 'female', 'other'],
  occupation: ['farmer', 'student', 'salaried', 'self-employed', 'unemployed', 'homemaker', 'daily-wage', 'retired'],
  education: ['none', 'primary', 'secondary', 'higher-secondary', 'graduate', 'postgraduate'],
  studyLevel: ['school', 'pre-matric', 'post-matric', 'ug', 'pg'],
};

const HOUSEHOLD = {
  state: str(80),
  district: str(80),
  annualIncome: numRange(0, 1e9),
  familySize: intRange(1, 50),
  area: oneOf(...ENUMS.area),
  category: oneOf(...ENUMS.category),
  bplCard: bool,
  ownsHouse: bool,
  rationCard: bool,
};

const MEMBER = {
  name: str(100),
  relation: oneOf(...ENUMS.relation),
  age: intRange(0, 120),
  gender: oneOf(...ENUMS.gender),
  occupation: oneOf(...ENUMS.occupation),
  education: oneOf(...ENUMS.education),
  isStudent: bool,
  studyLevel: nullable(oneOf(...ENUMS.studyLevel)),
  landHoldingAcres: nullable(numRange(0, 100000)),
  isWidow: bool,
  hasDisability: nullable(bool),
  disabilityPercent: nullable(numRange(0, 100)),
  consentGiven: bool,
  sensitiveConsent: bool,
};

function clean(spec, body, { required = [] } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('Body must be a JSON object');
  const out = {};
  for (const [k, check] of Object.entries(spec)) {
    if (body[k] === undefined) continue;
    const r = check(body[k]);
    if (!r) throw bad(`Invalid value for "${k}"`);
    out[k] = typeof r === 'string' ? r : body[k];
  }
  for (const k of required) if (out[k] === undefined) throw bad(`"${k}" is required`);
  return out;
}

export const cleanHousehold = (body) => clean(HOUSEHOLD, body);

export function cleanMember(body, { create = false } = {}) {
  const m = clean(MEMBER, body, { required: create ? ['name', 'relation', 'age'] : [] });
  // Privacy: sensitive fields are dropped unless the member consented to sensitive data.
  if (m.sensitiveConsent === false) {
    m.hasDisability = null;
    m.disabilityPercent = null;
  }
  return m;
}

export const MEMBER_DEFAULTS = {
  gender: 'other',
  occupation: 'unemployed',
  education: 'none',
  isStudent: false,
  studyLevel: null,
  landHoldingAcres: null,
  isWidow: false,
  hasDisability: null,
  disabilityPercent: null,
  consentGiven: true,
  sensitiveConsent: false,
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
export function cleanCredentials(body, { needName = false } = {}) {
  if (!body || typeof body !== 'object') throw bad('Body must be a JSON object');
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email)) throw bad('A valid email is required');
  if (typeof body.password !== 'string' || body.password.length < 6 || body.password.length > 200)
    throw bad('Password must be 6-200 characters');
  const out = { email, password: body.password };
  if (needName) {
    if (!str(100)(body.name)) throw bad('Name is required');
    out.name = body.name.trim();
  }
  return out;
}

export const LANGS = ['en', 'ta'];
export const cleanLang = (v) => (LANGS.includes(v) ? v : 'en');

const OPS = ['eq', 'neq', 'lte', 'gte', 'lt', 'gt', 'in', 'true', 'false'];
const CATS = ['education', 'farmer', 'women', 'children', 'senior', 'health', 'housing', 'employment', 'disability', 'financial'];
export const CATEGORY_IDS = CATS;

/** Validate an admin-submitted scheme against the contract shape. */
export function cleanScheme(body) {
  if (!body || typeof body !== 'object') throw bad('Body must be a JSON object');
  const locText = (k) => {
    const v = body[k];
    if (!v || !str(2000)(v.en)) throw bad(`"${k}.en" is required`);
    return { en: v.en, ta: typeof v.ta === 'string' ? v.ta : '' };
  };
  const locList = (k) => {
    const v = body[k] || {};
    const list = (x) => (Array.isArray(x) ? x.filter((i) => typeof i === 'string') : []);
    return { en: list(v.en), ta: list(v.ta) };
  };
  if (typeof body.id !== 'string' || !/^[a-z0-9][a-z0-9-]{1,99}$/.test(body.id)) throw bad('"id" must be a kebab-case slug');
  if (!CATS.includes(body.category)) throw bad(`"category" must be one of ${CATS.join(', ')}`);
  if (!['central', 'state'].includes(body.level)) throw bad('"level" must be central or state');
  if (body.deadline != null && !/^\d{4}-\d{2}-\d{2}$/.test(body.deadline)) throw bad('"deadline" must be YYYY-MM-DD or null');
  const rules = (Array.isArray(body.rules) ? body.rules : []).map((r, i) => {
    if (!r || typeof r.field !== 'string' || !OPS.includes(r.op)) throw bad(`rules[${i}] needs field and a valid op`);
    return {
      id: typeof r.id === 'string' && r.id ? r.id : `r${i + 1}`,
      field: r.field,
      op: r.op,
      value: r.value ?? null,
      label: { en: String(r.label?.en ?? ''), ta: String(r.label?.ta ?? '') },
    };
  });
  const url = (v) => (typeof v === 'string' && /^https?:\/\//.test(v) ? v : null);
  return {
    id: body.id,
    name: locText('name'),
    ministry: typeof body.ministry === 'string' ? body.ministry : '',
    level: body.level,
    state: body.level === 'state' ? (str(80)(body.state) || null) : null,
    category: body.category,
    summary: locText('summary'),
    benefits: locList('benefits'),
    documents: Array.isArray(body.documents) ? body.documents.filter((d) => typeof d === 'string') : [],
    howToApply: locList('howToApply'),
    officialUrl: url(body.officialUrl),
    sourceUrl: url(body.sourceUrl),
    lastVerified: typeof body.lastVerified === 'string' ? body.lastVerified : new Date().toISOString().slice(0, 10),
    dataStatus: 'demo-curated',
    deadline: body.deadline ?? null,
    rules,
  };
}

export const TRACKER_STATUSES = ['interested', 'started', 'submitted', 'verification', 'approved', 'rejected'];

export function cleanTrackerPatch(body) {
  if (!body || typeof body !== 'object') throw bad('Body must be a JSON object');
  const out = {};
  if (body.status !== undefined) {
    if (!TRACKER_STATUSES.includes(body.status)) throw bad(`status must be one of ${TRACKER_STATUSES.join(', ')}`);
    out.status = body.status;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string' || body.notes.length > 2000) throw bad('notes must be a string up to 2000 chars');
    out.notes = body.notes;
  }
  if (body.documentsDone !== undefined) {
    if (!Array.isArray(body.documentsDone) || body.documentsDone.some((d) => typeof d !== 'string'))
      throw bad('documentsDone must be an array of strings');
    out.documentsDone = [...new Set(body.documentsDone)];
  }
  if (body.reminderAt !== undefined) {
    if (body.reminderAt !== null && Number.isNaN(Date.parse(body.reminderAt))) throw bad('reminderAt must be an ISO date or null');
    out.reminderAt = body.reminderAt === null ? null : new Date(body.reminderAt).toISOString();
  }
  return out;
}
