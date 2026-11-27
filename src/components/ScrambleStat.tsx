"use client";

import { useEffect, useRef } from "react";

export default function ScrambleStat({ value, play }: { value: string; play: boolean }) {
  const text = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = text.current;
    if (!element) return;
    element.textContent = value;
    if (!play || !/\d/.test(value) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let step = 0;
    const timer = window.setInterval(() => {
      step++;
      if (step >= 7) {
        element.textContent = value;
        window.clearInterval(timer);
        return;
      }
      let digit = 0;
      element.textContent = value.replace(/\d/g, (character) =>
        digit++ < Math.floor(step / 2) ? character : String(Math.floor(Math.random() * 10)),
      );
    }, 42);
    return () => window.clearInterval(timer);
  }, [play, value]);

  return <><span className="sr-only">{value}</span><span ref={text} aria-hidden="true" className="tabular-nums">{value}</span></>;
}
