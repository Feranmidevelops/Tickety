import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'tickety.theme';

export function ThemeToggle() {
  // Default to light (matches the design); dark is opt-in and remembered once chosen.
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(KEY) as Theme) || 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return (
    <button
      className="btn btn--ghost btn--sm"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
