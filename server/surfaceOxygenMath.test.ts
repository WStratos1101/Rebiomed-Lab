import { describe, expect, it } from "vitest";
import { estimateSurfaceOxygen } from "../client/src/lib/surfaceOxygenMath";

describe("surface oxygen estimate", () => {
  it("derives liquid height from vessel area and volume", () => {
    const result = estimateSurfaceOxygen({ areaCm2: 0.32, volumeMl: 0.1, cellCount: 100000, ocrPmolPerMinPer100k: 63.1, timeHours: 1, temperatureC: 37, pressureAtm: 1, oxygenPercent: 19, mediumSolubilityFactor: 0.9 });
    expect(result).not.toBeNull();
    expect(result!.liquidHeightMm).toBeCloseTo(3.125, 3);
    expect(result!.initialDissolvedOxygenMgPerL).toBeGreaterThan(2);
  });

  it("never returns negative surface oxygen", () => {
    const result = estimateSurfaceOxygen({ areaCm2: 0.32, volumeMl: 0.1, cellCount: 1000000, ocrPmolPerMinPer100k: 305.9, timeHours: 72, temperatureC: 37, pressureAtm: 1, oxygenPercent: 19, mediumSolubilityFactor: 0.9 });
    expect(result).not.toBeNull();
    expect(result!.surfaceOxygenUm).toBe(0);
    expect(result!.status).toBe("depleted");
  });

  it("rejects invalid inputs", () => {
    expect(estimateSurfaceOxygen({ areaCm2: 0, volumeMl: 1, cellCount: 1, ocrPmolPerMinPer100k: 1, timeHours: 1, temperatureC: 37, pressureAtm: 1, oxygenPercent: 19, mediumSolubilityFactor: 0.9 })).toBeNull();
  });
  it("decreases initial oxygen solubility at higher temperature under equal pressure", () => {
    const baseline = { areaCm2: 0.32, volumeMl: 0.1, cellCount: 100000, ocrPmolPerMinPer100k: 63.1, timeHours: 1, pressureAtm: 1, oxygenPercent: 19, mediumSolubilityFactor: 0.9 };
    const cold = estimateSurfaceOxygen({ ...baseline, temperatureC: 25 });
    const warm = estimateSurfaceOxygen({ ...baseline, temperatureC: 40 });
    expect(cold!.initialDissolvedOxygenUm).toBeGreaterThan(warm!.initialDissolvedOxygenUm);
  });

});
