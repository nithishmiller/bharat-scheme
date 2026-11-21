import fs from 'node:fs';
import { CATEGORY_IDS } from './validate.js';

export const CATEGORY_LABELS = {
  education: { en: 'Education', ta: 'கல்வி' },
  farmer: { en: 'Farmers', ta: 'விவசாயம்' },
  women: { en: 'Women', ta: 'பெண்கள்' },
  children: { en: 'Children', ta: 'குழந்தைகள்' },
  senior: { en: 'Senior citizens', ta: 'முதியோர்' },
  health: { en: 'Health', ta: 'சுகாதாரம்' },
  housing: { en: 'Housing', ta: 'வீட்டுவசதி' },
  employment: { en: 'Employment', ta: 'வேலைவாய்ப்பு' },
  disability: { en: 'Disability', ta: 'மாற்றுத்திறனாளிகள்' },
  financial: { en: 'Financial inclusion', ta: 'நிதி' },
};

/** Read server/data/schemes.json; fall back to schemes.stub.json only if the main file is missing/invalid. */
export function loadSchemeFile(config, log = console) {
  for (const [file, isStub] of [[config.schemesPath, false], [config.schemesStubPath, true]]) {
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(data) || data.length === 0) throw new Error('not a non-empty array');
      if (isStub) log.warn?.(`[schemes] ${config.schemesPath} missing or invalid; using stub (${data.length} schemes)`);
      return { schemes: data, source: file, isStub };
    } catch (e) {
      log.warn?.(`[schemes] could not read ${file}: ${e.message}`);
    }
  }
  return { schemes: [], source: null, isStub: true };
}

/** Upsert file schemes into the repo. File-origin rows follow the file; admin edits/creations are kept. */
export async function syncSchemes(repo, config, log = console) {
  const { schemes, source, isStub } = loadSchemeFile(config, log);
  const existing = await repo.listSchemes();
  const byId = new Map(existing.map((s) => [s.id, s]));
  const fileIds = new Set();
  for (const s of schemes) {
    if (!s?.id || !s.name?.en) continue;
    fileIds.add(s.id);
    const cur = byId.get(s.id);
    if (cur?.adminEdited || cur?.origin === 'admin') continue;
    await repo.saveScheme({ ...s, origin: 'file', adminEdited: false, addedAt: cur?.addedAt || new Date().toISOString() });
  }
  for (const cur of existing) {
    if (cur.origin === 'file' && !fileIds.has(cur.id)) await repo.deleteScheme(cur.id);
  }
  for (const id of CATEGORY_IDS) await repo.saveCategory({ id, label: CATEGORY_LABELS[id] });
  return { count: schemes.length, source, isStub };
}

export const publicScheme = ({ origin, adminEdited, addedAt, ...s }) => s;
