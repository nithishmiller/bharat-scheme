import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API, getToken, setToken } from '../api/client.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());
  useEffect(() => {
    if (!getToken()) return;
    API.me().then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  const login = useCallback(async (email, password) => {
    const r = await API.login({ email, password });
    setToken(r.token); setUser(r.user); return r.user;
  }, []);
  const register = useCallback(async (name, email, password) => {
    const r = await API.register({ name, email, password });
    setToken(r.token); setUser(r.user); return r.user;
  }, []);
  const logout = useCallback(() => { setToken(null); setUser(null); }, []);
  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
