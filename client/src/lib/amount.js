// Reads money amounts that scheme data states in its English benefit text. Presentation only:
// nothing here decides eligibility, and an amount is shown only when the data states it plainly.
const num = (s) => Number(String(s).replace(/,/g, ''));

export function amountOf(scheme) {
  const lines = scheme?.benefits?.en || [];
  for (const b of lines) {
    if (/^premium/i.test(b)) continue;
    let m = b.match(/^₹([\d,]+) (?:per|every) month/i);
    if (m) return { kind: 'cash', yearly: num(m[1]) * 12, unit: 'month', value: num(m[1]) };
    m = b.match(/^₹([\d,]+) per year/i);
    if (m) return { kind: 'cash', yearly: num(m[1]), unit: 'year', value: num(m[1]) };
    m = b.match(/₹([\d.]+) lakh/i);
    if (m && /cover|accident|death/i.test(b)) return { kind: 'cover', value: Number(m[1]) * 100000, health: /health/i.test(b) };
    m = b.match(/pension of ₹([\d,]+)/i);
    if (m) return { kind: 'later', value: num(m[1]) };
  }
  return null;
}

export const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
export const inrShort = (n) => (n >= 100000 ? `₹${(n / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} lakh` : inr(n));

// Totals for the family: yearly cash where stated, and the largest health cover (cover is shared, not summed).
export function familyMoney(story) {
  let yearly = 0; let cover = 0; let life = 0; const seen = new Set();
  const add = (scheme, times = 1) => {
    if (!scheme || seen.has(scheme.id)) return;
    const a = amountOf(scheme);
    if (!a) return;
    if (a.kind === 'cash') yearly += a.yearly * times;
    if (a.kind === 'cover' && a.health) cover = Math.max(cover, a.value);
    if (a.kind === 'cover' && !a.health) life = Math.max(life, a.value);
  };
  story.household.forEach((g) => { add(g.scheme); seen.add(g.scheme.id); });
  story.people.forEach((p) => p.main.forEach((e) => { const a = amountOf(e.scheme); if (a?.kind === 'cash') yearly += a.yearly; else add(e.scheme); }));
  return { yearly, cover, life };
}

export function personYearly(person) {
  return person.main.reduce((sum, e) => { const a = amountOf(e.scheme); return a?.kind === 'cash' ? sum + a.yearly : sum; }, 0);
}
