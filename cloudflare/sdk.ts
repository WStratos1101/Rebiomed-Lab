import { jwtVerify, SignJWT } from "jose";
import { parse } from "cookie";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getUserByOpenId, upsertUser } from "./generated/db";
import { runtime } from "./runtime";
import { ENV } from "./env";
export const sdk = {
    async createSessionToken(openId: string, options: {
        name?: string;
        expiresInMs?: number;
    } = {}) {
        if (runtime().SESSION_SECRET.length < 32)
            throw new Error("SESSION_SECRET requires at least 32 characters");
        return new SignJWT({ openId, name: options.name || "", appId: ENV.appId })
            .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt()
            .setExpirationTime(Math.floor((Date.now() + (options.expiresInMs ?? ONE_YEAR_MS)) / 1000))
            .sign(new TextEncoder().encode(runtime().SESSION_SECRET));
    },
    async authenticateRequest(req: {
        headers: {
            cookie?: string;
            authorization?: string;
        };
    }) {
        const token = parse(req.headers.cookie || "")[COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer /, "");
        if (!token)
            return null;
        try {
            const { payload } = await jwtVerify(token, new TextEncoder().encode(runtime().SESSION_SECRET), { algorithms: ["HS256"] });
            if (payload.appId !== ENV.appId || typeof payload.openId !== "string")
                return null;
            const user = await getUserByOpenId(payload.openId);
            if (!user || user.approvalStatus !== "approved")
                return null;
            await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
            return user;
        }
        catch {
            return null;
        }
    },
};
