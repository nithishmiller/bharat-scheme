// "local" driver: one JSON file (or memory when path is ":memory:"). Default for the demo.
import fs from 'node:fs';
import crypto from 'node:crypto';

const EMPTY = () => ({
  users: [],
  households: [],
  members: [],
  schemes: [],
  categories: [],
  tracker: [],
  notifications: [],
  runs: [],
});
const clone = (o) => (o === undefined ? o : structuredClone(o));
const now = () => new Date().toISOString();

export function createLocalRepo({ path: file }) {
  const memory = file === ':memory:';
  let db = EMPTY();

  const persist = () => {
    if (memory) return;
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, file);
  };

  return {
    driver: 'local',
    async init() {
      if (!memory && fs.existsSync(file)) {
        try {
          db = { ...EMPTY(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
        } catch {
          fs.renameSync(file, `${file}.corrupt-${Date.now()}`);
          db = EMPTY();
        }
      }
    },
    async close() {},

    // users
    async countUsers() {
      return db.users.length;
    },
    async findUserByEmail(email) {
      return clone(db.users.find((u) => u.email === email));
    },
    async findUserById(id) {
      return clone(db.users.find((u) => u.id === id));
    },
    async createUser(u) {
      const user = { id: crypto.randomUUID(), role: 'user', createdAt: now(), fcmToken: null, ...u };
      db.users.push(user);
      persist();
      return clone(user);
    },
    async updateUser(id, patch) {
      const u = db.users.find((x) => x.id === id);
      if (!u) return undefined;
      Object.assign(u, patch);
      persist();
      return clone(u);
    },

    // household (one per user)
    async getHousehold(userId) {
      return clone(db.households.find((h) => h.userId === userId));
    },
    async upsertHousehold(userId, data) {
      let h = db.households.find((x) => x.userId === userId);
      if (!h) {
        h = { id: crypto.randomUUID(), userId };
        db.households.push(h);
      }
      Object.assign(h, data, { updatedAt: now() });
      persist();
      return clone(h);
    },

    // members
    async listMembers(userId) {
      return clone(db.members.filter((m) => m.userId === userId));
    },
    async getMember(userId, id) {
      return clone(db.members.find((m) => m.userId === userId && m.id === id));
    },
    async createMember(userId, m) {
      const member = { id: crypto.randomUUID(), userId, createdAt: now(), ...m };
      db.members.push(member);
      persist();
      return clone(member);
    },
    async updateMember(userId, id, patch) {
      const m = db.members.find((x) => x.userId === userId && x.id === id);
      if (!m) return undefined;
      Object.assign(m, patch);
      persist();
      return clone(m);
    },
    async deleteMember(userId, id) {
      const i = db.members.findIndex((x) => x.userId === userId && x.id === id);
      if (i < 0) return false;
      db.members.splice(i, 1);
      db.tracker = db.tracker.filter((t) => !(t.userId === userId && t.memberId === id));
      persist();
      return true;
    },

    // schemes
    async listSchemes() {
      return clone(db.schemes);
    },
    async getScheme(id) {
      return clone(db.schemes.find((s) => s.id === id));
    },
    async saveScheme(s) {
      const i = db.schemes.findIndex((x) => x.id === s.id);
      if (i >= 0) db.schemes[i] = clone(s);
      else db.schemes.push(clone(s));
      persist();
      return clone(s);
    },
    async deleteScheme(id) {
      const i = db.schemes.findIndex((x) => x.id === id);
      if (i < 0) return false;
      db.schemes.splice(i, 1);
      persist();
      return true;
    },

    // categories
    async listCategories() {
      return clone(db.categories);
    },
    async saveCategory(c) {
      const i = db.categories.findIndex((x) => x.id === c.id);
      if (i >= 0) db.categories[i] = clone(c);
      else db.categories.push(clone(c));
      persist();
    },

    // tracker
    async listTracker(userId) {
      return clone(db.tracker.filter((t) => t.userId === userId));
    },
    async getTracker(userId, id) {
      return clone(db.tracker.find((t) => t.userId === userId && t.id === id));
    },
    async findTracker(userId, schemeId, memberId) {
      return clone(db.tracker.find((t) => t.userId === userId && t.schemeId === schemeId && t.memberId === memberId));
    },
    async createTracker(item) {
      const t = { id: crypto.randomUUID(), ...item };
      db.tracker.push(t);
      persist();
      return clone(t);
    },
    async updateTracker(userId, id, patch, historyEntry) {
      const t = db.tracker.find((x) => x.userId === userId && x.id === id);
      if (!t) return undefined;
      Object.assign(t, patch, { updatedAt: now() });
      if (historyEntry) t.history.push(historyEntry);
      persist();
      return clone(t);
    },

    // notifications (unique per user+key)
    async listNotifications(userId) {
      return clone(db.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    async createNotificationIfNew(n) {
      if (db.notifications.some((x) => x.userId === n.userId && x.key === n.key)) return null;
      const note = { id: crypto.randomUUID(), read: false, readAt: null, createdAt: now(), ...n };
      db.notifications.push(note);
      persist();
      return clone(note);
    },
    async markNotificationRead(userId, id) {
      const n = db.notifications.find((x) => x.userId === userId && x.id === id);
      if (!n) return undefined;
      n.read = true;
      n.readAt = now();
      persist();
      return clone(n);
    },

    // recommendation runs (analytics source)
    async addRun(run) {
      db.runs.push({ id: crypto.randomUUID(), createdAt: now(), ...run });
      persist();
    },
    async listRuns() {
      return clone(db.runs);
    },
  };
}
