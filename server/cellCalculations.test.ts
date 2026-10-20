import { describe, expect, it } from "vitest";
import { calculateCellsNeeded, calculateManualCellCount, calculateVolumeToTake } from "../client/src/lib/cellCalculations";
describe("cell calculation units", () => {
    it("uses 1 mL when the manual-count solution volume is omitted and scales by volume", () => {
        expect(calculateManualCellCount(100, 4, 2)).toBe(500000);
        expect(calculateManualCellCount(100, 4, 2, 3)).toBe(1500000);
    });
    it("treats cell as a total independent of wells or flasks", () => {
        expect(calculateCellsNeeded(750000, "cell", 100, 0, "µL")).toBe(750000);
        expect(calculateVolumeToTake(250000, 1000000, "cell", 10, "mL", 0)).toBe(2.5);
    });
    it("converts density and volume units correctly", () => {
        expect(calculateCellsNeeded(100000, "cell/mL", 2, 500, "µL")).toBe(100000);
        expect(calculateVolumeToTake(200000, 50000, "cell/mL", 10, "mL", 0)).toBe(4);
        expect(calculateVolumeToTake(200000, 50000, "cell/mL", 0.01, "L", 0)).toBe(0.004);
    });
    it("multiplies per-well and per-flask quantities by the specified number of units", () => {
        expect(calculateCellsNeeded(10000, "cell/giếng", 12, 0, "mL")).toBe(120000);
        expect(calculateCellsNeeded(50000, "cell/flask", 3, 0, "mL")).toBe(150000);
        expect(calculateVolumeToTake(50000, 25000, "cell/giếng", 2, "mL", 4)).toBe(1);
    });
    it("rejects missing unit counts, zero totals and requests greater than available cells", () => {
        expect(calculateVolumeToTake(10, 100, "cell/flask", 1, "mL", 0)).toBeNull();
        expect(calculateVolumeToTake(101, 100, "cell", 1, "mL", 0)).toBeNull();
        expect(calculateVolumeToTake(10, 0, "cell", 1, "mL", 0)).toBeNull();
    });
});
