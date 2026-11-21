import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { API } from '../api/client.js';
import { useAsync, listOf } from '../lib/useAsync.js';
import { useAuth } from '../lib/auth.jsx';
import { ErrorBox, Provenance, Skeleton, StatusChip, Toast, Spinner, fmtDate } from '../components/Common.jsx';
import { Icon } from '../components/Brand.jsx';
import { AmountTag } from './Results.jsx';
import { StrengthNote, WhyList } from '../components/Why.jsx';
import { loadGuest } from '../lib/guest.js';
import { benefitLine, isHouseholdScheme, RANK, trackerNext } from '../lib/elig.js';
import PhotoFrame from '../components/photo/PhotoFrame.jsx';
import { getCategoryCaption } from '../components/photo/captions.js';

// The family's result for this one scheme, from the rules engine.
function useFamilyMatch(schemeId) {
  const { user, ready } = useAuth();
  const [st, setSt] = useState({ rows: [], household: null, items: [], loaded: false });
  useEffect(() => {
    if (!ready) return;
    let body = { includeNotEligible: true }; let hh = null;
    if (!user) { const g = loadGuest(); if (!g?.members?.length) return setSt({ rows: [], household: null, items: [], loaded: true }); body = { ...body, household: g.household, members: g.members }; hh = g.household; }
    Promise.all([
      API.recommend(body),
      user ? API.family().catch(() => null) : Promise.resolve(null),
      user ? API.tracker().catch(() => []) : Promise.resolve([]),
    ]).then(([rec, fam, tr]) => {
      const rows = (rec?.results || []).map((r) => ({ member: r.member, match: r.matches.find((m) => m.schemeId === schemeId) })).filter((r) => r.match);
      setSt({ rows, household: fam?.household || hh, items: listOf(tr, 'items').filter((i) => i.schemeId === schemeId), loaded: true });
    }).catch(() => setSt((x) => ({ ...x, loaded: true })));
  }, [user, ready, schemeId]);
  return st;
}

