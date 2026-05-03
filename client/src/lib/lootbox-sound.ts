import { useEffect, useState } from "react";

const STORAGE_KEY = "lootbox-sound-muted";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;
  const Ctx =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  audioContext = new Ctx();
  return audioContext;
}

function playNote(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
  gainPeak: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;

  const start = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(gainPeak, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

export function isLootboxMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setLootboxMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
}

export function playLootboxOpenSound(): void {
  if (isLootboxMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  // iOS / Safari leaves the context suspended until a user gesture.
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  // Rising C major arpeggio (C5, E5, G5, C6) for a satisfying "ta-da".
  playNote(ctx, 523.25, 0.0, 0.6, 0.18);
  playNote(ctx, 659.25, 0.08, 0.6, 0.18);
  playNote(ctx, 783.99, 0.16, 0.7, 0.18);
  playNote(ctx, 1046.5, 0.24, 0.9, 0.2);
}

export function useLootboxMute(): [boolean, () => void] {
  const [muted, setMuted] = useState<boolean>(isLootboxMuted);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setMuted(e.newValue === "true");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setLootboxMuted(next);
  };

  return [muted, toggle];
}
