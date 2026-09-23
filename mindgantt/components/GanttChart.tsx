"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Gantt from "frappe-gantt";
import "./frappe-gantt-base.css";
import "./gantt-theme.css";
import { buildGanttTasks, toISODate } from "@/lib/gantt";
import type { Edge } from "reactflow";
import type { MindMapNode } from "@/lib/mindmap-tree";

type GanttChartProps = {
  nodes: MindMapNode[];
  edges: Edge[];
  onScheduleChange: (id: string, schedule: { start?: string; end?: string; progress?: number }) => void;
};

export default function GanttChart({ nodes, edges, onScheduleChange }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);
  const onScheduleChangeRef = useRef(onScheduleChange);
  useEffect(() => {
    onScheduleChangeRef.current = onScheduleChange;
  }, [onScheduleChange]);

  const tasks = useMemo(() => buildGanttTasks(nodes, edges), [nodes, edges]);
  const prevTasksRef = useRef<typeof tasks>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!ganttRef.current) {
      ganttRef.current = new Gantt(containerRef.current, tasks, {
        view_mode: "Week",
        view_mode_select: true,
        bar_height: 24,
        bar_corner_radius: 6,
        padding: 14,
        today_button: true,
        on_date_change: (task, start, end) => {
          onScheduleChangeRef.current(task.id, {
            start: toISODate(start),
            end: toISODate(end),
          });
        },
        on_progress_change: (task, progress) => {
          onScheduleChangeRef.current(task.id, { progress });
        },
      });
    } else {
      const prevTasks = prevTasksRef.current;
      const sameTaskSet =
        prevTasks.length === tasks.length && prevTasks.every((t, i) => t.id === tasks[i].id);

      if (sameTaskSet) {
        // 同じタスク集合の日付/進捗だけの更新なら、update_task でスクロール位置を保ったまま反映する。
        tasks.forEach((task, i) => {
          const prev = prevTasks[i];
          if (prev.start !== task.start || prev.end !== task.end || prev.progress !== task.progress) {
            ganttRef.current!.update_task(task.id, task);
          }
        });
      } else {
        // ノードの追加/削除など構造が変わった場合は全体を再構築する。
        ganttRef.current.refresh(tasks);
      }
    }
    prevTasksRef.current = tasks;
  }, [tasks]);

  return (
    <div className="w-full h-[80vh] border rounded-md overflow-auto bg-white">
      {tasks.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">
          マインドマップにノードを追加してから「ガントチャート化」してください。
        </div>
      ) : (
        <div ref={containerRef} className="gantt-github-theme" />
      )}
    </div>
  );
}
