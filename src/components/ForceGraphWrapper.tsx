"use client";

import { memo, useEffect, type RefObject } from "react";
import ForceGraph3D, {
  type ForceGraphMethods, type ForceGraphProps, type LinkObject, type NodeObject,
} from "react-force-graph-3d";
import type { CortexPreviewNode } from "@/types/cortex";

export type GraphNode = NodeObject<CortexPreviewNode>;
export type GraphLink = LinkObject<CortexPreviewNode, { active: boolean }>;
export type GraphMethods = ForceGraphMethods<GraphNode, GraphLink>;

type ForceGraphWrapperProps = ForceGraphProps<GraphNode, GraphLink> & {
  graphRef: RefObject<GraphMethods | undefined>;
  onReady: () => void;
};

export default memo(function ForceGraphWrapper({ graphRef, onReady, ...props }: ForceGraphWrapperProps) {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return <ForceGraph3D<CortexPreviewNode, { active: boolean }> ref={graphRef} {...props} />;
});
