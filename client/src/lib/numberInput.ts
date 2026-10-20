export function parseLocaleNumber(value: string | number): number {
    if (typeof value === "number")
        return value;
    const compact = value.trim().replace(/[\s\u00A0]/g, "").replace(/\./g, ",");
    if ((compact.match(/,/g) ?? []).length > 1)
        return Number.NaN;
    const normalized = compact.replace(/,/g, ".");
    return normalized ? Number(normalized) : Number.NaN;
}
