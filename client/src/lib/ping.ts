let ctx: AudioContext | null = null;

/** Play a short two-note chime to announce something (e.g. a ticket assigned to you).
 *  Generated with the Web Audio API so there's no audio asset to ship, and best-effort:
 *  if audio is unavailable or blocked by autoplay rules, it silently does nothing. */
export function playPing(): void {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    [880, 1174.66].forEach((freq, i) => {   // A5 → D6
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  } catch {
    /* audio not available — ignore */
  }
}
