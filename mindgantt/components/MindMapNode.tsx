"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export type MindMapNodeRenderData = {
  label: string;
  collapsed?: boolean;
  hasChildren: boolean;
  isRoot: boolean;
  onLabelChange: (id: string, label: string) => void;
  onAddChild: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
};

function MindMapNodeComponent({ id, data, selected }: NodeProps<MindMapNodeRenderData>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(data.label);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== data.label) {
      data.onLabelChange(id, trimmed);
    } else {
      setDraft(data.label);
    }
  };

  return (
    <div
      className={`group relative min-w-[140px] rounded-md border bg-white px-3 py-2 text-sm shadow-sm ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300"
      }`}
      onDoubleClick={startEditing}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-none !bg-gray-300"
      />

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setDraft(data.label);
              setEditing(false);
            }
          }}
          className="w-full bg-transparent outline-none"
        />
      ) : (
        <span className="whitespace-pre-wrap">{data.label}</span>
      )}

      {data.hasChildren && (
        <button
          type="button"
          title={data.collapsed ? "展開" : "折りたたみ"}
          className="absolute -bottom-3 -right-3 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-xs leading-none text-gray-600 shadow-sm hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse(id);
          }}
        >
          {data.collapsed ? "+" : "−"}
        </button>
      )}

      <div className="pointer-events-none absolute -top-3 right-0 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          title="子ノードを追加 (Tab)"
          className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs leading-none text-white shadow"
          onClick={(e) => {
            e.stopPropagation();
            data.onAddChild(id);
          }}
        >
          +
        </button>
        {!data.isRoot && (
          <button
            type="button"
            title="削除 (Delete)"
            className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs leading-none text-white shadow"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete(id);
            }}
          >
            ×
          </button>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-none !bg-gray-300"
      />
    </div>
  );
}

export const MindMapNode = memo(MindMapNodeComponent);
