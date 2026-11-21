import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.json';
import ta from './ta.json';

const DICTS = { en, ta };
const Ctx = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => (localStorage.getItem('bs_lang') === 'ta' ? 'ta' : 'en'));
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem('bs_lang', lang);
  }, [lang]);
  const t = useCallback(
    (key, vars) => {
      let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
      if (vars) Object.entries(vars).forEach(([k, v]) => (s = s.replaceAll(`{${k}}`, v)));
      return s;
    },
    [lang],
  );
  // pick the {en,ta} field of scheme content, falling back to English
  const L = useCallback((o) => (o && typeof o === 'object' ? o[lang] || o.en || '' : o ?? ''), [lang]);
  const LA = useCallback((o) => (o && typeof o === 'object' && !Array.isArray(o) ? o[lang]?.length ? o[lang] : o.en || [] : o || []), [lang]);
  const value = useMemo(() => ({ lang, setLang: setLangState, t, L, LA }), [lang, t, L, LA]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
