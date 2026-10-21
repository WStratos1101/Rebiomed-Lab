import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { runtime } from "../runtime";
import { createHash } from "node:crypto";
import { calculators, chemicalRecipes, experimentLogs, experimentRuns, feedbacks, InsertUser, protocols, samples, users } from "./schema";
import { seedChemicalRecipes, type ChemicalIngredient } from "@shared/chemicalRecipes";
import { ENV } from "../env";
import { encryptPasswordForAccount } from "./passwordVault";
import { hashPassword } from "./password";
async function ensurePendingEditColumns(_db: unknown) { }
async function ensureExperimentLogsTable(_db: unknown) { }
async function ensureFeedbackTable(_db: unknown) { }
async function ensureSupporterIdentity(_db: unknown) { }
const GUEST_USERNAME = "Guest";
let guestIdentityReady: Promise<void> | null = null;
// Preserve the intentionally shared Guest demo account. Its stored password is hashed, not plaintext.
async function ensureGuestIdentity(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
    if (!guestIdentityReady) {
        guestIdentityReady = (async () => {
            const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, GUEST_USERNAME)).limit(1);
            if (existing.length) {
                await db.update(users).set({ name: "Guest", role: "guest", approvalStatus: "approved", loginMethod: "email" }).where(eq(users.id, existing[0].id));
                return;
            }
            const openId = createHash("sha256").update("rebiomed-guest-account").digest("hex");
            await db.insert(users).values({ openId, username: GUEST_USERNAME, name: "Guest", email: null, passwordHash: hashPassword("123456"), passwordVault: null, loginMethod: "email", role: "guest", approvalStatus: "approved" }).onConflictDoNothing();
        })().then(() => undefined).catch(error => { guestIdentityReady = null; throw error; });
    }
    await guestIdentityReady;
}
async function purgeGuestExperimentLogs(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, ownerId: number) {
    await db.delete(experimentLogs).where(and(eq(experimentLogs.ownerId, ownerId), lt(experimentLogs.createdAt, new Date(Date.now() - 2 * 60 * 60 * 1000))));
}
export function isSupporterAccount(user: {
    role?: string | null;
} | null | undefined) {
    return user?.role === "supporter";
}
export function isDedicatedSupporterAccount(user: {
    role?: string | null;
    username?: string | null;
} | null | undefined) {
    return isSupporterAccount(user) || (user?.role === "admin" && user.username?.trim().toLowerCase() === "admin");
}
function normalizeSupporterUser<T extends {
    role: string;
    username?: string | null;
    name?: string | null;
    email?: string | null;
}>(user: T): T {
    return isSupporterAccount(user) ? { ...user, name: "Website Supporter", email: null, role: "supporter" } : user;
}
export async function getDb() { return drizzle(runtime().DB); }
export async function upsertUser(user: InsertUser): Promise<void> {
    if (!user.openId)
        throw new Error("User openId is required for upsert");
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const values: InsertUser = { openId: user.openId, approvalStatus: user.approvalStatus ?? "approved" };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    textFields.forEach(field => {
        if (user[field] !== undefined) {
            values[field] = user[field] ?? null;
            updateSet[field] = user[field] ?? null;
        }
    });
    if (user.lastSignedIn !== undefined) {
        values.lastSignedIn = user.lastSignedIn;
        updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
        values.role = user.role;
        updateSet.role = user.role;
    }
    else if (user.openId === ENV.ownerOpenId) {
        values.role = "admin";
        updateSet.role = "admin";
    }
    if (user.approvalStatus !== undefined) {
        values.approvalStatus = user.approvalStatus;
        updateSet.approvalStatus = user.approvalStatus;
    }
    values.lastSignedIn ??= new Date();
    if (Object.keys(updateSet).length === 0)
        updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}
