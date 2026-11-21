import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { createRepo } from '../src/repo/index.js';
import { seed } from '../src/seed.js';
import { createApp } from '../src/app.js';

let server, base, repo;
const quiet = { warn() {}, error() {}, log() {} };

before(async () => {
  const config = loadConfig({ LOCAL_DB_PATH: ':memory:', JWT_SECRET: 'test-secret', OPENAI_API_KEY: '' });
  repo = await createRepo(config);
  await seed(repo, config, quiet);
  const app = createApp({ repo, config, push: { enabled: false, send: async () => ({ sent: false }) }, log: quiet });
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const call = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};
const login = async (email, password) => (await call('/auth/login', { method: 'POST', body: { email, password } })).body.token;

test('public scheme reads work without a token', async () => {
  const r = await call('/schemes');
  assert.equal(r.status, 200);
  assert.equal(r.body.dataStatus, 'demo-curated');
  assert.ok(r.body.schemes.length >= 3);
  const one = await call(`/schemes/${r.body.schemes[0].id}`);
  assert.equal(one.status, 200);
  assert.equal((await call('/schemes/nope')).body.error.code, 'not_found');
  const cats = await call('/categories');
  assert.ok(cats.body.every((c) => c.label.en && c.label.ta && typeof c.count === 'number'));
});

test('auth: bad login 401, private routes need token, register works', async () => {
  assert.equal((await call('/auth/login', { method: 'POST', body: { email: 'demo@bharatscheme.in', password: 'wrongpass' } })).status, 401);
  assert.equal((await call('/family')).status, 401);
  const reg = await call('/auth/register', { method: 'POST', body: { name: 'T', email: 'T@example.com', password: 'secret12' } });
  assert.equal(reg.status, 201);
  assert.equal((await call('/me', { token: reg.body.token })).body.user.email, 't@example.com');
  assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'T', email: 't@example.com', password: 'secret12' } })).status, 409);
});

test('demo family and recommendations', async () => {
  const token = await login('demo@bharatscheme.in', 'demo1234');
  const fam = await call('/family', { token });
  assert.equal(fam.body.members.length, 5);
  assert.equal(fam.body.household.annualIncome, 180000);
  const rec = await call('/recommendations', { method: 'POST', token, body: {} });
  assert.equal(rec.status, 200);
  assert.equal(rec.body.results.length, 5);
  const self = rec.body.results.find((r) => r.member.relation === 'self');
  assert.ok(self.matches.some((m) => m.status === 'eligible' && m.checks.length >= 0 && m.scheme.name.en));
});

test('guest recommendations and validation errors', async () => {
  const guest = await call('/recommendations', {
    method: 'POST',
    body: { household: { state: 'Tamil Nadu', annualIncome: 100000, rationCard: true }, members: [{ name: 'G', relation: 'self', age: 70 }, { name: 'H', relation: 'spouse', age: 60, consentGiven: false }] },
  });
  assert.equal(guest.status, 200);
  assert.equal(guest.body.skipped.length, 1);
  assert.equal((await call('/recommendations', { method: 'POST', body: { members: [{ name: 'x', relation: 'self', age: 999 }] } })).status, 400);
  assert.equal((await call('/recommendations', { method: 'POST', body: {} })).status, 401);
});

test('family CRUD and privacy: sensitive fields dropped without consent', async () => {
  const token = await login('demo@bharatscheme.in', 'demo1234');
  const m = await call('/family/members', { method: 'POST', token, body: { name: 'Temp', relation: 'sibling', age: 30, hasDisability: true, sensitiveConsent: false } });
  assert.equal(m.status, 201);
  assert.equal(m.body.hasDisability, null);
  const upd = await call(`/family/members/${m.body.id}`, { method: 'PUT', token, body: { age: 31 } });
  assert.equal(upd.body.age, 31);
  assert.equal((await call(`/family/members/${m.body.id}`, { method: 'DELETE', token })).status, 200);
  assert.equal((await call(`/family/members/${m.body.id}`, { method: 'DELETE', token })).status, 404);
});

