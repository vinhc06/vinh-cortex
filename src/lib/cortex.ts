import graph from "../../public/data/cortex-graph.json";
import { assertCortexNode, isResumeCore, type CortexGraph } from "@/types/cortex";
import { resolveMediaUrl } from "@/lib/media";

const nodes = graph.nodes.map((node) => {
  assertCortexNode(node);
  return { ...node, contentHtml: node.html };
});

const cortexGraph = { nodes, links: graph.links } satisfies CortexGraph;
const workspaceOrder = [
  "opendsa-engine", "intelent-ai", "polar-dream-travel", "autoviz-engine", "lockin",
  "align", "vt-vsa-fundraising",
  "ap-capstone-driving-sim", "game-development", "vt-cs-systems", "ml-quantum-lab",
  "visual-storytelling", "house-djing", "frontier-tech-writing", "habit-architecture", "beyond-code",
];
const workspaceRank = new Map(workspaceOrder.map((slug, index) => [slug, index]));

export function getCortexGraph() {
  return cortexGraph;
}

export function getNodeBySlug(slug: string) {
  return nodes.find((node) => node.slug === slug);
}

export function getWorkspaceGraph(scope: "constellation" | "career") {
  const selected = scope === "career" ? nodes.filter(isResumeCore) : nodes;
  const selectedSlugs = new Set(selected.map(({ slug }) => slug));
  return {
    nodes: [...selected].sort((a, b) => (workspaceRank.get(a.slug) ?? workspaceOrder.length) - (workspaceRank.get(b.slug) ?? workspaceOrder.length))
      .map(({ slug, title, lobe, status, summary, tags, impact, metrics, featured, html, date, repoUrl, videoKey }) => ({
        slug, title, lobe, status, summary, tags, impact, metrics, featured, html, date, repoUrl,
        videoSrc: resolveMediaUrl(videoKey),
      })),
    links: graph.links.filter(({ source, target }) => selectedSlugs.has(source) && selectedSlugs.has(target)),
  };
}
