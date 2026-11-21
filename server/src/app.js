import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { SERVER_ROOT } from './config.js';
import { makeAuth, publicUser } from './auth.js';
import { evaluateAll, schemeSummary } from './engine.js';
import { makeAi } from './ai.js';
import { generateNotifications } from './notifications.js';
import { publicScheme } from './schemes.js';
import {
  HttpError, bad, cleanHousehold, cleanMember, cleanCredentials, cleanLang, cleanScheme, cleanTrackerPatch, MEMBER_DEFAULTS,
} from './validate.js';

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const notFound = (what) => new HttpError(404, 'not_found', `${what} not found`);

export function createApp({ repo, config, push, log = console }) {
  const app = express();
  const auth = makeAuth(config, repo);
  const ai = makeAi(config, log);
  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  app.use('/api', api);

  api.get('/health', (_req, res) => res.json({ ok: true, driver: repo.driver, aiMode: ai.mode, push: Boolean(push?.enabled) }));

  // ---------- auth ----------
  api.post('/auth/register', wrap(async (req, res) => {
    const { name, email, password } = cleanCredentials(req.body, { needName: true });
    if (await repo.findUserByEmail(email)) throw new HttpError(409, 'email_taken', 'An account with this email already exists');
    const user = await repo.createUser({ name, email, passwordHash: auth.hash(password), role: 'user' });
    res.status(201).json({ token: auth.sign(user), user: publicUser(user) });
  }));
  api.post('/auth/login', wrap(async (req, res) => {
    const { email, password } = cleanCredentials(req.body);
    const user = await repo.findUserByEmail(email);
    if (!user || !auth.verify(password, user.passwordHash)) throw new HttpError(401, 'invalid_credentials', 'Incorrect email or password');
    res.json({ token: auth.sign(user), user: publicUser(user) });
  }));
  api.get('/me', auth.requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
  api.post('/me/device-token', auth.requireAuth, wrap(async (req, res) => {
    const t = req.body?.token;
    if (typeof t !== 'string' || t.length < 10 || t.length > 512) throw bad('token must be a string');
    await repo.updateUser(req.user.id, { fcmToken: t });
    res.json({ ok: true, pushEnabled: Boolean(push?.enabled) });
  }));

  // ---------- schemes (public reads) ----------
  api.get('/schemes', wrap(async (req, res) => {
    const { q, category, level, state } = req.query;
    let list = await repo.listSchemes();
    if (typeof category === 'string' && category) list = list.filter((s) => s.category === category);
    if (typeof level === 'string' && level) list = list.filter((s) => s.level === level);
    if (typeof state === 'string' && state) list = list.filter((s) => !s.state || s.state.toLowerCase() === state.toLowerCase());
    if (typeof q === 'string' && q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((s) =>
        [s.id, s.name.en, s.name.ta, s.summary?.en, s.summary?.ta, s.ministry, s.category].some((f) => f && String(f).toLowerCase().includes(needle)));
    }
    res.json({ schemes: list.map(publicScheme), dataStatus: 'demo-curated' });
  }));
  api.get('/schemes/:id', wrap(async (req, res) => {
    const s = await repo.getScheme(req.params.id);
    if (!s) throw notFound('Scheme');
    res.json(publicScheme(s));
  }));
  api.get('/categories', wrap(async (_req, res) => {
    const [cats, schemes] = await Promise.all([repo.listCategories(), repo.listSchemes()]);
    res.json(cats.map((c) => ({ id: c.id, label: c.label, count: schemes.filter((s) => s.category === c.id).length })));
  }));

  // ---------- family ----------
  const familyOf = async (userId) => ({ household: (await repo.getHousehold(userId)) || null, members: await repo.listMembers(userId) });
  const strip = ({ userId, ...rest }) => rest;
  api.get('/family', auth.requireAuth, wrap(async (req, res) => {
    const f = await familyOf(req.user.id);
    res.json({ household: f.household && strip(f.household), members: f.members.map(strip) });
  }));
  api.put('/family/household', auth.requireAuth, wrap(async (req, res) => {
    res.json(strip(await repo.upsertHousehold(req.user.id, cleanHousehold(req.body))));
  }));
  api.post('/family/members', auth.requireAuth, wrap(async (req, res) => {
    const m = await repo.createMember(req.user.id, { ...MEMBER_DEFAULTS, ...cleanMember(req.body, { create: true }) });
    res.status(201).json(strip(m));
  }));
  api.put('/family/members/:id', auth.requireAuth, wrap(async (req, res) => {
    const cur = await repo.getMember(req.user.id, req.params.id);
    if (!cur) throw notFound('Member');
    const patch = cleanMember(req.body);
    if (patch.sensitiveConsent === undefined && cur.sensitiveConsent === false) {
      delete patch.hasDisability;
      delete patch.disabilityPercent;
    }
    res.json(strip(await repo.updateMember(req.user.id, req.params.id, patch)));
  }));
  api.delete('/family/members/:id', auth.requireAuth, wrap(async (req, res) => {
    if (!(await repo.deleteMember(req.user.id, req.params.id))) throw notFound('Member');
    res.json({ ok: true });
  }));

  // ---------- recommendations ----------
  const guestFamily = (body) => {
    const household = cleanHousehold(body.household || {});
    if (!Array.isArray(body.members) || body.members.length === 0 || body.members.length > 20) throw bad('members must be a list of 1-20 people');
    const members = body.members.map((m, i) => ({
      ...MEMBER_DEFAULTS, ...cleanMember(m, { create: true }),
      id: typeof m.id === 'string' && m.id.length <= 64 ? m.id : `guest-${i + 1}`,
    }));
    return { household, members };
  };

  api.post('/recommendations', auth.optionalAuth, wrap(async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const includeNotEligible = body.includeNotEligible === true || req.query.includeNotEligible === '1';
    let family;
    if (body.members !== undefined || body.household !== undefined) family = guestFamily(body);
    else if (req.user) {
      family = await familyOf(req.user.id);
      if (!family.household || family.members.length === 0) throw new HttpError(400, 'no_family', 'Add your household and family members first');
    } else throw new HttpError(401, 'unauthorized', 'Sign in, or send {household, members} for guest mode');

    const schemes = await repo.listSchemes();
    const out = evaluateAll({ household: family.household, members: family.members, schemes, includeNotEligible });

    // Analytics source: aggregate only (scheme, category, best status); no names or profile data stored.
    const best = new Map();
    for (const { matches } of out.results)
      for (const m of matches) {
        if (m.status === 'not-eligible') continue;
        const prev = best.get(m.schemeId);
        if (!prev || (prev.status === 'likely' && m.status === 'eligible')) best.set(m.schemeId, { schemeId: m.schemeId, category: m.scheme.category, status: m.status });
      }
    const all = out.results.flatMap((r) => r.matches);
    await repo.addRun({
      userId: req.user?.id ?? null, state: family.household?.state ?? null, memberCount: out.results.length,
      eligibleCount: all.filter((m) => m.status === 'eligible').length, likelyCount: all.filter((m) => m.status === 'likely').length,
      matches: [...best.values()],
    });
    res.json(out);
  }));

  // ---------- AI ----------
  api.post('/ai/explain', auth.optionalAuth, wrap(async (req, res) => {
    const { schemeId, memberId } = req.body || {};
    const lang = cleanLang(req.body?.lang);
    const scheme = typeof schemeId === 'string' && (await repo.getScheme(schemeId));
    if (!scheme) throw notFound('Scheme');
    let member;
    let household;
    if (typeof memberId === 'string' && req.user) {
      member = await repo.getMember(req.user.id, memberId);
      if (!member) throw notFound('Member');
      household = await repo.getHousehold(req.user.id);
      if (member.consentGiven === false) member = undefined; // never explain a profile whose owner withheld consent
    } else if (req.body?.member) {
      member = { ...MEMBER_DEFAULTS, ...cleanMember(req.body.member, { create: true }), id: 'guest-1' };
      household = cleanHousehold(req.body.household || {});
    }
    res.json(await ai.explain({ scheme, lang, member, household }));
  }));
  api.post('/ai/ask', wrap(async (req, res) => {
    const { question, schemeId } = req.body || {};
    if (typeof question !== 'string' || !question.trim() || question.length > 500) throw bad('question must be a non-empty string up to 500 characters');
    const lang = cleanLang(req.body.lang);
    const schemes = await repo.listSchemes();
    if (schemeId !== undefined && !schemes.some((s) => s.id === schemeId)) throw notFound('Scheme');
    res.json(await ai.ask({ question: question.trim(), schemes, lang, schemeId }));
  }));

  // ---------- tracker ----------
  const trackerView = async (items) => {
    const schemes = new Map((await repo.listSchemes()).map((s) => [s.id, s]));
    return items.map(({ userId, ...t }) => {
      const s = schemes.get(t.schemeId);
      return { ...t, scheme: s ? { ...schemeSummary(s), documents: s.documents } : null };
    });
  };
  api.get('/tracker', auth.requireAuth, wrap(async (req, res) => res.json(await trackerView(await repo.listTracker(req.user.id)))));
  api.post('/tracker', auth.requireAuth, wrap(async (req, res) => {
    const { schemeId, memberId } = req.body || {};
    if (typeof schemeId !== 'string' || typeof memberId !== 'string') throw bad('schemeId and memberId are required');
    if (!(await repo.getScheme(schemeId))) throw notFound('Scheme');
    if (!(await repo.getMember(req.user.id, memberId))) throw notFound('Member');
    const existing = await repo.findTracker(req.user.id, schemeId, memberId);
    if (existing) return res.json((await trackerView([existing]))[0]);
    const at = new Date().toISOString();
    const item = await repo.createTracker({
      userId: req.user.id, schemeId, memberId, status: 'interested', notes: '', documentsDone: [], reminderAt: null,
      createdAt: at, updatedAt: at, history: [{ status: 'interested', at }],
    });
    generateNotifications({ repo, push, user: req.user }).catch((e) => log.warn?.(`[notifications] ${e.message}`));
    res.status(201).json((await trackerView([item]))[0]);
  }));
  api.patch('/tracker/:id', auth.requireAuth, wrap(async (req, res) => {
    const cur = await repo.getTracker(req.user.id, req.params.id);
    if (!cur) throw notFound('Tracker item');
    const patch = cleanTrackerPatch(req.body);
    const entry = patch.status && patch.status !== cur.status ? { status: patch.status, at: new Date().toISOString() } : undefined;
    const item = await repo.updateTracker(req.user.id, req.params.id, patch, entry);
    res.json((await trackerView([item]))[0]);
  }));

  // ---------- notifications ----------
  api.get('/notifications', auth.requireAuth, wrap(async (req, res) => {
    await generateNotifications({ repo, push, user: req.user });
    const list = await repo.listNotifications(req.user.id);
    res.json(list.map(({ userId, key, ...n }) => n));
  }));
  api.post('/notifications/:id/read', auth.requireAuth, wrap(async (req, res) => {
    const n = await repo.markNotificationRead(req.user.id, req.params.id);
    if (!n) throw notFound('Notification');
    const { userId, key, ...rest } = n;
    res.json(rest);
  }));

  // ---------- admin ----------
  const admin = express.Router();
  api.use('/admin', auth.requireAuth, auth.requireAdmin, admin);
  admin.get('/schemes', wrap(async (_req, res) => res.json({ schemes: await repo.listSchemes() })));
  admin.post('/schemes', wrap(async (req, res) => {
    const s = cleanScheme(req.body);
    if (await repo.getScheme(s.id)) throw new HttpError(409, 'exists', 'A scheme with this id already exists');
    res.status(201).json(await repo.saveScheme({ ...s, origin: 'admin', adminEdited: true, addedAt: new Date().toISOString() }));
  }));
  admin.put('/schemes/:id', wrap(async (req, res) => {
    const cur = await repo.getScheme(req.params.id);
    if (!cur) throw notFound('Scheme');
    const s = cleanScheme({ ...req.body, id: req.params.id });
    res.json(await repo.saveScheme({ ...s, origin: cur.origin, adminEdited: true, addedAt: cur.addedAt }));
  }));
  admin.delete('/schemes/:id', wrap(async (req, res) => {
    if (!(await repo.deleteScheme(req.params.id))) throw notFound('Scheme');
    res.json({ ok: true });
  }));
  admin.get('/analytics', wrap(async (_req, res) => {
    const [runs, schemes] = await Promise.all([repo.listRuns(), repo.listSchemes()]);
    const names = new Map(schemes.map((s) => [s.id, s.name]));
    const tally = (pairs) => {
      const m = new Map();
      for (const k of pairs) if (k) m.set(k, (m.get(k) || 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const matches = runs.flatMap((r) => r.matches || []);
    res.json({
      totalRuns: runs.length,
      topSchemes: tally(matches.map((m) => m.schemeId)).slice(0, 10).map(([schemeId, count]) => ({ schemeId, name: names.get(schemeId) || null, count })),
      byCategory: tally(matches.map((m) => m.category)).map(([category, count]) => ({ category, count })),
      byState: tally(runs.map((r) => r.state)).map(([state, count]) => ({ state, count })),
    });
  }));

  // ---------- static client & SPA fallback ----------
  const clientDist = path.resolve(SERVER_ROOT, '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // ---------- errors ----------
  api.use((_req, _res, next) => next(notFound('Route')));
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'bad_json', message: 'Request body is not valid JSON' } });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: { code: 'too_large', message: 'Request body too large' } });
    log.error?.(err);
    res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong' } });
  });
  return app;
}
