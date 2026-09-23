import dagre from "@dagrejs/dagre";
import type { Edge } from "reactflow";
import type { MindMapNode } from "./mindmap-tree";

export const MINDMAP_NODE_WIDTH = 180;
export const MINDMAP_NODE_HEIGHT = 44;

/**
 * Computes a left-to-right tree layout for the given (already-filtered to
 * visible) nodes/edges and returns new positions keyed by node id.
 */
export function computeTreeLayout(
  nodes: MindMapNode[],
  edges: Edge[]
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 24, ranksep: 90 });

  for (const node of nodes) {
    g.setNode(node.id, { width: MINDMAP_NODE_WIDTH, height: MINDMAP_NODE_HEIGHT });
  }
  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    const laidOut = g.node(node.id);
    if (!laidOut) continue;
    positions.set(node.id, {
      x: laidOut.x - MINDMAP_NODE_WIDTH / 2,
      y: laidOut.y - MINDMAP_NODE_HEIGHT / 2,
    });
  }
  return positions;
}
