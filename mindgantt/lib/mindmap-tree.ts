import type { Edge, Node } from "reactflow";

export type MindMapNodeStoredData = {
  label: string;
  collapsed?: boolean;
};

export type MindMapNode = Node<MindMapNodeStoredData>;

export const ROOT_ID = "root";

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `n${Date.now()}${Math.random().toString(16).slice(2)}`;
}

export function createInitialGraph(): { nodes: MindMapNode[]; edges: Edge[] } {
  const childA = makeId();
  const childB = makeId();
  return {
    nodes: [
      {
        id: ROOT_ID,
        position: { x: 0, y: 0 },
        data: { label: "Central idea", collapsed: false },
      },
      {
        id: childA,
        position: { x: 260, y: -80 },
        data: { label: "子タスクA", collapsed: false },
      },
      {
        id: childB,
        position: { x: 260, y: 80 },
        data: { label: "子タスクB", collapsed: false },
      },
    ],
    edges: [
      { id: `e-${ROOT_ID}-${childA}`, source: ROOT_ID, target: childA },
      { id: `e-${ROOT_ID}-${childB}`, source: ROOT_ID, target: childB },
    ],
  };
}

export function getChildren(edges: Edge[], parentId: string): string[] {
  return edges.filter((e) => e.source === parentId).map((e) => e.target);
}

export function getParent(edges: Edge[], id: string): string | undefined {
  return edges.find((e) => e.target === id)?.source;
}

export function getDescendants(edges: Edge[], id: string): Set<string> {
  const result = new Set<string>();
  const stack = [...getChildren(edges, id)];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    stack.push(...getChildren(edges, current));
  }
  return result;
}

export function getHiddenIds(nodes: MindMapNode[], edges: Edge[]): Set<string> {
  const hidden = new Set<string>();
  for (const node of nodes) {
    if (node.data.collapsed) {
      for (const id of getDescendants(edges, node.id)) hidden.add(id);
    }
  }
  return hidden;
}

function deselectAll(nodes: MindMapNode[]): MindMapNode[] {
  return nodes.map((n) => (n.selected ? { ...n, selected: false } : n));
}

export function addChild(
  nodes: MindMapNode[],
  edges: Edge[],
  parentId: string
): { nodes: MindMapNode[]; edges: Edge[]; newId: string } {
  const newId = makeId();
  const parent = nodes.find((n) => n.id === parentId);
  const newNode: MindMapNode = {
    id: newId,
    position: parent?.position ?? { x: 0, y: 0 },
    data: { label: "新しいトピック", collapsed: false },
    selected: true,
  };
  const nodesWithExpandedParent = deselectAll(nodes).map((n) =>
    n.id === parentId ? { ...n, data: { ...n.data, collapsed: false } } : n
  );
  const newEdge: Edge = {
    id: `e-${parentId}-${newId}`,
    source: parentId,
    target: newId,
  };
  return {
    nodes: [...nodesWithExpandedParent, newNode],
    edges: [...edges, newEdge],
    newId,
  };
}

export function addSibling(
  nodes: MindMapNode[],
  edges: Edge[],
  id: string
): { nodes: MindMapNode[]; edges: Edge[]; newId: string } {
  const parentId = getParent(edges, id);
  if (!parentId) {
    return addChild(nodes, edges, id);
  }
  return addChild(nodes, edges, parentId);
}

export function deleteSubtree(
  nodes: MindMapNode[],
  edges: Edge[],
  id: string
): { nodes: MindMapNode[]; edges: Edge[] } {
  const toRemove = getDescendants(edges, id);
  toRemove.add(id);
  const remainingNodes = nodes.filter((n) => !toRemove.has(n.id));
  const remainingEdges = edges.filter(
    (e) => !toRemove.has(e.source) && !toRemove.has(e.target)
  );
  const parentId = getParent(edges, id);
  const nodesWithSelection = remainingNodes.map((n) => ({
    ...n,
    selected: parentId !== undefined && n.id === parentId,
  }));
  return { nodes: nodesWithSelection, edges: remainingEdges };
}

export function toggleCollapse(nodes: MindMapNode[], id: string): MindMapNode[] {
  return nodes.map((n) =>
    n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n
  );
}

export function updateLabel(
  nodes: MindMapNode[],
  id: string,
  label: string
): MindMapNode[] {
  return nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n));
}

export function clearSelection(nodes: MindMapNode[]): MindMapNode[] {
  return deselectAll(nodes);
}

export function sanitizeGraph(input: unknown): { nodes: MindMapNode[]; edges: Edge[] } | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return null;
  if (raw.nodes.length === 0) return null;

  const nodes: MindMapNode[] = raw.nodes
    .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
    .map((n) => {
      const data = (n.data as Record<string, unknown> | undefined) ?? {};
      const position = (n.position as { x?: number; y?: number } | undefined) ?? {};
      return {
        id: String(n.id),
        position: { x: Number(position.x) || 0, y: Number(position.y) || 0 },
        data: {
          label: typeof data.label === "string" && data.label.trim() ? data.label : "無題",
          collapsed: Boolean(data.collapsed),
        },
      };
    });

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = raw.edges
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      id: String(e.id ?? `e-${e.source}-${e.target}`),
      source: String(e.source),
      target: String(e.target),
    }))
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  return { nodes, edges };
}
