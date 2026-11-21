// Generates in-app notifications (always stored) and forwards to the push adapter when configured.
// Idempotent: each notification has a dedupe key, so repeated calls never duplicate.
import { evaluateAll } from './engine.js';

const DAY = 86400000;

export async function generateNotifications({ repo, push, user, now = new Date() }) {
  const [household, members, schemes, tracker] = await Promise.all([
    repo.getHousehold(user.id), repo.listMembers(user.id), repo.listSchemes(), repo.listTracker(user.id),
  ]);
  if (!household || members.length === 0) return [];
  const byId = new Map(schemes.map((s) => [s.id, s]));
  const { results } = evaluateAll({ household, members, schemes });
  const created = [];
  const add = async (n) => {
    const note = await repo.createNotificationIfNew({ userId: user.id, ...n });
    if (note) {
      created.push(note);
      push?.send(user.fcmToken, { title: n.title.en, body: n.body.en }).catch(() => {});
    }
  };

  // 1) New schemes added after the account was created that match a member (top 5 by score).
  const fresh = [];
  for (const { member, matches } of results) {
    for (const m of matches) {
      const s = byId.get(m.schemeId);
      if (s?.addedAt && s.addedAt > user.createdAt) fresh.push({ member, m, s });
    }
  }
  fresh.sort((a, b) => b.m.score - a.m.score);
  const seen = new Set();
  for (const { member, s } of fresh) {
    if (seen.has(s.id) || seen.size >= 5) continue;
    seen.add(s.id);
    await add({
      kind: 'new-scheme', key: `new:${s.id}`, schemeId: s.id,
      title: { en: 'New scheme you may qualify for', ta: 'நீங்கள் தகுதி பெறக்கூடிய புதிய திட்டம்' },
      body: { en: `${s.name.en} may suit ${member.name}.`, ta: `${s.name.ta || s.name.en} — ${member.name} க்குப் பொருந்தலாம்.` },
    });
  }

  // 2) Deadlines within 30 days for schemes that match someone in the family.
  const matched = new Set(results.flatMap((r) => r.matches.map((m) => m.schemeId)));
  for (const s of schemes) {
    if (!s.deadline || !matched.has(s.id)) continue;
    const days = Math.ceil((Date.parse(`${s.deadline}T23:59:59Z`) - now.getTime()) / DAY);
    if (days < 0 || days > 30) continue;
    await add({
      kind: 'deadline', key: `deadline:${s.id}:${s.deadline}`, schemeId: s.id,
      title: { en: `Deadline in ${days} day${days === 1 ? '' : 's'}`, ta: `கடைசி தேதிக்கு ${days} நாட்கள்` },
      body: { en: `${s.name.en} closes on ${s.deadline}.`, ta: `${s.name.ta || s.name.en} — கடைசி தேதி ${s.deadline}.` },
    });
  }

  // 3) Tracked applications with documents not yet marked done.
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  for (const t of tracker) {
    if (['approved', 'rejected'].includes(t.status)) continue;
    const s = byId.get(t.schemeId);
    if (!s?.documents?.length) continue;
    const missing = s.documents.filter((d) => !t.documentsDone.includes(d));
    if (missing.length === 0) continue;
    await add({
      kind: 'missing-documents', key: `docs:${t.id}:${missing.length}`, schemeId: s.id,
      title: { en: 'Documents still pending', ta: 'ஆவணங்கள் நிலுவையில் உள்ளன' },
      body: {
        en: `${s.name.en} for ${nameOf.get(t.memberId) || 'a family member'}: ${missing.length} of ${s.documents.length} documents not yet marked done (${missing.join(', ')}).`,
        ta: `${s.name.ta || s.name.en} — ${nameOf.get(t.memberId) || 'குடும்ப உறுப்பினர்'}: ${s.documents.length} ஆவணங்களில் ${missing.length} இன்னும் முடிக்கப்படவில்லை.`,
      },
    });
  }
  return created;
}
