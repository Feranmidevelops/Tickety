import type { ReactNode } from 'react';
import './statcard.css';

type Tone = 'blue' | 'amber' | 'green' | 'red';

export function StatCard({ label, value, tone, icon }: {
  label: string; value: number | string; tone: Tone; icon: ReactNode;
}) {
  return (
    <div className="statcard card">
      <span className={`statcard__icon statcard__icon--${tone}`}>{icon}</span>
      <div className="statcard__body">
        <div className="statcard__value">{value}</div>
        <div className="statcard__label">{label}</div>
      </div>
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="statrow">{children}</div>;
}
