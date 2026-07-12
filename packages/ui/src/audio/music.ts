import type { Faction } from "@lotr-tcg/engine";

/**
 * Generative ambient music, fully synthesized — a soft two-note drone plus a
 * sparse melody walked over a faction-flavored scale. All notes are scheduled
 * ahead on the AudioContext clock (not setTimeout), so browser timer
 * throttling in background tabs can't stall or bunch the music.
 */

interface FactionTheme {
  /** Drone frequencies (root + colour tone). */
  drone: [number, number];
  /** Melody note pool, walked at random. */
  scale: number[];
  /** Seconds between melody notes (approximate). */
  pace: number;
}

const THEMES: Record<Faction, FactionTheme> = {
  // A-major pentatonic warmth for the Shire and the Elves.
  fellowship: { drone: [110, 164.81], scale: [440, 493.88, 554.37, 659.25, 739.99], pace: 2.6 },
  // Open-fifth D mixolydian — horns of the Mark.
  rohan: { drone: [146.83, 220], scale: [587.33, 659.25, 739.99, 880, 987.77], pace: 2.2 },
  // G-minor gravity for the White City under siege.
  gondor: { drone: [98, 146.83], scale: [392, 440, 466.16, 587.33, 698.46], pace: 3.0 },
  // Low C with a lurking tritone — the Shadow.
  mordor: { drone: [65.41, 92.5], scale: [261.63, 277.18, 311.13, 369.99, 415.3], pace: 3.4 },
  neutral: { drone: [110, 155.56], scale: [440, 523.25, 587.33, 659.25, 783.99], pace: 2.8 },
};

const SCHEDULE_HORIZON_S = 24; // how far ahead melody notes are booked
const REFILL_EVERY_MS = 15000;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let droneNodes: OscillatorNode[] = [];
let refillTimer: ReturnType<typeof setInterval> | null = null;
let scheduledUntil = 0;
let currentTheme: FactionTheme | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function scheduleMelody(ac: AudioContext, theme: FactionTheme, until: number): void {
  if (!masterGain) return;
  let t = Math.max(scheduledUntil, ac.currentTime + 0.1);
  while (t < until) {
    const freq = theme.scale[Math.floor(Math.random() * theme.scale.length)]!;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const dur = theme.pace * 0.9;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.1);
    t += theme.pace * (0.7 + Math.random() * 0.9);
  }
  scheduledUntil = until;
}

export function startMusic(faction: Faction): void {
  const ac = audioContext();
  if (!ac) return;
  stopMusic(); // clean slate if a theme is already playing

  const theme = THEMES[faction];
  currentTheme = theme;
  masterGain = ac.createGain();
  masterGain.gain.setValueAtTime(0, ac.currentTime);
  masterGain.gain.linearRampToValueAtTime(1, ac.currentTime + 2.5); // fade in
  masterGain.connect(ac.destination);

  droneNodes = theme.drone.map((freq) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.value = 0.035;
    osc.connect(g).connect(masterGain!);
    osc.start();
    return osc;
  });

  scheduledUntil = 0;
  scheduleMelody(ac, theme, ac.currentTime + SCHEDULE_HORIZON_S);
  refillTimer = setInterval(() => {
    if (ctx && currentTheme) scheduleMelody(ctx, currentTheme, ctx.currentTime + SCHEDULE_HORIZON_S);
  }, REFILL_EVERY_MS);
}

export function stopMusic(): void {
  if (refillTimer) {
    clearInterval(refillTimer);
    refillTimer = null;
  }
  for (const osc of droneNodes) {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
  }
  droneNodes = [];
  if (masterGain && ctx) {
    const g = masterGain;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    setTimeout(() => g.disconnect(), 600);
  }
  masterGain = null;
  currentTheme = null;
  scheduledUntil = 0;
}

export function isMusicPlaying(): boolean {
  return currentTheme !== null;
}
