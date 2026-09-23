// components/MapEditor.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Edge,
  EdgeChange,
  NodeChange,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { MindMapNode, type MindMapNodeRenderData } from "./MindMapNode";
import { computeTreeLayout } from "@/lib/mindmap-layout";
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
  type MindMapNode as MindMapNodeType,
} from "@/lib/mindmap-tree";

const LEGACY_STORAGE_KEY = "mindgantt:editor:v1";
const HISTORY_LIMIT = 50;
const SAVE_DEBOUNCE_MS = 600;

const nodeTypes = { mindMapNode: MindMapNode };

type Graph = { nodes: MindMapNodeType[]; edges: Edge[] };
type SaveStatus = "idle" | "saving" | "saved" | "error";

function readLegacyGraph(): Graph | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return sanitizeGraph(JSON.parse(raw));
  } catch {
    return null;
  }
}

function withLayout(nodes: MindMapNodeType[], edges: Edge[]): MindMapNodeType[] {
  const hidden = getHiddenIds(nodes, edges);
  const visibleNodes = nodes.filter((n) => !hidden.has(n.id));
  const visibleEdges = edges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target));
  const positions = computeTreeLayout(visibleNodes, visibleEdges);
  return nodes.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id)! } : n));
}

export default function MapEditor() {
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
            data: { label: data.label, collapsed: !!data.collapsed },
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
    (mutate: (nodes: MindMapNodeType[], edges: Edge[]) => { nodes: MindMapNodeType[]; edges: Edge[] }) => {
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

  // キーボードショートカット（Tab/Enter/Delete/Ctrl+Z/Ctrl+Shift+Z/Escape）
  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      return (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (isMeta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      const selected = graphRef.current.nodes.find((n) => n.selected);

      if (e.key === "Escape") {
        deselectAll();
        return;
      }
      if (!selected) return;

      if (e.key === "Tab") {
        e.preventDefault();
        handleAddChild(selected.id);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleAddSibling(selected.id);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDelete(selected.id);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, deselectAll, handleAddChild, handleAddSibling, handleDelete]);

  const hiddenIds = useMemo(() => getHiddenIds(graph.nodes, graph.edges), [graph.nodes, graph.edges]);

  const childCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of graph.edges) map.set(e.source, (map.get(e.source) ?? 0) + 1);
    return map;
  }, [graph.edges]);

  const displayNodes = useMemo(
    () =>
      graph.nodes.map((n) => ({
        ...n,
        type: "mindMapNode",
        hidden: hiddenIds.has(n.id),
        data: {
          label: n.data.label,
          collapsed: n.data.collapsed,
          hasChildren: (childCount.get(n.id) ?? 0) > 0,
          isRoot: !getParent(graph.edges, n.id),
          onLabelChange: handleLabelChange,
          onAddChild: handleAddChild,
          onDelete: handleDelete,
          onToggleCollapse: handleToggleCollapse,
        } satisfies MindMapNodeRenderData,
      })),
    [graph.nodes, graph.edges, hiddenIds, childCount, handleLabelChange, handleAddChild, handleDelete, handleToggleCollapse]
  );

  const displayEdges = useMemo(
    () =>
      graph.edges.map((e) => ({
        ...e,
        type: "smoothstep",
        hidden: hiddenIds.has(e.source) || hiddenIds.has(e.target),
      })),
    [graph.edges, hiddenIds]
  );

  const handleAddTopLevel = useCallback(() => {
    const selected = graphRef.current.nodes.find((n) => n.selected);
    const root = graphRef.current.nodes.find((n) => !getParent(graphRef.current.edges, n.id));
    const targetId = selected?.id ?? root?.id;
    if (targetId) handleAddChild(targetId);
  }, [handleAddChild]);

  const saveStatusLabel: Record<SaveStatus, string> = {
    idle: "",
    saving: "保存中…",
    saved: "保存済み",
    error: "保存に失敗しました",
  };

  return (
    <div className="w-full h-[80vh] border rounded-md overflow-hidden">
      <div className="flex items-center gap-2 p-2 bg-gray-50 border-b">
        <button className="px-3 py-1 rounded bg-blue-500 text-white" onClick={handleAddTopLevel}>
          ＋ トピック追加
        </button>
        <button
          className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-40"
          onClick={undo}
        >
          元に戻す
        </button>
        <button
          className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-40"
          onClick={redo}
        >
          やり直す
        </button>
        <span
          className={`text-sm ${saveStatus === "error" ? "text-red-600" : "text-gray-500"}`}
        >
          {saveStatusLabel[saveStatus]}
        </span>
        <div className="ml-auto text-sm text-gray-600">
          Tab: 子を追加 / Enter: 兄弟を追加 / Delete: 削除 / ダブルクリック: 編集
        </div>
      </div>

      <ReactFlowProvider>
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onPaneClick={deselectAll}
          nodesConnectable={false}
          deleteKeyCode={null}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ width: "100%", height: "calc(80vh - 48px)" }}
        >
          <Background gap={16} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
