import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.json';
import as from './as.json';
import bn from './bn.json';
import brx from './brx.json';
import doi from './doi.json';
import gu from './gu.json';
import hi from './hi.json';
import kn from './kn.json';
import ks from './ks.json';
import kok from './kok.json';
import mai from './mai.json';
import ml from './ml.json';
import mni from './mni.json';
import mr from './mr.json';
import ne from './ne.json';
import or from './or.json';
import pa from './pa.json';
import sa from './sa.json';
import sat from './sat.json';
import sd from './sd.json';
import ta from './ta.json';
import te from './te.json';
import ur from './ur.json';

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', dir: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', dir: 'ltr' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', dir: 'ltr' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر', dir: 'rtl' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', dir: 'ltr' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', dir: 'ltr' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr' },
  { code: 'mni', name: 'Manipuri', nativeName: 'ꯃꯩꯇꯩꯂꯣꯟ', dir: 'ltr' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', dir: 'ltr' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', dir: 'ltr' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', dir: 'ltr' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', dir: 'ltr' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', dir: 'rtl' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl' }
];

const DICTS = {
  en, as, bn, brx, doi, gu, hi, kn, ks, kok, mai, ml, mni, mr, ne, or, pa, sa, sat, sd, ta, te, ur
};

const RTL_LANGS = new Set(['ks', 'sd', 'ur']);
const Ctx = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('bs_lang');
    return saved && DICTS[saved] ? saved : 'en';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    if (RTL_LANGS.has(lang)) {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
    localStorage.setItem('bs_lang', lang);
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      let s = DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
      if (vars) Object.entries(vars).forEach(([k, v]) => (s = s.replaceAll(`{${k}}`, v)));
      return s;
    },
    [lang],
  );

  // pick the {en,ta,...} field of scheme content, falling back to English
  const L = useCallback((o) => (o && typeof o === 'object' ? o[lang] || o.en || '' : o ?? ''), [lang]);
  const LA = useCallback((o) => (o && typeof o === 'object' && !Array.isArray(o) ? o[lang]?.length ? o[lang] : o.en || [] : o || []), [lang]);

  const value = useMemo(() => ({ lang, setLang: setLangState, t, L, LA, languages: LANGUAGES }), [lang, t, L, LA]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
