import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { API } from '../api/client.js';
import { useAsync, listOf } from '../lib/useAsync.js';
import { Empty, ErrorBox, PageHead, Skeleton } from '../components/Common.jsx';
import { Icon } from '../components/Brand.jsx';

const FIELDS = ['state', 'district', 'annualIncome', 'familySize', 'area', 'category', 'bplCard', 'ownsHouse', 'rationCard', 'age', 'gender', 'occupation', 'education', 'isStudent', 'studyLevel', 'landHoldingAcres', 'isWidow', 'hasDisability', 'disabilityPercent'];
const OPS = ['eq', 'neq', 'lte', 'gte', 'lt', 'gt', 'in', 'true', 'false'];
const CATS = ['education', 'farmer', 'women', 'senior', 'health', 'housing', 'employment', 'disability', 'financial'];
const blank = () => ({
  id: '', name: { en: '', ta: '' }, ministry: '', level: 'central', state: null, category: 'financial', summary: { en: '', ta: '' },
  benefits: { en: [], ta: [] }, documents: [], howToApply: { en: [], ta: [] }, officialUrl: '', sourceUrl: null,
  lastVerified: new Date().toISOString().slice(0, 10), dataStatus: 'demo-curated', deadline: null, rules: [],
});
const lines = (a) => (a || []).join('\n');
const toLines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const valueText = (r) => (Array.isArray(r.value) ? r.value.join(', ') : r.value ?? '');
function parseValue(op, text) {
  if (op === 'true' || op === 'false') return null;
  if (op === 'in') return text.split(',').map((x) => x.trim()).filter(Boolean);
  if (text === 'true') return true; if (text === 'false') return false;
  return text !== '' && !isNaN(Number(text)) ? Number(text) : text;
}

function RulesEditor({ rules, onChange }) {
  const { t } = useI18n();
  const upd = (i, patch) => onChange(rules.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <fieldset>
      <legend>{t('adm.rules')}</legend>
      {rules.map((r, i) => (
        <div className="rule-row" key={i} role="group" aria-label={`${t('adm.rule')} ${i + 1}`}>
          <select aria-label={t('adm.field')} value={r.field} onChange={(e) => upd(i, { field: e.target.value })}>{FIELDS.map((f) => <option key={f}>{f}</option>)}</select>
          <select aria-label={t('adm.op')} value={r.op} onChange={(e) => upd(i, { op: e.target.value, value: parseValue(e.target.value, valueText(r)) })}>{OPS.map((o) => <option key={o}>{o}</option>)}</select>
          <input aria-label={t('adm.value')} placeholder={t('adm.value')} disabled={r.op === 'true' || r.op === 'false'} value={valueText(r)} onChange={(e) => upd(i, { value: parseValue(r.op, e.target.value) })} />
          <input aria-label={t('adm.labelEn')} placeholder={t('adm.labelEn')} value={r.label?.en || ''} onChange={(e) => upd(i, { label: { ...r.label, en: e.target.value } })} />
          <input aria-label={t('adm.labelTa')} placeholder={t('adm.labelTa')} lang="ta" value={r.label?.ta || ''} onChange={(e) => upd(i, { label: { ...r.label, ta: e.target.value } })} />
          <button type="button" className="btn sm danger" onClick={() => onChange(rules.filter((_, j) => j !== i))} aria-label={`${t('common.remove')} ${t('adm.rule')} ${i + 1}`}><Icon name="close" size={14} /></button>
        </div>
      ))}
      <button type="button" className="btn sm" onClick={() => onChange([...rules, { id: `r${rules.length + 1}`, field: 'age', op: 'gte', value: 18, label: { en: '', ta: '' } }])}>+ {t('adm.addRule')}</button>
    </fieldset>
  );
}

