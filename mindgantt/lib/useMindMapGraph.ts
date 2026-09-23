"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyEdgeChanges, applyNodeChanges, type Edge, type EdgeChange, type NodeChange } from "reactflow";
import { computeTreeLayout } from "@/lib/mindmap-layout";
import { assignDefaultSchedule } from "@/lib/gantt";
import {
  addChild,
  addSibling,
  clearSelection,
  createInitialGraph,
  deleteSubtree,
  getHiddenIds,
  getParent,
  sanitizeGraph,
  toggleCollapse,
  updateLabel,
  updateSchedule,
  type MindMapNode,
} from "@/lib/mindmap-tree";

const LEGACY_STORAGE_KEY = "mindgantt:editor:v1";
const HISTORY_LIMIT = 50;
const SAVE_DEBOUNCE_MS = 600;

export type Graph = { nodes: MindMapNode[]; edges: Edge[] };
export type SaveStatus = "idle" | "saving" | "saved" | "error";

function readLegacyGraph(): Graph | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return sanitizeGraph(JSON.parse(raw));
  } catch {
    return null;
  }
}

function withLayout(nodes: MindMapNode[], edges: Edge[]): MindMapNode[] {
  const hidden = getHiddenIds(nodes, edges);
  const visibleNodes = nodes.filter((n) => !hidden.has(n.id));
  const visibleEdges = edges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target));
  const positions = computeTreeLayout(visibleNodes, visibleEdges);
  return nodes.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id)! } : n));
}

export function useMindMapGraph() {
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [] });
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const historyRef = useRef<{ past: Graph[]; future: Graph[] }>({ past: [], future: [] });
  const graphRef = useRef(graph);
  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  // 初回読み込み: DB -> (無ければ) 旧localStorage -> (無ければ) 初期シード
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let initial: Graph | null = null;
      try {
        const res = await fetch("/api/mindmap");
        if (res.ok) {
          const data = await res.json();
          initial = sanitizeGraph(data);
        }
      } catch (e) {
        console.warn("failed to load mindmap from server", e);
      }
      if (cancelled) return;
      if (!initial) {
        initial = readLegacyGraph() ?? createInitialGraph();
      }
      setGraph({ nodes: withLayout(initial.nodes, initial.edges), edges: initial.edges });
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 変更を DB へ自動保存（デバウンス）
  useEffect(() => {
    if (!hydrated) return;
    setSaveStatus("saving");
    const handle = setTimeout(async () => {
      try {
        const payload = {
          nodes: graphRef.current.nodes.map(({ id, position, data }) => ({
            id,
            position,
            data: {
              label: data.label,
              collapsed: !!data.collapsed,
              start: data.start,
              end: data.end,
              progress: data.progress,
            },
          })),
          edges: graphRef.current.edges.map(({ id, source, target }) => ({ id, source, target })),
        };
        const res = await fetch("/api/mindmap", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`save failed: ${res.status}`);
        setSaveStatus("saved");
      } catch (e) {
        console.error("failed to save mindmap", e);
        setSaveStatus("error");
      }
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [graph, hydrated]);

  const applyTreeChange = useCallback(
    (mutate: (nodes: MindMapNode[], edges: Edge[]) => { nodes: MindMapNode[]; edges: Edge[] }) => {
      setGraph((current) => {
        historyRef.current.past.push(current);
        if (historyRef.current.past.length > HISTORY_LIMIT) historyRef.current.past.shift();
        historyRef.current.future = [];

        const mutated = mutate(current.nodes, current.edges);
        return { nodes: withLayout(mutated.nodes, mutated.edges), edges: mutated.edges };
      });
    },
    []
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      applyTreeChange((nodes, edges) => {
        const result = addChild(nodes, edges, parentId);
        return { nodes: result.nodes, edges: result.edges };
      });
    },
    [applyTreeChange]
  );

  const handleAddSibling = useCallback(
    (id: string) => {
      applyTreeChange((nodes, edges) => {
        const result = addSibling(nodes, edges, id);
        return { nodes: result.nodes, edges: result.edges };
      });
    },
    [applyTreeChange]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!getParent(graphRef.current.edges, id)) return; // ルート（親なし）は削除不可
      applyTreeChange((nodes, edges) => deleteSubtree(nodes, edges, id));
    },
    [applyTreeChange]
  );

  const handleToggleCollapse = useCallback(
    (id: string) => {
      applyTreeChange((nodes, edges) => ({ nodes: toggleCollapse(nodes, id), edges }));
    },
    [applyTreeChange]
  );

  const handleLabelChange = useCallback(
    (id: string, label: string) => {
      applyTreeChange((nodes, edges) => ({ nodes: updateLabel(nodes, id, label), edges }));
    },
    [applyTreeChange]
  );

  // ガントチャート側からの日程/進捗変更。ドラッグ移動と同様に undo 対象外。
  const handleScheduleChange = useCallback(
    (id: string, schedule: { start?: string; end?: string; progress?: number }) => {
      setGraph((current) => ({ ...current, nodes: updateSchedule(current.nodes, id, schedule) }));
    },
    []
  );

  const convertToGantt = useCallback(() => {
    applyTreeChange((nodes, edges) => ({ nodes: assignDefaultSchedule(nodes, edges), edges }));
  }, [applyTreeChange]);

  const undo = useCallback(() => {
    setGraph((current) => {
      const previous = historyRef.current.past.pop();
      if (!previous) return current;
      historyRef.current.future.push(current);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setGraph((current) => {
      const next = historyRef.current.future.pop();
      if (!next) return current;
      historyRef.current.past.push(current);
      return next;
    });
  }, []);

  const deselectAll = useCallback(() => {
    setGraph((current) => ({ ...current, nodes: clearSelection(current.nodes) }));
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setGraph((current) => ({ ...current, nodes: applyNodeChanges(changes, current.nodes) }));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setGraph((current) => ({ ...current, edges: applyEdgeChanges(changes, current.edges) }));
  }, []);

  return {
    graph,
    graphRef,
    hydrated,
    saveStatus,
    onNodesChange,
    onEdgesChange,
    handleAddChild,
    handleAddSibling,
    handleDelete,
    handleToggleCollapse,
    handleLabelChange,
    handleScheduleChange,
    convertToGantt,
    undo,
    redo,
    deselectAll,
  };
}
