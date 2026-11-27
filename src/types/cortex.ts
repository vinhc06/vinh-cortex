export const lobes = ["engineering", "creatives", "optimization", "athletics", "writing"] as const;
export const lobeColors = {
  engineering: "#22d3ee",
  creatives: "#c084fc",
  optimization: "#fbbf24",
  athletics: "#4ade80",
  writing: "#fb7185",
} satisfies Record<(typeof lobes)[number], string>;

export const cortexHubSlug = "opendsa-engine";
const resumeCoreSlugs = new Set([
  cortexHubSlug, "intelent-ai", "polar-dream-travel", "autoviz-engine",
  "lockin", "align", "vt-vsa-fundraising",
]);

export function isResumeCore(node: Pick<CortexNode, "slug">) {
  return resumeCoreSlugs.has(node.slug);
}

const archivedDestinations = new Map<string, string>([
  ["vinh-chau", "/about"],
  ["game-theory", "/nodes/habit-architecture"],
  ["mechanical-auto-diagnostics", "/nodes/habit-architecture"],
  ["focus-automation", "/nodes/habit-architecture"],
  ["sleep-protocols", "/nodes/habit-architecture"],
  ...["combat-sports", "competitive-team-sports", "mountain-trail", "telemetry-baseline"].map((slug): [string, string] => [slug, "/and#and-athletics"]),
  ...["lion-dance", "precision-barbering"].map((slug): [string, string] => [slug, "/and#and-creative"]),
]);

export const archivedNodeSlugs = [...archivedDestinations.keys()];

export function nodeHref(slug: string) {
  const archived = archivedDestinations.get(slug);
  if (archived) return archived;
  if (slug === "frontier-tech-writing") return "/writing";
  if (slug === "beyond-code") return "/and";
  return `/nodes/${slug}`;
}
const statuses = ["active", "completed"] as const;

export interface CortexNode {
  slug: string;
  title: string;
  lobe: (typeof lobes)[number];
  status: (typeof statuses)[number];
  date: string;
  summary: string;
  tags: string[];
  impact?: string[];
  repoUrl?: string;
  videoKey?: string;
  metrics?: Record<string, string | number>;
  featured?: boolean;
  html: string;
}

export interface SynapseLink {
  source: string;
  target: string;
}

export type CortexPreviewNode = Pick<
  CortexNode,
  "slug" | "title" | "lobe" | "status" | "summary" | "tags" | "metrics" | "featured"
>;

export type CortexWorkspaceNode = CortexPreviewNode &
  Pick<CortexNode, "html" | "date" | "repoUrl" | "impact"> & { videoSrc?: string };

export interface CortexGraph {
  nodes: CortexNode[];
  links: SynapseLink[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function assertCortexNode(value: unknown): asserts value is CortexNode {
  if (!isRecord(value)) throw new Error("Expected a node object");

  const fields = {
    slug: typeof value.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug),
    title: isText(value.title),
    lobe: lobes.some((lobe) => lobe === value.lobe),
    status: statuses.some((status) => status === value.status),
    date: isDate(value.date),
    summary: isText(value.summary),
    tags: Array.isArray(value.tags) && value.tags.every(isText),
    impact: value.impact === undefined || (Array.isArray(value.impact) && value.impact.every(isText)),
    repoUrl: value.repoUrl === undefined ||
      (isText(value.repoUrl) && /^https?:\/\//i.test(value.repoUrl) && URL.canParse(value.repoUrl)),
    videoKey: value.videoKey === undefined || isText(value.videoKey),
    metrics: value.metrics === undefined ||
      (isRecord(value.metrics) && Object.values(value.metrics).every(
        (metric) => isText(metric) || (typeof metric === "number" && Number.isFinite(metric)),
      )),
    featured: value.featured === undefined || typeof value.featured === "boolean",
    html: typeof value.html === "string",
  } satisfies Record<keyof CortexNode, boolean>;

  const invalid = Object.keys(fields).filter((key) => !fields[key as keyof typeof fields]);
  if (invalid.length) throw new Error(`Invalid node fields: ${invalid.join(", ")}`);
}
