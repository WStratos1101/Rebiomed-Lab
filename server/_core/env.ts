export const ENV = {
    get appId() { return process.env.APP_ID ?? "rebiomed-local"; },
    get cookieSecret() { return process.env.SESSION_SECRET ?? ""; },
    get databaseUrl() { return process.env.DATABASE_URL ?? ""; },
    get ownerOpenId() { return process.env.OWNER_OPEN_ID ?? ""; },
    get isProduction() { return process.env.NODE_ENV === "production"; },
};
