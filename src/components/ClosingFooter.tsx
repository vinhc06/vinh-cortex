import Link from "next/link";
import type { ReactNode } from "react";
import { resumeHref, sections } from "@/data/navigation";
import { ContactList } from "./SocialLinks";

export default function ClosingFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="mt-auto border-t border-hairline bg-surface/30">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-10 sm:px-8 sm:py-14 md:grid-cols-[1.4fr_1fr]">
        <section>
          <p className="max-w-[25ch] text-balance text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            Glad we could cross paths.
          </p>
          <p className="mt-3 text-base text-slate-400">Out of anywhere you could be, you&apos;re here.</p>
          <p className="mt-7 font-mono text-xs text-slate-400">© Vinh Chau, 2026</p>
        </section>
        <div className="grid grid-cols-2 gap-4 sm:gap-7">
          <div>
            <h2 className="font-mono text-xs tracking-widest text-slate-400">CONTACT</h2>
            <ContactList showCreators />
          </div>
          <nav aria-label="Footer navigation">
            <h2 className="font-mono text-xs tracking-widest text-slate-400">NAVIGATION</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {sections.map(({ href, label }) => <li key={href}><Link href={href} className="hover:text-glow">{label}</Link></li>)}
              <li><a href={resumeHref} target="_blank" rel="noopener noreferrer" className="hover:text-glow">Resume ↗<span className="sr-only"> (opens in a new tab)</span></a></li>
            </ul>
          </nav>
        </div>
        {children && <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4 md:col-span-2">{children}</div>}
      </div>
    </footer>
  );
}
