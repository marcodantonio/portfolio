import { Howl } from "howler";

const SAMPLE_RATE = 22_050;
const TAU = Math.PI * 2;

export type IslandAudio = {
  setEnabled(enabled: boolean): void;
  setPaused(paused: boolean): void;
  step(): void;
  jump(): void;
  discover(): void;
  dispose(): void;
};

type Sound = {
  howl: Howl | null;
  failed: boolean;
  waitingForUnlock: boolean;
  volume: number;
  loop: boolean;
};

/** Small mono PCM WAVs keep the soundscape original and independent of remote assets. */
function wav(samples: Float32Array): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index));
  };
  writeText(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index++) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)));
  }
  return `data:audio/wav;base64,${btoa(chunks.join(""))}`;
}

function noiseGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x80000000 - 1;
  };
}

function surf(): string {
  const length = SAMPLE_RATE * 8;
  const overlap = Math.floor(SAMPLE_RATE * 0.18);
  const samples = new Float32Array(length + overlap);
  const noise = noiseGenerator(83217);
  let soft = 0;
  let low = 0;
  for (let index = 0; index < samples.length; index++) {
    const white = noise();
    soft += (white - soft) * 0.19;
    low += (white - low) * 0.008;
    const phase = index / length * TAU;
    const swell = 0.38 + 0.28 * (1 - Math.cos(phase)) + 0.09 * (1 - Math.cos(phase * 2 + 1));
    samples[index] = (soft - low) * swell * 0.32;
  }
  // Join the tail to the head without a click or a silent gap at the loop point.
  for (let index = 0; index < overlap; index++) {
    const mix = index / overlap;
    const smooth = mix * mix * (3 - 2 * mix);
    samples[index] = samples[length + index] * (1 - smooth) + samples[index] * smooth;
  }
  return wav(samples.subarray(0, length));
}

function footstep(): string {
  const duration = 0.14;
  const samples = new Float32Array(Math.ceil(SAMPLE_RATE * duration));
  const noise = noiseGenerator(39041);
  let soft = 0;
  for (let index = 0; index < samples.length; index++) {
    const time = index / SAMPLE_RATE;
    soft += (noise() - soft) * 0.3;
    const envelope = Math.min(1, time / 0.008) * Math.exp(-time * 30) * Math.min(1, (duration - time) / 0.03);
    const thud = Math.sin(TAU * (100 * time - 130 * time * time));
    samples[index] = (soft * 0.55 + thud * 0.16) * envelope;
  }
  return wav(samples);
}

function jumpTone(): string {
  const duration = 0.3;
  const samples = new Float32Array(Math.ceil(SAMPLE_RATE * duration));
  for (let index = 0; index < samples.length; index++) {
    const time = index / SAMPLE_RATE;
    const envelope = Math.sin(Math.PI * time / duration) ** 1.5 * Math.exp(-time * 4);
    const phase = TAU * (220 * time + 180 * time * time);
    samples[index] = (Math.sin(phase) + 0.12 * Math.sin(phase * 2)) * envelope * 0.24;
  }
  return wav(samples);
}

function discoveryChime(): string {
  const duration = 1.05;
  const samples = new Float32Array(Math.ceil(SAMPLE_RATE * duration));
  const notes = [523.25, 659.25, 783.99];
  for (let index = 0; index < samples.length; index++) {
    const time = index / SAMPLE_RATE;
    let value = 0;
    notes.forEach((frequency, note) => {
      const age = time - note * 0.115;
      if (age <= 0) return;
      const envelope = Math.min(1, age / 0.012) * Math.exp(-age * 5.5);
      const phase = TAU * frequency * age;
      value += (Math.sin(phase) + 0.22 * Math.sin(phase * 2.01) + 0.07 * Math.sin(phase * 3.9)) * envelope * 0.22;
    });
    samples[index] = value * Math.min(1, (duration - time) / 0.16);
  }
  return wav(samples);
}

