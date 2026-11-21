import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../lib/auth.jsx';
import { API } from '../api/client.js';
import { EMPTY_HOUSEHOLD, newMember, loadGuest, saveGuest, cleanHousehold, cleanMember } from '../lib/guest.js';
import { ErrorBox, PageHead, Skeleton } from '../components/Common.jsx';

const STATES = ['Tamil Nadu', 'Andhra Pradesh', 'Karnataka', 'Kerala', 'Maharashtra', 'Uttar Pradesh', 'Bihar', 'West Bengal', 'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'Odisha', 'Telangana', 'Punjab', 'Haryana', 'Delhi', 'Other'];
const RELATIONS = ['self', 'spouse', 'child', 'parent', 'sibling', 'other'];
const OCCS = ['farmer', 'student', 'salaried', 'self-employed', 'unemployed', 'homemaker', 'daily-wage', 'retired'];
const EDUS = ['none', 'primary', 'secondary', 'higher-secondary', 'graduate', 'postgraduate'];
const LEVELS = ['school', 'pre-matric', 'post-matric', 'ug', 'pg'];

function Sel({ id, label, value, onChange, options, ns, hint }) {
  const { t } = useI18n();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{ns ? t(`${ns}.${o}`) : o}</option>)}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
function Num({ id, label, value, onChange, hint, min = 0, step }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="decimal" min={min} step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
function Chk({ id, label, checked, onChange }) {
  return (
    <label className="check" htmlFor={id} style={{ marginBottom: 10 }}>
      <input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function MemberForm({ m, onSave, onCancel, idx }) {
  const { t } = useI18n();
  const [v, setV] = useState(m);
  const [err, setErr] = useState('');
  const set = (k) => (val) => setV((x) => ({ ...x, [k]: val }));
  const p = `m${idx}`;
  const save = (e) => {
    e.preventDefault();
    if (!v.name.trim()) return setErr(t('wiz.errName'));
    if (v.age === '' || Number(v.age) < 0 || Number(v.age) > 120) return setErr(t('wiz.errAge'));
    onSave(v);
  };
  return (
    <form className="panel" onSubmit={save} aria-label={t('wiz.memberForm')}>
      <h3 style={{ marginBottom: 12 }}>{m.name ? t('wiz.editMember') : t('wiz.addMember')}</h3>
      <div className="grid2">
        <div className="field"><label htmlFor={`${p}-name`}>{t('f.name')}</label><input id={`${p}-name`} type="text" value={v.name} onChange={(e) => set('name')(e.target.value)} autoFocus /></div>
        <Sel id={`${p}-rel`} label={t('f.relation')} value={v.relation} onChange={set('relation')} options={RELATIONS} ns="rel" />
        <Num id={`${p}-age`} label={t('f.age')} value={v.age} onChange={set('age')} />
        <Sel id={`${p}-gen`} label={t('f.gender')} value={v.gender} onChange={set('gender')} options={['male', 'female', 'other']} ns="gender" />
        <Sel id={`${p}-occ`} label={t('f.occupation')} value={v.occupation} onChange={set('occupation')} options={OCCS} ns="occ" />
        <Sel id={`${p}-edu`} label={t('f.education')} value={v.education} onChange={set('education')} options={EDUS} ns="edu" />
      </div>
      <Chk id={`${p}-stu`} label={t('f.isStudent')} checked={v.isStudent} onChange={(c) => setV((x) => ({ ...x, isStudent: c, studyLevel: c ? x.studyLevel || 'school' : null }))} />
      {v.isStudent && <Sel id={`${p}-lvl`} label={t('f.studyLevel')} value={v.studyLevel} onChange={set('studyLevel')} options={LEVELS} ns="lvl" />}
      {(v.occupation === 'farmer' || v.landHoldingAcres) && <Num id={`${p}-land`} label={t('f.land')} value={v.landHoldingAcres} onChange={set('landHoldingAcres')} step="0.1" hint={t('f.landHint')} />}
      {v.gender === 'female' && <Chk id={`${p}-wid`} label={t('f.isWidow')} checked={v.isWidow} onChange={set('isWidow')} />}
      <fieldset style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 6 }}>
        <legend className="sr-only">{t('wiz.consent')}</legend>
        <Chk id={`${p}-cons`} label={t('f.consent')} checked={v.consentGiven} onChange={set('consentGiven')} />
        <Chk id={`${p}-sens`} label={t('f.sensitive')} checked={v.sensitiveConsent} onChange={(c) => setV((x) => ({ ...x, sensitiveConsent: c }))} />
        {v.sensitiveConsent && (
          <div className="reveal">
            <p className="small" style={{ margin: '0 0 8px' }}>{t('f.sensitiveWhy')}</p>
            <Chk id={`${p}-dis`} label={t('f.hasDisability')} checked={!!v.hasDisability} onChange={(c) => setV((x) => ({ ...x, hasDisability: c, disabilityPercent: c ? x.disabilityPercent : null }))} />
            {v.hasDisability && <Num id={`${p}-dpct`} label={t('f.disabilityPct')} value={v.disabilityPercent} onChange={set('disabilityPercent')} min={0} />}
          </div>
        )}
      </fieldset>
      {err && <p role="alert" style={{ color: 'var(--red)', margin: '8px 0' }}>{err}</p>}
      <div className="row"><button className="btn primary">{t('common.save')}</button><button type="button" className="btn ghost" onClick={onCancel}>{t('common.cancel')}</button></div>
    </form>
  );
}

export default function Wizard() {
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [h, setH] = useState(EMPTY_HOUSEHOLD);
  const [members, setMembers] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hErr, setHErr] = useState('');

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    if (user) {
      API.family().then((r) => { if (r?.household) setH({ ...EMPTY_HOUSEHOLD, ...r.household }); setMembers(r?.members || []); }, setErr).finally(() => setLoading(false));
    } else {
      const g = loadGuest();
      if (g) { setH({ ...EMPTY_HOUSEHOLD, ...g.household }); setMembers(g.members || []); }
      setLoading(false);
    }
  }, [user, ready]);

  const sh = (k) => (val) => setH((x) => ({ ...x, [k]: val }));
  const toMembers = () => {
    if (!h.annualIncome && h.annualIncome !== 0) return setHErr(t('wiz.errIncome'));
    if (!h.familySize || Number(h.familySize) < 1) return setHErr(t('wiz.errSize'));
    setHErr(''); setStep(2);
    if (members.length === 0) setEditing(newMember('self'));
  };
  const saveMember = (m) => {
    setMembers((list) => (list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [...list, m]));
    setEditing(null);
  };
  const removeMember = (m) => {
    setMembers((l) => l.filter((x) => x.id !== m.id));
    if (!String(m.id).startsWith('tmp-')) setRemoved((r) => [...r, m.id]);
  };
  const finish = async () => {
    setBusy(true); setErr(null);
    const hh = cleanHousehold(h);
    try {
      if (user) {
        await API.saveHousehold(hh);
        for (const id of removed) await API.deleteMember(id);
        for (const m of members) {
          const body = cleanMember(m);
          if (String(m.id).startsWith('tmp-')) { delete body.id; await API.addMember(body); } else await API.updateMember(m.id, body);
        }
        setRemoved([]);
      } else {
        saveGuest({ household: hh, members: members.map(cleanMember) });
      }
      nav('/results');
    } catch (x) { setErr(x); setBusy(false); }
  };

  if (loading) return <Skeleton rows={6} />;
  return (
    <>
      <PageHead kicker={t('wiz.kicker')} title={t('wiz.title')} sub={user ? t('wiz.subUser') : t('wiz.subGuest')} />
      <ol className="steps" aria-label={t('wiz.stepsLabel')}>
        <li aria-current={step === 1 ? 'step' : undefined}><span className="step-n">1</span>{t('wiz.step1')}</li>
        <li aria-current={step === 2 ? 'step' : undefined}><span className="step-n">2</span>{t('wiz.step2')}</li>
      </ol>
      <div className="split">
        <div>
          {err && <div style={{ marginBottom: 12 }}><ErrorBox error={err} /></div>}
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); toMembers(); }} aria-label={t('wiz.step1')}>
              <div className="grid2">
                <Sel id="h-state" label={t('f.state')} value={h.state} onChange={sh('state')} options={STATES} />
                <div className="field"><label htmlFor="h-dist">{t('f.district')}</label><input id="h-dist" type="text" value={h.district || ''} onChange={(e) => sh('district')(e.target.value)} /></div>
                <Num id="h-inc" label={t('f.income')} value={h.annualIncome} onChange={sh('annualIncome')} hint={t('f.incomeHint')} />
                <Num id="h-size" label={t('f.familySize')} value={h.familySize} onChange={sh('familySize')} min={1} />
                <Sel id="h-area" label={t('f.area')} value={h.area} onChange={sh('area')} options={['rural', 'urban']} ns="area" />
                <Sel id="h-cat" label={t('f.category')} value={h.category} onChange={sh('category')} options={['general', 'obc', 'sc', 'st', 'ews']} ns="cat" />
              </div>
              <Chk id="h-bpl" label={t('f.bpl')} checked={h.bplCard} onChange={sh('bplCard')} />
              <Chk id="h-ration" label={t('f.ration')} checked={h.rationCard} onChange={sh('rationCard')} />
              <Chk id="h-house" label={t('f.ownsHouse')} checked={h.ownsHouse} onChange={sh('ownsHouse')} />
              {hErr && <p role="alert" style={{ color: 'var(--red)' }}>{hErr}</p>}
              <button className="btn primary">{t('wiz.next')}</button>
            </form>
          )}
          {step === 2 && (
            <>
              {members.length > 0 && (
                <ul className="member-list" aria-label={t('wiz.members')} style={{ padding: 0, listStyle: 'none' }}>
                  {members.map((m) => (
                    <li className="m" key={m.id}>
                      <div>
                        <span className="nm">{m.name}</span>{' '}
                        <span className="muted small">{t(`rel.${m.relation}`)} · {m.age} · {t(`occ.${m.occupation}`)}</span>
                        {!m.consentGiven && <div className="small" style={{ color: 'var(--amber)' }}>{t('wiz.noConsent')}</div>}
                      </div>
                      <div className="row">
                        <button className="btn sm ghost" onClick={() => setEditing(m)} aria-label={`${t('common.edit')} ${m.name}`}>{t('common.edit')}</button>
                        <button className="btn sm danger" onClick={() => removeMember(m)} aria-label={`${t('common.remove')} ${m.name}`}>{t('common.remove')}</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {editing ? (
                <MemberForm key={editing.id} m={editing} idx={members.findIndex((x) => x.id === editing.id) + 1 || members.length + 1} onSave={saveMember} onCancel={() => setEditing(null)} />
              ) : (
                <button className="btn" onClick={() => setEditing(newMember(members.length ? 'child' : 'self'))}>+ {t('wiz.addMember')}</button>
              )}
              <div className="row" style={{ marginTop: 20 }}>
                <button className="btn ghost" onClick={() => setStep(1)}>{t('wiz.back')}</button>
                <button className="btn primary" disabled={busy || members.length === 0 || !!editing} onClick={finish}>{busy ? t('common.wait') : t('wiz.finish')}</button>
              </div>
              {members.length === 0 && !editing && <p className="muted small">{t('wiz.needOne')}</p>}
            </>
          )}
        </div>
        <aside className="note" aria-label={t('wiz.whyTitle')}>
          <h3>{t('wiz.whyTitle')}</h3>
          <p>{t('wiz.whyIntro')}</p>
          <ul>
            <li>{t('wiz.why1')}</li>
            <li>{t('wiz.why2')}</li>
            <li>{t('wiz.why3')}</li>
            <li>{t('wiz.why4')}</li>
          </ul>
          <p style={{ marginTop: 8 }}>{user ? t('wiz.storedUser') : t('wiz.storedGuest')}</p>
        </aside>
      </div>
    </>
  );
}
