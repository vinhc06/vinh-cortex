"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import {
  AdditiveBlending, AmbientLight, BufferAttribute, BufferGeometry, CanvasTexture, Color, DynamicDrawUsage, Group, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PerspectiveCamera, PointLight, Points, PointsMaterial, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, TorusGeometry,
} from "three";
import { cloudPositions, formations, nodePositions, pointCount, shortLabels, type Formation } from "@/lib/cortex-topology";
import { createLabelLayout, type ScreenLabel } from "@/lib/cortex-label-layout";
import { isResumeCore, lobeColors, lobes, type CortexPreviewNode, type SynapseLink } from "@/types/cortex";
import type { GraphLink, GraphMethods, GraphNode } from "./ForceGraphWrapper";
import { useSceneReady, useSoundCue } from "./TacticalEffects";

const ForceGraph = dynamic(
  () => import("./ForceGraphWrapper"),
  { ssr: false, loading: () => <GraphMessage>Loading 3D cortex…</GraphMessage> },
);

function GraphMessage({ children }: { children: ReactNode }) {
  return <p role="status" className="absolute inset-0 grid place-content-center px-6 text-center font-mono text-sm text-zinc-400">{children}</p>;
}

class GraphBoundary extends Component<{ children: ReactNode; onWebGLUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    if (/Error creating WebGL context/i.test(error.message)) this.props.onWebGLUnavailable();
  }

  render() {
    return this.state.failed
      ? <GraphMessage><span>3D rendering is unavailable.</span><Link href="/index" className="mt-2 text-glow underline">Browse the 2D case study index</Link></GraphMessage>
      : this.props.children;
  }
}

function makeSphere(node: GraphNode) {
  const radius = isResumeCore(node) ? 0.23 : 0.14;
  const color = lobeColors[node.lobe];
  const group = new Group();
  group.add(new Mesh(
    new SphereGeometry(radius, 20, 12),
    new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: node.status === "active" ? 0.85 : 0.45, roughness: 0.42, transparent: true }),
  ));
  group.add(new Mesh(
    new SphereGeometry(radius * 1.5, 16, 10),
    new MeshBasicMaterial({ color, transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false }),
  ));
  {
    const ring = new Mesh(
      new TorusGeometry(radius * 1.85, 0.006, 6, 32),
      new MeshBasicMaterial({ color, transparent: true, opacity: 0.48, depthWrite: false }),
    );
    ring.rotation.set(0.5, 0.3, 0);
    group.add(ring);
  }
  return group;
}

function labelFont() {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono").trim();
  return `600 36px ${family || "monospace"}`;
}

