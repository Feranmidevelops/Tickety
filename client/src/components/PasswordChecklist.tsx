import { IconCheck } from './icons';
import './passwordchecklist.css';

export interface PasswordRules {
  length: boolean;
  upper: boolean;
  digit: boolean;
  special: boolean;
}

/** Client-side mirror of the server password policy (see Identity options in Program.cs).
 *  Keep these rules in step with the server so a fully-green checklist always passes. */
export function checkPassword(pw: string): PasswordRules {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

export const passwordValid = (r: PasswordRules): boolean =>
  r.length && r.upper && r.digit && r.special;

const RULES: { key: keyof PasswordRules; label: string }[] = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'upper', label: 'One capital letter (A–Z)' },
  { key: 'digit', label: 'One number (0–9)' },
  { key: 'special', label: 'One special character (!@#$…)' },
];

/** Live requirements list that ticks each rule green as the password satisfies it. */
export function PasswordChecklist({ value }: { value: string }) {
  const rules = checkPassword(value);
  return (
    <ul className="pwcheck" aria-label="Password requirements">
      {RULES.map(({ key, label }) => {
        const ok = rules[key];
        return (
          <li key={key} className={`pwcheck__item ${ok ? 'pwcheck__item--ok' : ''}`}>
            <span className="pwcheck__mark">
              {ok ? <IconCheck width={11} height={11} /> : <span className="pwcheck__dot" />}
            </span>
            {label}
          </li>
        );
      })}
    </ul>
  );
}
