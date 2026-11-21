import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { Icon } from './Brand.jsx';

export function StatusChip({ status }) {
  const { t } = useI18n();
  const key = status === 'eligible' ? 'status.eligible' : status === 'likely' ? 'status.likely' : 'status.not';
  return <span className={`chip ${status}`}>{t(key)}</span>;
}

export function Provenance({ scheme }) {
  const { t } = useI18n();
  const src = scheme?.sourceUrl ? safeHost(scheme.sourceUrl) : 'myscheme.gov.in';
  const date = scheme?.lastVerified ? fmtDate(scheme.lastVerified) : '21 Nov 2026';
  return (
    <div className="prov" role="note">
      <b>{t('prov.demo')}</b>
      <span className="dot">{t('prov.source')}: {src}</span>
      <span className="dot">{t('prov.verified')} {date}</span>
    </div>
  );
}
function safeHost(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }
export function fmtDate(d) {
  const x = new Date(d);
  return isNaN(x) ? String(d) : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Skeleton({ rows = 4, heading = true }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{t('common.loading')}</span>
      {heading && <div className="skel h" />}
      {Array.from({ length: rows }, (_, i) => <div key={i} className={`skel ${i % 3 === 1 ? 's' : 'w'}`} />)}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="alert" role="alert">
      <span><strong>{t('common.error')}</strong> {error?.status === 0 ? t('common.network') : error?.message}</span>
      {onRetry && <button className="btn sm" onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  );
}

export function Empty({ title, icon = 'doc', children }) {
  return (
    <div className="empty">
      <Icon name={icon} size={56} className="empty-mark" />
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function PageHead({ kicker, title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        {kicker && <div className="kicker">{kicker}</div>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// Confirmation that dismisses itself; announced politely to screen readers.
export function Toast({ children, to, cta, onDone, ms = 4200 }) {
  useEffect(() => { const h = setTimeout(onDone, ms); return () => clearTimeout(h); }, [onDone, ms]);
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="tick" aria-hidden="true">✓</span>
      <span>{children}</span>
      {to && <Link to={to}>{cta}</Link>}
    </div>
  );
}

export const Spinner = () => <span className="spin" aria-hidden="true" />;
