import Link from "next/link";
import DeveloperLanyard from "@/components/DeveloperLanyard";
import { ConnectAndSocials } from "@/components/SocialLinks";

export const metadata = {
  title: "About Vinh Chau | Vinh Cortex",
  description: "Virginia Tech computer science, OpenDSA research engineering, and local-first AI at Intelent.",
};

const highlights = [
  ["Education", "Virginia Tech · Computer Science", "Expected graduation in Fall 2027"],
  ["Research", "OpenDSA · Research Engineering", "Instructor analytics and client-side caching"],
  ["Founder", "Intelent Technologies LLC", "Local-first AI agents and deterministic workflows"],
  ["Leadership", "VSA · Fundraising Chair", "Fundraising for the Vietnamese Student Association"],
];

const values = [
  ["Make the work inspectable", "A teammate should be able to see the inputs, understand what changed, and reproduce the result."],
  ["Keep the user in control", "Tools should make the next action clearer and keep important decisions visible to the people using them."],
  ["Learn by building", "Start with a small version, put it to work, and let the feedback shape what comes next."],
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="grid items-center gap-6 border-b border-hairline pb-8 md:grid-cols-[1fr_20rem]">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-7xl">Vinh Chau</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">
            I study computer science at Virginia Tech and expect to graduate in Fall 2027. My work spans research engineering, local-first AI, and the interactive systems that got me into programming.
          </p>
        </div>
        <DeveloperLanyard />
      </header>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        {highlights.map(([label, title, detail]) => (
          <div key={label} className="rounded-xl border border-hairline bg-surface p-5">
            <dt className="font-mono text-xs uppercase tracking-wide text-glow">{label}</dt>
            <dd className="mt-2 font-semibold text-white">{title}</dd>
            <dd className="mt-1 text-sm text-zinc-400">{detail}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-9 max-w-3xl space-y-7 leading-relaxed text-zinc-300">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">From game engines to research engineering</h2>
          <p>I started making 3D games at 13. Working with an engine taught me to think about what happens between an input and the feedback a person sees. At <Link href="/nodes/opendsa-engine" className="text-glow underline">OpenDSA</Link>, I bring that curiosity to instructor analytics and browser-side caching for interactive computer science learning tools.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">Building local-first AI</h2>
          <p>I founded <Link href="/nodes/intelent-ai" className="text-glow underline">Intelent Technologies LLC</Link> to build local-first AI agents that pair model capabilities with repeatable workflows.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">Leadership</h2>
          <p>I serve as <Link href="/nodes/vt-vsa-fundraising" className="text-glow underline">Fundraising Chair</Link> for Virginia Tech’s Vietnamese Student Association. It’s a chance to contribute to the campus community and support the work of a student-led team.</p>
        </section>
      </div>
      <section className="mt-10 border-t border-hairline pt-8">
        <h2 className="font-mono text-sm tracking-widest text-glow">CORE VALUES</h2>
        <ul className="mt-5 grid gap-5 sm:grid-cols-3">
          {values.map(([title, detail]) => (
            <li key={title}>
              <h3 className="flex gap-2 font-semibold text-white"><span aria-hidden="true" className="text-glow">✱</span>{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{detail}</p>
            </li>
          ))}
        </ul>
      </section>
      <ConnectAndSocials />
    </main>
  );
}
