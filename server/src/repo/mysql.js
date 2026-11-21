// "mysql" driver (mysql2). Used only when MYSQL_URL is set. Same interface as the local driver.
// NOTE: written against db/schema.sql; not exercised in the offline demo (no MySQL on the build machine).
import crypto from 'node:crypto';

const J = (v) => JSON.stringify(v ?? null);
const P = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
const iso = (d) => (d ? new Date(d).toISOString() : null);
const dateOnly = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const sqlDate = (iso8601) => (iso8601 ? new Date(iso8601) : null);
const b = (v) => (v === null || v === undefined ? null : v ? 1 : 0);
const fromB = (v) => (v === null || v === undefined ? null : !!v);

const rowUser = (r) =>
  r && { id: r.id, name: r.name, email: r.email, passwordHash: r.password_hash, role: r.role, fcmToken: r.fcm_token, createdAt: iso(r.created_at) };

const rowHousehold = (r) =>
  r && {
    id: r.id, userId: r.user_id, state: r.state, district: r.district, annualIncome: r.annual_income, familySize: r.family_size,
    area: r.area, category: r.category, bplCard: fromB(r.bpl_card), ownsHouse: fromB(r.owns_house), rationCard: fromB(r.ration_card),
    updatedAt: iso(r.updated_at),
  };

const rowMember = (r) =>
  r && {
    id: r.id, userId: r.user_id, name: r.name, relation: r.relation, age: r.age, gender: r.gender, occupation: r.occupation,
    education: r.education, isStudent: fromB(r.is_student), studyLevel: r.study_level,
    landHoldingAcres: r.land_holding_acres === null ? null : Number(r.land_holding_acres), isWidow: fromB(r.is_widow),
    hasDisability: fromB(r.has_disability), disabilityPercent: r.disability_percent, consentGiven: fromB(r.consent_given),
    sensitiveConsent: fromB(r.sensitive_consent), createdAt: iso(r.created_at),
  };

