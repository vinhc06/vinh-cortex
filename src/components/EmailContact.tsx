"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { emailAddress, emailHref } from "@/data/contact";

export default function EmailContact({ compact = false }: { compact?: boolean }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copyEmail() {
    clearTimeout(timer.current);
    setMessage("");
    try {
      await navigator.clipboard.writeText(emailAddress);
      setMessage("Email address copied");
    } catch {
      setMessage(`Copy unavailable. Email: ${emailAddress}`);
    }
    timer.current = setTimeout(() => setMessage(""), 2800);
  }

  return (
    <span className={compact ? "inline-flex items-center rounded-md border border-hairline" : "inline-flex flex-wrap items-center gap-2"}>
      <a href={emailHref} aria-label={compact ? "Email Vinh" : undefined} title={compact ? emailAddress : undefined} className={compact ? "grid size-8 place-items-center text-slate-300 hover:text-glow" : "break-all text-slate-200 hover:text-glow"}>
        {compact ? <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18v14H3zm0 2 9 6 9-6" /></svg> : emailAddress}
      </a>
      <button type="button" onClick={copyEmail} aria-label="Copy email address" title="Copy email address" className={compact ? "grid h-8 w-7 cursor-pointer place-items-center border-l border-hairline text-slate-400 hover:text-glow" : "cursor-pointer rounded border border-hairline px-1.5 py-px font-mono text-xs text-slate-400 hover:border-primary/60 hover:text-glow"}>
        {compact ? <svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg> : "Copy"}
      </button>
      <span role="status" className="sr-only">{message}</span>
      {message && createPortal(
        <span aria-hidden="true" className="pointer-events-none fixed bottom-5 left-1/2 z-[130] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-primary/40 bg-surface px-4 py-2 font-mono text-xs text-glow shadow-xl">{message}</span>,
        document.body,
      )}
    </span>
  );
}
