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
  // frappe-gantt 自身が発火した date_change/progress_change の値を覚えておき、
  // それをそのまま update_task で書き戻さないようにするための記録。
  // frappe-gantt はドラッグ中、日付が1日変わるたびに on_date_change を発火するが、
  // そのたびに update_task でバー要素を作り直すとドラッグ中のDOM操作が中断され、
  // 「1日動かすたびにドラッグが途切れる」問題になっていた。
  const lastEmittedRef = useRef<Map<string, { start: string; end: string; progress: number }>>(new Map());

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
          const patch = { start: toISODate(start), end: toISODate(end) };
          lastEmittedRef.current.set(task.id, {
            start: patch.start,
            end: patch.end,
            progress: task.progress ?? 0,
          });
          onScheduleChangeRef.current(task.id, patch);
        },
        on_progress_change: (task, progress) => {
          const prev = lastEmittedRef.current.get(task.id);
          lastEmittedRef.current.set(task.id, {
            start: prev?.start ?? task.start,
            end: prev?.end ?? task.end,
            progress,
          });
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
          if (prev.start === task.start && prev.end === task.end && prev.progress === task.progress) {
            return;
          }
          const echoed = lastEmittedRef.current.get(task.id);
          const isEcho =
            !!echoed &&
            echoed.start === task.start &&
            echoed.end === task.end &&
            echoed.progress === task.progress;
          if (isEcho) {
            // このタスク自身のドラッグ操作で生まれた変更 → frappe-gantt側は既に最新表示なので触らない
            lastEmittedRef.current.delete(task.id);
            return;
          }
          ganttRef.current!.update_task(task.id, task);
        });
      } else {
        // ノードの追加/削除など構造が変わった場合は全体を再構築する。
        ganttRef.current.refresh(tasks);
        lastEmittedRef.current.clear();
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
