"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SoundCue = "enter" | "route" | "drawer-open" | "drawer-close" | "hover";
export type SoundMode = "armed" | "on" | "off";
type AudioEngine = { context: AudioContext; master: GainNode; noise?: AudioBuffer };

const cues = {
  enter: [0.32, 170, 570, 0.045, true],
  route: [0.19, 420, 155, 0.033, true],
  "drawer-open": [0.16, 165, 370, 0.035, true],
  "drawer-close": [0.14, 310, 135, 0.027, true],
  hover: [0.038, 880, 550, 0.014, false],
} as const satisfies Record<SoundCue, readonly [number, number, number, number, boolean]>;

function noiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.35), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
  return buffer;
}

function play(engine: AudioEngine, cue: SoundCue) {
  const { context, master } = engine;
  const [duration, from, to, volume, sweep] = cues[cue];
  const start = context.currentTime;
  const end = start + duration;
  const tone = context.createOscillator();
  const envelope = context.createGain();
  tone.frequency.setValueAtTime(from, start);
  tone.frequency.exponentialRampToValueAtTime(to, end);
  envelope.gain.setValueAtTime(0.001, start);
  envelope.gain.linearRampToValueAtTime(volume, start + (sweep ? 0.033 : 0.004));
  envelope.gain.exponentialRampToValueAtTime(0.001, end);
  tone.connect(envelope).connect(master);
  tone.start(start);
  tone.stop(end);
  tone.onended = () => { tone.disconnect(); envelope.disconnect(); };

  if (sweep) {
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    noise.buffer = engine.noise ??= noiseBuffer(context);
    filter.type = "bandpass";
    filter.Q.value = 0.6;
    filter.frequency.setValueAtTime(from * 2.8, start);
    filter.frequency.exponentialRampToValueAtTime(to * 3.4, end);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(volume * 0.65, start + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    noise.connect(filter).connect(gain).connect(master);
    noise.start(start);
    noise.stop(end);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
}

export function useCortexAudio() {
  const [sound, setSound] = useState<SoundMode>("armed");
  const enabled = useRef(true);
  const engine = useRef<AudioEngine | null>(null);
  const lastHover = useRef(-Infinity);
  const unlockAttempt = useRef<Promise<void> | null>(null);

  const playCue = useCallback((cue: SoundCue) => {
    const audio = engine.current;
    if (!enabled.current || audio?.context.state !== "running") return;
    if (cue === "hover") {
      const now = audio.context.currentTime;
      if (now - lastHover.current < 0.085) return;
      lastHover.current = now;
    }
    play(audio, cue);
  }, []);

  const unlock = useCallback(async () => {
    if (!enabled.current || typeof AudioContext === "undefined") return;
    if (unlockAttempt.current) return unlockAttempt.current;
    try {
      if (!engine.current) {
        const context = new AudioContext();
        const master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);
        engine.current = { context, master };
      }
      const { context, master } = engine.current;
      const activate = () => {
        if (!enabled.current || context.state !== "running" || engine.current?.context !== context) return;
        master.gain.setTargetAtTime(0.7, context.currentTime, 0.012);
        setSound("on");
      };
      if (context.state === "running") {
        activate();
        return;
      }
      unlockAttempt.current = context.resume().then(activate, () => {}).finally(() => { unlockAttempt.current = null; });
      return unlockAttempt.current;
    } catch {
      // The rest of the interface remains usable if audio is unavailable.
    }
  }, []);

  const toggleSound = useCallback(() => {
    enabled.current = !enabled.current;
    if (!enabled.current) {
      const audio = engine.current;
      audio?.master.gain.setTargetAtTime(0, audio.context.currentTime, 0.01);
      setSound("off");
    } else {
      setSound("armed");
      void unlock().then(() => playCue("hover"));
    }
  }, [playCue, unlock]);

  useEffect(() => {
    function onGesture(event: MouseEvent | KeyboardEvent) {
      if (!event.isTrusted || !enabled.current || event.defaultPrevented) return;
      if (event instanceof KeyboardEvent && !["Enter", " "].includes(event.key)) return;
      if (event.target instanceof Element && event.target.closest("[data-sound-toggle]")) return;
      if (engine.current?.context.state !== "running") void unlock();
    }
    document.addEventListener("click", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    return () => {
      document.removeEventListener("click", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
    };
  }, [unlock]);

  useEffect(() => () => {
    const audio = engine.current;
    engine.current = null;
    if (audio && audio.context.state !== "closed") void audio.context.close().catch(() => {});
  }, []);

  return { sound, toggleSound, unlock, playCue };
}
