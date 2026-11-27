"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, MotionConfig } from "motion/react";
import { useEffect, useRef } from "react";
import { cortexHomeHref, cortexIndexHref, resumeHref, sections } from "@/data/navigation";

export function sectionPath(pathname: string) {
  if (pathname.startsWith("/writing/")) return "/writing";
  if (pathname.startsWith("/nodes/")) return "/";
  return pathname;
}

export default function SectionDock({ pathname }: { pathname: string }) {
  const active = pathname === cortexIndexHref ? cortexHomeHref : sectionPath(pathname);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const root = document.documentElement;
    const measure = () => root.style.setProperty("--section-dock-height", `${element.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--section-dock-height");
    };
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <div ref={bar} className="section-bar sticky top-0 z-25 flex items-center justify-between gap-2 border-b border-hairline px-3 py-3 backdrop-blur-md sm:justify-center sm:px-4">
        <Link href={cortexHomeHref} aria-label="Vinh Cortex home" className="grid size-8 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-glow sm:absolute sm:left-5">
          <Image src="/icon.svg" alt="" width={24} height={24} unoptimized />
        </Link>
        <nav aria-label="Sections" className="flex w-fit max-w-full flex-wrap items-center justify-center gap-0.5 rounded-xl border border-hairline bg-surface/90 p-1.5 font-mono text-[0.65rem] uppercase tracking-wide sm:gap-2 sm:text-xs">
          {sections.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={active === href ? "page" : undefined} className="relative isolate flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-slate-300 hover:text-white aria-[current=page]:text-background sm:px-4">
              {active === href && (
                <motion.span
                  aria-hidden="true"
                  layoutId="section-dock-active"
                  className="absolute inset-0 -z-10 rounded-lg bg-glow"
                  transition={{ type: "spring", stiffness: 480, damping: 37 }}
                />
              )}
              {label}
            </Link>
          ))}
          <a href={resumeHref} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap rounded-lg px-2 py-2 text-slate-300 hover:text-glow sm:px-4">
            Resume <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span>
          </a>
        </nav>
      </div>
    </MotionConfig>
  );
}