test('AI: offline mode, cites only dataset ids; refuses off-dataset questions', async () => {
  const token = await login('demo@bharatscheme.in', 'demo1234');
  const { body: { schemes } } = await call('/schemes');
  const s = schemes[0];
  const fam = await call('/family', { token });
  const ex = await call('/ai/explain', { method: 'POST', token, body: { schemeId: s.id, memberId: fam.body.members[0].id, lang: 'en' } });
  assert.equal(ex.body.mode, 'offline');
  assert.ok(ex.body.text.includes(s.name.en));
  const ta = await call('/ai/explain', { method: 'POST', body: { schemeId: s.id, lang: 'ta' } });
  assert.ok(ta.body.text.includes(s.name.ta));
  const ask = await call('/ai/ask', { method: 'POST', body: { question: `What documents are needed for ${s.name.en}?`, lang: 'en' } });
  assert.equal(ask.body.mode, 'offline');
  assert.ok(ask.body.citedSchemeIds.includes(s.id));
  assert.ok(ask.body.citedSchemeIds.every((id) => schemes.some((x) => x.id === id)));
  const off = await call('/ai/ask', { method: 'POST', body: { question: 'Who won the cricket world cup?', lang: 'en' } });
  assert.deepEqual(off.body.citedSchemeIds, []);
});

test('tracker lifecycle with history, and notifications', async () => {
  const token = await login('demo@bharatscheme.in', 'demo1234');
  const fam = await call('/family', { token });
  const { body: { schemes: all } } = await call('/schemes');
  const schemes = all.filter((x) => !['pm-kisan', 'kisan-credit-card'].includes(x.id)); // those two are seeded for the demo user
  const seeded = await call('/tracker', { token });
  assert.deepEqual(seeded.body.map((i) => i.schemeId).sort(), ['kisan-credit-card', 'pm-kisan']);
  const t = await call('/tracker', { method: 'POST', token, body: { schemeId: schemes[0].id, memberId: fam.body.members[0].id } });
  assert.equal(t.status, 201);
  assert.equal(t.body.status, 'interested');
  const again = await call('/tracker', { method: 'POST', token, body: { schemeId: schemes[0].id, memberId: fam.body.members[0].id } });
  assert.equal(again.body.id, t.body.id);
  const p = await call(`/tracker/${t.body.id}`, { method: 'PATCH', token, body: { status: 'started', notes: 'visited office', documentsDone: [] } });
  assert.deepEqual(p.body.history.map((h) => h.status), ['interested', 'started']);
  assert.equal((await call(`/tracker/${t.body.id}`, { method: 'PATCH', token, body: { status: 'bogus' } })).status, 400);
  const notes = await call('/notifications', { token });
  assert.ok(notes.body.some((n) => n.kind === 'missing-documents'));
  assert.ok(notes.body.every((n) => n.title.en && n.title.ta));
  const first = notes.body[0];
  assert.equal((await call(`/notifications/${first.id}/read`, { method: 'POST', token })).body.read, true);
  const again2 = await call('/notifications', { token });
  assert.equal(again2.body.length, notes.body.length); // idempotent
});

test('admin: forbidden for users, CRUD + analytics for admin', async () => {
  const user = await login('demo@bharatscheme.in', 'demo1234');
  assert.equal((await call('/admin/analytics', { token: user })).status, 403);
  const admin = await login('admin@bharatscheme.in', 'admin1234');
  const scheme = {
    id: 'test-scheme', name: { en: 'Test Scheme', ta: 'சோதனை' }, level: 'central', category: 'financial', summary: { en: 'x', ta: 'x' },
    benefits: { en: ['b'], ta: ['b'] }, documents: ['Aadhaar card'], howToApply: { en: ['go'], ta: ['go'] }, officialUrl: 'https://example.org/',
    rules: [{ field: 'age', op: 'gte', value: 18, label: { en: '18+', ta: '18+' } }],
  };
  assert.equal((await call('/admin/schemes', { method: 'POST', token: admin, body: scheme })).status, 201);
  assert.equal((await call('/admin/schemes', { method: 'POST', token: admin, body: scheme })).status, 409);
  assert.equal((await call('/admin/schemes/test-scheme', { method: 'PUT', token: admin, body: { ...scheme, name: { en: 'Renamed' } } })).body.name.en, 'Renamed');
  assert.equal((await call('/schemes/test-scheme')).body.name.en, 'Renamed');
  assert.equal((await call('/admin/schemes', { method: 'POST', token: admin, body: { ...scheme, id: 'Bad Id' } })).status, 400);
  assert.equal((await call('/admin/schemes/test-scheme', { method: 'DELETE', token: admin })).status, 200);
  const an = await call('/admin/analytics', { token: admin });
  assert.ok(an.body.totalRuns >= 2);
  assert.ok(Array.isArray(an.body.topSchemes) && Array.isArray(an.body.byCategory) && Array.isArray(an.body.byState));
});
