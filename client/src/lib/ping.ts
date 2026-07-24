let ctx: AudioContext | null = null;

type PingKind = 'chime' | 'blip';

/** Play a short sound. 'chime' = two ascending notes (a ticket assigned to you); 'blip' = one
 *  softer note (a new ticket in the queue). Generated with the Web Audio API so there's no audio
 *  asset to ship, and best-effort: if audio is unavailable or blocked by autoplay rules, it
 *  silently does nothing. */
export function playPing(kind: PingKind = 'chime'): void {
  try {
    const AC = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    const notes = kind === 'chime' ? [880, 1174.66] : [660];   // A5→D6, or a single soft E5
    const peak = kind === 'chime' ? 0.22 : 0.13;
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  } catch {
    /* audio not available — ignore */
  }
}
