// AI proxy. Uses OpenAI only when OPENAI_API_KEY is set; otherwise a deterministic offline explainer.
// Both modes are restricted to dataset content: eligibility comes from the rules engine, never from the model.
import { evaluateMember } from './engine.js';

const T = {
  en: {
    status: { eligible: 'eligible', likely: 'likely eligible (some information is missing)', 'not-eligible': 'not eligible' },
    for: 'For', benefits: 'Benefits', documents: 'Documents needed', apply: 'How to apply', site: 'Official site',
    verified: 'Last verified', demo: 'demo-curated data, not live', check: 'Checklist', need: 'need info', deadline: 'Deadline',
    noMatch: 'I can only answer from the scheme dataset, and I found nothing relevant to that question. Try naming a scheme, a category (for example farmer, health, education) or asking about documents, benefits or how to apply.',
    related: 'Closest schemes in the dataset',
  },
  ta: {
    status: { eligible: 'தகுதி உள்ளது', likely: 'தகுதி இருக்கலாம் (சில தகவல்கள் இல்லை)', 'not-eligible': 'தகுதி இல்லை' },
    for: 'உறுப்பினர்', benefits: 'பலன்கள்', documents: 'தேவையான ஆவணங்கள்', apply: 'விண்ணப்பிக்கும் முறை', site: 'அதிகாரப்பூர்வ இணையதளம்',
    verified: 'கடைசியாகச் சரிபார்த்த தேதி', demo: 'மாதிரித் தரவு, நேரடித் தரவு அல்ல', check: 'சரிபார்ப்புப் பட்டியல்', need: 'தகவல் தேவை', deadline: 'கடைசி தேதி',
    noMatch: 'திட்டத் தரவுத்தொகுப்பில் இருந்து மட்டுமே என்னால் பதிலளிக்க முடியும்; இந்தக் கேள்விக்குத் தொடர்புடையது எதுவும் கிடைக்கவில்லை. ஒரு திட்டத்தின் பெயர், வகை (எ.கா. விவசாயம், சுகாதாரம், கல்வி) அல்லது ஆவணங்கள், பலன்கள், விண்ணப்பிக்கும் முறை பற்றிக் கேளுங்கள்.',
    related: 'தரவுத்தொகுப்பில் மிக நெருங்கிய திட்டங்கள்',
  },
};

const pick = (obj, lang) => (obj && (obj[lang] || obj.en)) || '';
const list = (obj, lang) => (obj?.[lang]?.length ? obj[lang] : obj?.en) || [];

function checklistLines(checks, lang) {
  const t = T[lang];
  return checks.map((c) => `${c.result === 'met' ? '✓' : c.result === 'unmet' ? '✗' : '?'} ${pick(c.label, lang)}${c.result === 'unknown' ? ` (${t.need})` : ''}`);
}

const DOC_TA = {
  'Aadhaar card': 'ஆதார் அட்டை', 'Bank passbook (Aadhaar-linked)': 'வங்கி பாஸ்புக் (ஆதார் இணைக்கப்பட்டது)',
  'Land ownership records (patta/chitta)': 'நில உரிமைப் பதிவுகள் (பட்டா/சிட்டா)', 'Mobile number': 'கைபேசி எண்',
  'Bank passbook': 'வங்கி பாஸ்புக்', 'Land records or tenancy/lease agreement': 'நிலப் பதிவுகள் அல்லது குத்தகை ஒப்பந்தம்',
  'Sowing declaration': 'விதைப்பு அறிவிப்பு', 'Land records': 'நிலப் பதிவுகள்', 'Passport-size photo': 'பாஸ்போர்ட் அளவு புகைப்படம்',
  'Bank account details': 'வங்கிக் கணக்கு விவரங்கள்', 'BPL card or ration card': 'வறுமைக்கோட்டுக் கீழ் அட்டை அல்லது குடும்ப அட்டை',
  "Girl child's birth certificate": 'பெண் குழந்தையின் பிறப்புச் சான்றிதழ்', 'Parent/guardian Aadhaar and address proof': 'பெற்றோர்/பாதுகாவலரின் ஆதார் மற்றும் முகவரிச் சான்று',
  'Passport-size photos': 'பாஸ்போர்ட் அளவு புகைப்படங்கள்', 'Age proof': 'வயதுச் சான்று', 'BPL card or income certificate': 'வறுமைக்கோட்டுக் கீழ் அட்டை அல்லது வருமானச் சான்றிதழ்',
  'Ration card': 'குடும்ப அட்டை', 'Job card (if any)': 'வேலை அட்டை (இருந்தால்)', 'Land/site ownership proof': 'நிலம்/மனை உரிமைச் சான்று',
  'Bank/post office account details': 'வங்கி/அஞ்சலகக் கணக்கு விவரங்கள்', 'OBC caste certificate': 'பிற்படுத்தப்பட்டோர் சாதிச் சான்றிதழ்',
  'Income certificate': 'வருமானச் சான்றிதழ்', 'School bonafide certificate': 'பள்ளி மாணவர் சான்றிதழ்', 'Class 12 marksheet': '12-ஆம் வகுப்பு மதிப்பெண் சான்றிதழ்',
  'College admission proof': 'கல்லூரி சேர்க்கைச் சான்று', 'Class 8 marksheet': '8-ஆம் வகுப்பு மதிப்பெண் சான்றிதழ்', 'School certificate': 'பள்ளிச் சான்றிதழ்',
  'Disability certificate / UDID card': 'மாற்றுத்திறனாளிச் சான்றிதழ் / UDID அட்டை', 'Income proof': 'வருமானச் சான்று',
  'Disability certificate (80% or more)': 'மாற்றுத்திறனாளிச் சான்றிதழ் (80% அல்லது அதற்கு மேல்)', 'BPL card': 'வறுமைக்கோட்டுக் கீழ் அட்டை',
  'Aadhaar card or other officially valid ID': 'ஆதார் அட்டை அல்லது பிற அதிகாரப்பூர்வ அடையாள அட்டை', 'Savings bank account': 'சேமிப்பு வங்கிக் கணக்கு',
  'Consent for auto-debit': 'தானியங்கி பற்றுக்கான ஒப்புதல்', 'Class 6–12 government school study certificate': '6–12 வகுப்பு அரசுப் பள்ளிப் படிப்புச் சான்றிதழ்',
  'College admission/bonafide proof': 'கல்லூரி சேர்க்கை/மாணவர் சான்று', 'Family (ration) card': 'குடும்ப (ரேஷன்) அட்டை',
  'Income certificate from Village Administrative Officer': 'கிராம நிர்வாக அலுவலரிடம் பெற்ற வருமானச் சான்றிதழ்', 'Land records (patta/chitta)': 'நிலப் பதிவுகள் (பட்டா/சிட்டா)',
  'Site patta / land document': 'மனைப் பட்டா / நில ஆவணம்', 'College ID or education certificate': 'கல்லூரி அடையாள அட்டை அல்லது கல்விச் சான்றிதழ்',
  'Mobile number and email': 'கைபேசி எண் மற்றும் மின்னஞ்சல்',
};
const docName = (d, lang) => (lang === 'ta' && DOC_TA[d]) || d;

