import { z } from "zod";
import { publicProcedure, router } from "./generated/trpc";
import { runtime } from "./runtime";
export const systemRouter = router({
    health: publicProcedure.input(z.object({ timestamp: z.number().min(0) })).query(async () => {
        await runtime().DB.prepare("SELECT 1").first();
        return { ok: true };
    }),
});
