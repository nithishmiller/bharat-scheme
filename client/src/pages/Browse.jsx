import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { API } from '../api/client.js';
import { useAsync, listOf } from '../lib/useAsync.js';
import { Empty, ErrorBox, PageHead, Provenance } from '../components/Common.jsx';
import { Icon } from '../components/Brand.jsx';
import { AmountTag } from './Results.jsx';

const MAX = 3;
const KEY = 'bs_compare';
export const loadPick = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch { return []; } };
const savePick = (ids) => sessionStorage.setItem(KEY, JSON.stringify(ids));

export default function Browse() {
  const { t, L } = useI18n();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [state, setState] = useState('');
  const [pick, setPick] = useState(loadPick);
  useEffect(() => { const h = setTimeout(() => setDq(q), 250); return () => clearTimeout(h); }, [q]);
  useEffect(() => savePick(pick), [pick]);
  const cats = useAsync(() => API.categories(), []);
  const all = useAsync(() => API.schemes(), []);
  const res = useAsync(() => API.schemes({ q: dq, category, level, state }), [dq, category, level, state]);
  const states = useMemo(() => [...new Set(listOf(all.data).map((s) => s.state).filter(Boolean))].sort(), [all.data]);
  const byId = useMemo(() => Object.fromEntries(listOf(all.data).map((s) => [s.id, s])), [all.data]);
  const list = listOf(res.data);
  const clear = () => { setQ(''); setCategory(''); setLevel(''); setState(''); };
  const filtered = q || category || level || state;
  const toggle = (id) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? p : [...p, id]));
  return (
    <>
      <PageHead kicker={t('br.kicker')} title={t('br.title')} sub={t('br.sub')} />
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()} aria-label={t('br.title')}>
        <div className="search-field"><Icon name="search" size={18} /><label htmlFor="br-q" className="sr-only">{t('br.search')}</label><input id="br-q" type="search" placeholder={t('br.search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div><label htmlFor="br-lvl" className="sr-only">{t('det.level')}</label>
          <select id="br-lvl" value={level} onChange={(e) => setLevel(e.target.value)}><option value="">{t('br.anyLevel')}</option><option value="central">{t('level.central')}</option><option value="state">{t('level.state')}</option></select></div>
        <div><label htmlFor="br-st" className="sr-only">{t('f.state')}</label>
          <select id="br-st" value={state} onChange={(e) => setState(e.target.value)}><option value="">{t('br.anyState')}</option>{states.map((s) => <option key={s}>{s}</option>)}</select></div>
      </form>
      <div className="cats" role="group" aria-label={t('br.categories')}>
        <button className="cat" aria-pressed={!category} onClick={() => setCategory('')}>{t('br.all')}</button>
        {listOf(cats.data, 'categories').map((c) => (
          <button key={c.id} className="cat" aria-pressed={category === c.id} onClick={() => setCategory(category === c.id ? '' : c.id)}>{L(c.label) || c.id}<small className="num">{c.count}</small></button>
        ))}
      </div>
      <div className="row between br-bar">
        <p className="small muted" aria-live="polite" style={{ margin: 0 }}>{!res.loading && !res.error && t('br.count', { n: list.length })}</p>
        <p className="small faint" style={{ margin: 0 }}>{t('cmp.hint', { n: MAX })}</p>
      </div>
      {res.loading && <div className="cards">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skel block" style={{ height: 170, margin: 0 }} />)}</div>}
      {res.error && <ErrorBox error={res.error} onRetry={res.reload} />}
      {!res.loading && !res.error && list.length === 0 && (
        <Empty title={t('br.emptyTitle')} icon="search"><p>{t('br.emptyBody')}</p>{filtered && <button className="btn" onClick={clear}>{t('br.clear')}</button>}</Empty>
      )}
      {!res.loading && !res.error && list.length > 0 && (
        <ul className="cards">
          {list.map((s) => {
            const on = pick.includes(s.id);
            const full = !on && pick.length >= MAX;
            return (
              <li key={s.id} className={`scard ${on ? 'picked' : ''}`}>
                <div className="scard-tags"><span className="tag">{t(`cat.${s.category}`)}</span><span className="tag">{s.level === 'state' ? s.state || t('level.state') : t('level.central')}</span></div>
                <Link to={`/schemes/${s.id}`} className="scard-name">{L(s.name)}</Link>
                <p className="scard-sum">{L(s.summary)}</p>
                <div className="scard-foot">
                  <AmountTag scheme={s} />
                  <label className={`cmp-check ${full ? 'is-full' : ''}`} title={full ? t('cmp.full', { n: MAX }) : undefined}>
                    <input type="checkbox" checked={on} disabled={full} onChange={() => toggle(s.id)} />
                    <span>{t('cmp.add')}</span>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Provenance />
      {pick.length > 0 && <div style={{ height: 96 }} aria-hidden="true" />}
      {pick.length > 0 && (
        <div className="tray" role="region" aria-label={t('cmp.tray')}>
          <div className="wrap tray-in">
            <ul className="tray-picks">
              {pick.map((id) => (
                <li key={id}><span>{L(byId[id]?.name) || id}</span><button className="icon-btn sm" onClick={() => toggle(id)} aria-label={`${t('common.remove')} ${L(byId[id]?.name) || id}`}><Icon name="close" size={14} /></button></li>
              ))}
            </ul>
            <button className="btn primary" disabled={pick.length < 2} onClick={() => nav(`/schemes/compare?ids=${pick.join(',')}`)}>
              <Icon name="compare" size={16} />{pick.length < 2 ? t('cmp.pickMore') : t('cmp.go', { n: pick.length })}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
