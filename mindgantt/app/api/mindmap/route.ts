import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { mindMaps } from "@/db/schema";

const MAP_ID = "default";

export async function GET() {
  const db = getDb();
  const [row] = await db
    .select()
    .from(mindMaps)
    .where(eq(mindMaps.id, MAP_ID))
    .limit(1);

  if (!row) {
    return NextResponse.json(null);
  }

  return NextResponse.json({ nodes: row.nodes, edges: row.edges });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { nodes, edges } = body ?? {};

  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return NextResponse.json(
      { error: "nodes and edges must be arrays" },
      { status: 400 }
    );
  }

  const db = getDb();
  await db
    .insert(mindMaps)
    .values({ id: MAP_ID, nodes, edges, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: mindMaps.id,
      set: { nodes, edges, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
