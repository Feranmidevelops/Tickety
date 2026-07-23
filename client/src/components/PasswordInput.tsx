import { useState } from 'react';
import { IconEye, IconEyeOff } from './icons';
import './passwordinput.css';

interface Props {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
}

/** Password field with a show/hide eye toggle. */
export function PasswordInput({ id, value, onChange, placeholder, autoComplete, autoFocus, required }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwfield">
      <input
        id={id}
        className="input pwfield__input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
      />
      <button
        type="button"
        className="pwfield__toggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? <IconEyeOff width={17} height={17} /> : <IconEye width={17} height={17} />}
      </button>
    </div>
  );
}
