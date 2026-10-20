import { serialize, type SerializeOptions } from "cookie";
import type { User } from "./generated/schema";
import { sdk } from "./sdk";
export type TrpcContext = {
    req: {
        headers: {
            cookie?: string;
            authorization?: string;
        };
        path: string;
    };
    res: {
        cookie(name: string, value: string, options: SerializeOptions & {
            maxAge?: number;
        }): void;
        clearCookie(name: string, options: SerializeOptions): void;
        setHeader(name: string, value: string): void;
    };
    user: User | null;
};
export async function createContext(request: Request, responseHeaders: Headers): Promise<TrpcContext> {
    const req = { headers: { cookie: request.headers.get("cookie") ?? undefined, authorization: request.headers.get("authorization") ?? undefined }, path: new URL(request.url).pathname };
    return {
        req,
        res: {
            cookie(name, value, options) { responseHeaders.append("Set-Cookie", serialize(name, value, { ...options, maxAge: options.maxAge === undefined ? undefined : Math.floor(options.maxAge / 1000) })); },
            clearCookie(name, options) { responseHeaders.append("Set-Cookie", serialize(name, "", { ...options, maxAge: 0 })); },
            setHeader(name, value) { responseHeaders.set(name, value); },
        },
        user: await sdk.authenticateRequest(req),
    };
}
