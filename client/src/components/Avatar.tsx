import './avatar.css';

// A small palette of pleasant avatar backgrounds; picked deterministically per name.
const COLORS = [
  '#5e6ad2', '#2fbf7f', '#f0a92b', '#e14d78', '#12a99a',
  '#3b82f6', '#a855c9', '#e5844d', '#0ea5b5', '#6b74e0',
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const color = COLORS[hash(name) % COLORS.length];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
      title={name}
      aria-hidden
    >
      {initials(name || '?')}
    </span>
  );
}

export function AvatarLabel({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span className="avatarlabel">
      <Avatar name={name} size={size} />
      <span className="avatarlabel__name">{name}</span>
    </span>
  );
}