export async function getUserByOpenId(openId: string) {
    const db = await getDb();
    if (!db)
        return undefined;
    await ensureSupporterIdentity(db);
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0] ? normalizeSupporterUser(result[0]) : undefined;
}
export async function getUserByEmail(email: string) {
    const db = await getDb();
    if (!db)
        return undefined;
    const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return result[0];
}
export async function getUserById(id: number) {
    const db = await getDb();
    if (!db)
        return undefined;
    await ensureSupporterIdentity(db);
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ? normalizeSupporterUser(result[0]) : undefined;
}
export async function getUserByUsernameOrEmail(identifier: string) {
    const db = await getDb();
    if (!db)
        return undefined;
    await ensureSupporterIdentity(db);
    const requestedIdentifier = identifier.trim();
    const isGuestLogin = requestedIdentifier.toLowerCase() === GUEST_USERNAME.toLowerCase();
    if (isGuestLogin) await ensureGuestIdentity(db);
    const normalized = isGuestLogin ? GUEST_USERNAME : requestedIdentifier;
    const result = normalized.includes("@")
        ? await db.select().from(users).where(eq(users.email, normalized.toLowerCase())).limit(1)
        : await db.select().from(users).where(eq(users.username, normalized)).limit(1);
    return result[0] ? normalizeSupporterUser(result[0]) : undefined;
}
export async function listExperimentLogs(ownerId: number, isGuest = false) {
    const db = await getDb();
    if (!db)
        return [];
    await ensureExperimentLogsTable(db);
    if (isGuest) await purgeGuestExperimentLogs(db, ownerId);
    return db.select().from(experimentLogs).where(eq(experimentLogs.ownerId, ownerId)).orderBy(asc(experimentLogs.workDate), asc(experimentLogs.id));
}
export async function createExperimentLog(input: {
    ownerId: number;
    templateName?: string;
    experimentName?: string;
    cellType?: string;
    chemicalsUsed?: string;
    cultureConditions?: string;
    startTime?: string;
    endTime?: string;
    result?: string;
    workDate: string;
    workDone: string;
    protocol: string;
    cellsSeeded: string;
    note?: string;
    numericNote?: string;
    issue?: string;
}, isGuest = false) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await ensureExperimentLogsTable(db);
    if (isGuest) await purgeGuestExperimentLogs(db, input.ownerId);
    await db.insert(experimentLogs).values(input);
}
export async function updateExperimentLog(id: number, ownerId: number, input: {
    templateName?: string;
    experimentName?: string;
    cellType?: string;
    chemicalsUsed?: string;
    cultureConditions?: string;
    startTime?: string;
    endTime?: string;
    result?: string;
    workDate: string;
    workDone: string;
    protocol: string;
    cellsSeeded: string;
    note?: string;
    numericNote?: string;
    issue?: string;
}, isGuest = false) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await ensureExperimentLogsTable(db);
    if (isGuest) await purgeGuestExperimentLogs(db, ownerId);
    await db.update(experimentLogs).set(input).where(and(eq(experimentLogs.id, id), eq(experimentLogs.ownerId, ownerId)));
}
export async function deleteExperimentLog(id: number, ownerId: number, isGuest = false) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await ensureExperimentLogsTable(db);
    if (isGuest) await purgeGuestExperimentLogs(db, ownerId);
    await db.delete(experimentLogs).where(and(eq(experimentLogs.id, id), eq(experimentLogs.ownerId, ownerId)));
}
export async function deleteExperimentLogs(ids: number[] | undefined, ownerId: number, isGuest = false) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await ensureExperimentLogsTable(db);
    if (isGuest) await purgeGuestExperimentLogs(db, ownerId);
    const ownerFilter = eq(experimentLogs.ownerId, ownerId);
    if (!ids) {
        await db.delete(experimentLogs).where(ownerFilter);
        return;
    }
    if (ids.length > 0) {
        await db.delete(experimentLogs).where(and(ownerFilter, inArray(experimentLogs.id, ids)));
    }
}
export async function createFeedback(input: {
    reporterId: number;
    category: string;
    itemName: string;
    condition: string;
    remainingAmount?: string;
    remainingUnit?: string;
    usageCategory?: string;
    description?: string;
}) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await ensureFeedbackTable(db);
    await db.insert(feedbacks).values(input);
}
export async function listMyFeedbacks(reporterId: number) {
    const db = await getDb();
    if (!db)
        return [];
    await ensureFeedbackTable(db);
    return db.select().from(feedbacks).where(eq(feedbacks.reporterId, reporterId)).orderBy(desc(feedbacks.createdAt));
}
export async function deleteFeedback(id: number, reporterId: number) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await ensureFeedbackTable(db);
    await db.delete(feedbacks).where(and(eq(feedbacks.id, id), eq(feedbacks.reporterId, reporterId)));
}
export async function listAdminFeedbacks() {
    const db = await getDb();
    if (!db)
        return [];
    await ensureFeedbackTable(db);
    const cutoff = new Date(Date.now() - 30 * 60 * 60 * 1000);
    await db.delete(feedbacks).where(and(isNotNull(feedbacks.resolvedAt), lt(feedbacks.resolvedAt, cutoff)));
    return db.select().from(feedbacks).orderBy(desc(feedbacks.createdAt));
}
export async function resolveFeedback(id: number, resolvedById: number) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await ensureFeedbackTable(db);
    const result = await db.update(feedbacks).set({ resolvedById, resolvedAt: new Date() }).where(and(eq(feedbacks.id, id), isNull(feedbacks.resolvedAt)));
    if (result.meta.changes === 0)
        throw new Error("Phản ánh không tồn tại hoặc đã được xác nhận trước đó.");
}
export async function createEmailUser(input: {
    username: string;
    email: string;
    name: string;
    password: string;
}) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const email = input.email.toLowerCase();
    const openId = createHash("sha256").update(`${input.username}:${email}`).digest("hex");
    await db.insert(users).values({ openId, username: input.username, email, name: input.name, passwordHash: hashPassword(input.password), passwordVault: encryptPasswordForAccount(input.password, openId), loginMethod: "email", role: "user", approvalStatus: "pending" });
}
export async function updateUserProfile(id: number, input: {
    email: string;
    password?: string;
}) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const values: Record<string, unknown> = { email: input.email.toLowerCase() };
    if (input.password) {
        const target = await getUserById(id);
        if (!target)
            throw new Error("Không tìm thấy tài khoản.");
        values.passwordHash = hashPassword(input.password);
        values.passwordVault = encryptPasswordForAccount(input.password, target.openId);
    }
    await db.update(users).set(values).where(eq(users.id, id));
}
export async function updateUserApproval(id: number, approvalStatus: "pending" | "approved" | "rejected") {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const target = await getUserById(id);
    if ((target?.username?.toLowerCase() === "wstratos" || isSupporterAccount(target)) && approvalStatus !== "approved") {
        throw new Error("Không thể thu hồi quyền truy cập của tài khoản hệ thống.");
    }
    await db.update(users).set({ approvalStatus }).where(eq(users.id, id));
}
export async function deleteUserById(id: number) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const target = await getUserById(id);
    if (!target)
        return false;
    if (target.role === "admin" || target.role === "supporter" || target.username?.toLowerCase() === "wstratos" || isSupporterAccount(target)) {
        throw new Error("Chỉ có thể xoá tài khoản User; tài khoản Admin được bảo vệ.");
    }
    await db.delete(users).where(eq(users.id, id));
    return true;
}
export async function ensureLabSeed() { }
export async function getLabContent(viewerRole?: string | null) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await ensureLabSeed();
    const [protocolRows, sampleRows, calculatorRows, runRows] = await Promise.all([
        db.select({ id: protocols.id, slug: protocols.slug, title: protocols.title, category: protocols.category, tag: protocols.tag, status: protocols.status, version: protocols.version, updatedAt: protocols.updatedAt, owner: protocols.owner, summary: protocols.summary, duration: protocols.duration, steps: protocols.steps, notes: protocols.notes }).from(protocols).orderBy(asc(protocols.id)),
        db.select().from(samples).orderBy(asc(samples.id)),
        db.select({ id: calculators.id, slug: calculators.slug, name: calculators.name, category: calculators.category, formula: calculators.formula, description: calculators.description, config: calculators.config, status: calculators.status, active: calculators.active }).from(calculators).orderBy(asc(calculators.id)),
        db.select().from(experimentRuns).orderBy(asc(experimentRuns.id)),
    ]);
    if (viewerRole === "guest") {
        const seenCategories = new Set<string>();
        const guestProtocols = protocolRows.filter(row => row.status === "Đã duyệt" && !seenCategories.has(row.category) && seenCategories.add(row.category));
        return { protocols: guestProtocols, samples: sampleRows, calculators: calculatorRows.filter(row => row.active === 1), runs: [] };
    }
    return { protocols: protocolRows, samples: sampleRows, calculators: calculatorRows, runs: runRows };
}
type ChemicalRecipeInput = {
    name: string;
    group: string;
    baseVolume: number;
    baseUnit: string;
    stock: string;
    note?: string;
    ingredients: ChemicalIngredient[];
    method: string;
};
function slugifyChemicalName(name: string) {
    return `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
}
function toChemicalRecipe(row: typeof chemicalRecipes.$inferSelect) {
    return {
        id: row.slug,
        dbId: row.id,
        name: row.name,
        group: row.groupName,
        baseVolume: Number(row.baseVolume),
        baseUnit: row.baseUnit,
        stock: row.stock,
        note: row.note ?? undefined,
        ingredients: Array.isArray(row.ingredients) ? row.ingredients as ChemicalIngredient[] : [],
        steps: row.method.split("\n").map(item => item.trim()).filter(Boolean),
        status: row.status === "Bản nháp" ? "Bản nháp" : "Đã duyệt",
    };
}
export async function listChemicalRecipes(viewerRole?: string | null) {
    const db = await getDb();
    if (!db)
        return seedChemicalRecipes.map(recipe => ({ ...recipe, dbId: undefined }));
    const rows = await db.select().from(chemicalRecipes).where(eq(chemicalRecipes.active, 1)).orderBy(asc(chemicalRecipes.id));
    const recipes = rows.map(toChemicalRecipe);
    return viewerRole === "guest" ? recipes.slice(0, 2) : recipes;
}
export async function createChemicalRecipe(input: ChemicalRecipeInput) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await db.insert(chemicalRecipes).values({
        slug: slugifyChemicalName(input.name),
        name: input.name,
        groupName: input.group,
        baseVolume: String(input.baseVolume),
        baseUnit: input.baseUnit,
        stock: input.stock,
        note: input.note || null,
        ingredients: input.ingredients,
        method: input.method,
        status: "Bản nháp",
        active: 1,
    });
}
export async function getChemicalRecipeById(id: number) {
    const db = await getDb();
    if (!db)
        return undefined;
    const rows = await db.select().from(chemicalRecipes).where(eq(chemicalRecipes.id, id)).limit(1);
    return rows[0];
}
export async function updateChemicalRecipe(id: number, input: ChemicalRecipeInput) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const target = await db.select({ id: chemicalRecipes.id }).from(chemicalRecipes).where(eq(chemicalRecipes.id, id)).limit(1);
    if (!target[0])
        throw new Error("Không tìm thấy cách pha hoá chất.");
    await db.update(chemicalRecipes).set({
        name: input.name,
        groupName: input.group,
        baseVolume: String(input.baseVolume),
        baseUnit: input.baseUnit,
        stock: input.stock,
        note: input.note || null,
        ingredients: input.ingredients,
        method: input.method,
    }).where(eq(chemicalRecipes.id, id));
}
export async function setChemicalRecipeStatus(id: number, status: "Bản nháp" | "Đã duyệt") {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const result = await db.update(chemicalRecipes).set({ status }).where(eq(chemicalRecipes.id, id));
    if (result.meta.changes === 0)
        throw new Error("Không tìm thấy cách pha hoá chất.");
}
export async function deleteChemicalRecipeById(id: number) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const result = await db.update(chemicalRecipes).set({ active: 0 }).where(eq(chemicalRecipes.id, id));
    if (result.meta.changes === 0)
        throw new Error("Không tìm thấy cách pha hoá chất.");
}
type ProtocolContentInput = {
    title: string;
    summary: string;
    owner: string;
    category?: "Custom" | "Hypoxia" | "HighPressure" | "ProtocolCells" | "ProtocolPCR" | "ProtocolEvaluation" | "ProtocolStaining";
    steps?: {
        title: string;
        detail: string;
        time: string;
        calculatorIds?: string[];
    }[];
};
type CalculatorContentInput = {
    name: string;
    formula: string;
    description: string;
    category?: "Chemicals" | "Cells" | "PCR" | "Custom" | "Hypoxia" | "HighPressure";
    inputUnits?: Record<string, string>;
    outputUnit?: string;
    variables?: {
        key: string;
        label: string;
        unit: string;
    }[];
};
const isAdminEditor = (role?: string | null) => role === "admin" || role === "supporter";
export async function createProtocolDraft(input: ProtocolContentInput, approved = false) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
    await db.insert(protocols).values({ slug, title: input.title, category: input.category ?? "Custom", tag: input.category === "Hypoxia" ? "Hypoxia" : input.category === "HighPressure" ? "High pressure" : "New protocol", status: approved ? "Đã duyệt" : "Bản nháp", version: approved ? "v1.0" : "v0.1", owner: input.owner, summary: input.summary || "Nội dung mới được thêm vào kho Rebiomed Protocol.", duration: "Chưa cập nhật", steps: input.steps?.length ? input.steps : [{ title: "Bắt đầu biên soạn", detail: input.summary || "Thêm hướng dẫn chi tiết cho bước này.", time: "—" }], notes: approved ? [] : ["Bản nháp — cần review trước khi sử dụng trong thực nghiệm."] });
}
export async function createSampleDraft(input: {
    name: string;
    description: string;
}) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const code = `NEW-${Date.now()}`;
    await db.insert(samples).values({ code, name: input.name, groupName: "Bản nháp", status: "Bản nháp", description: input.description || "Mẫu mới được thêm vào kho Rebiomed Protocol.", properties: [{ label: "Trạng thái", value: "Chưa cập nhật" }], theory: input.description || "Bổ sung lý thuyết và dữ liệu tham chiếu cho mẫu này." });
}
export async function createCalculatorDraft(input: CalculatorContentInput, approved = false) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
    await db.insert(calculators).values({ slug, name: input.name, category: input.category ?? "Custom", formula: input.formula, description: input.description || "Tool mới được tạo trong Rebiomed Protocol.", config: { syntax: "arithmetic", formula: input.formula, inputUnits: input.inputUnits ?? {}, outputUnit: input.outputUnit ?? "", variables: input.variables ?? [] }, status: approved ? "Đã duyệt" : "Bản nháp", active: 1 });
}
export async function updateCalculatorById(id: number, input: CalculatorContentInput, editorId?: number, editorRole?: string | null) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const values = { name: input.name, category: input.category ?? "Custom", formula: input.formula, description: input.description || "Tool được cập nhật trong Rebiomed Protocol.", config: { syntax: "arithmetic", formula: input.formula, inputUnits: input.inputUnits ?? {}, outputUnit: input.outputUnit ?? "", variables: input.variables ?? [] } };
    if (isAdminEditor(editorRole)) {
        try {
            await ensurePendingEditColumns(db);
        }
        catch (error) {
            console.warn("[Content] Approval metadata unavailable; applying Admin calculator edit directly:", error);
            await db.update(calculators).set({ ...values, status: "Đã duyệt" }).where(eq(calculators.id, id));
            return;
        }
        await db.update(calculators).set({ ...values, status: "Đã duyệt", pendingEdit: null, pendingEditBy: null, pendingEditAt: null }).where(eq(calculators.id, id));
    }
    else {
        await ensurePendingEditColumns(db);
        await db.update(calculators).set({ pendingEdit: values, pendingEditBy: editorId ?? null, pendingEditAt: new Date() }).where(eq(calculators.id, id));
    }
}
export async function updateProtocolDraft(id: number, input: ProtocolContentInput, editorId?: number, editorRole?: string | null) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const values = { title: input.title, summary: input.summary, owner: input.owner, ...(input.category ? { category: input.category } : {}), ...(input.steps ? { steps: input.steps } : {}) };
    if (isAdminEditor(editorRole)) {
        try {
            await ensurePendingEditColumns(db);
        }
        catch (error) {
            console.warn("[Content] Approval metadata unavailable; applying Admin protocol edit directly:", error);
            await db.update(protocols).set({ ...values, status: "Đã duyệt", version: "v1.0" }).where(eq(protocols.id, id));
            return;
        }
        await db.update(protocols).set({ ...values, status: "Đã duyệt", version: "v1.0", pendingEdit: null, pendingEditBy: null, pendingEditAt: null }).where(eq(protocols.id, id));
    }
    else {
        await ensurePendingEditColumns(db);
        await db.update(protocols).set({ pendingEdit: values, pendingEditBy: editorId ?? null, pendingEditAt: new Date() }).where(eq(protocols.id, id));
    }
}
export async function updateSampleDraft(id: number, input: {
    name: string;
    description: string;
}) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await db.update(samples).set({ name: input.name, description: input.description, theory: input.description }).where(eq(samples.id, id));
}
export async function deleteProtocolById(id: number) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await db.delete(protocols).where(eq(protocols.id, id));
}
export async function deleteCalculatorById(id: number) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await db.delete(calculators).where(eq(calculators.id, id));
}
export type PendingContentEdit = {
    kind: "protocol" | "calculator";
    id: number;
    title: string;
    editorId: number | null;
    updatedAt: Date | null;
};
export async function listPendingContentEdits(): Promise<PendingContentEdit[]> {
    const db = await getDb();
    if (!db)
        return [];
    await ensurePendingEditColumns(db);
    const [protocolRows, calculatorRows] = await Promise.all([
        db.select({ id: protocols.id, title: protocols.title, pendingEditBy: protocols.pendingEditBy, pendingEditAt: protocols.pendingEditAt }).from(protocols).where(isNotNull(protocols.pendingEdit)),
        db.select({ id: calculators.id, name: calculators.name, pendingEditBy: calculators.pendingEditBy, pendingEditAt: calculators.pendingEditAt }).from(calculators).where(isNotNull(calculators.pendingEdit)),
    ]);
    return [
        ...protocolRows.map(row => ({ kind: "protocol" as const, id: row.id, title: row.title, editorId: row.pendingEditBy ?? null, updatedAt: row.pendingEditAt ?? null })),
        ...calculatorRows.map(row => ({ kind: "calculator" as const, id: row.id, title: row.name, editorId: row.pendingEditBy ?? null, updatedAt: row.pendingEditAt ?? null })),
    ];
}
export async function approvePendingContentEdit(kind: "protocol" | "calculator", id: number) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await ensurePendingEditColumns(db);
    if (kind === "protocol") {
        const row = (await db.select().from(protocols).where(eq(protocols.id, id)).limit(1))[0];
        const pending = row?.pendingEdit && typeof row.pendingEdit === "object" ? row.pendingEdit as Record<string, unknown> : null;
        if (!row || !pending)
            throw new Error("Không tìm thấy bản chỉnh sửa đang chờ duyệt.");
        const result = await db.update(protocols).set({ title: typeof pending.title === "string" ? pending.title : row.title, summary: typeof pending.summary === "string" ? pending.summary : row.summary, owner: typeof pending.owner === "string" ? pending.owner : row.owner, category: typeof pending.category === "string" ? pending.category : row.category, steps: Array.isArray(pending.steps) ? pending.steps : row.steps, status: "Đã duyệt", version: "v1.0", pendingEdit: null, pendingEditBy: null, pendingEditAt: null }).where(and(eq(protocols.id, id), isNotNull(protocols.pendingEdit)));
        if (result.meta.changes === 0)
            throw new Error("Bản chỉnh sửa này đã được thay thế hoặc huỷ.");
    }
    else {
        const row = (await db.select().from(calculators).where(eq(calculators.id, id)).limit(1))[0];
        const pending = row?.pendingEdit && typeof row.pendingEdit === "object" ? row.pendingEdit as Record<string, unknown> : null;
        if (!row || !pending)
            throw new Error("Không tìm thấy bản chỉnh sửa đang chờ duyệt.");
        const result = await db.update(calculators).set({ name: typeof pending.name === "string" ? pending.name : row.name, category: typeof pending.category === "string" ? pending.category : row.category, formula: typeof pending.formula === "string" ? pending.formula : row.formula, description: typeof pending.description === "string" ? pending.description : row.description, config: pending.config && typeof pending.config === "object" ? pending.config : row.config, status: "Đã duyệt", pendingEdit: null, pendingEditBy: null, pendingEditAt: null }).where(and(eq(calculators.id, id), isNotNull(calculators.pendingEdit)));
        if (result.meta.changes === 0)
            throw new Error("Bản chỉnh sửa này đã được thay thế hoặc huỷ.");
    }
}
export async function rejectPendingContentEdit(kind: "protocol" | "calculator", id: number) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await ensurePendingEditColumns(db);
    const table = kind === "protocol" ? protocols : calculators;
    const result = await db.update(table).set({ pendingEdit: null, pendingEditBy: null, pendingEditAt: null }).where(eq(table.id, id));
    if (result.meta.changes === 0)
        throw new Error("Không tìm thấy bản chỉnh sửa đang chờ duyệt.");
}
export async function listTeamMembers(viewerUsername?: string | null) {
    const db = await getDb();
    if (!db)
        return [];
    await ensureSupporterIdentity(db);
    const members = await db.select({ id: users.id, username: users.username, name: users.name, email: users.email, role: users.role, approvalStatus: users.approvalStatus, loginMethod: users.loginMethod, lastSignedIn: users.lastSignedIn }).from(users).where(sql`LOWER(TRIM(COALESCE(${users.username}, ''))) <> 'guest'`).orderBy(asc(users.id));
    return members.map(normalizeSupporterUser);
}
export async function updateUserRole(id: number, role: "admin" | "supporter" | "user") {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    const target = await getUserById(id);
    if (target?.username?.toLowerCase() === "wstratos" && role !== "admin") {
        throw new Error("Không thể hạ quyền của tài khoản hệ thống.");
    }
    if (isSupporterAccount(target) && role !== "supporter")
        throw new Error("Không thể hạ quyền của account admin/Website Supporter.");
    if (role === "supporter" && !isDedicatedSupporterAccount(target))
        throw new Error("Quyền Supporter chỉ dành riêng cho account admin.");
    await db.update(users).set({ role }).where(eq(users.id, id));
}
export async function setUserPassword(id: number, password: string, openId: string) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await db.update(users).set({ passwordHash: hashPassword(password), passwordVault: encryptPasswordForAccount(password, openId) }).where(eq(users.id, id));
}
export async function getProtocolById(id: number) {
    const db = await getDb();
    if (!db)
        return undefined;
    return (await db.select({ id: protocols.id, slug: protocols.slug, title: protocols.title, category: protocols.category, tag: protocols.tag, status: protocols.status, version: protocols.version, updatedAt: protocols.updatedAt, owner: protocols.owner, summary: protocols.summary, duration: protocols.duration, steps: protocols.steps, notes: protocols.notes }).from(protocols).where(eq(protocols.id, id)).limit(1))[0];
}
export async function getSampleById(id: number) {
    const db = await getDb();
    if (!db)
        return undefined;
    return (await db.select().from(samples).where(eq(samples.id, id)).limit(1))[0];
}
export async function getCalculatorById(id: number) {
    const db = await getDb();
    if (!db)
        return undefined;
    return (await db.select({ id: calculators.id, slug: calculators.slug, name: calculators.name, category: calculators.category, formula: calculators.formula, description: calculators.description, config: calculators.config, status: calculators.status, active: calculators.active }).from(calculators).where(eq(calculators.id, id)).limit(1))[0];
}
export async function setProtocolStatus(id: number, status: "Đã duyệt" | "Bản nháp") {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await db.update(protocols).set({ status }).where(eq(protocols.id, id));
}
export async function setSampleStatus(id: number, status: "Đã duyệt" | "Bản nháp") {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await db.update(samples).set({ status }).where(eq(samples.id, id));
}
export async function setCalculatorStatus(id: number, status: "Đã duyệt" | "Bản nháp") {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await db.update(calculators).set({ status }).where(eq(calculators.id, id));
}
export async function deleteSampleById(id: number) {
    const db = await getDb();
    if (!db)
        throw new Error("Database is not available");
    await db.delete(samples).where(eq(samples.id, id));
}
