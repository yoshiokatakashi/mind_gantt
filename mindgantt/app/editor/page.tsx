// app/editor/page.tsx
import EditorShell from "@/components/EditorShell";

export default function EditorPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">MindGantt</h1>
      <EditorShell />
    </main>
  );
}
