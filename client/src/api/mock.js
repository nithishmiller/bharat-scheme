// Small in-memory mock of the contract API. Enable with VITE_USE_MOCK=1.
const SCHEMES = [
  {
    id: 'pm-kisan', name: { en: 'PM-KISAN', ta: 'பிரதமர் கிசான்' }, ministry: 'Ministry of Agriculture & Farmers Welfare',
    level: 'central', state: null, category: 'farmer',
    summary: { en: 'Income support of ₹6,000 a year to farmer families.', ta: 'விவசாயக் குடும்பங்களுக்கு ஆண்டுக்கு ₹6,000 வருமான உதவி.' },
    benefits: { en: ['₹6,000 per year in three instalments', 'Paid directly to the bank account'], ta: ['ஆண்டுக்கு ₹6,000, மூன்று தவணைகளில்', 'நேரடியாக வங்கிக் கணக்கில்'] },
    documents: ['Aadhaar card', 'Land record', 'Bank passbook'],
    howToApply: { en: ['Visit pmkisan.gov.in', 'Choose New Farmer Registration', 'Enter Aadhaar and land details'], ta: ['pmkisan.gov.in செல்லவும்', 'புதிய விவசாயி பதிவு', 'ஆதார், நில விவரம் உள்ளிடவும்'] },
    officialUrl: 'https://pmkisan.gov.in/', sourceUrl: 'https://www.myscheme.gov.in/schemes/pm-kisan', lastVerified: '2026-11-21', dataStatus: 'demo-curated', deadline: null,
    rules: [
      { id: 'r1', field: 'occupation', op: 'eq', value: 'farmer', label: { en: 'Occupation is farmer', ta: 'தொழில் விவசாயம்' } },
      { id: 'r2', field: 'landHoldingAcres', op: 'gt', value: 0, label: { en: 'Owns agricultural land', ta: 'விவசாய நிலம் உள்ளது' } },
    ],
  },
  {
    id: 'pmay-g', name: { en: 'PM Awas Yojana – Gramin', ta: 'பிரதமர் வீட்டுவசதி – கிராமம்' }, ministry: 'Ministry of Rural Development',
    level: 'central', state: null, category: 'housing',
    summary: { en: 'Help to build a pucca house for rural families without one.', ta: 'வீடு இல்லாத கிராமக் குடும்பங்களுக்கு உதவி.' },
    benefits: { en: ['Up to ₹1.2 lakh assistance'], ta: ['₹1.2 லட்சம் வரை உதவி'] },
    documents: ['Aadhaar card', 'Job card', 'Bank passbook'],
    howToApply: { en: ['Contact the Gram Panchayat'], ta: ['கிராம பஞ்சாயத்தை அணுகவும்'] },
    officialUrl: 'https://pmayg.nic.in/', sourceUrl: null, lastVerified: '2026-11-21', dataStatus: 'demo-curated', deadline: null,
    rules: [
      { id: 'r1', field: 'area', op: 'eq', value: 'rural', label: { en: 'Lives in a rural area', ta: 'கிராமப் பகுதியில் வசிப்பு' } },
      { id: 'r2', field: 'ownsHouse', op: 'false', value: null, label: { en: 'Family does not own a house', ta: 'குடும்பத்திற்கு வீடு இல்லை' } },
      { id: 'r3', field: 'annualIncome', op: 'lte', value: 300000, label: { en: 'Annual income up to ₹3,00,000', ta: 'ஆண்டு வருமானம் ₹3,00,000 வரை' } },
    ],
  },
  {
    id: 'pm-scholarship', name: { en: 'Post-Matric Scholarship', ta: 'மேல்நிலைக் கல்வி உதவித்தொகை' }, ministry: 'Ministry of Social Justice',
    level: 'central', state: null, category: 'education',
    summary: { en: 'Fee and maintenance support for students after class 10.', ta: '10-ஆம் வகுப்புக்குப் பின் படிக்கும் மாணவர்களுக்கு உதவி.' },
    benefits: { en: ['Tuition fee reimbursement', 'Monthly maintenance allowance'], ta: ['கல்விக் கட்டணத் திருப்பம்', 'மாதாந்திர உதவித்தொகை'] },
    documents: ['Aadhaar card', 'Income certificate', 'Community certificate', 'Marksheet'],
    howToApply: { en: ['Register on scholarships.gov.in', 'Fill the form', 'Submit to the institution'], ta: ['scholarships.gov.in பதிவு', 'படிவம் நிரப்பவும்', 'கல்வி நிறுவனத்தில் சமர்ப்பிக்கவும்'] },
    officialUrl: 'https://scholarships.gov.in/', sourceUrl: 'https://www.myscheme.gov.in/', lastVerified: '2026-11-21', dataStatus: 'demo-curated', deadline: '2027-01-31',
    rules: [
      { id: 'r1', field: 'isStudent', op: 'true', value: null, label: { en: 'Currently a student', ta: 'தற்போது மாணவர்' } },
      { id: 'r2', field: 'studyLevel', op: 'in', value: ['post-matric', 'ug', 'pg'], label: { en: 'Studying after class 10', ta: '10-ஆம் வகுப்புக்குப் பிறகு படிப்பு' } },
      { id: 'r3', field: 'annualIncome', op: 'lte', value: 250000, label: { en: 'Annual family income up to ₹2,50,000', ta: 'ஆண்டு வருமானம் ₹2,50,000 வரை' } },
    ],
  },
  {
    id: 'tn-mkmut', name: { en: 'Magalir Urimai Thogai', ta: 'மகளிர் உரிமைத் தொகை' }, ministry: 'Government of Tamil Nadu', level: 'state', state: 'Tamil Nadu', category: 'women',
    summary: { en: 'Monthly assistance to women heads of eligible families.', ta: 'தகுதியுள்ள குடும்பப் பெண் தலைவர்களுக்கு மாத உதவி.' },
    benefits: { en: ['₹1,000 per month'], ta: ['மாதம் ₹1,000'] }, documents: ['Ration card', 'Aadhaar card', 'Bank passbook'],
    howToApply: { en: ['Apply at the notified camp'], ta: ['அறிவிக்கப்பட்ட முகாமில் விண்ணப்பிக்கவும்'] },
    officialUrl: 'https://www.tn.gov.in/', sourceUrl: null, lastVerified: '2026-11-21', dataStatus: 'demo-curated', deadline: null,
    rules: [
      { id: 'r1', field: 'gender', op: 'eq', value: 'female', label: { en: 'Woman applicant', ta: 'பெண் விண்ணப்பதாரர்' } },
      { id: 'r2', field: 'age', op: 'gte', value: 21, label: { en: 'Age 21 or above', ta: '21 வயது அல்லது மேல்' } },
      { id: 'r3', field: 'rationCard', op: 'true', value: null, label: { en: 'Family holds a ration card', ta: 'குடும்ப அட்டை உள்ளது' } },
    ],
  },
];
const CATS = ['education', 'farmer', 'women', 'senior', 'health', 'housing', 'employment', 'disability', 'financial'];
let FAMILY = {
  household: { state: 'Tamil Nadu', district: 'Madurai', annualIncome: 180000, familySize: 4, area: 'rural', category: 'obc', bplCard: false, ownsHouse: false, rationCard: true },
  members: [
    { id: 'm1', name: 'Murugan', relation: 'self', age: 44, gender: 'male', occupation: 'farmer', education: 'secondary', isStudent: false, studyLevel: null, landHoldingAcres: 2.5, isWidow: false, hasDisability: null, disabilityPercent: null, consentGiven: true, sensitiveConsent: false },
    { id: 'm2', name: 'Valli', relation: 'spouse', age: 40, gender: 'female', occupation: 'homemaker', education: 'primary', isStudent: false, studyLevel: null, landHoldingAcres: null, isWidow: false, hasDisability: null, disabilityPercent: null, consentGiven: true, sensitiveConsent: false },
    { id: 'm3', name: 'Karthik', relation: 'child', age: 19, gender: 'male', occupation: 'student', education: 'higher-secondary', isStudent: true, studyLevel: 'ug', landHoldingAcres: null, isWidow: false, hasDisability: null, disabilityPercent: null, consentGiven: true, sensitiveConsent: false },
  ],
};
let TRACKER = [];
let NOTIFS = [{ id: 'n1', title: 'Welcome', body: 'Mock notifications are on.', read: false, createdAt: new Date().toISOString() }];
const err = (status, message) => Object.assign(new Error(message), { status, code: 'MOCK' });

