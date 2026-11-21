import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { API } from '../api/client.js';
import { useAsync, listOf } from '../lib/useAsync.js';
import { Icon } from '../components/Brand.jsx';

// A static preview built from the real map components' styles, labelled as a sample.
function Preview() {
  const { t } = useI18n();
  return (
    <figure className="preview" aria-label={t('land.sampleLabel')}>
      <figcaption className="preview-bar"><span>{t('land.sampleBar')}</span><span className="tag">{t('land.sampleTag')}</span></figcaption>
      <div className="preview-body">
        <div className="pv-figs">
          <div><b className="num">3</b><span>{t('land.pvSchemes')}</span></div>
          <div className="money"><b className="num">₹6,000</b><span>{t('land.pvYearly')}</span></div>
        </div>
        <div className="pv-people">
          <div className="pv-person">
            <span className="fam-av c0" aria-hidden="true">MR</span>
            <div><b>{t('land.sampleWho1')}</b><span className="dots" aria-hidden="true"><i /><i /><i className="b" /></span></div>
          </div>
          <div className="pv-person">
            <span className="fam-av c1" aria-hidden="true">KR</span>
            <div><b>{t('land.sampleWho2')}</b><span className="dots" aria-hidden="true"><i /></span></div>
          </div>
        </div>
        <ul className="pv-lines">
          <li><span>PM-KISAN</span><span className="amt cash num">₹6,000 / {t('land.pvYear')}</span></li>
          <li><span>{t('land.sampleScheme3')}</span><span className="faint small">{t('land.pvScholar')}</span></li>
          <li><span>{t('land.sampleScheme2')}</span><span className="chip likely">{t('status.likely')}</span></li>
        </ul>
        <div className="pv-step"><span className="step-n" aria-hidden="true">1</span><span>{t('land.pvStep')}</span></div>
      </div>
    </figure>
  );
}

export default function Landing() {
  const { t } = useI18n();
  const { data, error, loading } = useAsync(() => API.schemes(), []);
  const count = listOf(data).length;
  return (
    <>
      <section className="hero" aria-labelledby="h-land">
        <div className="hero-copy">
          <span className="kicker">{t('land.kicker')}</span>
          <h1 id="h-land">{t('land.title')}</h1>
          <p className="lede">{t('land.lede')}</p>
          <div className="cta-row">
            <Link className="btn primary lg" to="/family">{t('land.cta')} <Icon name="arrow" className="arr" /></Link>
            <Link className="btn lg" to="/schemes">{t('land.browse')}</Link>
          </div>
          <ul className="trust" aria-live="polite">
            <li>
              {loading && <span className="skel" style={{ width: 60, display: 'inline-block', margin: 0 }} />}
              {error && <span>{t('land.countErr')}</span>}
              {!loading && !error && <><b className="num">{count}</b> {t('land.count')}</>}
            </li>
            <li><b>EN · தமிழ்</b> {t('land.trustLang')}</li>
            <li><b>{t('land.trustGuestB')}</b> {t('land.trustGuest')}</li>
          </ul>
        </div>
        <Preview />
      </section>
      <section className="how" aria-label={t('land.howLabel')}>
        {[1, 2, 3].map((n) => (
          <div key={n} className="how-step">
            <span className="how-n num">{n}</span>
            <h3>{t(`land.how${n}t`)}</h3>
            <p>{t(`land.how${n}d`)}</p>
          </div>
        ))}
      </section>
      <p className="demo-note"><span className="prov-b">{t('prov.demo')}</span> {t('land.demoNote')}</p>
    </>
  );
}