/** Opt-in audio. Only this instance's Howls are paused, adjusted, or unloaded. */
export function createIslandAudio(): IslandAudio {
  let enabled = false;
  let paused = false;
  let disposed = false;
  let initialized = false;
  let initializationFailed = false;
  let ambient: Sound | undefined;
  let steps: Sound | undefined;
  let jumping: Sound | undefined;
  let discovery: Sound | undefined;
  let ambientId: number | undefined;
  let ambientPending = false;
  let lastStep = -Infinity;
  let lastJump = -Infinity;
  let lastDiscovery = -Infinity;
  let stepCount = 0;
  const sounds: Sound[] = [];
  const active = () => enabled && !paused && !disposed && typeof document !== "undefined" && !document.hidden;

  function syncAmbient() {
    const howl = ambient?.howl;
    if (!howl || ambient?.failed || howl.state() !== "loaded") return;
    if (!active()) {
      if (ambientId !== undefined) howl.pause(ambientId);
      ambientPending = false;
      return;
    }
    if (ambientPending || howl.playing(ambientId)) return;
    ambientPending = true;
    try {
      ambientId = howl.play(ambientId);
    } catch {
      ambientPending = false;
    }
  }

  function makeSound(source: string, volume: number, loop = false): Sound {
    const sound: Sound = { howl: null, failed: false, waitingForUnlock: false, volume, loop };
    sounds.push(sound);
    sound.howl = new Howl({
      src: [source], format: ["wav"], volume: loop ? 0 : volume,
      loop, preload: true, autoplay: false, pool: 2,
      onload: () => { if (loop) syncAmbient(); },
      onloaderror: () => {
        sound.failed = true;
        if (loop) ambientPending = false;
      },
      onplay: (id) => {
        if (loop) ambientPending = false;
        if (!active()) {
          sound.howl?.stop(id);
          return;
        }
        if (loop) sound.howl?.fade(0, volume, 450, id);
      },
      onplayerror: () => {
        if (!loop || disposed) return;
        ambientPending = false;
        // Retry only the ambience after a genuine browser unlock; never replay stale actions.
        if (!sound.waitingForUnlock) {
          sound.waitingForUnlock = true;
          sound.howl?.once("unlock", () => {
            sound.waitingForUnlock = false;
            syncAmbient();
          });
        }
      },
    });
    return sound;
  }

  function initialize() {
    if (initialized || initializationFailed || typeof window === "undefined") return;
    try {
      ambient = makeSound(surf(), 0.38, true);
      steps = makeSound(footstep(), 0.25);
      jumping = makeSound(jumpTone(), 0.25);
      discovery = makeSound(discoveryChime(), 0.24);
      initialized = true;
    } catch {
      initializationFailed = true;
      releaseSounds();
    }
  }

  function releaseSounds() {
    sounds.forEach((sound) => {
      try { sound.howl?.off(); sound.howl?.unload(); } catch { /* Audio is optional if the device is unavailable. */ }
      sound.howl = null;
    });
    sounds.length = 0;
  }

  function sync() {
    syncAmbient();
    if (!active()) sounds.forEach((sound) => {
      if (!sound.loop && sound.howl?.state() === "loaded") sound.howl.stop();
    });
  }

  function play(sound: Sound | undefined, rate = 1) {
    const howl = sound?.howl;
    if (!active() || !howl || sound?.failed || howl.state() !== "loaded") return;
    try {
      howl.stop();
      howl.rate(rate);
      howl.play();
    } catch { /* A blocked effect can be tried again on the next player action. */ }
  }

  return {
    setEnabled(next) {
      if (disposed) return;
      enabled = next;
      if (enabled) initialize();
      sync();
    },
    setPaused(next) {
      if (disposed) return;
      paused = next;
      sync();
    },
    step() {
      if (!active()) return;
      const now = performance.now();
      if (now - lastStep < 150) return;
      lastStep = now;
      play(steps, ++stepCount % 2 ? 0.96 : 1.04);
    },
    jump() {
      if (!active()) return;
      const now = performance.now();
      if (now - lastJump < 250) return;
      lastJump = now;
      play(jumping);
    },
    discover() {
      if (!active()) return;
      const now = performance.now();
      if (now - lastDiscovery < 650) return;
      lastDiscovery = now;
      play(discovery);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      releaseSounds();
    },
  };
}