function makeLabelTexture(title: string, highlighted: boolean) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  const font = labelFont();
  context.font = font;
  canvas.width = Math.ceil(context.measureText(title).width) + 42;
  canvas.height = 70;
  context.font = font;
  if (highlighted) {
    context.beginPath();
    context.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 33);
    context.fillStyle = "rgba(9, 11, 14, 0.92)";
    context.fill();
    context.strokeStyle = "#06B6D4";
    context.lineWidth = 3;
    context.stroke();
  }
  context.fillStyle = highlighted ? "#22D3EE" : "#CBD5E1";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(title, canvas.width / 2, canvas.height / 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

type NodeLabel = {
  group: Group;
  screen?: ScreenLabel;
  normal?: CanvasTexture;
  highlighted?: CanvasTexture;
};

const homePosition = { x: 0, y: 0, z: 18 };
const origin = { x: 0, y: 0, z: 0 };
const linkColor = () => "#06B6D4";
const particleColor = () => "#22D3EE";
const particleCount = (link: GraphLink) => link.active ? 3 : 0;
const finiteCoordinate = (value: number) => Number.isFinite(value) ? value : 0;
const opticsDefaults = { Glow: 65, "Point Size": 45, Connections: 60, Labels: 100 };
const opticKeys = Object.keys(opticsDefaults) as (keyof typeof opticsDefaults)[];
const cloudColors = lobes.map((lobe) => new Color(lobeColors[lobe]));
const ignitionDuration = 1150;
let hasIgnited = false;

function makeCloud() {
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(cloudPositions("cortex"), 3).setUsage(DynamicDrawUsage);
  const color = new BufferAttribute(new Float32Array(pointCount * 3), 3).setUsage(DynamicDrawUsage);
  geometry.setAttribute("position", position);
  geometry.setAttribute("color", color);
  const points = new Points(geometry, new PointsMaterial({
    size: 0.045, vertexColors: true, depthWrite: false, transparent: true,
    opacity: 0.55, blending: AdditiveBlending, toneMapped: false,
  }));
  points.frustumCulled = false;
  points.raycast = () => {}; // Decorative particles never capture graph input.
  return { points, position, color };
}

export type CortexCamera = { focusNode: (slug: string) => void };

const NeuralCortex3D = memo(function NeuralCortex3D({
  nodes,
  links,
  selectedSlug,
  cameraRef,
  onSelectNode,
  onResetCamera,
  onIgnitionComplete,
  ignitionFinished,
  onWebGLUnavailable,
}: {
  nodes: CortexPreviewNode[];
  links: SynapseLink[];
  selectedSlug?: string;
  cameraRef: Ref<CortexCamera>;
  onSelectNode: (node: CortexPreviewNode) => void;
  onResetCamera: () => void;
  onIgnitionComplete: () => void;
  ignitionFinished: boolean;
  onWebGLUnavailable: () => void;
}) {
  const sceneReady = useSceneReady();
  const playCue = useSoundCue();
  const viewport = useRef<HTMLDivElement>(null);
  const fgRef = useRef<GraphMethods | undefined>(undefined);
  const hasInitializedCameraRef = useRef(false);
  const pendingCameraAction = useRef<{ slug: string } | "reset" | null>(null);
  const hoveredSlug = useRef<string | undefined>(undefined);
  const focusedSlug = useRef<string | undefined>(undefined);
  const selectedLabelSlug = useRef(selectedSlug);
  const labels = useRef(new WeakMap<GraphNode, NodeLabel>());
  const restoreLabelLayout = useRef<(() => void) | undefined>(undefined);
  const cloud = useRef<ReturnType<typeof makeCloud> | null>(null);
  const [formation, setFormation] = useState<Formation>("cortex");
  const [category, setCategory] = useState<CortexPreviewNode["lobe"]>();
  const filterLobes = lobes.filter((lobe) => nodes.some((node) => node.lobe === lobe));
  const categoryRef = useRef<CortexPreviewNode["lobe"] | undefined>(undefined);
  const labelsReady = useRef(ignitionFinished);
  const [optics, setOptics] = useState(opticsDefaults);
  const opticsRef = useRef(opticsDefaults);
  const morph = useRef<{
    start: number; duration: number; ignition?: boolean;
    fromCloud: Float32Array; toCloud: Float32Array;
    fromNodes: ReturnType<typeof nodePositions>; toNodes: ReturnType<typeof nodePositions>;
  } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const graphData = useMemo(() => {
    const active = new Set(nodes.filter((node) => node.status === "active").map((node) => node.slug));
    const positions = nodePositions(nodes, "cortex");
    const positioned = nodes.map((node, index): GraphNode => {
      const [x, y, z] = positions[index];
      return { ...node, x, y, z, fx: x, fy: y, fz: z };
    });
    // The force simulation writes coordinates and resolved endpoints into these objects.
    return {
      nodes: positioned,
      links: links.map((link): GraphLink => ({ ...link, active: active.has(link.source) || active.has(link.target) })),
    };
  }, [nodes, links]);
  const targets = useMemo(() => formations.map((mode) => ({
    mode,
    cloud: cloudPositions(mode),
    nodes: nodePositions(nodes, mode),
  })), [nodes]);
  const showParticles = optics.Connections > 0;
  const particleCountForOptics = useCallback((link: GraphLink) => showParticles ? particleCount(link) : 0, [showParticles]);

  const tickMorph = useCallback((forcedProgress?: number) => {
    const animation = morph.current;
    const pointCloud = cloud.current;
    if (!animation || !pointCloud) return;
    const linear = forcedProgress ?? (animation.duration ? Math.max(0, Math.min((performance.now() - animation.start) / animation.duration, 1)) : 1);
    const progress = linear >= 1 ? 1 : animation.ignition
      ? 1 - Math.exp(-7 * linear) * Math.cos(8.5 * linear)
      : linear * linear * (3 - 2 * linear);
    const positions = pointCloud.position.array;
    for (let i = 0; i < positions.length; i++) {
      positions[i] = animation.fromCloud[i] + (animation.toCloud[i] - animation.fromCloud[i]) * progress;
    }
    pointCloud.position.needsUpdate = true;
    graphData.nodes.forEach((node, index) => {
      const from = animation.fromNodes[index];
      const to = animation.toNodes[index];
      node.x = node.fx = from[0] + (to[0] - from[0]) * progress;
      node.y = node.fy = from[1] + (to[1] - from[1]) * progress;
      node.z = node.fz = from[2] + (to[2] - from[2]) * progress;
    });
    if (linear >= 1) {
      morph.current = null;
      if (animation.ignition) {
        hasIgnited = true;
        queueMicrotask(onIgnitionComplete);
      }
    }
  }, [graphData, onIgnitionComplete]);

  const changeFormation = useCallback((next: Formation, start: number) => {
    const pointCloud = cloud.current;
    const graph = fgRef.current;
    const target = targets.find(({ mode }) => mode === next);
    if (next === formation || !pointCloud || !graph || !target) return;
    if (morph.current?.ignition) {
      hasIgnited = true;
      onIgnitionComplete();
    }
    setFormation(next);
    morph.current = {
      start,
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 580,
      fromCloud: new Float32Array(pointCloud.position.array),
      toCloud: target.cloud,
      fromNodes: graphData.nodes.map(({ x, y, z }) => [x ?? 0, y ?? 0, z ?? 0]),
      toNodes: target.nodes,
    };
    graph.d3ReheatSimulation();
  }, [formation, graphData, onIgnitionComplete, targets]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const nextSize = { width: Math.floor(width), height: Math.floor(height) };
      setSize((current) => current.width === nextSize.width && current.height === nextSize.height ? current : nextSize);
    });
    let disposed = false;
    const observe = () => { if (!disposed) observer.observe(element); };
    void document.fonts.load(labelFont()).then(observe, observe);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, []);

  const updateLabel = useCallback((slug: string | undefined) => {
    if (!slug) return;
    const node = graphData.nodes.find((candidate) => candidate.slug === slug);
    if (!node) return;
    const entry = labels.current.get(node);
    if (!entry) return;
    const engaged = slug === hoveredSlug.current || slug === focusedSlug.current || slug === selectedLabelSlug.current;
    const highlighted = engaged || node.lobe === categoryRef.current;
    const core = isResumeCore(node);
    const labelOpacity = opticsRef.current.Labels / 100;
    if (!labelsReady.current || !labelOpacity || (!highlighted && !core)) {
      if (entry.screen) entry.screen.opacity = 0;
      return;
    }

    const variant = highlighted ? "highlighted" : "normal";
    const title = highlighted ? node.title : shortLabels[slug] ?? node.title.split(/\s+/).slice(0, 2).join(" ");
    const texture = entry[variant] ??= makeLabelTexture(title, highlighted);
    if (!texture) return;
    if (!entry.screen) {
      const sprite = new Sprite(new SpriteMaterial({ map: texture, depthWrite: false, toneMapped: false, opacity: 0 }));
      sprite.raycast = () => {}; // Labels should not intercept sphere clicks or hover.
      sprite.frustumCulled = false;
      sprite.visible = false;
      entry.group.add(sprite);
      entry.screen = { sprite, width: 1, height: 1, opacity: 0, priority: 0 };
    }
    const { screen } = entry;
    screen.sprite.material.map = texture;
    const height = highlighted ? 0.39 : 0.31;
    screen.sprite.position.set(0, highlighted ? -0.38 : -0.30, 0);
    screen.width = height * texture.image.width / texture.image.height;
    screen.height = height;
    screen.priority = engaged ? 2 : core ? 1 : 0;
    const selected = graphData.nodes.find((candidate) => candidate.slug === selectedLabelSlug.current);
    const focus = categoryRef.current ?? selected?.lobe;
    const fade = focus && focus !== node.lobe ? 0.15 : 1;
    screen.opacity = labelOpacity * (highlighted ? 1 : 0.52 * fade);
  }, [graphData]);

  const applyOptics = useCallback(() => {
    const { Glow, "Point Size": pointSize } = opticsRef.current;
    const focus = graphData.nodes.find((node) => node.slug === selectedLabelSlug.current);
    const focusedLobe = categoryRef.current ?? focus?.lobe;
    const firstLobe = graphData.nodes[0]?.lobe;
    const singleLobe = firstLobe && graphData.nodes.every((node) => node.lobe === firstLobe) ? firstLobe : undefined;
    const pointCloud = cloud.current;
    if (pointCloud) {
      pointCloud.points.material.size = 0.012 + pointSize * 0.00066;
      pointCloud.points.material.opacity = 0.07 + Glow * 0.004;
      for (let i = 0; i < pointCount; i++) {
        const cluster = singleLobe ? lobes.indexOf(singleLobe) : i % lobes.length;
        const brightness = focusedLobe && lobes[cluster] !== focusedLobe ? 0.12 : 0.8;
        const { r, g, b } = cloudColors[cluster];
        pointCloud.color.setXYZ(i, r * brightness, g * brightness, b * brightness);
      }
      pointCloud.color.needsUpdate = true;
    }
    for (const node of graphData.nodes) {
      const group = labels.current.get(node)?.group;
      const fade = focusedLobe && node.lobe !== focusedLobe ? 0.15 : 1;
      const sphere = group?.children[0];
      const halo = group?.children[1];
      const ring = group?.children[2];
      if (sphere instanceof Mesh && sphere.material instanceof MeshStandardMaterial) {
        sphere.material.emissiveIntensity = (0.18 + Glow * 0.014) * fade * (node.status === "active" ? 1 : 0.55);
        sphere.material.opacity = fade;
        sphere.material.depthWrite = fade === 1;
      }
      if (halo instanceof Mesh && halo.material instanceof MeshBasicMaterial) halo.material.opacity = Glow * 0.003 * fade;
      if (ring instanceof Mesh && ring.material instanceof MeshBasicMaterial) ring.material.opacity = Glow * 0.008 * fade;
      updateLabel(node.slug);
    }
  }, [graphData, updateLabel]);

  const makeNode = useCallback((node: GraphNode) => {
    const group = makeSphere(node);
    const entry = labels.current.get(node);
    if (entry) {
      entry.group = group;
      if (entry.screen) group.add(entry.screen.sprite);
    } else {
      labels.current.set(node, { group });
    }
    updateLabel(node.slug);
    return group;
  }, [updateLabel]);

  useEffect(() => {
    const cache = labels.current;
    return () => {
      for (const node of graphData.nodes) {
        const entry = cache.get(node);
        entry?.normal?.dispose();
        entry?.highlighted?.dispose();
      }
    };
  }, [graphData]);

  useLayoutEffect(() => {
    selectedLabelSlug.current = selectedSlug;
    categoryRef.current = category;
    labelsReady.current = ignitionFinished;
    opticsRef.current = optics;
    applyOptics();
  }, [selectedSlug, category, ignitionFinished, optics, applyOptics]);

  const handleHover = useCallback((node: GraphNode | null) => {
    const previous = hoveredSlug.current;
    hoveredSlug.current = node?.slug;
    if (node && node.slug !== previous) playCue("hover");
    updateLabel(previous);
    updateLabel(node?.slug);
  }, [playCue, updateLabel]);

  function focusLabel(slug: string | undefined) {
    const previous = focusedSlug.current;
    focusedSlug.current = slug;
    updateLabel(previous);
    updateLabel(slug);
  }

  const moveCamera = useCallback((action: { slug: string } | "reset") => {
    const graph = fgRef.current;
    if (!hasInitializedCameraRef.current || !graph) {
      pendingCameraAction.current = action;
      return;
    }
    if (action === "reset") {
      graph.cameraPosition(homePosition, origin, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 800);
      return;
    }

    const index = graphData.nodes.findIndex(({ slug }) => slug === action.slug);
    const node = graphData.nodes[index];
    if (!node) return;
    const [x, y, z] = morph.current?.toNodes[index] ?? [finiteCoordinate(node.x ?? 0), finiteCoordinate(node.y ?? 0), finiteCoordinate(node.z ?? 0)];
    const dist = Math.hypot(x, y, z);
    const target = { x, y, z };
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduceMotion ? 0 : 900;
    if (dist < 0.01) {
      graph.cameraPosition({ x: 0, y: 0, z: 6 }, target, duration);
      return;
    }
    // Approach from the viewer side so the drawer does not hide the subject.
    const offset = 5;
    graph.cameraPosition({ x: x + (x / dist) * 0.9, y: y + (y / dist) * 0.45, z: z + offset }, target, duration);
  }, [graphData]);

  useImperativeHandle(cameraRef, () => ({ focusNode: (slug) => moveCamera({ slug }) }), [moveCamera]);

  const initializeCamera = useCallback(() => {
    const graph = fgRef.current;
    if (!graph || hasInitializedCameraRef.current) return;
    hasInitializedCameraRef.current = true;
    const point = new PointLight("#22D3EE", 2.5, 150, 0.7);
    point.position.set(3, 4, 6.5);
    graph.lights([new AmbientLight("#d5eefa", 1.1), point]);
    graph.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const scene = graph.scene();
    const beforeRender = scene.onBeforeRender;
    const layout = createLabelLayout();
    const screenLabels: ScreenLabel[] = [];
    scene.onBeforeRender = (...args) => {
      beforeRender.apply(scene, args);
      screenLabels.length = 0;
      for (const node of graphData.nodes) {
        const screen = labels.current.get(node)?.screen;
        if (screen) screenLabels.push(screen);
      }
      layout(args[0], args[2], screenLabels);
    };
    restoreLabelLayout.current = () => { scene.onBeforeRender = beforeRender; };
    cloud.current = makeCloud();
    graph.scene().add(cloud.current.points);
    applyOptics();
    const camera = graph.camera() as PerspectiveCamera;
    if (camera.isPerspectiveCamera) {
      camera.fov = 38;
      camera.updateProjectionMatrix();
    }
    if (!hasIgnited && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const target = targets[0];
      morph.current = {
        start: performance.now(), duration: ignitionDuration, ignition: true,
        fromCloud: new Float32Array(pointCount * 3), toCloud: target.cloud,
        fromNodes: graphData.nodes.map(() => [0, 0, 0]), toNodes: target.nodes,
      };
      tickMorph(0);
      graph.cameraPosition({ x: 0, y: 0, z: 7 }, origin, 0);
      graph.cameraPosition(homePosition, origin, ignitionDuration - 100);
      graph.d3ReheatSimulation();
    } else {
      graph.cameraPosition(homePosition, origin, 0);
      queueMicrotask(onIgnitionComplete);
    }

    const pending = pendingCameraAction.current;
    pendingCameraAction.current = null;
    if (pending) moveCamera(pending);
  }, [applyOptics, graphData, moveCamera, onIgnitionComplete, targets, tickMorph]);

  useEffect(() => () => {
    restoreLabelLayout.current?.();
    const pointCloud = cloud.current;
    if (!pointCloud) return;
    pointCloud.points.removeFromParent();
    pointCloud.points.geometry.dispose();
    pointCloud.points.material.dispose();
    cloud.current = null;
    morph.current = null;
    hasInitializedCameraRef.current = false;
  }, []);

  const handleReset = useCallback(() => {
    moveCamera("reset");
    onResetCamera();
  }, [moveCamera, onResetCamera]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented || event.repeat || event.isComposing ||
        event.ctrlKey || event.metaKey || event.altKey || event.key.toLowerCase() !== "r" ||
        event.composedPath().some((target) =>
          target instanceof HTMLElement &&
          (target.isContentEditable || target.matches("input, textarea, select, [role='textbox']")),
        )
      ) return;

      event.preventDefault();
      handleReset();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleReset]);

  return (
    <section aria-label="Interactive 3D cortex" className="relative overflow-hidden rounded-2xl border border-hairline bg-background">
      <div ref={viewport} className="relative h-[clamp(24rem,64svh,50rem)] overflow-hidden">
        {sceneReady && size.width > 0 && size.height > 0 && (
          <GraphBoundary onWebGLUnavailable={onWebGLUnavailable}>
            <ForceGraph
              graphRef={fgRef}
              onReady={initializeCamera}
              graphData={graphData}
              width={size.width}
              height={size.height}
              backgroundColor="#090B0E"
              nodeId="slug"
              nodeThreeObject={makeNode}
              nodeThreeObjectExtend
              nodeRelSize={0.22}
              nodeOpacity={0}
              nodeLabel=""
              linkColor={linkColor}
              linkOpacity={optics.Connections / 185}
              linkWidth={0}
              linkCurvature={0.18}
              linkDirectionalParticles={particleCountForOptics}
              linkDirectionalParticleColor={particleColor}
              linkDirectionalParticleSpeed={0.006}
              linkDirectionalParticleWidth={0.085}
              showNavInfo={false}
              enableNodeDrag={false}
              warmupTicks={80}
              cooldownTime={1350}
              onEngineTick={tickMorph}
              onEngineStop={tickMorph}
              onNodeHover={handleHover}
              onNodeClick={onSelectNode}
            />
          </GraphBoundary>
        )}
        <div className="pointer-events-none absolute inset-x-4 top-4 flex">
          <p className="rounded-md border border-hairline bg-surface/80 px-2.5 py-1.5 font-mono text-xs tracking-wider text-slate-400 md:hidden">
            PINCH TO ZOOM · DRAG TO ORBIT
          </p>
          <p className="hidden rounded-md border border-hairline bg-surface/80 px-2.5 py-1.5 font-mono text-xs tracking-wider text-slate-400 md:block">
            DRAG TO ORBIT · SCROLL TO ZOOM · RIGHT-DRAG TO PAN
          </p>
        </div>
        <div className="absolute inset-x-4 bottom-16 z-10 flex flex-wrap items-end justify-between gap-2">
          <div role="group" aria-label="Topology" className="flex flex-wrap gap-1 rounded-lg border border-hairline bg-surface/90 p-1 font-mono text-[0.65rem] tracking-wide text-zinc-300 sm:text-xs">
            {formations.map((mode) => (
              <button key={mode} type="button" onClick={(event) => changeFormation(mode, event.timeStamp)} aria-pressed={formation === mode} className="cursor-pointer rounded px-2 py-1.5 uppercase hover:text-glow aria-pressed:bg-primary/15 aria-pressed:text-glow">
                {mode}
              </button>
            ))}
          </div>
          <details className="relative ml-auto rounded-lg border border-primary/40 bg-surface/95 font-mono text-xs text-slate-300">
            <summary className="cursor-pointer px-3 py-2 text-glow">OPTICS</summary>
            <div className="absolute bottom-full right-0 mb-2 grid w-48 gap-3 rounded-lg border border-hairline bg-surface/95 p-3 shadow-xl">
              {opticKeys.map((key) => (
                <label key={key} className="grid gap-1">
                  <span className="flex justify-between">{key}<span className="text-glow">{optics[key]}%</span></span>
                  <input type="range" min={0} max={100} value={optics[key]} onChange={(event) => setOptics({ ...optics, [key]: Number(event.target.value) })} className="w-full accent-cyan-400" />
                </label>
              ))}
            </div>
          </details>
        </div>
        <button
          type="button"
          onClick={handleReset}
          aria-keyshortcuts="R"
          className="absolute bottom-4 left-4 z-10 flex cursor-pointer items-center gap-2 rounded-lg border border-primary/60 bg-surface/90 px-3 py-2 font-mono text-xs text-glow shadow-lg backdrop-blur-sm transition-colors hover:border-glow hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow"
        >
          Reset Camera
          <kbd aria-hidden="true" className="hidden rounded border border-primary/30 px-1.5 text-[0.65rem] text-zinc-300 md:inline">R</kbd>
        </button>
      </div>
      <div className="border-t border-hairline bg-surface/70 p-3 sm:p-4">
        {filterLobes.length > 1 && <div role="group" aria-label="Filter 3D nodes by category" className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={!category} onClick={() => setCategory(undefined)} className="cursor-pointer rounded-md border border-hairline px-2.5 py-1 font-mono text-xs text-slate-300 aria-pressed:border-primary aria-pressed:text-glow">ALL</button>
          {filterLobes.map((lobe) => (
            <button key={lobe} type="button" onClick={() => setCategory(category === lobe ? undefined : lobe)} aria-pressed={category === lobe} style={{ color: lobeColors[lobe] }} className="cursor-pointer rounded-md border border-hairline px-2.5 py-1 font-mono text-xs uppercase aria-pressed:border-current aria-pressed:bg-current/10">
              {lobe}
            </button>
          ))}
        </div>}
        <details className="mt-2 font-mono text-xs text-slate-400">
          <summary className="w-fit cursor-pointer py-1 hover:text-glow">Browse nodes</summary>
          <div role="group" aria-label="Select a cortex node" className="mt-2 flex flex-wrap gap-2">
            {graphData.nodes.filter((node) => !category || node.lobe === category).map((node) => (
              <button key={node.slug} type="button" aria-label={node.title} onFocus={() => focusLabel(node.slug)} onBlur={() => focusLabel(undefined)} onClick={() => onSelectNode(node)} aria-pressed={selectedSlug === node.slug} className="cursor-pointer rounded-full border border-hairline px-3 py-1.5 text-zinc-300 hover:border-primary/60 hover:text-glow aria-pressed:border-primary/60 aria-pressed:text-glow">
                {shortLabels[node.slug] ?? node.title}
              </button>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
});

export default NeuralCortex3D;
