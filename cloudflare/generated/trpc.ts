import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "../context";
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
// Require a signed-in, approved non-Guest account before any mutation of shared data.
const requireSharedEditor = t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    if (ctx.user.approvalStatus !== "approved" || isGuestRole(ctx.user.role)) {
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
    const { ctx, next } = opts;
    if (!ctx.user || !isAdminLikeRole(ctx.user.role)) {
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
