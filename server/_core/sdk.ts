import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
export type SessionPayload = {
    openId: string;
    appId: string;
    name: string;
};
export type AuthenticatedUser = User;
class LocalSessionService {
    private getSessionSecret() {
        const secret = ENV.cookieSecret;
        if (!secret)
            throw new Error("SESSION_SECRET is unavailable");
        return new TextEncoder().encode(secret);
    }
    async createSessionToken(openId: string, options: {
        expiresInMs?: number;
        name?: string;
    } = {}): Promise<string> {
        return this.signSession({
            openId,
            appId: ENV.appId,
            name: options.name || "",
        }, options);
    }
    async signSession(payload: SessionPayload, options: {
        expiresInMs?: number;
    } = {}): Promise<string> {
        const issuedAt = Date.now();
        const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
        const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
        const secretKey = this.getSessionSecret();
        return new SignJWT({
            openId: payload.openId,
            appId: payload.appId,
            name: payload.name,
        })
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .setExpirationTime(expirationSeconds)
            .sign(secretKey);
    }
    async verifySession(cookieValue: string | undefined | null): Promise<{
        openId: string;
        appId: string;
        name: string;
    } | null> {
        if (!cookieValue) {
            console.warn("[Auth] Missing session cookie");
            return null;
        }
        try {
            const secretKey = this.getSessionSecret();
            const { payload } = await jwtVerify(cookieValue, secretKey, {
                algorithms: ["HS256"],
            });
            const { openId, appId, name } = payload as Record<string, unknown>;
            if (!isNonEmptyString(openId) ||
                (!isNonEmptyString(appId) || appId !== ENV.appId) ||
                typeof name !== "string") {
                console.warn("[Auth] Session payload missing required fields");
                return null;
            }
            return {
                openId,
                appId,
                name,
            };
        }
        catch (error) {
            console.warn("[Auth] Session verification failed", String(error));
            return null;
        }
    }
    async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
        const session = await this.verifySession(parse(req.headers.cookie ?? "")[COOKIE_NAME]);
        if (!session)
            throw ForbiddenError("Invalid session cookie");
        const user = await db.getUserByOpenId(session.openId);
        if (!user || user.approvalStatus !== "approved")
            throw ForbiddenError("Account is unavailable or not approved");
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        return user;
    }
}
export const sdk = new LocalSessionService();
