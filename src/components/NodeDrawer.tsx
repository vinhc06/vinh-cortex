"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, MotionConfig, useIsPresent } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { lobeColors, nodeHref, type CortexPreviewNode, type CortexWorkspaceNode } from "@/types/cortex";
import CreativePreviews from "./CreativePreviews";
import { useSoundCue } from "./TacticalEffects";

const entrance = { type: "spring", stiffness: 390, damping: 34 } as const;

function DrawerSection({ label, open, onToggle, delay, children }: {
  label: string;
  open: boolean;
  onToggle: () => void;
  delay: number;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...entrance, delay }} className="rounded-xl border border-hairline bg-background/55">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:text-glow">
          {label}
          <span aria-hidden="true" className="font-mono text-glow">{open ? "−" : "+"}</span>
        </button>
      </h3>
      <div id={id} inert={!open} className={`grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="space-y-4 px-4 pb-4 pt-1">{children}</div>
        </div>
      </div>
    </motion.section>
  );
}

export default function NodeDrawer({
  node, connections, onSelectNode, onClose,
}: {
  node: CortexWorkspaceNode;
  connections: CortexPreviewNode[];
  onSelectNode: (node: CortexPreviewNode) => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sections, setSections] = useState({ architecture: false, impact: true, media: Boolean(node.videoSrc) });
  const present = useIsPresent();
  const playCue = useSoundCue();
  const previousDrawerState = useRef<"closed" | "preview" | "expanded">("closed");
  const drawer = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const router = useRouter();
  const destination = nodeHref(node.slug);
  const portalLabel = destination === "/and" ? "Explore And What Else?" : destination === "/writing" ? "Explore Writing" : undefined;
  const expand = useCallback(() => {
    setExpanded(true);
    setSections((current) => ({ ...current, architecture: true }));
  }, []);
  const toggle = (section: keyof typeof sections) => setSections((current) => ({ ...current, [section]: !current[section] }));

  useEffect(() => {
    const state = !present ? "closed" : expanded ? "expanded" : "preview";
    const previous = previousDrawerState.current;
    if (state === previous) return;
    previousDrawerState.current = state;
    playCue(state === "closed" || (state === "preview" && previous === "expanded") ? "drawer-close" : "drawer-open");
  }, [expanded, playCue, present]);

  useEffect(() => {
    const previous = document.activeElement;
    heading.current?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    heading.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previousOverflow; };
  }, [expanded]);

  useEffect(() => {
    if (!present) return;
    function handleKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || document.querySelector("dialog[open]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Enter" && !expanded && !event.repeat &&
          event.target instanceof Element &&
          !event.target.closest("a, button, input, textarea, select, summary, [contenteditable]")) {
        event.preventDefault();
        if (portalLabel) router.push(destination);
        else expand();
      }
      if (event.key === "Tab" && expanded && drawer.current) {
        const focusable = Array.from(drawer.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), video[controls]"))
          .filter((element) => !element.closest("[inert]"));
        const first = focusable[0];
        const last = focusable.at(-1);
        const active = document.activeElement;
        if (first && last &&
            (!drawer.current.contains(active) || (event.shiftKey ? active === first || active === heading.current : active === last))) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [destination, expand, expanded, onClose, portalLabel, present, router]);

  const metrics = Object.entries(node.metrics ?? {});
  const impact = node.impact ?? [];
  const revealDelay = 0.29 + 0.035 * node.tags.length;

  return (
    <MotionConfig reducedMotion="user">
      <motion.aside
        ref={drawer} layout layoutRoot layoutId={`case-study-${node.slug}`}
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 370, damping: 38 }}
        inert={!present} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined}
        aria-labelledby={titleId}
        className={`fixed inset-y-0 right-0 z-30 flex w-full flex-col overflow-y-auto overscroll-contain border-l border-hairline shadow-2xl shadow-black/60 backdrop-blur-xl ${expanded ? "max-w-none bg-background/90" : "max-w-md bg-surface/95"}`}
      >
        <motion.div layout="position" className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-hairline bg-surface/95 px-5 py-3 backdrop-blur-xl sm:px-7">
          <span className="font-mono text-xs uppercase tracking-wider text-slate-400">{expanded ? "Case Study" : "Quick Inspect"}</span>
          <div className="flex gap-2">
            {expanded && <button type="button" onClick={() => { setExpanded(false); heading.current?.focus({ preventScroll: true }); }} className="cursor-pointer rounded-md border border-hairline px-3 py-1.5 text-sm text-zinc-300 hover:text-glow">Quick Inspect</button>}
            <button type="button" onClick={onClose} className="cursor-pointer rounded-md border border-hairline px-3 py-1.5 text-sm text-zinc-300 hover:text-glow">Close <kbd aria-hidden="true" className="ml-1 text-[0.65rem] text-slate-400">[ESC]</kbd></button>
          </div>
        </motion.div>

        <motion.div layout="position" className={`mx-auto flex w-full flex-1 flex-col gap-5 p-5 sm:p-7 ${expanded ? "max-w-4xl sm:py-12" : ""}`}>
          <header>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs capitalize text-slate-400">
              <span style={{ color: lobeColors[node.lobe] }} className="rounded-full border border-hairline bg-background px-2.5 py-1">{node.lobe}</span>
              <span>{node.status}</span>
            </div>
            <div className="mt-4 overflow-hidden">
              <motion.h2 id={titleId} ref={heading} tabIndex={-1} initial={{ y: "105%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...entrance, delay: 0.08 }} className={`font-semibold tracking-tight text-white outline-none ${expanded ? "text-4xl sm:text-5xl" : "text-3xl"}`}>{node.title}</motion.h2>
            </div>
            <div className="mt-2 overflow-hidden">
              <motion.time dateTime={node.date} initial={{ y: "105%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...entrance, delay: 0.16 }} className="block font-mono text-xs text-slate-400">{node.date}</motion.time>
            </div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.19 }} className="mt-3 leading-relaxed text-zinc-300">{node.summary}</motion.p>
          </header>

          {node.tags.length > 0 && (
            <ul aria-label="Tools and skills" className="flex flex-wrap gap-2">
              {node.tags.map((tag, index) => (
                <motion.li key={tag} initial={{ opacity: 0, scale: 0.88, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ ...entrance, delay: 0.23 + index * 0.035 }} className="rounded-md border border-hairline bg-background px-2.5 py-1 font-mono text-xs text-zinc-300">{tag}</motion.li>
              ))}
            </ul>
          )}

          <div className="grid gap-2">
            <DrawerSection label="Architecture" open={sections.architecture} onToggle={() => toggle("architecture")} delay={revealDelay}>
              <div className="space-y-3 text-sm leading-relaxed text-slate-300 [&_a]:text-glow [&_a]:underline [&_code]:font-mono [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: node.html }} />
            </DrawerSection>
            <DrawerSection label="Impact & Metrics" open={sections.impact} onToggle={() => toggle("impact")} delay={revealDelay + 0.06}>
              {impact.length > 0 && (
                <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-slate-300">
                  {impact.map((item, index) => (
                    <motion.li key={item} initial={{ opacity: 0, y: -7 }} animate={{ opacity: 1, y: 0 }} transition={{ ...entrance, delay: revealDelay + 0.1 + index * 0.055 }}>{item}</motion.li>
                  ))}
                </ul>
              )}
              {metrics.length > 0 && (
                <dl className="grid grid-cols-2 gap-2">
                  {metrics.map(([label, value], index) => (
                    <motion.div key={label} initial={{ opacity: 0, y: -7 }} animate={{ opacity: 1, y: 0 }} transition={{ ...entrance, delay: revealDelay + 0.1 + (index + impact.length) * 0.055 }} className="min-w-0 rounded-lg border border-hairline bg-surface/80 p-3">
                      <dt className="text-xs capitalize text-zinc-400">{label.replace(/([a-z])([A-Z])/g, "$1 $2")}</dt>
                      <dd className="mt-1 break-words font-mono text-xs text-glow">{value}</dd>
                    </motion.div>
                  ))}
                </dl>
              )}
              {!impact.length && !metrics.length && <p className="text-sm text-slate-400">Outcomes and measurements are forthcoming.</p>}
            </DrawerSection>
            <DrawerSection label="Links & Media" open={sections.media} onToggle={() => toggle("media")} delay={revealDelay + 0.12}>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-glow">
                <Link href={destination} className="hover:underline">{portalLabel ?? "Standalone case study"} →</Link>
                {node.repoUrl && <a href={node.repoUrl} className="hover:underline">GitHub ↗</a>}
              </div>
              {node.videoSrc && <video aria-label={node.title} src={node.videoSrc} controls playsInline preload="none" className="aspect-video w-full rounded-lg border border-hairline bg-background" />}
              {node.lobe === "creatives" && !portalLabel && <CreativePreviews slug={node.slug} />}
              {connections.length > 0 && (
                <ul aria-label="Connected nodes" className="flex flex-wrap gap-2">
                  {connections.map((connection) => (
                    <li key={connection.slug}><button type="button" onClick={() => onSelectNode(connection)} className="cursor-pointer rounded-full border border-hairline px-3 py-1.5 text-left text-xs text-slate-300 hover:border-primary hover:text-glow">{connection.title}</button></li>
                  ))}
                </ul>
              )}
            </DrawerSection>
          </div>
          {!expanded && (portalLabel ? (
            <Link href={destination} aria-keyshortcuts="Enter" className="mt-auto flex items-center justify-between gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-background hover:bg-glow">{portalLabel} <span aria-hidden="true">→</span></Link>
          ) : (
            <button type="button" onClick={expand} aria-keyshortcuts="Enter" className="mt-auto flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-primary px-4 py-3 text-left text-sm font-semibold text-background hover:bg-glow">View Full Details <kbd aria-hidden="true" className="font-mono text-xs">[ENTER]</kbd></button>
          ))}
        </motion.div>
      </motion.aside>
    </MotionConfig>
  );
}
