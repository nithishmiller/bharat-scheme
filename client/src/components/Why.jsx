import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { fmtValue, ruleOf } from '../lib/elig.js';

const ORDER = { unmet: 0, unknown: 1, met: 2 };
const GLYPH = { met: '✓', unknown: '?', unmet: '✗' };

// Rule-by-rule explanation in three visually distinct states.
export function WhyList({ match, scheme, member, household }) {
  const { t, L } = useI18n();
  const checks = [...(match.checks || [])].sort((a, b) => ORDER[a.result] - ORDER[b.result]);
  const valueOf = (f) => (f ? fmtValue(f, member?.[f] ?? household?.[f], t) : null);
  return (
    <ul className="why-list">
      {checks.map((c) => {
        const f = ruleOf(scheme, c)?.field || c.field;
        const v = valueOf(f);
        return (
          <li key={c.ruleId} className={`w-${c.result}`}>
            <span className="w-mark" aria-hidden="true">{GLYPH[c.result]}</span>
            <span className="w-body">
              <span className="w-state">{t(`why.${c.result}`)}</span>
              <span className="w-label">{L(c.label)}</span>
              {c.result === 'met' && v && <span className="w-note">{t('why.recorded', { v })}</span>}
              {c.result === 'unmet' && <span className="w-note">{v ? t('why.unmetVal', { v }) : t('why.unmetNoVal')}</span>}
              {c.result === 'unknown' && (
                <span className="w-note">
                  {f === 'isPregnant' ? t('res.niConfirm') : (<>{f ? t('why.add', { field: t(`field.${f}`) }) : t('check.missingGeneric')}{' '}
                  <Link to="/family">{t('why.addLink')}</Link></>)}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function StrengthNote({ match }) {
  const { t } = useI18n();
  const checks = match.checks || [];
  const met = checks.filter((c) => c.result === 'met').length;
  return <span className="strength">{t('res.rulesMet', { met, total: checks.length })}</span>;
}
