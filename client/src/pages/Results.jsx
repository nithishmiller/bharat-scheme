import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../lib/auth.jsx';
import { API } from '../api/client.js';
import { listOf } from '../lib/useAsync.js';
import { loadGuest } from '../lib/guest.js';
import { Empty, ErrorBox, PageHead, Skeleton, StatusChip, Toast, Spinner } from '../components/Common.jsx';
import { StrengthNote, WhyList } from '../components/Why.jsx';
import { Icon } from '../components/Brand.jsx';
import { benefitLine, buildStory, k, keyReason, nextActions, RANK } from '../lib/elig.js';
import { amountOf, familyMoney, inr, inrShort, personYearly } from '../lib/amount.js';

const GLYPH = { eligible: '✓', likely: '?', 'not-eligible': '✗' };
const initials = (n = '') => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const first = (n = '') => n.split(' ')[0];

export function AmountTag({ scheme }) {
  const { t } = useI18n();
  const a = amountOf(scheme);
  if (!a) return null;
  if (a.kind === 'cash') return <span className="amt cash num">{t(a.unit === 'month' ? 'map.perMonth' : 'map.perYear', { v: inr(a.value) })}</span>;
  if (a.kind === 'cover') return <span className="amt cover num">{t('map.coverOf', { v: inrShort(a.value) })}</span>;
  return <span className="amt later num">{t('map.later', { v: inr(a.value) })}</span>;
}

function SaveControl({ scheme, member, user, item, onSaved }) {
  const { t, L } = useI18n();
  const [state, setState] = useState(null);
  if (!user) return <Link className="btn sm ghost" to="/login" state={{ from: '/results' }}>{t('res.loginToSave')}</Link>;
  if (item) return <Link className="tracked" to="/tracker"><Icon name="check" size={16} /> {t('res.inTracker', { stage: t(`trk.s.${item.status}`) })}</Link>;
  const save = async () => {
    setState('busy');
    const it0 = { schemeId: scheme.id, memberId: member.id, status: 'interested' };
    try { const it = await API.track({ schemeId: scheme.id, memberId: member.id }); onSaved(it || it0, scheme); }
    catch (e) { if (e.status === 409) onSaved(it0, scheme); else setState('err'); }
  };
  return (
    <button className="btn sm" onClick={save} disabled={state === 'busy'} aria-label={`${t('res.save')}: ${L(scheme.name)}, ${member.name}`}>
      {state === 'busy' ? <Spinner /> : <Icon name="plus" size={16} />}
      {state === 'err' ? t('common.retry') : t('res.save')}
    </button>
  );
}

// One scheme line, for one person or for the whole household. Eligible is the default, so it carries no chip.
function SchemeRow({ scheme, entries, household, user, trackedMap, onSaved, hh, total }) {
  const { t, L, LA } = useI18n();
  const [open, setOpen] = useState(false);
  const firstE = entries[0];
  const match = firstE.match;
  const reason = keyReason(match, scheme);
  const saveFor = hh ? (entries.find((e) => e.member.relation === 'self') || firstE).member : firstE.member;
  const item = entries.map((e) => trackedMap.get(k(e.member.id, scheme.id))).find(Boolean);
  const id = `why-${hh ? 'hh' : firstE.member.id}-${scheme.id}`;
  const docs = scheme.documents || [];
  const benefit = benefitLine(scheme, LA);
  const to = `/schemes/${scheme.id}${hh ? '' : `?m=${firstE.member.id}`}`;
  return (
    <li className="line" data-open={open}>
      <div className="line-main">
        <div className="line-text">
          <Link className="line-name" to={to}>{L(scheme.name) || scheme.id}</Link>
          {benefit && <p className="line-benefit">{benefit}</p>}
          <p className="line-meta">
            {hh && <span className="who"><Icon name="people" size={14} />{entries.length >= total ? t('res.forAll', { n: entries.length }) : entries.map((e) => first(e.member.name)).join(', ')}</span>}
            {reason.check && <span className={`reason r-${reason.kind}`}>{L(reason.check.label)}</span>}
          </p>
        </div>
        <div className="line-side">
          <AmountTag scheme={scheme} />
          {match.status !== 'eligible' && <StatusChip status={match.status} />}
        </div>
      </div>
      <div className="line-actions">
        <button className="disclose" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          <span className="caret" aria-hidden="true" />{t('res.why')}
        </button>
        <span className="faint small"><Icon name="doc" size={14} /> {t('res.docsN', { n: docs.length })}</span>
        <span className="line-save"><SaveControl scheme={scheme} member={saveFor} user={user} item={item} onSaved={onSaved} /></span>
      </div>
      {open && (
        <div className="why" id={id}>
          <div className="why-head">
            <h4>{hh ? t('res.whyHousehold') : t('res.whyFor', { name: firstE.member.name })}</h4>
            <StrengthNote match={match} />
          </div>
          <WhyList match={match} scheme={scheme} member={firstE.member} household={household} />
          {docs.length > 0 && (
            <>
              <h4>{t('res.docsTitle')}</h4>
              <ul className="doc-pills">{docs.map((d) => <li key={d}>{d}</li>)}</ul>
            </>
          )}
          <Link className="btn sm" to={to}>{t('res.viewScheme')} <Icon name="arrow" size={16} className="arr" /></Link>
        </div>
      )}
    </li>
  );
}