function FamilyWhy({ scheme, fam, focus }) {
  const { t } = useI18n();
  const sorted = [...fam.rows].sort((a, b) => (a.member.id === focus ? -1 : b.member.id === focus ? 1 : RANK[a.match.status] - RANK[b.match.status]));
  const [open, setOpen] = useState(() => new Set());
  const firstId = sorted[0]?.member.id;
  useEffect(() => { if (firstId) setOpen(new Set([firstId])); }, [firstId]);
  if (!fam.loaded || !sorted.length) return null;
  const hh = isHouseholdScheme(scheme);
  const shown = hh ? sorted.slice(0, 1) : sorted;
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <section className="sec fam-why" aria-labelledby="fw-h">
      <h2 id="fw-h">{t('det.whyFamily')}</h2>
      {hh && <p className="small muted">{t('det.hhNote', { n: sorted.filter((r) => r.match.status !== 'not-eligible').length })}</p>}
      <ul className="fw-list">
        {shown.map(({ member, match }) => (
          <li key={member.id} className="fw-item">
            <button className="fw-head" aria-expanded={open.has(member.id)} onClick={() => toggle(member.id)}>
              <span className="caret" aria-hidden="true" />
              <span className="fw-name">{hh ? t('res.hhTitle') : member.name}</span>
              <StrengthNote match={match} />
              <StatusChip status={match.status} />
            </button>
            {open.has(member.id) && <div className="why"><WhyList match={match} scheme={scheme} member={member} household={fam.household} /></div>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NextBox({ scheme, fam }) {
  const { t } = useI18n();
  if (!fam.loaded || !fam.rows.length) return null;
  const item = fam.items[0];
  let text; let to = null; let cta = null;
  if (item) {
    const n = trackerNext(item, scheme);
    text = t(n.key, { n: n.left?.length || 0, docs: (n.left || []).join(', ') });
    to = '/tracker'; cta = t('nba.ctaTracker');
  } else {
    const best = [...fam.rows].sort((a, b) => RANK[a.match.status] - RANK[b.match.status])[0];
    if (best.match.status === 'eligible') text = t('det.nextSave', { n: (scheme.documents || []).length });
    else if (best.match.status === 'likely') { text = t('det.nextDetail'); to = '/family'; cta = t('nba.ctaDetail'); }
    else text = t('det.nextNot');
  }
  const best = [...fam.rows].sort((a, b) => RANK[a.match.status] - RANK[b.match.status])[0];
  return (
    <div className="act-next" role="note">
      <div className="row between"><span className="kicker">{t('nba.next')}</span>{best && <StatusChip status={best.match.status} />}</div>
      <p>{text}</p>
      {to && <Link className="linkbtn" to={to}>{cta} →</Link>}
    </div>
  );
}

function ModeBadge({ mode }) {
  const { t } = useI18n();
  return <span className={`mode ${mode}`}>{mode === 'openai' ? t('ai.modeOpenai') : t('ai.modeOffline')}</span>;
}

function AiBox({ scheme }) {
  const { t, lang } = useI18n();
  const [l, setL] = useState(lang);
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState('');
  const [ans, setAns] = useState(null);
  const [qBusy, setQBusy] = useState(false);
  useEffect(() => setL(lang), [lang]);
  useEffect(() => { setOut(null); setAns(null); }, [scheme.id]);
  const explain = async (lg = l) => {
    setBusy(true); setErr(null);
    try { setOut(await API.explain({ schemeId: scheme.id, lang: lg })); } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const ask = async (e) => {
    e.preventDefault(); if (!q.trim()) return;
    setQBusy(true); setErr(null);
    try { setAns(await API.ask({ question: q.trim(), schemeId: scheme.id, lang: l })); } catch (x) { setErr(x); } finally { setQBusy(false); }
  };
  return (
    <section className="ai-box sec" aria-labelledby="ai-h">
      <div className="ai-head">
        <div>
          <h2 id="ai-h">{t('ai.title')}</h2>
          <span className="info-label"><Icon name="info" size={14} />{t('ai.informational')}</span>
        </div>
        <span className="seg" role="group" aria-label={t('lang.label')}>
          <button aria-pressed={l === 'en'} onClick={() => { setL('en'); out && explain('en'); }}>EN</button>
          <button aria-pressed={l === 'ta'} onClick={() => { setL('ta'); out && explain('ta'); }}>தமிழ்</button>
        </span>
      </div>
      <div className="ai-body" lang={l} aria-live="polite">
        {busy ? <div className="skel w" /> : out ? out.text : <span className="muted">{t('ai.placeholder')}</span>}
      </div>
      <div className="ai-foot">
        <button className="btn sm" onClick={() => explain()} disabled={busy}>{busy && <Spinner />}{t('ai.explain')}</button>
        {out && <ModeBadge mode={out.mode} />}
      </div>
      <form className="ai-ask" onSubmit={ask}>
        <label htmlFor="ask-q">{t('ai.askLabel')}</label>
        <div className="ai-ask-row">
          <input id="ask-q" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ai.askPh')} />
          <button className="btn" disabled={qBusy || !q.trim()}>{qBusy && <Spinner />}{t('ai.ask')}</button>
        </div>
      </form>
      {(ans || qBusy) && (
        <div className="ai-body ai-ans" lang={l} aria-live="polite">
          {qBusy ? <div className="skel w" /> : <>{ans.text}<div className="row" style={{ marginTop: 8 }}><ModeBadge mode={ans.mode} />{ans.citedSchemeIds?.length > 0 && <span className="small muted">{t('ai.cited')}: {ans.citedSchemeIds.join(', ')}</span>}</div></>}
        </div>
      )}
      {err && <div style={{ marginTop: 12 }}><ErrorBox error={err} /></div>}
    </section>
  );
}

function SaveBox({ schemeId, focus }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [mid, setMid] = useState('');
  const [state, setState] = useState(null);
  const [toast, setToast] = useState(false);
  useEffect(() => {
    if (!user) return;
    API.family().then((f) => { const m = f?.members || []; setMembers(m); setMid((m.find((x) => x.id === focus) || m.find((x) => x.relation === 'self') || m[0])?.id || ''); }).catch(() => {});
  }, [user, focus]);
  useEffect(() => {
    if (!user || !mid) return;
    API.tracker().then((r) => setState(listOf(r, 'items').some((i) => i.schemeId === schemeId && i.memberId === mid) ? 'ok' : null)).catch(() => {});
  }, [user, mid, schemeId]);
  if (!user) return <Link className="btn block" to="/login" state={{ from: `/schemes/${schemeId}` }}>{t('res.loginToSave')}</Link>;
  if (!members.length) return <Link className="btn block" to="/family">{t('det.checkMine')}</Link>;
  const save = async () => {
    setState('busy');
    try { await API.track({ schemeId, memberId: mid }); setState('ok'); setToast(true); } catch (e) { setState(e.status === 409 ? 'ok' : 'err'); }
  };
  return (
    <div className="act-save">
      {members.length > 1 && (
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="save-for">{t('det.saveFor')}</label>
          <select id="save-for" value={mid} onChange={(e) => setMid(e.target.value)}>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        </div>
      )}
      {state === 'ok' ? (
        <Link className="saved-state" to="/tracker"><Icon name="check" size={16} />{t('res.saved')} · {t('det.viewTracker')}</Link>
      ) : (
        <button className="btn block" onClick={save} disabled={state === 'busy'}>{state === 'busy' ? <Spinner /> : <Icon name="plus" size={16} />}{t('det.save')}</button>
      )}
      {state === 'err' && <span role="alert" className="small" style={{ color: 'var(--red)' }}>{t('common.error')} — {t('common.retry')}</span>}
      {toast && <Toast to="/tracker" cta={t('toast.view')} onDone={() => setToast(false)}>{t('toast.savedPlain')}</Toast>}
    </div>
  );
}

export default function SchemeDetail() {
  const { id } = useParams();
  const { t, L, LA, lang } = useI18n();
  const { data: s, error, loading, reload } = useAsync(() => API.scheme(id), [id]);
  const [sp] = useSearchParams();
  const fam = useFamilyMatch(id);
  const docKey = `bs_docs_${id}`;
  const [done, setDone] = useState([]);
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(docKey)) || []); } catch { setDone([]); } }, [docKey]);
  const tick = (d) => setDone((cur) => { const n = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]; localStorage.setItem(docKey, JSON.stringify(n)); return n; });

  if (loading) return <div className="detail"><Skeleton rows={9} /><div className="skel block" style={{ height: 260 }} /></div>;
  if (error) return <><Link to="/schemes" className="back">← {t('nav.schemes')}</Link><div style={{ marginTop: 12 }}><ErrorBox error={error.status === 404 ? { message: t('det.notFound') } : error} onRetry={error.status === 404 ? null : reload} /></div></>;
  const benefits = LA(s.benefits); const steps = LA(s.howToApply);
  const docs = s.documents || [];
  const nDone = done.filter((d) => docs.includes(d)).length;
  const cap = getCategoryCaption(s.category, lang);
  return (
    <>
      <Link to="/schemes" className="back">← {t('nav.schemes')}</Link>
      <div className="det-photo-header" style={{ margin: '14px 0 20px 0' }}>
        <PhotoFrame
          variant="strip"
          image={cap.image}
          alt={cap.alt}
          title={cap.title}
          text={cap.text}
          badge={
            <span className="tag" style={{ background: 'var(--marigold)', color: 'var(--ink-900)', fontWeight: 600 }}>
              {t(`cat.${s.category}`)} · {s.level === 'state' ? s.state || t('level.state') : t('level.central')}
            </span>
          }
        />
      </div>
      <div className="detail">
        <article className="detail-main">
          <div className="det-tags">
            <span className="tag">{t(`cat.${s.category}`)}</span>
            <span className="tag">{s.level === 'state' ? s.state || t('level.state') : t('level.central')}</span>
          </div>
          <h1>{L(s.name)}</h1>
          <p className="lede-sm">{L(s.summary)}</p>
          {benefitLine(s, LA) && (
            <div className="benefit-hl">
              <span className="kicker">{t('det.youGet')}</span>
              <p>{benefitLine(s, LA)}</p>
              <AmountTag scheme={s} />
            </div>
          )}
          <Provenance scheme={s} />
          <FamilyWhy scheme={s} fam={fam} focus={sp.get('m')} />
          <section className="sec"><h2>{t('det.benefits')}</h2><ul className="ticks">{benefits.map((b, i) => <li key={i}>{b}</li>)}</ul></section>
          <section className="sec">
            <div className="sec-row"><h2>{t('det.documents')}</h2><span className="meter num" aria-hidden="true"><i style={{ width: `${docs.length ? (nDone / docs.length) * 100 : 0}%` }} /></span></div>
            <ul className="doclist">
              {docs.map((d) => (
                <li key={d}><label className={`check ${done.includes(d) ? 'is-done' : ''}`}><input type="checkbox" checked={done.includes(d)} onChange={() => tick(d)} /><span>{d}</span></label></li>
              ))}
            </ul>
            <p className="small faint" style={{ marginTop: 8 }}>{t('det.docsLocal', { done: nDone, total: docs.length })}</p>
          </section>
          <section className="sec"><h2>{t('det.how')}</h2><ol className="steps-num">{steps.map((b, i) => <li key={i}>{b}</li>)}</ol></section>
          <section className="sec">
            <h2>{t('det.eligibility')}</h2>
            <ul className="rules-plain">
              {(s.rules || []).map((r) => <li key={r.id}>{L(r.label)}</li>)}
            </ul>
            <p className="small muted">{t('det.eligNote')} <Link to="/family">{t('det.checkMine')}</Link></p>
          </section>
          <AiBox scheme={s} />
          <p className="small faint" style={{ marginTop: 24 }} lang={lang}>{t('det.disclaimer')}</p>
        </article>
        <aside className="detail-aside" aria-label={t('det.actions')}>
          <div className="act">
            <NextBox scheme={s} fam={fam} />
            <a className="btn primary block lg" href={s.officialUrl} target="_blank" rel="noopener noreferrer">{t('det.official')} <Icon name="ext" size={16} /><span className="sr-only">{t('common.newTab')}</span></a>
            <p className="act-ref">{t('det.refNote', { host: safeHost(s.officialUrl) })}</p>
            <SaveBox schemeId={s.id} focus={sp.get('m')} />
            <dl className="act-meta">
              <div><dt>{t('det.ministry')}</dt><dd>{s.ministry}</dd></div>
              <div><dt>{t('det.deadline')}</dt><dd>{s.deadline ? fmtDate(s.deadline) : t('det.noDeadline')}</dd></div>
              <div><dt>{t('det.verified')}</dt><dd>{fmtDate(s.lastVerified)}</dd></div>
              {s.sourceUrl && <div><dt>{t('prov.source')}</dt><dd><a href={s.sourceUrl} target="_blank" rel="noopener noreferrer">{safeHost(s.sourceUrl)} ↗</a></dd></div>}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
const safeHost = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u || ''; } };