function SchemeForm({ initial, isNew, onDone, onCancel }) {
  const { t } = useI18n();
  const [s, setS] = useState(initial);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const setL = (k, lang, v) => setS((x) => ({ ...x, [k]: { ...x[k], [lang]: v } }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const body = { ...s, rules: s.rules.map((r, i) => ({ ...r, id: r.id || `r${i + 1}` })), state: s.level === 'state' ? s.state || null : null, deadline: s.deadline || null, sourceUrl: s.sourceUrl || null };
    try { await API.adminSave(body, isNew); onDone(); } catch (x) { setErr(x); setBusy(false); }
  };
  const L2 = (label, k, ta) => (
    <div className="grid2">
      <div className="field"><label htmlFor={`f-${k}-en`}>{label} (EN)</label>{ta === 'area' ? <textarea id={`f-${k}-en`} value={lines(s[k].en)} onChange={(e) => setL(k, 'en', toLines(e.target.value))} /> : <input id={`f-${k}-en`} type="text" value={s[k].en} onChange={(e) => setL(k, 'en', e.target.value)} />}</div>
      <div className="field"><label htmlFor={`f-${k}-ta`}>{label} (தமிழ்)</label>{ta === 'area' ? <textarea id={`f-${k}-ta`} lang="ta" value={lines(s[k].ta)} onChange={(e) => setL(k, 'ta', toLines(e.target.value))} /> : <input id={`f-${k}-ta`} lang="ta" type="text" value={s[k].ta} onChange={(e) => setL(k, 'ta', e.target.value)} />}</div>
    </div>
  );
  return (
    <form className="panel" onSubmit={submit} aria-label={isNew ? t('adm.new') : t('common.edit')}>
      <h2 style={{ marginBottom: 14 }}>{isNew ? t('adm.new') : `${t('common.edit')}: ${initial.name.en}`}</h2>
      <div className="grid3">
        <div className="field"><label htmlFor="f-id">ID</label><input id="f-id" type="text" required pattern="[a-z0-9-]+" disabled={!isNew} value={s.id} onChange={(e) => set('id', e.target.value)} /><span className="hint">{t('adm.idHint')}</span></div>
        <div className="field"><label htmlFor="f-cat">{t('adm.category')}</label><select id="f-cat" value={s.category} onChange={(e) => set('category', e.target.value)}>{CATS.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}</select></div>
        <div className="field"><label htmlFor="f-lvl">{t('det.level')}</label><select id="f-lvl" value={s.level} onChange={(e) => set('level', e.target.value)}><option value="central">{t('level.central')}</option><option value="state">{t('level.state')}</option></select></div>
      </div>
      {L2(t('adm.name'), 'name')}
      {L2(t('adm.summary'), 'summary')}
      <div className="grid2">
        <div className="field"><label htmlFor="f-min">{t('det.ministry')}</label><input id="f-min" type="text" value={s.ministry} onChange={(e) => set('ministry', e.target.value)} /></div>
        {s.level === 'state' && <div className="field"><label htmlFor="f-state">{t('f.state')}</label><input id="f-state" type="text" value={s.state || ''} onChange={(e) => set('state', e.target.value)} /></div>}
        <div className="field"><label htmlFor="f-url">{t('adm.officialUrl')}</label><input id="f-url" type="url" required value={s.officialUrl} onChange={(e) => set('officialUrl', e.target.value)} /></div>
        <div className="field"><label htmlFor="f-src">{t('adm.sourceUrl')}</label><input id="f-src" type="url" value={s.sourceUrl || ''} onChange={(e) => set('sourceUrl', e.target.value)} /></div>
        <div className="field"><label htmlFor="f-dl">{t('det.deadline')}</label><input id="f-dl" type="date" value={s.deadline || ''} onChange={(e) => set('deadline', e.target.value)} /></div>
        <div className="field"><label htmlFor="f-ver">{t('det.verified')}</label><input id="f-ver" type="date" value={s.lastVerified || ''} onChange={(e) => set('lastVerified', e.target.value)} /></div>
      </div>
      {L2(t('det.benefits'), 'benefits', 'area')}
      {L2(t('det.how'), 'howToApply', 'area')}
      <div className="field"><label htmlFor="f-docs">{t('det.documents')} ({t('adm.onePerLine')})</label><textarea id="f-docs" value={lines(s.documents)} onChange={(e) => set('documents', toLines(e.target.value))} /></div>
      <RulesEditor rules={s.rules} onChange={(r) => set('rules', r)} />
      {err && <div style={{ margin: '12px 0' }}><ErrorBox error={err} /></div>}
      <div className="row" style={{ marginTop: 14 }}><button className="btn primary" disabled={busy}>{busy ? t('common.wait') : t('common.save')}</button><button type="button" className="btn ghost" onClick={onCancel}>{t('common.cancel')}</button></div>
    </form>
  );
}

function Bars({ title, rows }) {
  const { t } = useI18n();
  const max = Math.max(1, ...rows.map((r) => r.v));
  const W = 260, H = 14;
  return (
    <figure style={{ margin: 0 }}>
      <figcaption><h3 style={{ fontSize: 16, marginBottom: 8 }}>{title}</h3></figcaption>
      {rows.length === 0 ? <p className="muted small">{t('adm.noData')}</p> : rows.map((r) => (
        <div className="hbar" key={r.k}>
          <span className="lab" title={r.k}>{r.k}</span>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={`${r.k}: ${r.v}`}>
            <rect x="0" y="0" width={W} height={H} rx="3" fill="#ECEEEA" />
            <rect x="0" y="0" width={(r.v / max) * W} height={H} rx="3" fill="#10233F" />
          </svg>
          <span className="mono">{r.v}</span>
        </div>
      ))}
    </figure>
  );
}
const toRows = (arr, ...keys) => (arr || []).map((x) => ({ k: String(keys.map((k) => x[k]).find((v) => v != null && typeof v !== 'object') ?? '—'), v: Number(x.count ?? x.runs ?? x.value ?? 0) }));

function Analytics() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useAsync(() => API.analytics(), []);
  if (loading) return <Skeleton rows={6} />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <>
      <div className="stat" style={{ marginBottom: 16, maxWidth: 280 }}><b className="num">{data.totalRuns ?? 0}</b><span>{t('adm.totalRuns')}</span></div>
      <div className="an-grid">
        <Bars title={t('adm.topSchemes')} rows={toRows(data.topSchemes, 'name', 'schemeId', 'id')} />
        <Bars title={t('adm.byCategory')} rows={toRows(data.byCategory, 'category', 'label', 'id')} />
        <Bars title={t('adm.byState')} rows={toRows(data.byState, 'state', 'label')} />
      </div>
    </>
  );
}

