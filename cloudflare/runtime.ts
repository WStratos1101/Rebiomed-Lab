import { AsyncLocalStorage } from "node:async_hooks";
export interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
    SESSION_SECRET: string;
    REBIOMED_PASSWORD_VAULT_KEY: string;
    APP_ID?: string;
}
const storage = new AsyncLocalStorage<Env>();
export function runtime(): Env {
    const env = storage.getStore();
    if (!env)
        throw new Error("Request environment is unavailable");
    return env;
}
export function withRuntime<T>(env: Env, callback: () => T): T { return storage.run(env, callback); }
