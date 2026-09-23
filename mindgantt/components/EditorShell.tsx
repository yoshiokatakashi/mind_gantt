"use client";

import React, { useState } from "react";
import MapEditor from "./MapEditor";
import GanttChart from "./GanttChart";
import { useMindMapGraph } from "@/lib/useMindMapGraph";

type Tab = "map" | "gantt";

export default function EditorShell() {
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const mindMap = useMindMapGraph();

  const handleConvertToGantt = () => {
    mindMap.convertToGantt();
    setActiveTab("gantt");
  };

  return (
    <div>
      <div className="flex gap-1 mb-3 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "map"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("map")}
        >
          マインドマップ
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "gantt"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("gantt")}
        >
          ガントチャート
        </button>
      </div>

      {activeTab === "map" ? (
        <MapEditor {...mindMap} onConvertToGantt={handleConvertToGantt} />
      ) : (
        <GanttChart
          nodes={mindMap.graph.nodes}
          edges={mindMap.graph.edges}
          onScheduleChange={mindMap.handleScheduleChange}
        />
      )}
    </div>
  );
}