export default function Admin() {
  const { t, L } = useI18n();
  const [tab, setTab] = useState('schemes');
  const [editing, setEditing] = useState(null);
  const { data, error, loading, reload } = useAsync(() => API.adminSchemes(), []);
  const list = listOf(data);
  const [delErr, setDelErr] = useState(null);
  const [q, setQ] = useState('');
  const shown = list.filter((s) => !q || `${s.id} ${s.name?.en} ${s.name?.ta} ${s.category}`.toLowerCase().includes(q.toLowerCase()));
  const del = async (s) => {
    if (!window.confirm(t('adm.confirmDelete', { name: L(s.name) }))) return;
    try { await API.adminDelete(s.id); reload(); } catch (e) { setDelErr(e); }
  };
  return (
    <>
      <PageHead kicker={t('nav.admin')} title={t('adm.title')} />
      <div className="tabs" role="tablist">
        {['schemes', 'analytics'].map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setEditing(null); }}>{t(`adm.tab.${k}`)}</button>)}
      </div>
      {tab === 'analytics' && <Analytics />}
      {tab === 'schemes' && editing && <SchemeForm key={editing.initial.id || 'new'} {...editing} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
      {tab === 'schemes' && !editing && (
        <>
          {!loading && !error && (
            <div className="stats">
              <div className="stat"><b className="num">{list.length}</b><span>{t('adm.statSchemes')}</span></div>
              <div className="stat"><b className="num">{list.filter((s) => s.level === 'state').length}</b><span>{t('adm.statState')}</span></div>
              <div className="stat"><b className="num">{list.reduce((n, s) => n + (s.rules || []).length, 0)}</b><span>{t('adm.statRules')}</span></div>
            </div>
          )}
          <div className="adm-bar">
            <div className="search-field"><Icon name="search" size={18} /><label htmlFor="adm-q" className="sr-only">{t('adm.search')}</label><input id="adm-q" type="search" placeholder={t('adm.search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <button className="btn primary" onClick={() => setEditing({ initial: blank(), isNew: true })}><Icon name="plus" size={16} />{t('adm.new')}</button>
          </div>
          {delErr && <div style={{ marginBottom: 10 }}><ErrorBox error={delErr} /></div>}
          {loading && <Skeleton rows={6} heading={false} />}
          {error && <ErrorBox error={error} onRetry={reload} />}
          {!loading && !error && list.length === 0 && <Empty title={t('adm.empty')} />}
          {shown.length > 0 && (
            <div className="scroll-x">
              <table className="data">
                <thead><tr><th scope="col">{t('adm.name')}</th><th scope="col">{t('adm.category')}</th><th scope="col">{t('det.level')}</th><th scope="col">{t('adm.rules')}</th><th scope="col"><span className="sr-only">{t('adm.actions')}</span></th></tr></thead>
                <tbody>
                  {shown.map((s) => (
                    <tr key={s.id}>
                      <td><div className="adm-name">{L(s.name)}</div><div className="adm-id">{s.id}</div></td>
                      <td><span className="tag">{t(`cat.${s.category}`)}</span></td>
                      <td>{s.level === 'state' ? s.state || t('level.state') : t('level.central')}</td>
                      <td className="num">{(s.rules || []).length}</td>
                      <td><div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}><button className="btn sm" onClick={() => setEditing({ initial: { ...blank(), ...s }, isNew: false })} aria-label={`${t('common.edit')} ${L(s.name)}`}>{t('common.edit')}</button><button className="btn sm danger" onClick={() => del(s)} aria-label={`${t('common.remove')} ${L(s.name)}`}>{t('common.remove')}</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
