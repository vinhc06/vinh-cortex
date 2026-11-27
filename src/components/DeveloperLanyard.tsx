"use client";

import { useEffect, useRef, type PointerEvent } from "react";

const limit = (angle: number) => Math.max(-0.68, Math.min(angle, 0.68));

export default function DeveloperLanyard() {
  const pivot = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLDivElement>(null);
  const motion = useRef({ angle: 0, velocity: 0, pointer: -1, lastAngle: 0, lastPointerTime: 0, frame: 0, time: 0 });

  function draw() {
    if (!badge.current) return;
    badge.current.style.transform = `rotate(${motion.current.angle}rad)`;
  }

  function swing(time: number) {
    const state = motion.current;
    const dt = Math.min((time - state.time) / 1000, 0.026);
    state.time = time;
    state.velocity += (-22 * Math.sin(state.angle) - 2.9 * state.velocity) * dt;
    state.angle += state.velocity * dt;
    if (Math.abs(state.angle) + Math.abs(state.velocity) < 0.006) {
      state.angle = 0;
      state.velocity = 0;
      state.frame = 0;
    } else {
      state.frame = requestAnimationFrame(swing);
    }
    draw();
  }

  function release() {
    const state = motion.current;
    cancelAnimationFrame(state.frame);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      Object.assign(state, { angle: 0, velocity: 0, frame: 0 });
      draw();
    } else {
      state.time = performance.now();
      state.frame = requestAnimationFrame(swing);
    }
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    const state = motion.current;
    if (state.pointer !== -1 || event.button !== 0) return;
    cancelAnimationFrame(state.frame);
    state.pointer = event.pointerId;
    state.lastAngle = state.angle;
    state.lastPointerTime = event.timeStamp;
    state.velocity = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLButtonElement>) {
    const state = motion.current;
    if (state.pointer !== event.pointerId || !pivot.current) return;
    const anchor = pivot.current.getBoundingClientRect();
    const angle = limit(-Math.atan2(event.clientX - anchor.x, Math.max(40, event.clientY - anchor.y)));
    const dt = Math.max((event.timeStamp - state.lastPointerTime) / 1000, 0.016);
    state.angle = angle;
    state.velocity = Math.max(-4, Math.min((angle - state.lastAngle) / dt, 4));
    state.lastPointerTime = event.timeStamp;
    state.lastAngle = angle;
    draw();
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (motion.current.pointer !== event.pointerId) return;
    motion.current.pointer = -1;
    if (event.timeStamp - motion.current.lastPointerTime > 100) motion.current.velocity = 0;
    release();
  }

  function nudge(direction: number) {
    if (motion.current.pointer !== -1 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    motion.current.velocity = direction * 0.75;
    release();
  }

  useEffect(() => {
    const state = motion.current;
    return () => cancelAnimationFrame(state.frame);
  }, []);

  return (
    <div className="relative mx-auto h-64 w-full max-w-xs overflow-hidden" aria-label="Interactive developer badge">
      <div ref={pivot} className="absolute top-0 left-1/2 size-0" />
      <div ref={badge} className="absolute inset-x-0 top-0 origin-top will-change-transform">
        <div aria-hidden="true" className="mx-auto h-15 w-4 border-x border-cyan-300/50 bg-gradient-to-b from-cyan-400/10 to-cyan-400/35" />
        <button
          type="button"
          onPointerDown={startDrag}
          onPointerMove={drag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onPointerEnter={(event) => { if (event.pointerType === "mouse" && !motion.current.frame) nudge(event.movementX < 0 ? 1 : -1); }}
          onClick={(event) => { if (event.detail === 0) nudge(1); }}
          aria-describedby="lanyard-hint"
          className="mx-auto block w-52 touch-none select-none cursor-grab rounded-xl border border-cyan-400/45 bg-linear-to-br from-[#172932] to-surface p-4 text-left shadow-xl shadow-black/45 active:cursor-grabbing"
        >
          <span aria-hidden="true" className="mx-auto mb-4 block h-1.5 w-9 rounded-full border border-hairline bg-background" />
          <span className="block font-mono text-[0.65rem] tracking-widest text-cyan-300">DEVELOPER ID</span>
          <span className="mt-1 block text-2xl font-semibold text-white">Vinh Chau</span>
          <span className="block font-mono text-xs text-slate-300">@vinhc06 · VT CS ’27</span>
          <span className="mt-3 block border-t border-cyan-400/20 pt-2 font-mono text-xs text-cyan-200">OpenDSA / Intelent</span>
        </button>
      </div>
      <span id="lanyard-hint" className="absolute inset-x-0 bottom-0 text-center font-mono text-xs text-slate-400">Drag the badge to swing it</span>
    </div>
  );
}
