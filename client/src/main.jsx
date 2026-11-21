import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { I18nProvider } from './i18n/index.jsx';
import { AuthProvider } from './lib/auth.jsx';
import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-tamil';
import '@fontsource-variable/anek-tamil';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/map.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
