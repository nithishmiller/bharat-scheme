// Usage: node server/data/validate.mjs  — checks schemes.json against CONTRACT.md
import fs from 'node:fs';
const file = new URL('./schemes.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const FIELDS = new Set(['state','district','annualIncome','familySize','area','category','bplCard','ownsHouse','rationCard','id','name','relation','age','gender','occupation','education','isStudent','studyLevel','landHoldingAcres','isWidow','isPregnant','needsCareProtection','hasDisability','disabilityPercent','consentGiven','sensitiveConsent']);
const OPS = new Set(['eq','neq','lte','gte','lt','gt','in','true','false']);
const CATS = ['education','farmer','women','senior','health','housing','employment','disability','financial','children'];
const errs = []; const e = (id, m) => errs.push(`${id}: ${m}`);
const bil = (id, k, o) => { if (!o || !o.en || !o.ta) e(id, `${k} needs en+ta`); };
const bilArr = (id, k, o) => { if (!o || !Array.isArray(o.en) || !Array.isArray(o.ta) || !o.en.length || o.en.length !== o.ta.length) e(id, `${k} needs equal-length non-empty en/ta arrays`); };
if (!Array.isArray(data)) throw new Error('schemes.json must be an array');
const ids = new Set();
for (const s of data) {
  const id = s.id || '(no id)';
  if (!/^[a-z0-9-]+$/.test(id)) e(id, 'bad id'); if (ids.has(id)) e(id, 'duplicate id'); ids.add(id);
  bil(id, 'name', s.name); bil(id, 'summary', s.summary); bilArr(id, 'benefits', s.benefits); bilArr(id, 'howToApply', s.howToApply);
  if (!s.ministry) e(id, 'ministry');
  if (!['central', 'state'].includes(s.level)) e(id, 'level');
  if (s.level === 'state' ? !s.state : s.state !== null) e(id, 'state/level mismatch');
  if (!CATS.includes(s.category)) e(id, 'category');
  if (!Array.isArray(s.documents) || !s.documents.length) e(id, 'documents');
  if (!/^https:\/\//.test(s.officialUrl || '')) e(id, 'officialUrl');
  if (s.sourceUrl !== null && !/^https:\/\/www\.myscheme\.gov\.in\/schemes\//.test(s.sourceUrl)) e(id, 'sourceUrl');
  if (s.lastVerified !== '2026-11-21') e(id, 'lastVerified'); if (s.dataStatus !== 'demo-curated') e(id, 'dataStatus');
  if (s.deadline !== null && !/^\d{4}-\d{2}-\d{2}$/.test(s.deadline)) e(id, 'deadline');
  if (!Array.isArray(s.rules) || !s.rules.length) e(id, 'rules');
  const rids = new Set();
  for (const r of s.rules || []) {
    if (rids.has(r.id)) e(id, `dup rule id ${r.id}`); rids.add(r.id);
    if (!FIELDS.has(r.field)) e(id, `${r.id}: unknown field ${r.field}`);
    if (!OPS.has(r.op)) e(id, `${r.id}: unknown op ${r.op}`);
    if (r.op === 'in' && !Array.isArray(r.value)) e(id, `${r.id}: 'in' needs array`);
    if (['lte','gte','lt','gt'].includes(r.op) && typeof r.value !== 'number') e(id, `${r.id}: numeric op needs number`);
    bil(id, `${r.id}.label`, r.label);
  }
}
const cats = new Set(data.map(s => s.category));
for (const c of CATS) if (!cats.has(c)) e('*', `no scheme in category ${c}`);
const tn = data.filter(s => s.state === 'Tamil Nadu').length;
if (data.length < 60 || data.length > 90) e('*', `count ${data.length} outside 60-90`);
if (tn < 12 || tn > 35) e('*', `TN count ${tn} outside 12-35`);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`OK: ${data.length} schemes (${tn} Tamil Nadu), all ${CATS.length} categories covered, all rule fields valid.`);
