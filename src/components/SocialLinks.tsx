import { careerProfiles, instagram, phoneDisplay, phoneHref } from "@/data/contact";
import EmailContact from "./EmailContact";

const careerIcons = {
  GitHub: "M9 19c-4 1-4-2-6-2m12 4v-3.5a3 3 0 0 0-.8-2.3c2.7-.3 5.6-1.3 5.6-6A4.7 4.7 0 0 0 18.5 6a4.4 4.4 0 0 0-.1-3S17.4 2.7 15 4.3a12 12 0 0 0-6 0C6.6 2.7 5.6 3 5.6 3a4.4 4.4 0 0 0-.1 3A4.7 4.7 0 0 0 4.2 9.2c0 4.7 2.9 5.7 5.6 6a3 3 0 0 0-.8 2.3V21",
  LinkedIn: "M5 9v10m0-14v.2M10 19V9m0 4a4 4 0 0 1 8 0v6",
  Handshake: "M2 13l4-6 4 2 2-1 6 4 4-2m-1 2-4 6-3 1-6-4m2-6-2 3 3 2 2-2 5 4",
} as const;

function publicLink(value: string | undefined) {
  const url = value?.trim();
  return url && /^https:\/\//i.test(url) && URL.canParse(url) ? url : undefined;
}

export function CareerIcons() {
  return (
    <nav aria-label="Career links" className="flex items-center gap-1.5">
      {(Object.keys(careerIcons) as (keyof typeof careerIcons)[]).map((name) => (
        <a key={name} href={careerProfiles[name]} target="_blank" rel="noopener noreferrer" aria-label={`${name} (opens in a new tab)`} title={name} className="grid size-8 place-items-center rounded-md border border-hairline text-slate-300 hover:border-primary/60 hover:text-glow">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={careerIcons[name]} /></svg>
        </a>
      ))}
      <EmailContact compact />
    </nav>
  );
}

const creatorLinks = [
  [`${instagram.label} ${instagram.handle}`, instagram.href],
  ["X", publicLink(process.env.NEXT_PUBLIC_X_URL)],
  ["TikTok", publicLink(process.env.NEXT_PUBLIC_TIKTOK_URL)],
] as const;

function ProfileLinks({ links }: { links: readonly (readonly [string, string | undefined])[] }) {
  return links.map(([label, href]) => (
    <li key={label}>{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-slate-200 hover:text-glow">{label}<span className="sr-only"> (opens in a new tab)</span></a> : <span className="text-slate-500" title="Unlisted">{label}<span className="sr-only"> (unlisted)</span></span>}</li>
  ));
}

export function ContactList({ showCreators = false }: { showCreators?: boolean }) {
  return (
    <ul className="mt-3 space-y-2 text-sm">
      <li><span className="sr-only">Email </span><EmailContact /></li>
      <li><a href={phoneHref} className="whitespace-nowrap text-slate-200 hover:text-glow"><span className="sr-only">Phone </span>{phoneDisplay}</a></li>
      <ProfileLinks links={Object.entries(careerProfiles)} />
      {showCreators && <ProfileLinks links={creatorLinks} />}
    </ul>
  );
}

export function ConnectAndSocials() {
  return (
    <section aria-labelledby="connect-and-socials" className="mt-10 border-t border-hairline pt-8">
      <h2 id="connect-and-socials" className="text-xl font-semibold text-white">Connect &amp; Socials</h2>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div><h3 className="font-mono text-xs uppercase tracking-wide text-slate-400">Career &amp; Contact</h3><ContactList /></div>
        <div><h3 className="font-mono text-xs uppercase tracking-wide text-slate-400">Creator &amp; Social</h3><ul className="mt-3 space-y-2 text-sm"><ProfileLinks links={creatorLinks} /></ul></div>
      </div>
    </section>
  );
}
