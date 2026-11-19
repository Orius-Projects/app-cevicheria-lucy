const SOUND_STORAGE_KEY = 'cevicheria_sound_enabled';

/**
 * Consulta si el sonido de avisos está habilitado en almacenamiento local.
 */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(SOUND_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/**
 * Habilita o deshabilita el sonido de avisos.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Silencioso ante fallos de storage
  }
}

/**
 * Reproduce un tono armónico sintetizado con la API WebAudio cuando un pedido está listo.
 * Si AudioContext está bloqueado por políticas del navegador o no disponible,
 * captura el error silenciosamente (solo debug log) para no interrumpir el flujo visual.
 */
export function playReadySound(): void {
  if (typeof window === 'undefined') return;
  if (!isSoundEnabled()) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';

    // Secuencia de dos tonos armoniosos: Re5 (587.33 Hz) a La5 (880 Hz)
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);

    osc.onended = () => {
      try {
        ctx.close().catch(() => {});
      } catch {
        // Silencioso
      }
    };
  } catch (err) {
    // Si falla o está bloqueado, solo debug log: el aviso visual permanece
    console.debug('AudioContext no disponible o bloqueado:', err);
  }
}
