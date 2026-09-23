import type { Edge } from "reactflow";
import { getChildren, getParent, type MindMapNode } from "./mindmap-tree";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Depth-first order (roots first, each node immediately followed by its children). */
function getHierarchyOrder(nodes: MindMapNode[], edges: Edge[]): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    order.push(id);
    for (const childId of getChildren(edges, id)) visit(childId);
  }
  for (const node of nodes) {
    if (!getParent(edges, node.id)) visit(node.id);
  }
  return order;
}

type Schedule = { start: string; end: string };
type ScheduleMap = Map<string, Schedule>;

/**
 * Walks the tree and computes a start/end for every node: nodes that already
 * have both dates keep them as-is (and become the basis for their
 * children/younger siblings); nodes missing dates get a default 1-day slot
 * chained after the previous sibling (or the parent, or "today" for a root).
 */
function computeSchedule(nodes: MindMapNode[], edges: Edge[]): ScheduleMap {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const schedule: ScheduleMap = new Map();

  function resolve(id: string, baseStart: string): Schedule {
    const node = byId.get(id);
    const existingStart = node?.data.start;
    const existingEnd = node?.data.end;
    if (existingStart && existingEnd) return { start: existingStart, end: existingEnd };
    if (existingStart) return { start: existingStart, end: addDays(existingStart, 1) };
    return { start: baseStart, end: addDays(baseStart, 1) };
  }

  // 戻り値: このノード自身とその配下すべてを含めた、部分木全体の終了日（最も遅い終了日）。
  // 次の兄弟（または次のルート）は、この部分木全体が終わってから開始する。
  function walk(id: string, baseStart: string): string {
    if (schedule.has(id)) return schedule.get(id)!.end;
    const { start, end } = resolve(id, baseStart);
    schedule.set(id, { start, end });

    let prevEnd = end; // first child chains off this node's own end
    let subtreeEnd = end;
    for (const childId of getChildren(edges, id)) {
      const childSubtreeEnd = walk(childId, prevEnd);
      prevEnd = childSubtreeEnd;
      if (childSubtreeEnd > subtreeEnd) subtreeEnd = childSubtreeEnd;
    }
    return subtreeEnd;
  }

  const roots = nodes.filter((n) => !getParent(edges, n.id));
  let cursor = toISODate(new Date());
  for (const root of roots) {
    cursor = walk(root.id, cursor);
  }

  return schedule;
}

/** Fills in start/end for nodes that don't have both yet; leaves existing dates untouched. */
export function assignDefaultSchedule(nodes: MindMapNode[], edges: Edge[]): MindMapNode[] {
  const schedule = computeSchedule(nodes, edges);
  return nodes.map((n) => {
    if (n.data.start && n.data.end) return n;
    const computed = schedule.get(n.id);
    if (!computed) return n;
    return { ...n, data: { ...n.data, start: computed.start, end: computed.end } };
  });
}

export type GanttTask = {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
};

/** Display-only: computes a schedule for every node without persisting it. */
export function buildGanttTasks(nodes: MindMapNode[], edges: Edge[]): GanttTask[] {
  const schedule = computeSchedule(nodes, edges);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return getHierarchyOrder(nodes, edges).map((id) => {
    const n = byId.get(id)!;
    const computed = schedule.get(id);
    return {
      id: n.id,
      name: n.data.label,
      start: n.data.start ?? computed?.start ?? toISODate(new Date()),
      end: n.data.end ?? computed?.end ?? addDays(toISODate(new Date()), 1),
      progress: n.data.progress ?? 0,
    };
  });
}
