import { index, integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    openId: text("openId").notNull().unique(),
    username: text("username").unique(),
    name: text("name"),
    email: text("email"),
    loginMethod: text("loginMethod"),
    role: text("role", { enum: ["admin", "supporter", "researcher", "viewer", "user"] }).default("researcher").notNull(),
    approvalStatus: text("approvalStatus", { enum: ["pending", "approved", "rejected"] }).default("approved").notNull(),
    passwordHash: text("passwordHash"),
    passwordVault: text("passwordVault"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(sql `(unixepoch() * 1000)`).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(sql `(unixepoch() * 1000)`).$onUpdate(() => new Date()).notNull(),
    lastSignedIn: integer("lastSignedIn", { mode: "timestamp_ms" }).default(sql `(unixepoch() * 1000)`).notNull(),
});
export const protocols = sqliteTable("protocols", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    tag: text("tag").notNull(),
    status: text("status", { enum: ["Đã duyệt", "Bản nháp"] }).default("Bản nháp").notNull(),
    version: text("version").default("v0.1").notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(sql `(unixepoch() * 1000)`).$onUpdate(() => new Date()).notNull(),
    owner: text("owner").notNull(),
    summary: text("summary").notNull(),
    duration: text("duration").notNull(),
    steps: text("steps", { mode: "json" }).notNull(),
    notes: text("notes", { mode: "json" }).notNull(),
    pendingEdit: text("pendingEdit", { mode: "json" }),
    pendingEditBy: integer("pendingEditBy"),
    pendingEditAt: integer("pendingEditAt", { mode: "timestamp_ms" }),
});
export const samples = sqliteTable("samples", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    groupName: text("groupName").notNull(),
    status: text("status").default("Bản nháp").notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(sql `(unixepoch() * 1000)`).$onUpdate(() => new Date()).notNull(),
    description: text("description").notNull(),
    properties: text("properties", { mode: "json" }).notNull(),
    theory: text("theory").notNull(),
});
export const calculators = sqliteTable("calculators", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    formula: text("formula").notNull(),
    description: text("description").notNull(),
    config: text("config", { mode: "json" }).notNull(),
    status: text("status").default("Đã duyệt").notNull(),
    active: integer("active").default(1).notNull(),
    pendingEdit: text("pendingEdit", { mode: "json" }),
    pendingEditBy: integer("pendingEditBy"),
    pendingEditAt: integer("pendingEditAt", { mode: "timestamp_ms" }),
});
export const chemicalRecipes = sqliteTable("chemicalRecipes", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    groupName: text("groupName").notNull(),
    baseVolume: text("baseVolume").notNull(),
    baseUnit: text("baseUnit").notNull(),
    stock: text("stock").notNull(),
    note: text("note"),
    ingredients: text("ingredients", { mode: "json" }).notNull(),
    method: text("method").notNull(),
    status: text("status").default("Đã duyệt").notNull(),
    active: integer("active").default(1).notNull(),
});
export const experimentRuns = sqliteTable("experimentRuns", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    runCode: text("runCode").notNull().unique(),
    runDate: text("runDate").notNull(),
    ctMean: text("ctMean").notNull(),
    efficiency: text("efficiency").notNull(),
    protocolSlug: text("protocolSlug").notNull(),
    notes: text("notes"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(sql `(unixepoch() * 1000)`).notNull(),
});
export const experimentLogs = sqliteTable("experimentLogs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerId: integer("ownerId").notNull(),
    templateName: text("templateName"),
    experimentName: text("experimentName"),
    cellType: text("cellType"),
    chemicalsUsed: text("chemicalsUsed"),
    cultureConditions: text("cultureConditions"),
    startTime: text("startTime"),
    endTime: text("endTime"),
    result: text("result"),
    workDate: text("workDate").notNull(),
    workDone: text("workDone").notNull(),
    protocol: text("protocol").notNull(),
    cellsSeeded: text("cellsSeeded").notNull(),
    note: text("note"),
    numericNote: text("numericNote"),
    issue: text("issue"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(sql `(unixepoch() * 1000)`).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(sql `(unixepoch() * 1000)`).$onUpdate(() => new Date()).notNull(),
}, table => ({ ownerDateIndex: index("experimentLogs_owner_date_idx").on(table.ownerId, table.workDate, table.id) }));
export const feedbacks = sqliteTable("feedbacks", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reporterId: integer("reporterId").notNull(),
    category: text("category").notNull(),
    itemName: text("itemName").notNull(),
    condition: text("condition").notNull(),
    remainingAmount: text("remainingAmount"),
    remainingUnit: text("remainingUnit"),
    usageCategory: text("usageCategory"),
    description: text("description"),
    resolvedById: integer("resolvedById"),
    resolvedAt: integer("resolvedAt", { mode: "timestamp_ms" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(sql `(unixepoch() * 1000)`).notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Protocol = typeof protocols.$inferSelect;
export type Sample = typeof samples.$inferSelect;
export type Calculator = typeof calculators.$inferSelect;
export type ChemicalRecipeRecord = typeof chemicalRecipes.$inferSelect;
export type ExperimentRun = typeof experimentRuns.$inferSelect;
export type ExperimentLog = typeof experimentLogs.$inferSelect;
export type Feedback = typeof feedbacks.$inferSelect;
