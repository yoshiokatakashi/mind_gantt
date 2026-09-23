import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const mindMaps = pgTable("mind_maps", {
  id: text("id").primaryKey(),
  nodes: jsonb("nodes").notNull(),
  edges: jsonb("edges").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
