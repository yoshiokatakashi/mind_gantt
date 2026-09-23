// app/editor/page.tsx
import MapEditor from "@/components/MapEditor";

export default function EditorPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">MindGantt マインドマップ</h1>
      <MapEditor />
    </main>
  );
}
