"use client";

import Link from "next/link";
import { useState } from "react";
import type { TelemetrySnapshot } from "@/lib/telemetry";
import { lobeColors, lobes, nodeHref, type CortexNode } from "@/types/cortex";

type IndexNode = Pick<CortexNode, "slug" | "title" | "lobe" | "status" | "summary" | "tags">;
type Filter = "all" | CortexNode["lobe"];

const experience = [
  ["Virginia Tech", "Computer Science"],
  ["OpenDSA", "Research Assistant"],
  ["Intelent Technologies LLC", "Founder"],
  ["Polar Dream Travel", "Software Engineering Intern"],
  ["Virginia Tech VSA", "Fundraising Chair"],
] as const;

export default function CortexIndex2D({ nodes, telemetry }: {
  nodes: readonly IndexNode[];
  telemetry: TelemetrySnapshot | null | undefined;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const categories = lobes.filter((lobe) => nodes.some((node) => node.lobe === lobe));
  const filters = ["all", ...categories] as const;
  const visibleNodes = nodes.filter((node) => filter === "all" || node.lobe === filter);
  const github = telemetry?.github;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="border-b border-hairline pb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">Vinh Cortex</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-400">
          Software engineering, research, and student leadership.
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="velocity-heading" className="rounded-xl border border-hairline bg-surface p-5">
          <h2 id="velocity-heading" className="text-sm font-semibold text-zinc-200">GitHub commit velocity</h2>
          <p className="mt-3 font-mono text-2xl text-glow">{github ? `${github.totalRecentCommits}${github.commitCountComplete ? "" : "+"}` : "—"}</p>
          <p className="mt-1 text-xs text-zinc-400" role="status">
            {github ? `Last ${github.windowDays} days${telemetry?.stale ? " · cached" : ""}` : telemetry === undefined ? "Loading GitHub activity…" : "GitHub activity unavailable"}
          </p>
        </section>

        <section aria-labelledby="experience-heading" className="order-first rounded-xl border border-hairline bg-surface p-5">
          <h2 id="experience-heading" className="text-sm font-semibold text-zinc-200">Experience &amp; Education</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {experience.map(([organization, role]) => (
              <div key={organization}>
                <dt className="text-sm font-medium text-foreground">{organization}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-zinc-400">{role}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section aria-labelledby="directory-heading" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="directory-heading" className="text-2xl font-semibold tracking-tight text-white">Case study directory</h2>
          <p className="font-mono text-xs text-zinc-400" role="status">
            {visibleNodes.length} {visibleNodes.length === 1 ? "case study" : "case studies"}
          </p>
        </div>
        {categories.length > 1 && <div role="group" aria-label="Filter by category" className="mt-4 flex flex-wrap gap-2">
          {filters.map((lobe) => (
            <button
              key={lobe}
              type="button"
              aria-pressed={filter === lobe}
              onClick={() => setFilter(lobe)}
              style={{ "--category-color": lobe === "all" ? "var(--color-glow)" : lobeColors[lobe] } as React.CSSProperties}
              className="cursor-pointer rounded-full border border-hairline px-3 py-2 font-mono text-xs tracking-wide uppercase text-(--category-color) transition-colors hover:border-(--category-color) aria-pressed:border-(--category-color) aria-pressed:bg-zinc-800"
            >
              {lobe}
            </button>
          ))}
        </div>}

        {visibleNodes.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-hairline p-6 text-zinc-400">
            No case studies in this lobe yet.
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleNodes.map((node) => (
              <li key={node.slug}>
                <Link href={nodeHref(node.slug)} style={{ "--category-color": lobeColors[node.lobe] } as React.CSSProperties} className="group flex h-full flex-col rounded-xl border border-hairline bg-surface p-5 transition-colors hover:border-(--category-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow">
                  <div className="flex items-center justify-between gap-3 font-mono text-xs capitalize">
                    <span className="uppercase text-(--category-color)">{node.lobe}</span>
                    <span className="text-zinc-400">{node.status}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold leading-snug text-white group-hover:text-glow">{node.title}</h3>
                  <p className="mt-2 grow text-sm leading-relaxed text-zinc-400">{node.summary}</p>
                  <div className="mt-4 flex items-end justify-between gap-3 border-t border-hairline pt-3">
                    <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
                      {node.tags.map((tag) => (
                        <li key={tag} className="rounded bg-background px-2 py-1 font-mono text-xs text-zinc-300">{tag}</li>
                      ))}
                    </ul>
                    <span aria-hidden="true" className="text-primary group-hover:text-glow">↗</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
