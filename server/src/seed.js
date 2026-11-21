import bcrypt from 'bcryptjs';
import { syncSchemes } from './schemes.js';

export const DEMO = { email: 'demo@bharatscheme.in', password: 'demo1234' };
export const ADMIN = { email: 'admin@bharatscheme.in', password: 'admin1234' };

const DEMO_HOUSEHOLD = {
  state: 'Tamil Nadu', district: 'Thanjavur', annualIncome: 180000, familySize: 5, area: 'rural',
  category: 'obc', bplCard: false, ownsHouse: false, rationCard: true,
};

const base = { consentGiven: true, sensitiveConsent: false, hasDisability: null, disabilityPercent: null, isWidow: false, landHoldingAcres: null, studyLevel: null, isStudent: false };
const DEMO_MEMBERS = [
  { ...base, name: 'Murugan K', relation: 'self', age: 44, gender: 'male', occupation: 'farmer', education: 'secondary', landHoldingAcres: 1.5 },
  { ...base, name: 'Lakshmi M', relation: 'spouse', age: 40, gender: 'female', occupation: 'homemaker', education: 'secondary' },
  { ...base, name: 'Priya M', relation: 'child', age: 19, gender: 'female', occupation: 'student', education: 'higher-secondary', isStudent: true, studyLevel: 'ug' },
  { ...base, name: 'Ramasamy K', relation: 'parent', age: 68, gender: 'male', occupation: 'retired', education: 'primary' }, // widower (isWidow applies to widows)
  { ...base, name: 'Karthik M', relation: 'child', age: 15, gender: 'male', occupation: 'student', education: 'secondary', isStudent: true, studyLevel: 'school' },
];

/** Two tracker entries so the tracker demo is never empty. No-op if the demo user already tracks anything. */
async function seedDemoTracker(repo, userId, selfId) {
  if ((await repo.listTracker(userId)).length) return;
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const entries = [
    { schemeId: 'pm-kisan', status: 'submitted', notes: 'Applied at the CSC centre.', documentsDone: ['Aadhaar card', 'Bank passbook (Aadhaar-linked)', 'Land ownership records (patta/chitta)'], steps: [['interested', 5], ['started', 4], ['submitted', 2]] },
    { schemeId: 'kisan-credit-card', status: 'started', notes: 'Docs gathering at the bank.', documentsDone: ['Aadhaar card'], steps: [['interested', 3], ['started', 1]] },
  ];
  for (const e of entries) {
    if (!(await repo.getScheme(e.schemeId))) continue;
    await repo.createTracker({
      userId, schemeId: e.schemeId, memberId: selfId, status: e.status, notes: e.notes,
      documentsDone: e.documentsDone, reminderAt: null, createdAt: day(e.steps[0][1]), updatedAt: day(e.steps.at(-1)[1]),
      history: e.steps.map(([status, n]) => ({ status, at: day(n) })),
    });
  }
}

/** Idempotent: loads schemes + categories, and creates demo/admin users if absent. */
export async function seed(repo, config, log = console) {
  const schemeInfo = await syncSchemes(repo, config, log);

  if (!(await repo.findUserByEmail(ADMIN.email))) {
    await repo.createUser({ name: 'Admin', email: ADMIN.email, passwordHash: bcrypt.hashSync(ADMIN.password, 10), role: 'admin' });
  }
  if (!(await repo.findUserByEmail(DEMO.email))) {
    const created = new Date(Date.now() - 7 * 86400000).toISOString(); // account "created" a week ago so newer schemes read as new
    const user = await repo.createUser({ name: 'Murugan K', email: DEMO.email, passwordHash: bcrypt.hashSync(DEMO.password, 10), role: 'user', createdAt: created });
    await repo.upsertHousehold(user.id, DEMO_HOUSEHOLD);
    for (const m of DEMO_MEMBERS) await repo.createMember(user.id, m);
  }
  const demo = await repo.findUserByEmail(DEMO.email);
  const self = demo && (await repo.listMembers(demo.id)).find((m) => m.relation === 'self');
  if (self) await seedDemoTracker(repo, demo.id, self.id);
  return schemeInfo;
}
