"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, MotionConfig, useIsPresent } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import SectionDock, { sectionPath } from "./SectionDock";
import WelcomeOverlay from "./WelcomeOverlay";
import ClosingFooter from "./ClosingFooter";
import { CareerIcons } from "./SocialLinks";
import { cortexHomeHref, resumeHref, sections } from "@/data/navigation";
import { useCortexAudio, type SoundCue, type SoundMode } from "@/lib/use-cortex-audio";

const chrome = createContext<{
  openNavigation: () => void;
  toggleSound: () => void;
  sound: SoundMode;
  playCue: (cue: SoundCue) => void;
}>({ openNavigation: () => {}, toggleSound: () => {}, sound: "armed", playCue: () => {} });
const sceneReadyContext = createContext(true);
const homeVisitContext = createContext(0);
export const useSceneReady = () => useContext(sceneReadyContext);
export const useCortexHomeVisit = () => useContext(homeVisitContext);
export const useSoundCue = () => useContext(chrome).playCue;
const targets = "a, button, summary, label, input[type='range'], [role='button'], [data-reticle-target]";
const editors = "input:not([type='range']), textarea, select, [contenteditable]:not([contenteditable='false'])";
const pageTransition = { duration: 0.22, ease: "easeInOut" } as const;

function SectionFrame({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return (
    <motion.div
      inert={!present}
      aria-hidden={!present || undefined}
      className={`min-w-0 ${present ? "" : "pointer-events-none absolute inset-x-0 top-0"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

export function TacticalControls() {
  const { openNavigation, toggleSound, sound } = useContext(chrome);
  return (
    <div className="flex items-center gap-2 font-mono text-[0.68rem] text-slate-400">
      <button type="button" onClick={openNavigation} aria-keyshortcuts="Meta+K Control+K" className="cursor-pointer rounded border border-hairline px-2 py-1 hover:text-glow">
        Navigate <kbd>[⌘K]</kbd>
      </button>
      <button type="button" onClick={toggleSound} data-sound-toggle aria-label="Sound effects" aria-pressed={sound !== "off"} className="cursor-pointer rounded border border-hairline px-2 py-1 hover:text-glow aria-pressed:text-glow">
        SFX {sound === "armed" ? "AUTO" : sound.toUpperCase()}
      </button>
    </div>
  );
}

export default function TacticalEffects({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { sound, toggleSound, unlock, playCue } = useCortexAudio();
  const lastPath = useRef(pathname);
  const welcomeDismissed = useRef(false);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [welcomeBlocking, setWelcomeBlocking] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [homeVisit, setHomeVisit] = useState(0);
  const navigateCortex = useCallback(() => {
    if (pathname === cortexHomeHref) setHomeVisit((visit) => visit + 1);
  }, [pathname]);
  const restoreAfterIntro = useRef<HTMLElement | null>(null);
  const dock = useRef<HTMLDivElement>(null);
  const dismissWelcome = useCallback(() => {
    if (welcomeDismissed.current) return;
    welcomeDismissed.current = true;
    void unlock().then(() => playCue("enter"));
    setSceneReady(true);
    setWelcomeOpen(false);
  }, [playCue, unlock]);
  const finishWelcome = useCallback(() => {
    setWelcomeBlocking(false);
  }, []);
  function replayWelcome(event: React.MouseEvent<HTMLButtonElement>) {
    welcomeDismissed.current = false;
    restoreAfterIntro.current = event.currentTarget;
    setWelcomeBlocking(true);
    setWelcomeOpen(true);
  }
  const cursor = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const page = dock.current;
    if (!page) return;
    page.inert = welcomeBlocking;
    if (welcomeBlocking) return;

    const previous = restoreAfterIntro.current;
    const viewButton = page.querySelector<HTMLButtonElement>('[aria-label="Cortex view"] button[aria-pressed="true"]');
    (previous?.isConnected ? previous : viewButton ?? page.querySelector("a"))?.focus({ preventScroll: true });
  }, [welcomeBlocking]);
  const openNavigation = useCallback(() => {
    if (!welcomeBlocking && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [welcomeBlocking]);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    playCue("route");
  }, [pathname, playCue]);

  useEffect(() => {
    const media = matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    const root = document.documentElement;
    function hideCursor() {
      delete root.dataset.reticle;
    }
    function move(event: PointerEvent) {
      const element = cursor.current;
      const target = event.target instanceof Element ? event.target : null;
      if (!element || !media.matches || event.pointerType === "touch" || target?.closest(editors) || dialog.current?.open) {
        hideCursor();
        return;
      }
      root.dataset.reticle = "";
      element.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      element.toggleAttribute("data-target", Boolean(target?.closest(targets)));
    }
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        hideCursor();
        openNavigation();
      }
    }
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", hideCursor);
    window.addEventListener("blur", hideCursor);
    window.addEventListener("keydown", keydown);
    media.addEventListener("change", hideCursor);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hideCursor);
      window.removeEventListener("blur", hideCursor);
      window.removeEventListener("keydown", keydown);
      media.removeEventListener("change", hideCursor);
      hideCursor();
    };
  }, [openNavigation]);

  useEffect(() => {
    if (sound !== "on") return;
    function handleHover(event: PointerEvent) {
      if (event.pointerType === "touch" || !(event.target instanceof Element)) return;
      const target = event.target.closest(targets);
      if (!target || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) return;
      playCue("hover");
    }
    document.addEventListener("pointerover", handleHover, { passive: true });
    return () => document.removeEventListener("pointerover", handleHover);
  }, [sound, playCue]);

  return (
    <chrome.Provider value={{ openNavigation, toggleSound, sound, playCue }}>
      <div ref={dock} className="flex min-h-dvh flex-col">
        <SectionDock pathname={pathname} onCortexNavigate={navigateCortex} />
        <sceneReadyContext.Provider value={sceneReady}>
          <homeVisitContext.Provider value={homeVisit}>
            <div className="relative">
              <MotionConfig reducedMotion="user">
                <AnimatePresence initial={false}>
                  <SectionFrame key={sectionPath(pathname)}>{children}</SectionFrame>
                </AnimatePresence>
              </MotionConfig>
            </div>
          </homeVisitContext.Provider>
        </sceneReadyContext.Provider>
        <ClosingFooter>
            <CareerIcons />
            <TacticalControls />
            <button type="button" onClick={replayWelcome} className="cursor-pointer rounded-md border border-hairline px-3 py-1.5 font-mono text-xs text-slate-400 hover:border-primary/60 hover:text-glow">
              Replay Intro <span aria-hidden="true">↻</span>
            </button>
        </ClosingFooter>
      </div>
      <MotionConfig reducedMotion="user">
        <AnimatePresence onExitComplete={finishWelcome}>
          {welcomeOpen && <WelcomeOverlay key="welcome" onDismiss={dismissWelcome} />}
        </AnimatePresence>
      </MotionConfig>
      <noscript><style>{".welcome-curtain { display: none !important; }"}</style></noscript>
      <div ref={cursor} className="tactical-reticle" aria-hidden="true"><span /></div>
      <dialog ref={dialog} aria-labelledby="tactical-navigation" className="fixed inset-0 m-auto w-[min(24rem,calc(100%-2rem))] rounded-xl border border-primary/40 bg-surface p-5 text-foreground shadow-2xl backdrop:bg-black/60">
        <header className="flex items-center justify-between gap-2 border-b border-hairline pb-3">
          <h2 id="tactical-navigation" className="font-mono text-sm text-glow">Navigate</h2>
          <form method="dialog"><button className="cursor-pointer rounded border border-hairline px-2 py-1 font-mono text-xs" aria-label="Close navigation">[ESC]</button></form>
        </header>
        <nav aria-label="Quick navigation" className="mt-3 grid gap-1">
          {sections.map(({ href, label }) => (
            <Link key={href} href={href} onNavigate={href === cortexHomeHref ? navigateCortex : undefined} onClick={() => dialog.current?.close()} className="rounded px-2 py-1.5 hover:bg-primary/10 hover:text-glow">{label}</Link>
          ))}
          <a href={resumeHref} target="_blank" rel="noopener noreferrer" onClick={() => dialog.current?.close()} className="rounded px-2 py-1.5 hover:bg-primary/10 hover:text-glow">Resume ↗</a>
        </nav>
      </dialog>
    </chrome.Provider>
  );
}
