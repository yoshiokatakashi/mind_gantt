// components/MapEditor.tsx
"use client";

import React, { useCallback, useEffect } from "react";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  ReactFlowProvider,
  Background,
} from "reactflow";
import "reactflow/dist/style.css";

const STORAGE_KEY = "mindgantt:editor:v1";

const initialNodes: Node[] = [
  { id: "1", data: { label: "Central idea" }, position: { x: 250, y: 100 } },
  { id: "2", data: { label: "子タスクA" }, position: { x: 100, y: 250 } },
  { id: "3", data: { label: "子タスクB" }, position: { x: 400, y: 250 } },
];
const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2" }];

export default function MapEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  // 読み込み：localStorage から復元
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.nodes) setNodes(parsed.nodes);
        if (parsed?.edges) setEdges(parsed.edges);
      }
    } catch (e) {
      console.warn("restore failed", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存：nodes/edges が変わったら localStorage に保存
  useEffect(() => {
    const payload = JSON.stringify({ nodes, edges });
    localStorage.setItem(STORAGE_KEY, payload);
  }, [nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges]
  );

  const onNodeChanges = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  const onEdgeChanges = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const addNode = useCallback(() => {
    const id = `${Date.now()}`;
    const newNode: Node = {
      id,
      data: { label: `新規ノード ${id.slice(-4)}` },
      position: { x: 250 + Math.random() * 200 - 100, y: 20 + Math.random() * 300 },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

  return (
    <div className="w-full h-[80vh] border rounded-md overflow-hidden">
      <div className="flex gap-2 p-2 bg-gray-50 border-b">
        <button className="px-3 py-1 rounded bg-blue-500 text-white" onClick={addNode}>
          ノード追加
        </button>
        <button className="px-3 py-1 rounded bg-red-500 text-white" onClick={deleteSelected}>
          選択削除
        </button>
        <div className="ml-auto text-sm text-gray-600">ドラッグで移動、端点をドラッグで接続</div>
      </div>

      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodeChanges}
          onEdgesChange={onEdgeChanges}
          onConnect={onConnect}
          connectionMode={ConnectionMode.Loose}
          fitView
          style={{ width: "100%", height: "calc(80vh - 48px)" }}
        >
          <Background gap={12} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
