import { cortexHubSlug, isResumeCore, lobes, type CortexPreviewNode } from "@/types/cortex";

export const formations = ["cortex", "galaxy", "radial", "grid"] as const;
export type Formation = (typeof formations)[number];
export const pointCount = 2400;
type Position = [number, number, number];
const tau = Math.PI * 2;
// Convert the original graph to tenths of a scene unit, then spread it 2.2×.
const spreadScale = 0.22;

export const shortLabels: Record<string, string> = {
  "opendsa-engine": "OpenDSA", "intelent-ai": "Intelent",
  "autoviz-engine": "AutoViz", lockin: "LockIn", "polar-dream-travel": "Polar Dream",
  align: "Align", "vt-vsa-fundraising": "VT VSA", "visual-storytelling": "Creative Studio",
  "habit-architecture": "Cognitive Systems", "frontier-tech-writing": "Writing",
  "house-djing": "Audio Lab", "game-development": "Game Engineering",
  "ap-capstone-driving-sim": "Driving Study", "vt-cs-systems": "VT Systems",
  "ml-quantum-lab": "ML Lab", "beyond-code": "Beyond Code",
};

export function nodePositions(nodes: CortexPreviewNode[], formation: Formation): Position[] {
  const members = nodes.filter(({ slug }) => slug !== cortexHubSlug);
  const core = members.filter(isResumeCore);
  const satellites = members.filter((node) => !isResumeCore(node));
  return nodes.map((node): Position => {
    if (node.slug === cortexHubSlug) return [0, 0, 0];
    const cluster = lobes.indexOf(node.lobe);
    const group = members.filter(({ lobe }) => lobe === node.lobe);
    const index = group.indexOf(node);
    const angle = Math.PI / 2 - tau * cluster / lobes.length;
    if (formation === "galaxy") {
      const radius = 10 + 4 * index + cluster * 0.8;
      const spiral = angle + radius * 0.095;
      return [radius * Math.cos(spiral), radius * Math.sin(spiral), (index % 3 - 1) * 4];
    }
    if (formation === "grid") {
      const slot = members.indexOf(node);
      return [(slot % 5 - 2) * 11, (Math.floor(slot / 5) % 4 - 1.5) * 11, (cluster % 3 - 1) * 11];
    }
    if (formation === "radial") {
      const radius = 10 + index * 4.2;
      return [radius * Math.cos(angle), radius * Math.sin(angle), (index % 2 - 0.5) * 4];
    }
    const ring = isResumeCore(node) ? core : satellites;
    const slot = ring.indexOf(node);
    const offset = Math.PI / 2 + tau * slot / ring.length + (ring === core ? 0 : 0.35);
    const primary = ring === core;
    const radius = primary ? (satellites.length ? 14 : 19) : 23 + 1.5 * Math.cos(3 * offset);
    return [
      radius * Math.cos(offset),
      radius * Math.sin(offset),
      primary ? (slot % 3 - 1) * 5 : 10 * Math.sin(2 * offset + 0.4),
    ];
  }).map(([x, y, z]) => [x * spreadScale, y * spreadScale, z * spreadScale]);
}

export function cloudPositions(formation: Formation) {
  const points = new Float32Array(pointCount * 3);
  for (let i = 0; i < pointCount; i++) {
    const cluster = i % lobes.length;
    const index = Math.floor(i / lobes.length);
    const ratio = (index + 0.5) / (pointCount / lobes.length);
    const noise = Math.sin(i * 78.233) * 43758.5453;
    const jitter = noise - Math.floor(noise) - 0.5;
    const angle = Math.PI / 2 - tau * cluster / lobes.length;
    let position: Position;
    if (formation === "galaxy") {
      const radius = 3 + 30 * Math.sqrt(ratio);
      const spiral = angle + radius * 0.13 + jitter * 0.7;
      position = [radius * Math.cos(spiral), radius * Math.sin(spiral), jitter * (8 - ratio * 5)];
    } else if (formation === "radial") {
      const radius = 3 + 29 * ratio;
      const ray = angle + (index % 4 - 1.5) * 0.065;
      position = [radius * Math.cos(ray), radius * Math.sin(ray), jitter * 6];
    } else if (formation === "grid") {
      position = [(i % 20 - 9.5) * 3, (Math.floor(i / 20) % 15 - 7) * 3, (Math.floor(i / 300) - 3.5) * 5];
    } else {
      // Two folded hemispheres, separated by the longitudinal fissure.
      const side = i % 2 ? 1 : -1;
      const level = 1 - 2 * ratio;
      const phase = index * 2.399963 + cluster * 0.19;
      const ring = Math.sqrt(1 - level * level);
      const fold = 1 + 0.09 * Math.cos(phase * 9 + level * 18) + 0.05 * Math.sin(level * 32);
      position = [
        side * (2.2 + (1 + Math.cos(phase) * ring) * 10.8 * fold),
        23 * level * fold + 1.4 * Math.sin(phase),
        13 * Math.sin(phase) * ring * fold + jitter * 2,
      ];
    }
    points.set(position.map((coordinate) => coordinate * spreadScale), i * 3);
  }
  return points;
}