function StartHere({ actions }) {
  const { t, L } = useI18n();
  if (!actions.length) return null;
  const text = (a) => {
    if (a.kind === 'finish') return a.left.length ? t('nba.finishDocs', { scheme: L(a.scheme?.name), name: a.member?.name || '', n: a.left.length }) : t('nba.finishSubmit', { scheme: L(a.scheme?.name), name: a.member?.name || '' });
    if (a.kind === 'apply') return a.member ? t('nba.apply', { scheme: L(a.scheme.name), name: a.member.name }) : t('nba.applyHH', { scheme: L(a.scheme.name) });
    const fields = a.fields.filter((f) => f !== 'isPregnant');
    if (fields.length === 0) return t('res.niConfirm') + ' — ' + L(a.scheme.name);
    return t('nba.detail', { field: fields.map((f) => t(`field.${f}`)).join(', '), scheme: L(a.scheme.name), n: a.n });
  };
  const cta = { finish: 'nba.ctaTracker', apply: 'nba.ctaApply', detail: 'nba.ctaDetail' };
  return (
    <section className="start" aria-labelledby="nba-h">
      <h2 id="nba-h" className="sec-title">{t('nba.title')}</h2>
      <ol className="start-list">
        {actions.map((a, i) => (
          <li key={i} className={`step ${i === 0 ? 'lead' : ''} k-${a.kind}`}>
            <span className="step-n" aria-hidden="true">{i + 1}</span>
            <div className="step-body">
              {i === 0 && <span className="kicker">{t('map.step1')}</span>}
              <p className="step-t">{text(a)}</p>
              {a.kind === 'finish' && a.left.length > 0 && <ul className="doc-pills">{a.left.map((d) => <li key={d}>{d}</li>)}</ul>}
              {a.kind === 'apply' && a.scheme && <AmountTag scheme={a.scheme} />}
            </div>
            <Link className={`btn ${i === 0 ? 'primary' : 'sm'}`} to={a.to}>{t(cta[a.kind])} <Icon name="arrow" size={16} className="arr" /></Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

// The family at a glance: one tile per person with a dot per scheme they can claim. Clicking selects.
function FamilyStrip({ story, total, selected, onSelect }) {
  const { t } = useI18n();
  const hhN = story.household.length;
  return (
    <nav className="fam-strip" aria-label={t('map.stripLabel')}>
      {hhN > 0 && (
        <button className={`fam-tile hh${selected === 'all' ? ' sel' : ''}`} onClick={() => onSelect('all')} aria-pressed={selected === 'all'}>
          <span className="fam-av hh" aria-hidden="true"><Icon name="home" size={18} /></span>
          <span className="fam-name">{t('map.household')}</span>
          <span className="fam-meta">{t('map.allN', { n: total })}</span>
          <span className="dots" aria-hidden="true">{story.household.map((g) => <i key={g.scheme.id} />)}</span>
          <span className="fam-count">{t('map.schemesN', { n: hhN })}</span>
        </button>
      )}
      {story.people.map((p, i) => {
        const n = p.main.length + p.basic.length;
        const y = personYearly(p);
        return (
          <button key={p.member.id} className={`fam-tile${selected === p.member.id ? ' sel' : ''}`} onClick={() => onSelect(p.member.id)} aria-pressed={selected === p.member.id}>
            <span className={`fam-av c${i % 5}`} aria-hidden="true">{initials(p.member.name)}</span>
            <span className="fam-name">{p.member.name}</span>
            <span className="fam-meta">{t(`rel.${p.member.relation}`)} · {t('res.age', { n: p.member.age })}</span>
            <span className="dots" aria-hidden="true">{p.main.map((e) => <i key={e.scheme.id} />)}{p.basic.map((e) => <i key={e.scheme.id} className="b" />)}</span>
            <span className="fam-count">{n ? t('map.schemesN', { n }) : t('map.noneShort')}</span>
            {y > 0 && <b className="fam-amt num">{t('map.perYear', { v: inr(y) })}</b>}
          </button>
        );
      })}
    </nav>
  );
}

function Grid({ results, story }) {
  const { t, L } = useI18n();
  const rows = useMemo(() => {
    const map = new Map();
    results.forEach((r) => r.matches.forEach((m) => {
      if (m.status === 'not-eligible') return;
      if (!map.has(m.schemeId)) map.set(m.schemeId, { id: m.schemeId, scheme: m.scheme, cells: {}, best: 9 });
      const row = map.get(m.schemeId); row.cells[r.member.id] = m; row.best = Math.min(row.best, RANK[m.status]);
    }));
    const hh = new Set(story.household.map((g) => g.scheme.id));
    return [...map.values()].map((r) => ({ ...r, hh: hh.has(r.id) })).sort((a, b) => a.best - b.best || a.hh - b.hh);
  }, [results, story]);
  return (
    <details className="grid-view">
      <summary><span className="caret" aria-hidden="true" />{t('res.gridOpen', { n: rows.length })}</summary>
      <div className="mapwrap" role="region" aria-label={t('res.mapTitle')} tabIndex={0}>
        <table className="map">
          <thead>
            <tr>
              <th scope="col">{t('res.scheme')}</th>
              {results.map((r) => <th scope="col" key={r.member.id}>{first(r.member.name)}<small>{t(`rel.${r.member.relation}`)}</small></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row"><Link to={`/schemes/${row.id}`}>{L(row.scheme?.name) || row.id}</Link>{row.hh && <small className="tag">{t('res.hhShort')}</small>}</th>
                {results.map((r) => {
                  const m = row.cells[r.member.id];
                  return (
                    <td key={r.member.id}>
                      {m ? <Link className={`cell ${m.status}`} to={`/schemes/${row.id}?m=${r.member.id}`} aria-label={`${r.member.name}, ${L(row.scheme?.name)}: ${t(m.status === 'eligible' ? 'status.eligible' : 'status.likely')}`}>{GLYPH[m.status]}</Link> : <span className="cell none" aria-hidden="true" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function MapSkeleton() {
  const { t } = useI18n();
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{t('common.loading')}</span>
      <div className="skel h" />
      <div className="figs">{[0, 1, 2].map((i) => <div key={i} className="skel block" style={{ height: 88 }} />)}</div>
      <div className="fam-strip">{[0, 1, 2, 3].map((i) => <div key={i} className="skel block" />)}</div>
      <div className="skel block" style={{ height: 180 }} />
    </div>
  );
}

export default function Results() {
  const { t, L } = useI18n();
  const { user, ready } = useAuth();
  const [state, setState] = useState({ loading: true, data: null, error: null, noFamily: false });
  const [schemes, setSchemes] = useState([]);
  const [household, setHousehold] = useState(null);
  const [items, setItems] = useState([]);
  const [showNot, setShowNot] = useState(false);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(null); // null = all, 'all' = household/everyone, or memberId

  const load = useCallback(() => {
    if (!ready) return;
    setState({ loading: true, data: null, error: null, noFamily: false });
    let body = { includeNotEligible: true };
    if (!user) {
      const g = loadGuest();
      if (!g || !g.members?.length) return setState({ loading: false, data: null, error: null, noFamily: true });
      body = { household: g.household, members: g.members, includeNotEligible: true };
      setHousehold(g.household);
    } else {
      API.family().then((f) => setHousehold(f?.household || null)).catch(() => {});
      API.tracker().then((r) => setItems(listOf(r, 'items'))).catch(() => {});
    }
    API.schemes().then((r) => setSchemes(listOf(r))).catch(() => {});
    API.recommend(body).then(
      (data) => setState({ loading: false, data, error: null, noFamily: !(data?.results?.length) && !(data?.skipped?.length) }),
      (error) => setState({ loading: false, data: null, error, noFamily: false }),
    );
  }, [user, ready]);
  useEffect(load, [load]);

  const results = state.data?.results || [];
  const skipped = state.data?.skipped || [];
  const sMap = useMemo(() => Object.fromEntries(schemes.map((s) => [s.id, s])), [schemes]);
  const mMap = useMemo(() => Object.fromEntries(results.map((r) => [r.member.id, r.member])), [results]);
  const story = useMemo(() => buildStory(results, sMap), [results, sMap]);
  const money = useMemo(() => familyMoney(story), [story]);
  const trackedMap = useMemo(() => new Map(items.map((i) => [k(i.memberId, i.schemeId), i])), [items]);
  const actions = useMemo(() => nextActions(story, items, sMap, mMap), [story, items, sMap, mMap]);
  const onSaved = (it, scheme) => {
    setItems((cur) => [...cur.filter((x) => k(x.memberId, x.schemeId) !== k(it.memberId, it.schemeId)), it]);
    setToast(L(scheme?.name));
  };
  const closeToast = useCallback(() => setToast(null), []);
  const rowProps = { household, user, trackedMap, onSaved, total: results.length };

  if (state.loading) return <MapSkeleton />;
  if (state.error) return <><PageHead kicker={t('res.kicker')} title={t('res.title')} /><ErrorBox error={state.error} onRetry={load} /></>;
  if (state.noFamily) {
    return (
      <>
        <PageHead kicker={t('res.kicker')} title={t('res.title')} />
        <Empty title={t('res.emptyTitle')} icon="people"><p>{t('res.emptyBody')}</p><Link className="btn primary lg" to="/family">{t('land.cta')} <Icon name="arrow" className="arr" /></Link></Empty>
      </>
    );
  }
  const head = results.find((r) => r.member.relation === 'self')?.member || results[0]?.member;
  const c = story.counts;
  return (
    <>
      <header className="map-head">
        <div>
          <span className="kicker">{t('res.kicker')}</span>
          <h1>{head ? t('res.titleFamily', { name: head.name }) : t('res.title')}</h1>
        </div>
        <Link className="btn sm" to="/family"><Icon name="edit" size={16} />{t('res.editFamily')}</Link>
      </header>

      <section className="figs" aria-live="polite" aria-label={t('map.summary')}>
        <div className="fig">
          <b className="num">{c.claimable}</b>
          <span>{t('map.schemes', { members: results.length })}</span>
        </div>
        {money.yearly > 0 && (
          <div className="fig money">
            <b className="num">{inr(money.yearly)}</b>
            <span>{t('map.yearly')}</span>
          </div>
        )}
        {money.cover > 0 && (
          <div className="fig">
            <b className="num">{inrShort(money.cover)}</b>
            <span>{t('map.cover')}</span>
          </div>
        )}
        {c.need > 0 && (
          <a className="fig need" href="#ni-h">
            <b className="num">{c.need}</b>
            <span>{t('map.need')}</span>
          </a>
        )}
      </section>
      <p className="fig-note">{t('map.amountNote')} {t('res.disclaimer')}</p>

      {skipped.length > 0 && <div className="skipped" role="status">{t('res.skipped', { names: skipped.map((s) => s.name || s.memberId || s).join(', ') })}</div>}

      <FamilyStrip story={story} total={results.length} selected={selected} onSelect={(id) => setSelected((cur) => cur === id ? null : id)} />
      <p className="legend" aria-hidden="true"><span><i /> {t('map.legMain')}</span><span><i className="b" /> {t('map.legBasic')}</span></p>

      <StartHere actions={actions} />

      {c.claimable === 0 && story.needInfo.length === 0 && <Empty title={t('res.noneTitle')}><p>{t('res.noneBody')}</p></Empty>}

      {story.household.length > 0 && (!selected || selected === 'all') && (
        <section className="sect" aria-labelledby="hh-h">
          <div className="block-head">
            <span className="block-ic" aria-hidden="true"><Icon name="home" /></span>
            <div>
              <h2 id="hh-h">{t('res.hhTitle')}</h2>
              <p>{t('res.hhSub')}</p>
            </div>
          </div>
          <ul className="lines">{story.household.map((g) => <SchemeRow key={g.scheme.id} scheme={g.scheme} entries={g.entries} hh {...rowProps} />)}</ul>
        </section>
      )}

      <section className="sect" aria-labelledby="pp-h">
        {(!selected || selected === 'all') && (
        <div className="block-head">
          <span className="block-ic" aria-hidden="true"><Icon name="people" /></span>
          <div>
            <h2 id="pp-h">{t('res.ppTitle')}</h2>
            <p>{t('res.ppSub')}</p>
          </div>
        </div>
        )}
        {story.people.filter((p) => !selected || selected === 'all' || selected === p.member.id).map((p, i) => {
          const y = personYearly(p);
          return (
            <div className="person" key={p.member.id} id={`p-${p.member.id}`}>
              <div className="person-head">
                <span className={`fam-av c${i % 5}`} aria-hidden="true">{initials(p.member.name)}</span>
                <div className="person-id">
                  <h3>{p.member.name}</h3>
                  <span className="meta">{t(`rel.${p.member.relation}`)} · {t('res.age', { n: p.member.age })}{p.member.occupation ? ` · ${t(`occ.${p.member.occupation}`)}` : ''}</span>
                </div>
                <span className="person-tally">
                  {t('res.personCount', { n: p.main.length + p.basic.length })}
                  {y > 0 && <b className="num">{t('map.perYear', { v: inr(y) })}</b>}
                </span>
              </div>
              {p.main.length === 0 && p.basic.length === 0 && <p className="muted small person-none">{t('res.memberNone')}</p>}
              {p.main.length > 0 && <ul className="lines">{p.main.map((e) => <SchemeRow key={e.scheme.id} scheme={e.scheme} entries={[e]} {...rowProps} />)}</ul>}
              {p.basic.length > 0 && (
                <details className="basic">
                  <summary><span className="caret" aria-hidden="true" /><span><b>{t('res.basic', { n: p.basic.length })}</b> <span className="faint">{p.basic.map((e) => L(e.scheme.name)).join(' · ')}</span></span></summary>
                  <ul className="lines">{p.basic.map((e) => <SchemeRow key={e.scheme.id} scheme={e.scheme} entries={[e]} {...rowProps} />)}</ul>
                </details>
              )}
            </div>
          );
        })}
      </section>

      {story.needInfo.length > 0 && (
        <section className="sect need-block" aria-labelledby="ni-h">
          <div className="block-head">
            <span className="block-ic amber" aria-hidden="true">?</span>
            <div>
              <h2 id="ni-h">{t('res.niTitle')}</h2>
              <p>{t('res.niSub')}</p>
            </div>
          </div>
          <ul className="lines">
            {story.needInfo.map((g) => {
              const confirmOnly = g.fields.size === 1 && g.fields.has('isPregnant');
              return (
              <li className="line" key={g.scheme.id}>
                <div className="line-main">
                  <div className="line-text">
                    <Link className="line-name" to={`/schemes/${g.scheme.id}`}>{L(g.scheme.name)}</Link>
                    <p className="line-meta"><span className="who"><Icon name="people" size={14} />{g.entries.length >= results.length ? t('res.forEveryone', { n: g.entries.length }) : g.entries.map((e) => first(e.member.name)).join(', ')}</span>
                      <span className="reason r-unknown">{confirmOnly ? t('res.niConfirm') : t('why.add', { field: [...g.fields].map((f) => t(`field.${f}`)).join(', ') })}</span></p>
                  </div>
                  <div className="line-side"><AmountTag scheme={g.scheme} />{!confirmOnly && <Link className="btn sm" to="/family">{t('nba.ctaDetail')}</Link>}</div>
                </div>
              </li>
              );
            })}
          </ul>
        </section>
      )}

      <Grid results={results} story={story} />

      {story.notEligible.length > 0 && (
        <section className="sect not-block">
          <label className="switch"><input type="checkbox" checked={showNot} onChange={(e) => setShowNot(e.target.checked)} /><span>{t('res.showNotN', { n: story.notEligible.length })}</span></label>
          {showNot && (
            <ul className="lines muted-lines">
              {story.notEligible.map((g) => {
                const e = g.entries[0]; const r = keyReason(e.match, g.scheme);
                return (
                  <li className="line" key={g.scheme.id}>
                    <div className="line-main">
                      <div className="line-text">
                        <Link className="line-name" to={`/schemes/${g.scheme.id}`}>{L(g.scheme.name)}</Link>
                        {r.check && <p className="line-meta"><span className="reason r-unmet">{t('why.notMetBecause', { rule: L(r.check.label) })}</span></p>}
                      </div>
                      <div className="line-side"><StatusChip status="not-eligible" /></div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      {toast && <Toast to="/tracker" cta={t('toast.view')} onDone={closeToast}>{t('toast.saved', { scheme: toast })}</Toast>}
    </>
  );
}