function sections(scheme, lang, want) {
  const t = T[lang];
  const out = [];
  if (want.benefits) out.push(`${t.benefits}:\n${list(scheme.benefits, lang).map((b) => `• ${b}`).join('\n')}`);
  if (want.documents) out.push(`${t.documents}: ${(scheme.documents || []).map((d) => docName(d, lang)).join(', ')}`);
  if (want.apply) out.push(`${t.apply}:\n${list(scheme.howToApply, lang).map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
  if (want.deadline && scheme.deadline) out.push(`${t.deadline}: ${scheme.deadline}`);
  return out;
}

const footer = (scheme, lang) => {
  const t = T[lang];
  return `${t.site}: ${scheme.officialUrl || '-'} · ${t.verified}: ${scheme.lastVerified} (${t.demo})`;
};

/** Deterministic explainer: composes text only from the scheme's own fields (+ engine result when a member is given). */
export function explainOffline(scheme, { lang = 'en', member, household } = {}) {
  const t = T[lang];
  const parts = [`${pick(scheme.name, lang)} — ${pick(scheme.summary, lang)}`];
  if (member) {
    const ev = evaluateMember(member, household, scheme);
    parts.push(`${t.for} ${member.name}: ${t.status[ev.status]}.\n${t.check}:\n${checklistLines(ev.checks, lang).join('\n')}`);
  }
  parts.push(...sections(scheme, lang, { benefits: true, documents: true, apply: true, deadline: true }));
  parts.push(footer(scheme, lang));
  return parts.join('\n\n');
}

// ---- retrieval for /ai/ask ----
const STOP = new Set('a an the is are of for to in on and or how what which who can do does i my me we our about tell with from this that scheme schemes'.split(' '));
const stem = (w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
const tokens = (s) => String(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);

function haystack(scheme) {
  const both = (o) => [o?.en, o?.ta].flat().filter(Boolean).join(' ');
  const rules = (scheme.rules || []).map((r) => both(r.label)).join(' ');
  return {
    strong: tokens([both(scheme.name), scheme.id.replace(/-/g, ' ')].join(' ')),
    mid: tokens([scheme.category, scheme.ministry, scheme.state, scheme.level].filter(Boolean).join(' ')),
    weak: tokens([both(scheme.summary), (scheme.benefits?.en || []).concat(scheme.benefits?.ta || []).join(' '), (scheme.documents || []).join(' '), rules].join(' ')),
  };
}

export function retrieve(question, schemes, limit = 3) {
  const q = tokens(question);
  if (q.length === 0) return [];
  const scored = [];
  for (const s of schemes) {
    const h = haystack(s);
    let score = 0;
    for (const w of q) {
      if (h.strong.includes(w)) score += 4;
      if (h.mid.includes(w)) score += 3;
      if (h.weak.includes(w)) score += 1;
    }
    if (score > 0) scored.push({ s, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.s);
}

const INTENT = {
  documents: /document|paper|proof|certificate|ஆவண/i,
  apply: /\bapply|application|register|how to|process|விண்ணப்/i,
  benefits: /benefit|amount|money|get|receive|pension|cover|பலன்|தொகை/i,
  deadline: /deadline|last date|due|closing|கடைசி/i,
  eligibility: /eligib|qualif|who can|rules?|criteria|தகுதி/i,
};

export function askOffline(question, schemes, { lang = 'en', schemeId } = {}) {
  const t = T[lang];
  const pool = schemeId ? schemes.filter((s) => s.id === schemeId) : retrieve(question, schemes);
  if (pool.length === 0) return { text: t.noMatch, citedSchemeIds: [] };
  const want = Object.fromEntries(Object.entries(INTENT).map(([k, re]) => [k, re.test(question)]));
  const none = !Object.values(want).some(Boolean);
  const blocks = pool.map((s) => {
    const lines = [`${pick(s.name, lang)} — ${pick(s.summary, lang)}`];
    lines.push(...sections(s, lang, none ? { benefits: true } : want));
    if (want.eligibility) lines.push(`${t.check}:\n${(s.rules || []).map((r) => `• ${pick(r.label, lang)}`).join('\n')}`);
    lines.push(footer(s, lang));
    return lines.join('\n\n');
  });
  const head = schemeId ? '' : `${t.related}:\n\n`;
  return { text: head + blocks.join('\n\n———\n\n'), citedSchemeIds: pool.map((s) => s.id) };
}

// ---- OpenAI (optional) ----
async function chatOpenAI(config, messages) {
  const body = { model: config.openaiModel, messages, temperature: 0.2, response_format: { type: 'json_object' } };
  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: config.openaiKey });
    const r = await client.chat.completions.create(body);
    return r.choices[0].message.content;
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.openaiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    return (await res.json()).choices[0].message.content;
  }
}

const SYSTEM = (lang) =>
  `You explain Indian government welfare scheme data in simple, plain ${lang === 'ta' ? 'Tamil' : 'English'}. ` +
  'Use ONLY the JSON facts provided in the user message. Never invent amounts, dates, URLs, documents or eligibility rules; ' +
  'if something is not in the facts, say it is not in the data. Do not decide eligibility yourself: repeat the engine checklist if one is given. ' +
  'Reply as JSON: {"text": string, "citedSchemeIds": string[]} where citedSchemeIds are ids from the facts you used.';

const compact = (s) => ({
  id: s.id, name: s.name, ministry: s.ministry, category: s.category, summary: s.summary, benefits: s.benefits,
  documents: s.documents, howToApply: s.howToApply, officialUrl: s.officialUrl, deadline: s.deadline, lastVerified: s.lastVerified,
  rules: (s.rules || []).map((r) => r.label),
});

export function makeAi(config, log = console) {
  const live = Boolean(config.openaiKey);

  async function viaOpenAI(lang, facts, instruction, allowedIds) {
    const raw = await chatOpenAI(config, [
      { role: 'system', content: SYSTEM(lang) },
      { role: 'user', content: `${instruction}\n\nFACTS:\n${JSON.stringify(facts)}` },
    ]);
    const parsed = JSON.parse(raw);
    if (typeof parsed.text !== 'string' || !parsed.text.trim()) throw new Error('empty model answer');
    const cited = (Array.isArray(parsed.citedSchemeIds) ? parsed.citedSchemeIds : []).filter((id) => allowedIds.includes(id));
    return { text: parsed.text.trim(), citedSchemeIds: cited.length ? cited : allowedIds };
  }

  return {
    mode: live ? 'openai' : 'offline',
    async explain({ scheme, lang, member, household }) {
      if (live) {
        try {
          const ev = member ? evaluateMember(member, household, scheme) : null;
          const facts = { scheme: compact(scheme), engineResult: ev && { member: member.name, status: ev.status, checks: ev.checks } };
          const r = await viaOpenAI(lang, facts, 'Explain this scheme to a family. Include benefits, documents and how to apply.', [scheme.id]);
          return { mode: 'openai', text: r.text };
        } catch (e) {
          log.warn?.(`[ai] OpenAI explain failed, using offline explainer: ${e.message}`);
        }
      }
      return { mode: 'offline', text: explainOffline(scheme, { lang, member, household }) };
    },
    async ask({ question, schemes, lang, schemeId }) {
      const pool = schemeId ? schemes.filter((s) => s.id === schemeId) : retrieve(question, schemes, 5);
      if (live && pool.length) {
        try {
          const r = await viaOpenAI(lang, { schemes: pool.map(compact) }, `Question: ${question}`, pool.map((s) => s.id));
          return { mode: 'openai', ...r };
        } catch (e) {
          log.warn?.(`[ai] OpenAI ask failed, using offline answer: ${e.message}`);
        }
      }
      return { mode: 'offline', ...askOffline(question, schemes, { lang, schemeId }) };
    },
  };
}
