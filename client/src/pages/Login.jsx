import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../lib/auth.jsx';
import { ErrorBox, PageHead, Spinner } from '../components/Common.jsx';
import { Icon, Mark } from '../components/Brand.jsx';

export default function Login() {
  const { t } = useI18n();
  const { login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const done = (u) => nav(loc.state?.from || (u.role === 'admin' ? '/admin' : '/results'), { replace: true });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { done(mode === 'login' ? await login(f.email, f.password) : await register(f.name, f.email, f.password)); }
    catch (x) { setErr(x); } finally { setBusy(false); }
  };
  const fill = (email, password) => setF({ ...f, email, password });
  return (
    <div className="auth">
      <aside className="auth-side">
        <span className="big-mark"><Mark /></span>
        <h2>{t('auth.welcome')}</h2>
        <ul>
          {['auth.side1', 'auth.side2', 'auth.side3'].map((k) => <li key={k}><Icon name="check" />{t(k)}</li>)}
        </ul>
      </aside>
      <div className="auth-card">
      <PageHead kicker={t('auth.kicker')} title={mode === 'login' ? t('auth.login') : t('auth.register')} />
      <div className="demo-box">
        <strong>{t('auth.demo')}</strong>
        <div><code>demo@bharatscheme.in / demo1234</code><button type="button" className="linkbtn small" onClick={() => fill('demo@bharatscheme.in', 'demo1234')}>{t('auth.fill')}</button></div>
        <div><code>admin@bharatscheme.in / admin1234</code><button type="button" className="linkbtn small" onClick={() => fill('admin@bharatscheme.in', 'admin1234')}>{t('auth.fill')}</button></div>
      </div>
      <form onSubmit={submit} noValidate={false}>
        {mode === 'register' && (
          <div className="field"><label htmlFor="a-name">{t('auth.name')}</label><input id="a-name" type="text" required autoComplete="name" value={f.name} onChange={set('name')} /></div>
        )}
        <div className="field"><label htmlFor="a-email">{t('auth.email')}</label><input id="a-email" type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></div>
        <div className="field"><label htmlFor="a-pw">{t('auth.password')}</label><input id="a-pw" type="password" required minLength={mode === 'register' ? 6 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} /></div>
        {err && <div style={{ marginBottom: 12 }}><ErrorBox error={err} /></div>}
        <div className="row">
          <button className="btn primary" disabled={busy}>{busy && <Spinner />}{busy ? t('common.wait') : mode === 'login' ? t('auth.login') : t('auth.register')}</button>
          <button type="button" className="linkbtn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(null); }}>
            {mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
          </button>
        </div>
      </form>
      <div className="auth-guest">
        <p className="muted small">{t('auth.guestNote')}</p>
        <button className="btn block" onClick={() => nav('/family')}>{t('auth.guest')}</button>
      </div>
      </div>
    </div>
  );
}