export async function createMysqlRepo({ url }) {
  const mysql = await import('mysql2/promise');
  const pool = mysql.createPool({ uri: url, connectionLimit: 10, dateStrings: false });
  const q = async (sql, args = []) => (await pool.query(sql, args))[0];
  const one = async (sql, args) => (await q(sql, args))[0];

  async function hydrateScheme(r) {
    if (!r) return undefined;
    const rules = await q('SELECT * FROM scheme_rules WHERE scheme_id=? ORDER BY position', [r.id]);
    return {
      id: r.id, name: { en: r.name_en, ta: r.name_ta }, ministry: r.ministry, level: r.level, state: r.state, category: r.category,
      summary: P(r.summary), benefits: P(r.benefits), documents: P(r.documents), howToApply: P(r.how_to_apply),
      officialUrl: r.official_url, sourceUrl: r.source_url, lastVerified: dateOnly(r.last_verified), dataStatus: r.data_status,
      deadline: dateOnly(r.deadline), origin: r.origin, adminEdited: !!r.admin_edited, addedAt: iso(r.added_at),
      rules: rules.map((x) => ({ id: x.id, field: x.field, op: x.op, value: P(x.value), label: { en: x.label_en, ta: x.label_ta } })),
    };
  }

  async function hydrateTracker(r) {
    if (!r) return undefined;
    const hist = await q('SELECT status, at FROM tracker_history WHERE tracker_id=? ORDER BY id', [r.id]);
    return {
      id: r.id, userId: r.user_id, schemeId: r.scheme_id, memberId: r.member_id, status: r.status, notes: r.notes,
      documentsDone: P(r.documents_done) || [], reminderAt: iso(r.reminder_at), createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
      history: hist.map((h) => ({ status: h.status, at: iso(h.at) })),
    };
  }

  const rowNote = (r) =>
    r && { id: r.id, userId: r.user_id, kind: r.kind, key: r.key_text, schemeId: r.scheme_id, title: P(r.title), body: P(r.body),
      read: !!r.read_at, readAt: iso(r.read_at), createdAt: iso(r.created_at) };

  return {
    driver: 'mysql',
    async init() {
      await q('SELECT 1');
    },
    async close() {
      await pool.end();
    },

    async countUsers() {
      return (await one('SELECT COUNT(*) AS c FROM users')).c;
    },
    async findUserByEmail(email) {
      return rowUser(await one('SELECT * FROM users WHERE email=?', [email]));
    },
    async findUserById(id) {
      return rowUser(await one('SELECT * FROM users WHERE id=?', [id]));
    },
    async createUser(u) {
      const id = crypto.randomUUID();
      await q('INSERT INTO users (id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)', [
        id, u.name, u.email, u.passwordHash, u.role || 'user', u.createdAt ? new Date(u.createdAt) : new Date(),
      ]);
      return rowUser(await one('SELECT * FROM users WHERE id=?', [id]));
    },
    async updateUser(id, patch) {
      if (patch.fcmToken !== undefined) await q('UPDATE users SET fcm_token=? WHERE id=?', [patch.fcmToken, id]);
      return rowUser(await one('SELECT * FROM users WHERE id=?', [id]));
    },

    async getHousehold(userId) {
      return rowHousehold(await one('SELECT * FROM households WHERE user_id=?', [userId]));
    },
    async upsertHousehold(userId, d) {
      const cur = await one('SELECT * FROM households WHERE user_id=?', [userId]);
      const m = { ...rowHousehold(cur), ...d };
      if (!cur) {
        await q(
          'INSERT INTO households (id,user_id,state,district,annual_income,family_size,area,category,bpl_card,owns_house,ration_card) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [crypto.randomUUID(), userId, m.state ?? null, m.district ?? null, m.annualIncome ?? null, m.familySize ?? null, m.area ?? null, m.category ?? null, b(m.bplCard), b(m.ownsHouse), b(m.rationCard)],
        );
      } else {
        await q(
          'UPDATE households SET state=?,district=?,annual_income=?,family_size=?,area=?,category=?,bpl_card=?,owns_house=?,ration_card=? WHERE user_id=?',
          [m.state ?? null, m.district ?? null, m.annualIncome ?? null, m.familySize ?? null, m.area ?? null, m.category ?? null, b(m.bplCard), b(m.ownsHouse), b(m.rationCard), userId],
        );
      }
      return rowHousehold(await one('SELECT * FROM households WHERE user_id=?', [userId]));
    },

    async listMembers(userId) {
      return (await q('SELECT * FROM members WHERE user_id=? ORDER BY created_at, id', [userId])).map(rowMember);
    },
    async getMember(userId, id) {
      return rowMember(await one('SELECT * FROM members WHERE user_id=? AND id=?', [userId, id]));
    },
    async createMember(userId, m) {
      const h = await one('SELECT id FROM households WHERE user_id=?', [userId]);
      const id = crypto.randomUUID();
      await q(
        `INSERT INTO members (id,household_id,user_id,name,relation,age,gender,occupation,education,is_student,study_level,land_holding_acres,is_widow,has_disability,disability_percent,consent_given,sensitive_consent)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, h?.id ?? null, userId, m.name, m.relation, m.age, m.gender, m.occupation, m.education, b(m.isStudent), m.studyLevel ?? null,
          m.landHoldingAcres ?? null, b(m.isWidow), b(m.hasDisability), m.disabilityPercent ?? null, b(m.consentGiven), b(m.sensitiveConsent)],
      );
      return rowMember(await one('SELECT * FROM members WHERE id=?', [id]));
    },
    async updateMember(userId, id, patch) {
      const cur = await one('SELECT * FROM members WHERE user_id=? AND id=?', [userId, id]);
      if (!cur) return undefined;
      const m = { ...rowMember(cur), ...patch };
      await q(
        `UPDATE members SET name=?,relation=?,age=?,gender=?,occupation=?,education=?,is_student=?,study_level=?,land_holding_acres=?,is_widow=?,has_disability=?,disability_percent=?,consent_given=?,sensitive_consent=? WHERE user_id=? AND id=?`,
        [m.name, m.relation, m.age, m.gender, m.occupation, m.education, b(m.isStudent), m.studyLevel ?? null, m.landHoldingAcres ?? null,
          b(m.isWidow), b(m.hasDisability), m.disabilityPercent ?? null, b(m.consentGiven), b(m.sensitiveConsent), userId, id],
      );
      return rowMember(await one('SELECT * FROM members WHERE id=?', [id]));
    },
    async deleteMember(userId, id) {
      const r = await pool.query('DELETE FROM members WHERE user_id=? AND id=?', [userId, id]);
      return r[0].affectedRows > 0;
    },

    async listSchemes() {
      const rows = await q('SELECT * FROM schemes ORDER BY id');
      return Promise.all(rows.map(hydrateScheme));
    },
    async getScheme(id) {
      return hydrateScheme(await one('SELECT * FROM schemes WHERE id=?', [id]));
    },
    async saveScheme(s) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(
          `REPLACE INTO schemes (id,name_en,name_ta,ministry,level,state,category,summary,benefits,documents,how_to_apply,official_url,source_url,last_verified,data_status,deadline,origin,admin_edited,added_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [s.id, s.name.en, s.name.ta || '', s.ministry || '', s.level, s.state ?? null, s.category, J(s.summary), J(s.benefits), J(s.documents),
            J(s.howToApply), s.officialUrl ?? null, s.sourceUrl ?? null, s.lastVerified || null, s.dataStatus || 'demo-curated', s.deadline ?? null,
            s.origin || 'file', s.adminEdited ? 1 : 0, s.addedAt ? new Date(s.addedAt) : new Date()],
        );
        await conn.query('DELETE FROM scheme_rules WHERE scheme_id=?', [s.id]);
        for (const [i, r] of (s.rules || []).entries()) {
          await conn.query('INSERT INTO scheme_rules (scheme_id,id,position,field,op,value,label_en,label_ta) VALUES (?,?,?,?,?,?,?,?)', [
            s.id, r.id, i, r.field, r.op, J(r.value), r.label?.en || '', r.label?.ta || '',
          ]);
        }
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
      return s;
    },
    async deleteScheme(id) {
      return (await pool.query('DELETE FROM schemes WHERE id=?', [id]))[0].affectedRows > 0;
    },

    async listCategories() {
      return (await q('SELECT * FROM categories ORDER BY id')).map((r) => ({ id: r.id, label: { en: r.label_en, ta: r.label_ta } }));
    },
    async saveCategory(c) {
      await q('REPLACE INTO categories (id,label_en,label_ta) VALUES (?,?,?)', [c.id, c.label.en, c.label.ta]);
    },

    async listTracker(userId) {
      return Promise.all((await q('SELECT * FROM tracker_items WHERE user_id=? ORDER BY created_at', [userId])).map(hydrateTracker));
    },
    async getTracker(userId, id) {
      return hydrateTracker(await one('SELECT * FROM tracker_items WHERE user_id=? AND id=?', [userId, id]));
    },
    async findTracker(userId, schemeId, memberId) {
      return hydrateTracker(await one('SELECT * FROM tracker_items WHERE user_id=? AND scheme_id=? AND member_id=?', [userId, schemeId, memberId]));
    },
    async createTracker(item) {
      const id = crypto.randomUUID();
      await q('INSERT INTO tracker_items (id,user_id,scheme_id,member_id,status,notes,documents_done,reminder_at) VALUES (?,?,?,?,?,?,?,?)', [
        id, item.userId, item.schemeId, item.memberId, item.status, item.notes || '', J(item.documentsDone || []), sqlDate(item.reminderAt),
      ]);
      for (const h of item.history || []) await q('INSERT INTO tracker_history (tracker_id,status,at) VALUES (?,?,?)', [id, h.status, new Date(h.at)]);
      return hydrateTracker(await one('SELECT * FROM tracker_items WHERE id=?', [id]));
    },
    async updateTracker(userId, id, patch, historyEntry) {
      const cur = await one('SELECT * FROM tracker_items WHERE user_id=? AND id=?', [userId, id]);
      if (!cur) return undefined;
      const m = { status: cur.status, notes: cur.notes, documentsDone: P(cur.documents_done) || [], reminderAt: iso(cur.reminder_at), ...patch };
      await q('UPDATE tracker_items SET status=?,notes=?,documents_done=?,reminder_at=? WHERE id=?', [m.status, m.notes, J(m.documentsDone), sqlDate(m.reminderAt), id]);
      if (historyEntry) await q('INSERT INTO tracker_history (tracker_id,status,at) VALUES (?,?,?)', [id, historyEntry.status, new Date(historyEntry.at)]);
      return hydrateTracker(await one('SELECT * FROM tracker_items WHERE id=?', [id]));
    },

    async listNotifications(userId) {
      return (await q('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC', [userId])).map(rowNote);
    },
    async createNotificationIfNew(n) {
      const id = crypto.randomUUID();
      const r = (
        await pool.query('INSERT IGNORE INTO notifications (id,user_id,kind,key_text,scheme_id,title,body) VALUES (?,?,?,?,?,?,?)', [
          id, n.userId, n.kind, n.key, n.schemeId ?? null, J(n.title), J(n.body),
        ])
      )[0];
      return r.affectedRows ? rowNote(await one('SELECT * FROM notifications WHERE id=?', [id])) : null;
    },
    async markNotificationRead(userId, id) {
      await q('UPDATE notifications SET read_at=COALESCE(read_at, NOW(3)) WHERE user_id=? AND id=?', [userId, id]);
      return rowNote(await one('SELECT * FROM notifications WHERE user_id=? AND id=?', [userId, id]));
    },

    async addRun(run) {
      await q('INSERT INTO recommendation_runs (id,user_id,state,member_count,eligible_count,likely_count,matches) VALUES (?,?,?,?,?,?,?)', [
        crypto.randomUUID(), run.userId ?? null, run.state ?? null, run.memberCount, run.eligibleCount, run.likelyCount, J(run.matches),
      ]);
    },
    async listRuns() {
      return (await q('SELECT * FROM recommendation_runs')).map((r) => ({
        id: r.id, userId: r.user_id, state: r.state, memberCount: r.member_count, eligibleCount: r.eligible_count,
        likelyCount: r.likely_count, matches: P(r.matches) || [], createdAt: iso(r.created_at),
      }));
    },
  };
}
