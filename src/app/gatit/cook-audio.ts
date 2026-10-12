/**
 * Sunetele modului de gătit, generate cu Web Audio (fără fișiere).
 * iOS pornește sunetul doar după o atingere, așa că îl deblocăm la prima atingere din pagină.
 */

let ctx: AudioContext | null = null;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/** Pe iOS (16.4+), „playback” sună și cu telefonul pe silențios; îl cerem doar cât sună alarma. */
function audioSession(type: "playback" | "auto") {
  try {
    const s = (navigator as AudioSessionNavigator).audioSession;
    if (s && s.type !== type) s.type = type;
  } catch {}
}

export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    // Un sunet mut, ca iOS să considere contextul pornit de utilizator.
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.01);
  } catch {}
}

function play(notes: [freq: number, at: number, dur: number][], volume: number) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const t0 = ctx.currentTime + 0.02;
    for (const [freq, at, dur] of notes) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(volume, t0 + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + at);
      o.stop(t0 + at + dur + 0.05);
    }
  } catch {}
}

/** Alarma de final: trei note urcătoare, de două ori. Se repetă cât timp nu o oprești. */
export function alarm() {
  audioSession("playback");
  play(
    [
      [880, 0, 0.18], [1175, 0.2, 0.18], [1568, 0.4, 0.3],
      [880, 0.9, 0.18], [1175, 1.1, 0.18], [1568, 1.3, 0.3],
    ],
    0.5,
  );
  navigator.vibrate?.([300, 150, 300, 150, 300]);
}

/** Memento scurt (ex. „scutură coșul la jumătate”). */
export function chime() {
  play([[1047, 0, 0.3], [1319, 0.18, 0.45]], 0.35);
  navigator.vibrate?.(200);
}

export function quietAudio() {
  audioSession("auto");
}
