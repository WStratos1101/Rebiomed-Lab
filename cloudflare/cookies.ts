export function getSessionCookieOptions(_req: unknown) {
    return { httpOnly: true, path: "/", sameSite: "lax" as const, secure: true };
}
