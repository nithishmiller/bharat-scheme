import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { API } from '../api/client.js';
import { useAsync } from '../lib/useAsync.js';
import { Empty, ErrorBox, PageHead, Provenance, fmtDate } from '../components/Common.jsx';
import { Icon } from '../components/Brand.jsx';
import { AmountTag } from './Results.jsx';
import { loadPick } from './Browse.jsx';
import PhotoFrame from '../components/photo/PhotoFrame.jsx';
import { getPagePhoto } from '../components/photo/captions.js';

// Side-by-side view of 2-3 schemes, built only from the scheme data the API already returns.
export default function Compare() {
  const { t, L, LA, lang } = useI18n();
  const cmpPhoto = getPagePhoto('compareBanner', lang);
  const [sp] = useSearchParams();
  const ids = (sp.get('ids') || loadPick().join(',')).split(',').filter(Boolean).slice(0, 3);
  const { data, error, loading, reload } = useAsync(() => Promise.all(ids.map((id) => API.scheme(id))), [ids.join(',')]);
  const list = data || [];
  const head = <PageHead kicker={t('cmp.kicker')} title={t('cmp.title')} sub={t('cmp.sub')}><Link className="btn sm" to="/schemes">← {t('cmp.back')}</Link></PageHead>;
  if (ids.length < 2) return <>{head}<Empty title={t('cmp.emptyTitle')} icon="compare"><p>{t('cmp.emptyBody')}</p><Link className="btn primary" to="/schemes">{t('nav.schemes')}</Link></Empty></>;
  if (loading) return <>{head}<div className="skel block" style={{ height: 420 }} /></>;
  if (error) return <>{head}<ErrorBox error={error} onRetry={reload} /></>;
  const rows = [
    ['cmp.get', (s) => <><AmountTag scheme={s} /><ul className="ticks">{LA(s.benefits).map((b, i) => <li key={i}>{b}</li>)}</ul></>],
    ['cmp.who', (s) => <ul className="rules-plain">{(s.rules || []).map((r) => <li key={r.id}>{L(r.label)}</li>)}</ul>],
    ['cmp.docs', (s) => <><b className="num">{t('res.docsN', { n: (s.documents || []).length })}</b><ul className="plain">{(s.documents || []).map((d) => <li key={d}>{d}</li>)}</ul></>],
    ['cmp.how', (s) => <ol className="steps-num sm">{LA(s.howToApply).map((b, i) => <li key={i}>{b}</li>)}</ol>],
    ['cmp.run', (s) => <>{s.level === 'state' ? s.state || t('level.state') : t('level.central')}<div className="faint small">{s.ministry}</div></>],
    ['det.deadline', (s) => (s.deadline ? fmtDate(s.deadline) : t('det.noDeadline'))],
  ];
  return (
    <>
      {head}
      <div className="cmp-banner" style={{ margin: '16px 0 24px 0' }}>
        <PhotoFrame
          variant="strip"
          image={cmpPhoto.image}
          alt={cmpPhoto.alt}
          title={cmpPhoto.title}
          text={cmpPhoto.text}
        />
      </div>
      {/* Desktop: table */}
      <div className="cmp-wrap cmp-desktop" role="region" aria-label={t('cmp.title')} tabIndex={0}>
        <table className="cmp" style={{ '--cols': list.length }}>
          <thead>
            <tr>
              <td className="cmp-corner" />
              {list.map((s) => (
                <th key={s.id} scope="col">
                  <span className="tag">{t(`cat.${s.category}`)}</span>
                  <Link to={`/schemes/${s.id}`} className="cmp-name">{L(s.name)}</Link>
                  <p className="faint small">{L(s.summary)}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, render]) => (
              <tr key={k}>
                <th scope="row">{t(k)}</th>
                {list.map((s) => <td key={s.id}>{render(s)}</td>)}
              </tr>
            ))}
            <tr>
              <th scope="row">{t('cmp.next')}</th>
              {list.map((s) => (
                <td key={s.id}>
                  <Link className="btn sm" to={`/schemes/${s.id}`}>{t('res.viewScheme')} <Icon name="arrow" size={14} className="arr" /></Link>
                  <p className="small faint" style={{ marginTop: 8 }}>{t('det.refNote', { host: safe(s.officialUrl) })}</p>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {/* Mobile: stacked cards */}
      <div className="cmp-stack">
        {list.map((s) => (
          <section key={s.id} className="cmp-card">
            <span className="tag">{t(`cat.${s.category}`)}</span>
            <Link to={`/schemes/${s.id}`} className="cmp-name">{L(s.name)}</Link>
            <p className="faint small" style={{ margin: '4px 0 12px' }}>{L(s.summary)}</p>
            {rows.map(([k, render]) => (
              <div key={k} className="cmp-row">
                <span className="cmp-label">{t(k)}</span>
                <div>{render(s)}</div>
              </div>
            ))}
            <div className="cmp-row" style={{ borderBottom: 0 }}>
              <Link className="btn sm" to={`/schemes/${s.id}`}>{t('res.viewScheme')} <Icon name="arrow" size={14} className="arr" /></Link>
            </div>
          </section>
        ))}
      </div>
      <Provenance />
    </>
  );
}
const safe = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u || ''; } };
