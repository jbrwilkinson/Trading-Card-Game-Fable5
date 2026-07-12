/**
 * Fully synthesized SFX via the Web Audio API — no audio files to load or
 * license. (The plan originally called for Howler.js over mp3 assets; with no
 * recorded assets available, oscillator/noise synthesis keeps the game
 * self-contained. If real recordings are added later, only this module
 * changes — the SfxId vocabulary and useSoundEffects hook stay the same.)
 */
export type SfxId = "draw" | "play" | "attack" | "knockout" | "resolve" | "victory" | "defeat" | "turn";

let ctx: AudioContext | null = null;
let muted = false;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

function tone(
  ac: AudioContext,
  {
    freq,
    endFreq,
    type = "sine",
    duration,
    gain = 0.12,
    delay = 0,
  }: { freq: number; endFreq?: number; type?: OscillatorType; duration: number; gain?: number; delay?: number }
): void {
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noiseBurst(ac: AudioContext, { duration, gain = 0.18, delay = 0 }: { duration: number; gain?: number; delay?: number }): void {
  const t0 = ac.currentTime + delay;
  const length = Math.ceil(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t0);
}

export function playSfx(id: SfxId): void {
  if (muted) return;
  const ac = audioContext();
  if (!ac) return;

  switch (id) {
    case "draw":
      tone(ac, { freq: 520, endFreq: 880, type: "triangle", duration: 0.09, gain: 0.06 });
      break;
    case "play":
      tone(ac, { freq: 220, endFreq: 180, type: "triangle", duration: 0.14, gain: 0.11 });
      noiseBurst(ac, { duration: 0.06, gain: 0.05 });
      break;
    case "attack":
      noiseBurst(ac, { duration: 0.22, gain: 0.22 });
      tone(ac, { freq: 130, endFreq: 55, type: "sawtooth", duration: 0.28, gain: 0.14 });
      break;
    case "knockout":
      tone(ac, { freq: 320, endFreq: 70, type: "square", duration: 0.4, gain: 0.09 });
      break;
    case "resolve":
      tone(ac, { freq: 660, type: "sine", duration: 0.1, gain: 0.07 });
      tone(ac, { freq: 990, type: "sine", duration: 0.12, gain: 0.06, delay: 0.08 });
      break;
    case "turn":
      tone(ac, { freq: 392, type: "triangle", duration: 0.1, gain: 0.05 });
      break;
    case "victory":
      [392, 494, 587, 784].forEach((f, i) => tone(ac, { freq: f, type: "triangle", duration: 0.28, gain: 0.1, delay: i * 0.14 }));
      break;
    case "defeat":
      [220, 174, 147, 110].forEach((f, i) => tone(ac, { freq: f, type: "sawtooth", duration: 0.4, gain: 0.08, delay: i * 0.18 }));
      break;
  }
}
