import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useI18n, LANGUAGES } from '../i18n/index.jsx';
import { useAuth } from '../lib/auth.jsx';
import { API } from '../api/client.js';
import { listOf } from '../lib/useAsync.js';
import { ErrorBox, Skeleton } from './Common.jsx';
import { Icon, Wordmark } from './Brand.jsx';

function Drawer({ onClose, onChanged }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState({ loading: true, items: [], error: null });
  const closeRef = useRef(null);
  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    API.notifications().then((r) => setState({ loading: false, items: listOf(r, 'notifications'), error: null }), (error) => setState({ loading: false, items: [], error }));
  };
  useEffect(load, []);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const read = async (n) => {
    if (n.read) return;
    try { await API.readNotification(n.id); setState((s) => ({ ...s, items: s.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)) })); onChanged(); } catch { /* keep unread */ }
  };
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={t('notif.title')}>
        <header>
          <h2 style={{ fontSize: 22 }}>{t('notif.title')}</h2>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label={t('common.close')}><Icon name="close" /></button>
        </header>
        <div className="body">
          {state.loading && <div style={{ padding: 16 }}><Skeleton rows={4} heading={false} /></div>}
          {state.error && <div style={{ padding: 16 }}><ErrorBox error={state.error} onRetry={load} /></div>}
          {!state.loading && !state.error && state.items.length === 0 && <div className="empty" style={{ margin: 20 }}><Icon name="bell" size={40} className="empty-mark" /><p>{t('notif.empty')}</p></div>}
          {state.items.map((n) => (
            <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`}>
              <b>{typeof n.title === 'object' ? n.title[lang] || n.title.en : n.title}</b>
              <div>{typeof n.body === 'object' ? n.body[lang] || n.body.en : n.body || n.message}</div>
              <div className="row between" style={{ marginTop: 6 }}>
                <time dateTime={n.createdAt}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</time>
                {!n.read && <button className="linkbtn small" onClick={() => read(n)}>{t('notif.markRead')}</button>}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

export default function Header() {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const count = () => user && API.notifications().then((r) => setUnread(listOf(r, 'notifications').filter((n) => !n.read).length)).catch(() => {});
  useEffect(() => { if (user) count(); else setUnread(0); }, [user]); // eslint-disable-line
  return (
    <header className="site-head">
      <a className="skip" href="#main">{t('common.skip')}</a>
      <div className="wrap bar">
        <Link to="/" className="brand" aria-label="Bharat Scheme, home"><Wordmark /></Link>
        <nav className="nav" aria-label={t('nav.label')}>
          <NavLink to="/results">{t('nav.results')}</NavLink>
          <NavLink to="/family">{t('nav.family')}</NavLink>
          <NavLink to="/schemes" end>{t('nav.schemes')}</NavLink>
          {user && <NavLink to="/tracker">{t('nav.tracker')}</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">{t('nav.admin')}</NavLink>}
        </nav>
        <div className="head-tools">
          <div className="lang-picker-wrap" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <label htmlFor="lang-select" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>{t('lang.label')}</label>
            <select
              id="lang-select"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label={t('lang.label')}
              style={{
                height: 32,
                padding: '0 24px 0 10px',
                borderRadius: '9999px',
                border: '1px solid var(--rule, #e4e1d8)',
                background: 'var(--sunken, #f5f4f0)',
                color: 'var(--ink-900, #0b2545)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                maxWidth: '115px',
                outline: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230b2545' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center'
              }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} lang={l.code} style={{ background: '#fff', color: '#0b2545' }}>
                  {l.nativeName}
                </option>
              ))}
            </select>
          </div>
          {user && (
            <button className="icon-btn" onClick={() => setOpen(true)} aria-label={t('notif.open', { n: unread })}>
              <Icon name="bell" />
              {unread > 0 && <span className="badge-count" aria-hidden="true">{unread}</span>}
            </button>
          )}
          {user ? (
            <span className="account">
              <span className="avatar" aria-hidden="true">{(user.name || user.email || '?').trim()[0].toUpperCase()}</span>
              <button className="linkbtn small logout-text" onClick={() => { logout(); nav('/'); }}>{t('auth.logout')}</button>
              <button className="icon-btn logout-icon" onClick={() => { logout(); nav('/'); }} aria-label={t('auth.logout')}><Icon name="close" size={18} /></button>
            </span>
          ) : (
            <Link className="btn sm" to="/login">{t('auth.login')}</Link>
          )}
        </div>
      </div>
      {open && <Drawer onClose={() => setOpen(false)} onChanged={count} />}
    </header>
  );
}
