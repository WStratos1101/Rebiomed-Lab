export function publicPlatformConfig(_env: NodeJS.ProcessEnv = process.env) {
    return {};
}
export function publicPlatformScript(env: NodeJS.ProcessEnv = process.env): string {
    return `window.__REBIOMED_CONFIG__=${JSON.stringify(publicPlatformConfig(env))};`;
}
