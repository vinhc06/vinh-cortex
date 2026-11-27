import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import { biometrics } from "@/data/biometrics";
import { instagram } from "@/data/contact";

export const metadata = {
  title: "And What Else? | Vinh Chau",
  description: "Hybrid athletics, creative craft, and the systems Vinh explores beyond engineering.",
};

const photographs = {
  athletics: [
    ["strength-conditioning.jpg", "Strength training"],
    ["field-sports.jpg", "Team sports"],
    ["combat-training.jpg", "Combat training"],
    ["snowboarding.jpg", "Snowboarding"],
  ],
  creative: [
    ["sony-zv-e10.jpg", "Behind the camera"],
    ["ddj-sb3.jpg", "DJing on the DDJ-SB3"],
    ["independent-barbering.jpg", "Independent barbering"],
    ["lion-dance.jpg", "VT Lion Dance"],
  ],
  systems: [
    ["systems-notes.jpg", "Notes and routines"],
    ["chess.jpg", "A game in progress"],
    ["holdem-strategy.jpg", "Hold’em ranges and strategy"],
    ["lexus-rx350.jpg", "The 2008 Lexus RX 350"],
  ],
} as const;

const benchmarks = [
  ["Lat pulldown", biometrics.latPulldown],
  ["Pull-ups", biometrics.pullUps],
  ["Vertical jump", biometrics.verticalJump],
  ["5K", biometrics.fiveK],
  ["2-mile", biometrics.twoMile],
];

function PhotoGrid({ photos }: { photos: readonly (readonly [string, string])[] }) {
  return (
    <ul className="mt-7 grid auto-cols-[minmax(13rem,76%)] grid-flow-col gap-3 overflow-x-auto pb-3 sm:grid-flow-row sm:grid-cols-4 sm:overflow-visible">
      {photos.map(([file, label]) => {
        const src = `/images/${file}`;
        const available = existsSync(join(process.cwd(), "public", "images", file));
        return (
          <li key={file} className="min-w-0">
            <figure>
              <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-hairline bg-surface">
                {available ? (
                  <Image src={src} alt={label} fill sizes="(max-width: 639px) 72vw, (max-width: 1152px) 25vw, 270px" className="object-cover" />
                ) : (
                  <div className="editorial-photo-placeholder absolute inset-2 grid place-items-end border border-slate-400/10 p-3">
                    <span className="font-mono text-[0.65rem] text-slate-400">Photo forthcoming</span>
                  </div>
                )}
              </div>
              <figcaption className="mt-2 font-mono text-xs text-slate-400">{label}</figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}

export default function AndPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <header className="mb-12 border-b border-hairline pb-9 sm:mb-16">
        <h1 className="text-balance text-5xl font-semibold tracking-[-0.055em] text-white sm:text-7xl">And what else?</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">Away from the keyboard, I train, make things, and take things apart to see how they work.</p>
      </header>

      <div className="space-y-14 sm:space-y-18">
        <section aria-labelledby="and-athletics">
          <h2 id="and-athletics" className="flex items-baseline gap-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span aria-hidden="true" className="font-mono text-sm text-glow">[&amp;]</span> Hybrid Athletics
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">I combine lifting, plyometrics, calisthenics, and running. Soccer, flag football, and volleyball keep training social. I also practice MMA and snowboard.</p>
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-5">
            {benchmarks.map(([label, value]) => (
              <div key={label} className="bg-surface p-3 sm:p-4">
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="mt-1 font-mono text-sm text-glow">{value}</dd>
              </div>
            ))}
          </dl>
          <PhotoGrid photos={photographs.athletics} />
        </section>

        <section aria-labelledby="and-creative" className="border-t border-hairline pt-9">
          <h2 id="and-creative" className="flex items-baseline gap-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span aria-hidden="true" className="font-mono text-sm text-glow">[&amp;]</span> Creative Craft
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">I shoot with a Sony ZV-E10 and edit in DaVinci Resolve. I mix house music on a Pioneer DDJ-SB3 and build 3D games in UE5 and Unity. Independent barbering and VT Lion Dance give me two more ways to practice timing and precision.</p>
          <PhotoGrid photos={photographs.creative} />
          <a href={instagram.href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-glow underline decoration-primary/40 underline-offset-4 hover:decoration-glow">
            {instagram.label} {instagram.handle} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span>
          </a>
        </section>

        <section aria-labelledby="and-systems" className="border-t border-hairline pt-9">
          <h2 id="and-systems" className="flex items-baseline gap-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span aria-hidden="true" className="font-mono text-sm text-glow">[&amp;]</span> Systems &amp; Strategy
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">I use what I learn about neuroscience, habits, and sleep to refine my routines. Texas Hold’em and chess give me different ways to practice decision-making. With DIY maintenance on a 2008 Lexus RX 350, I use the same habit of isolating a variable and checking what changed.</p>
          <PhotoGrid photos={photographs.systems} />
        </section>
      </div>
    </main>
  );
}
