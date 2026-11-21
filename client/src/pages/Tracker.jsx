import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { API } from '../api/client.js';
import { useAsync, listOf } from '../lib/useAsync.js';
import { Empty, ErrorBox, PageHead, Spinner } from '../components/Common.jsx';
import { Icon } from '../components/Brand.jsx';
import { trackerNext } from '../lib/elig.js';

const FLOW = ['interested', 'started', 'submitted', 'verification', 'approved'];
const ALL = [...FLOW, 'rejected'];
const dt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function Item({ item, scheme, member, onPatch }) {
  const { t, L } = useI18n();
  const [notes, setNotes] = useState(item.notes || '');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(null);
  const patch = async (body, what) => {
    setBusy(what); setErr(null);
    try { onPatch(item.id, await API.patchTracker(item.id, body) || { ...item, ...body }, body); } catch (e) { setErr(e); } finally { setBusy(null); }
  };
  const docs = scheme?.documents || [];
  const done = item.documentsDone || [];
  const nDone = done.filter((d) => docs.includes(d)).length;
  const idx = FLOW.indexOf(item.status);
  const rejected = item.status === 'rejected';
  const toggleDoc = (d) => patch({ documentsDone: done.includes(d) ? done.filter((x) => x !== d) : [...done, d] }, 'doc');
  const sid = `ti-${item.id}`;
  const n = trackerNext(item, scheme);
  return (
    <li className={`tcard s-${item.status}`}>
      <div className="tcard-head">
        <div className="tcard-id">
          <h3><Link to={`/schemes/${item.schemeId}`}>{L(scheme?.name) || item.schemeId}</Link></h3>
          <span className="meta">{t('trk.for')} <b>{member?.name || item.memberId}</b>{scheme?.deadline && <> · <span className="due">{t('trk.deadline')}: {dt(scheme.deadline)}</span></>}</span>
        </div>
        <span className={`stage-pill p-${item.status}`}>{t(`trk.s.${item.status}`)}</span>
      </div>

      <div className="stages" role="group" aria-label={t('trk.setStatus')}>
        {FLOW.map((s, i) => (
          <button key={s} type="button" aria-label={t(`trk.s.${s}`)} className={`stage ${!rejected && i < idx ? 'done' : ''} ${!rejected && i === idx ? 'now' : ''}`} aria-pressed={item.status === s} disabled={!!busy} onClick={() => item.status !== s && patch({ status: s }, 'status')}>
            <span className="stage-dot" aria-hidden="true">{!rejected && i < idx ? '✓' : i + 1}</span>
            <span className="stage-label">{t(`trk.s.${s}`)}</span>
          </button>
        ))}
      </div>
      <div className="row between tcard-sub">
        <p className={`trk-next ${n.key.replace('.', '-')}`}><span className="kicker">{t('nba.next')}</span>{t(n.key, { n: n.left?.length || 0, docs: (n.left || []).join(', ') })}</p>
        <button type="button" className={`linkbtn small ${rejected ? '' : 'danger-link'}`} disabled={!!busy} onClick={() => patch({ status: rejected ? 'interested' : 'rejected' }, 'status')}>
          {busy === 'status' && <Spinner />} {rejected ? t('trk.reopen') : t('trk.markRejected')}
        </button>
      </div>

      <div className="tcard-grid">
        <fieldset className="tdocs">
          <legend><span>{t('trk.docs')}</span> <span className="num faint">{nDone}/{docs.length}</span></legend>
          <span className="meter" aria-hidden="true"><i style={{ width: `${docs.length ? (nDone / docs.length) * 100 : 0}%` }} /></span>
          {docs.length === 0 && <p className="muted small">{t('trk.noDocs')}</p>}
          <ul>
            {docs.map((d) => (
              <li key={d}><label className={`check ${done.includes(d) ? 'is-done' : ''}`}><input type="checkbox" checked={done.includes(d)} disabled={!!busy} onChange={() => toggleDoc(d)} /><span>{d}</span></label></li>
            ))}
          </ul>
        </fieldset>
        <div className="tside">
          <div className="field">
            <label htmlFor={`${sid}-rem`}><Icon name="cal" size={15} /> {t('trk.reminder')}</label>
            <input id={`${sid}-rem`} type="date" value={item.reminderAt ? String(item.reminderAt).slice(0, 10) : ''} disabled={!!busy} onChange={(e) => patch({ reminderAt: e.target.value ? new Date(e.target.value + 'T09:00:00').toISOString() : null }, 'rem')} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={`${sid}-n`}>{t('trk.notes')}</label>
            <textarea id={`${sid}-n`} value={notes} placeholder={t('trk.notesPh')} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (item.notes || '') && patch({ notes }, 'notes')} />
            <span className="hint" aria-live="polite">{busy === 'notes' ? t('common.wait') : t('trk.notesAuto')}</span>
          </div>
        </div>
      </div>
      {err && <ErrorBox error={err} />}
      {(item.history || []).length > 0 && (
        <details className="thist">
          <summary><span className="caret" aria-hidden="true" />{t('trk.history')} <span className="faint">({item.history.length})</span></summary>
          <ol className="timeline">
            {item.history.slice().reverse().map((h, i) => <li key={i}><b>{t(`trk.s.${h.status}`)}</b> <span className="faint">{dt(h.at)}</span></li>)}
          </ol>
        </details>
      )}
    </li>
  );
}

function TrackerSkeleton() {
  return <div aria-busy="true">{[0, 1].map((i) => <div key={i} className="skel block" style={{ height: 220, marginBottom: 16 }} />)}</div>;
}

export default function Tracker() {
  const { t } = useI18n();
  const items = useAsync(() => API.tracker(), []);
  const schemes = useAsync(() => API.schemes(), []);
  const fam = useAsync(() => API.family().catch(() => null), []);
  const sMap = useMemo(() => Object.fromEntries(listOf(schemes.data).map((s) => [s.id, s])), [schemes.data]);
  const mMap = useMemo(() => Object.fromEntries((fam.data?.members || []).map((m) => [m.id, m])), [fam.data]);
  const list = listOf(items.data, 'items');
  const onPatch = (id, updated) => items.setData(list.map((x) => (x.id === id ? { ...x, ...updated } : x)));
  const sorted = [...list].sort((a, b) => ALL.indexOf(a.status) - ALL.indexOf(b.status));
  const counts = ALL.map((s) => [s, list.filter((i) => i.status === s).length]);
  return (
    <>
      <PageHead kicker={t('trk.kicker')} title={t('trk.title')} sub={t('trk.sub')} />
      {items.loading && <TrackerSkeleton />}
      {items.error && <ErrorBox error={items.error} onRetry={items.reload} />}
      {!items.loading && !items.error && list.length === 0 && (
        <Empty title={t('trk.emptyTitle')} icon="doc"><p>{t('trk.emptyBody')}</p><Link className="btn primary" to="/results">{t('nav.results')} <Icon name="arrow" size={16} className="arr" /></Link></Empty>
      )}
      {list.length > 0 && (
        <ol className="pipeline" aria-label={t('trk.progress')}>
          {counts.map(([s, c]) => <li key={s} className={`${c ? 'has' : ''} p-${s}`}><b className="num">{c}</b><span>{t(`trk.s.${s}`)}</span></li>)}
        </ol>
      )}
      <ul className="tlist">{sorted.map((i) => <Item key={i.id} item={i} scheme={sMap[i.schemeId] || i.scheme} member={mMap[i.memberId]} onPatch={onPatch} />)}</ul>
    </>
  );
}