function evalRule(r, p) {
  const v = p[r.field];
  if (v === null || v === undefined) return 'unknown';
  const ok = { eq: v === r.value, neq: v !== r.value, lte: v <= r.value, gte: v >= r.value, lt: v < r.value, gt: v > r.value, in: Array.isArray(r.value) && r.value.includes(v), true: v === true, false: v === false }[r.op];
  return ok ? 'met' : 'unmet';
}
function recommend(household, members) {
  const skipped = members.filter((m) => !m.consentGiven).map((m) => ({ memberId: m.id, name: m.name }));
  const results = members.filter((m) => m.consentGiven).map((member) => {
    const merged = { ...household, ...member };
    const matches = SCHEMES.map((s) => {
      const checks = s.rules.filter((r) => r.field !== 'hasDisability' || member.sensitiveConsent).map((r) => ({ ruleId: r.id, label: r.label, result: evalRule(r, merged) }));
      const unmet = checks.some((c) => c.result === 'unmet');
      const unk = checks.some((c) => c.result === 'unknown');
      const met = checks.filter((c) => c.result === 'met').length;
      return {
        schemeId: s.id, memberId: member.id, status: unmet ? 'not-eligible' : unk ? 'likely' : 'eligible',
        score: checks.length ? Math.round((met / checks.length) * 100) : 0, checks,
        scheme: { id: s.id, name: s.name, category: s.category, level: s.level, state: s.state, summary: s.summary },
      };
    }).sort((a, b) => b.score - a.score);
    return { member, matches };
  });
  return { generatedAt: new Date().toISOString(), results, skipped };
}
const toScheme = (s) => s;
export async function mockHandler(method, path, body, token) {
  await new Promise((r) => setTimeout(r, 120));
  const [p, query = ''] = path.split('?');
  const q = new URLSearchParams(query);
  const user = token === 'admin' ? { id: 'u2', name: 'Admin', email: 'admin@bharatscheme.in', role: 'admin' } : { id: 'u1', name: 'Demo Family', email: 'demo@bharatscheme.in', role: 'user' };
  if (p === '/auth/login') {
    if (body.email === 'admin@bharatscheme.in' && body.password === 'admin1234') return { token: 'admin', user: { ...user, id: 'u2', name: 'Admin', email: body.email, role: 'admin' } };
    if (body.email === 'demo@bharatscheme.in' && body.password === 'demo1234') return { token: 'demo', user };
    throw err(401, 'Wrong email or password');
  }
  if (p === '/auth/register') return { token: 'demo', user: { ...user, name: body.name, email: body.email } };
  if (p === '/me') { if (!token) throw err(401, 'Not signed in'); return { user }; }
  if (p === '/schemes' && method === 'GET') {
    const t = (q.get('q') || '').toLowerCase();
    const list = SCHEMES.filter((s) => (!t || (s.name.en + s.name.ta + s.summary.en).toLowerCase().includes(t)) && (!q.get('category') || s.category === q.get('category')) && (!q.get('level') || s.level === q.get('level')) && (!q.get('state') || s.state === q.get('state')));
    return { schemes: list.map(toScheme), dataStatus: 'demo-curated' };
  }
  if (p.startsWith('/schemes/')) { const s = SCHEMES.find((x) => x.id === decodeURIComponent(p.slice(9))); if (!s) throw err(404, 'Scheme not found'); return s; }
  if (p === '/categories') return CATS.map((id) => ({ id, label: { en: id[0].toUpperCase() + id.slice(1), ta: id }, count: SCHEMES.filter((s) => s.category === id).length }));
  if (p === '/family') return JSON.parse(JSON.stringify(FAMILY));
  if (p === '/family/household') { FAMILY.household = { ...body }; return FAMILY.household; }
  if (p === '/family/members' && method === 'POST') { const m = { ...body, id: 'm' + Date.now() }; FAMILY.members.push(m); return m; }
  if (p.startsWith('/family/members/')) {
    const id = p.split('/').pop();
    if (method === 'DELETE') { FAMILY.members = FAMILY.members.filter((m) => m.id !== id); return { ok: true }; }
    FAMILY.members = FAMILY.members.map((m) => (m.id === id ? { ...m, ...body, id } : m)); return FAMILY.members.find((m) => m.id === id);
  }
  if (p === '/recommendations') return body?.household ? recommend(body.household, body.members || []) : recommend(FAMILY.household, FAMILY.members);
  if (p === '/ai/explain') { const s = SCHEMES.find((x) => x.id === body.schemeId); return { mode: 'offline', text: `${s.name[body.lang] || s.name.en}: ${s.summary[body.lang] || s.summary.en}\n\n` + (s.benefits[body.lang] || s.benefits.en).map((b) => '• ' + b).join('\n') }; }
  if (p === '/ai/ask') return { mode: 'offline', text: 'Mock answer: see the scheme details above.', citedSchemeIds: body.schemeId ? [body.schemeId] : [] };
  if (p === '/tracker' && method === 'GET') return TRACKER;
  if (p === '/tracker' && method === 'POST') { const it = { id: 't' + Date.now(), ...body, status: 'interested', notes: '', documentsDone: [], reminderAt: null, history: [{ status: 'interested', at: new Date().toISOString() }] }; TRACKER.push(it); return it; }
  if (p.startsWith('/tracker/')) {
    const id = p.split('/').pop();
    TRACKER = TRACKER.map((t) => (t.id === id ? { ...t, ...body, history: body.status && body.status !== t.status ? [...t.history, { status: body.status, at: new Date().toISOString() }] : t.history } : t));
    return TRACKER.find((t) => t.id === id);
  }
  if (p === '/notifications') return NOTIFS;
  if (p.startsWith('/notifications/')) { const id = p.split('/')[2]; NOTIFS = NOTIFS.map((n) => (n.id === id ? { ...n, read: true } : n)); return { ok: true }; }
  if (p === '/admin/schemes' && method === 'GET') return { schemes: SCHEMES };
  if (p === '/admin/schemes' && method === 'POST') { SCHEMES.push(body); return body; }
  if (p.startsWith('/admin/schemes/')) {
    const id = decodeURIComponent(p.split('/').pop());
    if (method === 'DELETE') { SCHEMES.splice(SCHEMES.findIndex((s) => s.id === id), 1); return { ok: true }; }
    SCHEMES[SCHEMES.findIndex((s) => s.id === id)] = body; return body;
  }
  if (p === '/admin/analytics') return { totalRuns: 12, topSchemes: SCHEMES.map((s, i) => ({ schemeId: s.id, count: 9 - i * 2 })), byCategory: [{ category: 'farmer', count: 5 }, { category: 'education', count: 4 }], byState: [{ state: 'Tamil Nadu', count: 12 }] };
  throw err(404, `No mock for ${method} ${p}`);
}
