import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header.jsx';
import { Skeleton } from './components/Common.jsx';
import { useAuth } from './lib/auth.jsx';
import { useI18n } from './i18n/index.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Wizard from './pages/Wizard.jsx';
import Results from './pages/Results.jsx';
import SchemeDetail from './pages/SchemeDetail.jsx';
import Browse from './pages/Browse.jsx';
import Tracker from './pages/Tracker.jsx';
import Admin from './pages/Admin.jsx';
import Compare from './pages/Compare.jsx';
import { Mark } from './components/Brand.jsx';

function Guard({ children, admin }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Skeleton />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { t } = useI18n();
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <>
      <Header />
      <main id="main" className="wrap" tabIndex={-1}>
        <div className="page-in" key={loc.pathname}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/family" element={<Wizard />} />
          <Route path="/results" element={<Results />} />
          <Route path="/schemes" element={<Browse />} />
          <Route path="/schemes/compare" element={<Compare />} />
          <Route path="/schemes/:id" element={<SchemeDetail />} />
          <Route path="/tracker" element={<Guard><Tracker /></Guard>} />
          <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
      </main>
      <footer className="site-foot">
        <div className="wrap">
          <span className="foot-brand"><Mark />Bharat Scheme</span>
          <span>{t('footer.note')}</span>
        </div>
      </footer>
    </>
  );
}
