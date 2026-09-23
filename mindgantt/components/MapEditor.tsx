// components/MapEditor.tsx
"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import ReactFlow, { Background, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import { MindMapNode, type MindMapNodeRenderData } from "./MindMapNode";
import { getHiddenIds, getParent } from "@/lib/mindmap-tree";
import type { useMindMapGraph } from "@/lib/useMindMapGraph";

const nodeTypes = { mindMapNode: MindMapNode };

type MapEditorProps = ReturnType<typeof useMindMapGraph> & {
  onConvertToGantt: () => void;
};

export default function MapEditor({
  graph,
  graphRef,
  saveStatus,
  onNodesChange,
  onEdgesChange,
  handleAddChild,
  handleAddSibling,
  handleDelete,
  handleToggleCollapse,
  handleLabelChange,
  undo,
  redo,
  deselectAll,
  onConvertToGantt,
}: MapEditorProps) {
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
  }, [graphRef, undo, redo, deselectAll, handleAddChild, handleAddSibling, handleDelete]);

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
  }, [graphRef, handleAddChild]);

  const saveStatusLabel: Record<typeof saveStatus, string> = {
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
        <button
          className="px-3 py-1 rounded bg-emerald-600 text-white"
          onClick={onConvertToGantt}
        >
          ガントチャート化
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
