import type { PresenceStatus } from '../lib/types';
import './presence.css';

const LABEL: Record<PresenceStatus, string> = { Online: 'Online', Away: 'Away', Offline: 'Offline' };

export function PresenceDot({ status, withLabel = true }: { status: PresenceStatus; withLabel?: boolean }) {
  return (
    <span className={`presence presence--${status}`}>
      <span className="presence__dot" />
      {withLabel && <span className="presence__label">{LABEL[status]}</span>}
    </span>
  );
}
