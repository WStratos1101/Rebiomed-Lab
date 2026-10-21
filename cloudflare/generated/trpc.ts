import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "../context";
import { blockGuestIpNow, shouldBlockGuestForProcedure } from "../guestIpGuard";
import { runtime } from "../runtime";
const t = initTRPC.context<TrpcContext>().create({
    transformer: superjson,
});
export const router = t.router;
export const publicProcedure = t.procedure;
export const isAdminLikeRole = (role: string | null | undefined) => role === "admin" || role === "supporter";
export const isGuestRole = (role: string | null | undefined) => role === "guest";
export function assertNotGuest(role: string | null | undefined) {
    if (isGuestRole(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Tài khoản Guest chỉ được xem demo, dùng công cụ tính và ghi nhật ký tạm thời." });
}
// Only a confirmed authenticated Guest calling a specifically listed, high-impact
// forbidden mutation results in an immediate 15-minute IP ban. A single 403 from a
// different source is never sufficient. Refusal still works if logging/DB fails.
async function onGuestForbiddenMutation(ctx: TrpcContext, procedurePath: string): Promise<void> {
    if (!shouldBlockGuestForProcedure(ctx.user?.role, procedurePath) || !ctx.clientIp) return;
    try {
        await blockGuestIpNow(runtime(), ctx.clientIp, procedurePath);
    } catch (error) {
        console.error("[GuestIPGuard] Unable to persist the IP block", error);
    }
}
// Require a signed-in, approved non-Guest account before any mutation of shared data.
const requireSharedEditor = t.middleware(async ({ ctx, next, path }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    if (ctx.user.approvalStatus !== "approved" || isGuestRole(ctx.user.role)) {
        await onGuestForbiddenMutation(ctx, path);
        throw new TRPCError({ code: "FORBIDDEN", message: "Guest không thể chỉnh sửa dữ liệu chung." });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
});
export const sharedEditorProcedure = t.procedure.use(requireSharedEditor);
const requireUser = t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
        },
    });
});
export const protectedProcedure = t.procedure.use(requireUser);
export const adminProcedure = t.procedure.use(t.middleware(async (opts) => {
    const { ctx, next, path } = opts;
    if (!ctx.user || !isAdminLikeRole(ctx.user.role)) {
        await onGuestForbiddenMutation(ctx, path);
        throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
        },
    });
}));
const requireResearcher = t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || !["admin", "supporter", "researcher", "user"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Researcher access required" });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
});
export const researcherProcedure = t.procedure.use(requireResearcher);
const requireViewer = t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || !["admin", "supporter", "researcher", "viewer", "user", "guest"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Workspace viewer access required" });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
});
export const viewerProcedure = t.procedure.use(requireViewer);
