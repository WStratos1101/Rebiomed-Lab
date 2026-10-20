import { scrypt } from "@noble/hashes/scrypt";
import { randomBytes, timingSafeEqual } from "node:crypto";
const KEY_LENGTH = 64;
const N = 16384;
const R = 8;
const P = 1;
export function hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = Buffer.from(scrypt(password, salt, { N, r: R, p: P, dkLen: KEY_LENGTH })).toString("hex");
    return `scrypt$${N}$${R}$${P}$${salt}$${hash}`;
}
export function verifyPassword(password: string, encoded: string | null | undefined): boolean {
    if (!encoded)
        return false;
    const [algorithm, n, r, p, salt, expectedHex] = encoded.split("$");
    if (algorithm !== "scrypt" || !n || !r || !p || !salt || !expectedHex)
        return false;
    try {
        const expected = Buffer.from(expectedHex, "hex");
        const actual = Buffer.from(scrypt(password, salt, { N: Number(n), r: Number(r), p: Number(p), dkLen: expected.length }));
        return expected.length === actual.length && timingSafeEqual(expected, actual);
    }
    catch {
        return false;
    }
}
