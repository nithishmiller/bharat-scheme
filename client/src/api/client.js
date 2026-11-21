import { mockHandler } from './mock.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === '1' || import.meta.env.VITE_USE_MOCK === 'true';
export const isMock = USE_MOCK;
const TOKEN_KEY = 'bs_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  if (USE_MOCK) return mockHandler(method, path, body, getToken());
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server');
  }
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const e = data?.error || {};
    throw new ApiError(res.status, e.code || 'ERROR', e.message || `Request failed (${res.status})`);
  }
  return data;
}

const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o || {}).forEach(([k, v]) => v !== '' && v != null && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const API = {
  login: (b) => api('/auth/login', { method: 'POST', body: b, auth: false }),
  register: (b) => api('/auth/register', { method: 'POST', body: b, auth: false }),
  me: () => api('/me'),
  family: () => api('/family'),
  saveHousehold: (b) => api('/family/household', { method: 'PUT', body: b }),
  addMember: (b) => api('/family/members', { method: 'POST', body: b }),
  updateMember: (id, b) => api(`/family/members/${id}`, { method: 'PUT', body: b }),
  deleteMember: (id) => api(`/family/members/${id}`, { method: 'DELETE' }),
  schemes: (f) => api(`/schemes${qs(f)}`, { auth: false }),
  scheme: (id) => api(`/schemes/${encodeURIComponent(id)}`, { auth: false }),
  categories: () => api('/categories', { auth: false }),
  recommend: (b) => api('/recommendations', { method: 'POST', body: b }),
  explain: (b) => api('/ai/explain', { method: 'POST', body: b }),
  ask: (b) => api('/ai/ask', { method: 'POST', body: b }),
  tracker: () => api('/tracker'),
  track: (b) => api('/tracker', { method: 'POST', body: b }),
  patchTracker: (id, b) => api(`/tracker/${id}`, { method: 'PATCH', body: b }),
  notifications: () => api('/notifications'),
  readNotification: (id) => api(`/notifications/${id}/read`, { method: 'POST' }),
  adminSchemes: () => api('/admin/schemes'),
  adminSave: (s, isNew) => (isNew ? api('/admin/schemes', { method: 'POST', body: s }) : api(`/admin/schemes/${encodeURIComponent(s.id)}`, { method: 'PUT', body: s })),
  adminDelete: (id) => api(`/admin/schemes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  analytics: () => api('/admin/analytics'),
};
