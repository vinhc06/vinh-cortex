"use client";

import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import type { TelemetrySnapshot } from "@/lib/telemetry";
import type { CortexPreviewNode, CortexWorkspaceNode, SynapseLink } from "@/types/cortex";
import CortexIndex2D from "./CortexIndex2D";
import NeuralCortex3D, { type CortexCamera } from "./NeuralCortex3D";
import NodeDrawer from "./NodeDrawer";
import { CareerIcons } from "./SocialLinks";
import ScrambleStat from "./ScrambleStat";

const telemetryUrl = process.env.NEXT_PUBLIC_AWS_TELEMETRY_URL?.trim() || "/api/telemetry";

export default function CortexWorkspace({
  nodes,
  links,
  initialView = "3d",
}: {
  nodes: CortexWorkspaceNode[];
  links: SynapseLink[];
  initialView?: "3d" | "2d";
}) {
  const view = initialView;
  const [ignited, setIgnited] = useState(false);
  const finishIgnition = useCallback(() => setIgnited(true), []);
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>();
  const github = telemetry?.github;
  const systemStatus = github ? telemetry?.stale ? "Cached" : "Live" : telemetry === undefined ? "Connecting" : "Unavailable";
  const cameraRef = useRef<CortexCamera>(null);
  const node = nodes.find(({ slug }) => slug === selectedSlug);
  const closeDrawer = useCallback(() => setSelectedSlug(undefined), []);
  const selectNode = useCallback(({ slug }: CortexPreviewNode) => {
    cameraRef.current?.focusNode(slug);
    startTransition(() => setSelectedSlug(slug));
  }, []);
  const connectedSlugs = new Set<string>();
  if (node) {
    for (const { source, target } of links) {
      if (source === node.slug) connectedSlugs.add(target);
      if (target === node.slug) connectedSlugs.add(source);
    }
    connectedSlugs.delete(node.slug);
  }
  const connections = nodes.filter(({ slug }) => connectedSlugs.has(slug));

  useEffect(() => {
    const controller = new AbortController();
    async function loadTelemetry() {
      try {
        const response = await fetch(telemetryUrl, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Telemetry request failed");
        const snapshot = await response.json() as TelemetrySnapshot;
        if (!controller.signal.aborted) setTelemetry(snapshot);
      } catch {
        if (!controller.signal.aborted) setTelemetry(null);
      }
    }
    void loadTelemetry();
    return () => controller.abort();
  }, []);

  return (
    <>
      <header className="relative z-20 border-b border-hairline bg-surface/85 backdrop-blur-xl" data-ignition={view === "3d" ? ignited ? "ready" : "pending" : undefined}>
        <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3 sm:px-7">
          <div className="ignition-hud flex items-center gap-2 whitespace-nowrap font-mono text-[0.68rem] tracking-wide text-glow sm:text-xs">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-glow shadow-[0_0_10px_#22D3EE]" />
            SINGULARITY // CORTEX v0.1
          </div>
          <div className="ignition-hud [--ignition-delay:65ms]"><CareerIcons /></div>
          <dl className="ignition-hud flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap font-mono text-[0.68rem] [--ignition-delay:130ms] sm:text-xs">
            <div className="flex items-center gap-1.5">
              <dt className="text-zinc-400">Commits{github ? ` · ${github.windowDays}d` : ""}</dt>
              <dd className="text-glow"><ScrambleStat value={github ? `${github.totalRecentCommits}${github.commitCountComplete ? "" : "+"}` : "—"} play={ignited} /></dd>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 border-l border-hairline pl-3">
              <dt className="text-zinc-400">Status</dt>
              <dd className="text-glow" role="status">{systemStatus}</dd>
            </div>
          </dl>
        </div>
      </header>

      {view === "3d" ? (
        <main className="mx-auto w-full max-w-[100rem] px-4 pb-8 pt-6 sm:px-7 sm:pt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Neural Cortex</h1>
              <p className="mt-1 text-sm text-zinc-400">Select a node to explore its case study and connections.</p>
            </div>
            <Link href="/index" className="rounded-full border border-primary/40 px-3 py-1.5 text-xs text-glow hover:bg-primary/10 sm:hidden">
              Browse 2D Index →
            </Link>
          </div>
          <NeuralCortex3D
            nodes={nodes}
            links={links}
            selectedSlug={selectedSlug}
            cameraRef={cameraRef}
            onSelectNode={selectNode}
            onResetCamera={closeDrawer}
            onIgnitionComplete={finishIgnition}
            ignitionFinished={ignited}
          />
          <AnimatePresence mode="wait">
            {node && <NodeDrawer key={node.slug} node={node} connections={connections} onSelectNode={selectNode} onClose={closeDrawer} />}
          </AnimatePresence>
        </main>
      ) : (
        <CortexIndex2D nodes={nodes} telemetry={telemetry} />
      )}
    </>
  );
}
