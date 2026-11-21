// Guest family lives only in this browser (localStorage); sent inline to /api/recommendations.
const KEY = 'bs_guest_family';
export const EMPTY_HOUSEHOLD = { state: 'Tamil Nadu', district: '', annualIncome: '', familySize: '', area: 'rural', category: 'general', bplCard: false, ownsHouse: false, rationCard: false };
export const newMember = (relation = 'self') => ({
  id: 'tmp-' + Math.random().toString(36).slice(2, 9), name: '', relation, age: '', gender: 'male', occupation: 'unemployed', education: 'none',
  isStudent: false, studyLevel: null, landHoldingAcres: null, isWidow: false, hasDisability: null, disabilityPercent: null, consentGiven: true, sensitiveConsent: false,
});
export const loadGuest = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
export const saveGuest = (f) => localStorage.setItem(KEY, JSON.stringify(f));
export const clearGuest = () => localStorage.removeItem(KEY);
// numbers typed in forms arrive as strings; send real types
export function cleanHousehold(h) {
  const n = (v) => (v === '' || v == null ? null : Number(v));
  return { ...h, annualIncome: n(h.annualIncome), familySize: n(h.familySize) };
}
export function cleanMember(m) {
  const n = (v) => (v === '' || v == null ? null : Number(v));
  const out = { ...m, age: n(m.age), landHoldingAcres: n(m.landHoldingAcres), disabilityPercent: n(m.disabilityPercent) };
  if (!out.sensitiveConsent) { out.hasDisability = null; out.disabilityPercent = null; }
  if (!out.isStudent) out.studyLevel = null;
  return out;
}
