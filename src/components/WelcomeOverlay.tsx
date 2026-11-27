"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const WelcomeCortex = dynamic(() => import("./WelcomeCortex"), { ssr: false });

const icons = [
  { label: "Code", path: "m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20" },
  { label: "Activity", path: "M2 12h5l3-7 4 14 3-7h5" },
  { label: "PenTool", path: "m3 21 5-11 9-4 1 1-4 9-11 5Zm0 0 6-6m5-4 3 3m0-8 2-3 2 2-3 2" },
];
const enter = { type: "spring", stiffness: 320, damping: 26 } as const;

export default function WelcomeOverlay({ onDismiss }: { onDismiss: () => void }) {
  const skip = useRef<HTMLButtonElement>(null);
  const [previewOnline, setPreviewOnline] = useState<boolean>();

  useEffect(() => {
    skip.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") {
        event.preventDefault();
        skip.current?.focus();
        return;
      }
      if ((event.key !== "Enter" && event.key !== " ") || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onDismiss();
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [onDismiss]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="welcome-curtain fixed inset-0 z-[90] grid place-items-center overflow-hidden overscroll-none bg-background px-5 text-center"
      data-welcome-overlay
      exit={{ y: -12, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      onClick={onDismiss}
    >
      <div aria-hidden="true" className="welcome-particles" />
      <WelcomeCortex onStatus={setPreviewOnline} />
      <div aria-hidden="true" className="welcome-vignette absolute inset-0" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-center justify-center gap-3">
          {icons.map(({ label, path }, index) => (
            <motion.span key={label} title={label} aria-hidden="true" initial={{ opacity: 0, y: 10, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...enter, delay: 0.08 + index * 0.075 }} className="grid size-10 place-items-center rounded-lg border border-cyan-400/20 bg-surface/75 text-cyan-200 shadow-[0_0_18px_#22d3ee10]">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d={path} />
              </svg>
            </motion.span>
          ))}
        </div>
        <p role="status" className="mt-5 flex items-center gap-2 font-mono text-[0.67rem] tracking-widest text-cyan-200/85">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
          {previewOnline === undefined ? "BOOT · INITIALIZING" : previewOnline ? "BOOT · CORTEX ONLINE" : "BOOT · CONSOLE READY"}
        </p>
        <motion.h1 id="welcome-title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enter, delay: 0.26 }} className="mt-3 text-balance text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          Vinh Chau
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enter, delay: 0.43 }} className="mt-5 w-fit rounded-full border border-cyan-400/30 bg-cyan-400/5 px-4 py-1.5 font-mono text-xs tracking-wide text-cyan-200">
          @vinhc06
        </motion.p>
        <motion.button ref={skip} type="button" onClick={(event) => { event.stopPropagation(); onDismiss(); }} aria-keyshortcuts="Enter Space" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enter, delay: 0.52 }} className="mt-9 cursor-pointer rounded-lg border border-primary bg-primary/10 px-5 py-3.5 font-mono text-xs font-semibold tracking-wide text-glow shadow-[0_0_30px_#22d3ee12] outline-none hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-glow/60 sm:px-6 sm:text-sm">
          [ PRESS ENTER OR CLICK TO INITIALIZE ]
        </motion.button>
      </div>
    </motion.div>
  );
}
