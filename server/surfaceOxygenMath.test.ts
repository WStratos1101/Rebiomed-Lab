import { describe, expect, it } from "vitest";
import { calculateMaintenanceOxygen, estimateRequiredInputOxygen, estimateRequiredInputOxygenByConcentration, estimateSurfaceOxygen } from "../client/src/lib/surfaceOxygenMath";

const baseInput = {
  areaCm2: 0.32,
  volumeMl: 0.1,
  cellCount: 100000,
  ocrPmolPerMinPer100k: 63.1,
  timeHours: 1,
  temperatureC: 37,
  pressureAtm: 1,
  oxygenPercent: 19,
  mediumSolubilityFactor: 0.9,
};

describe("surface oxygen estimate", () => {
  it("derives liquid height and equivalent remaining surface percentage", () => {
    const result = estimateSurfaceOxygen(baseInput);
    expect(result).not.toBeNull();
    expect(result!.liquidHeightMm).toBeCloseTo(3.125, 3);
    expect(result!.initialDissolvedOxygenMgPerL).toBeGreaterThan(2);
    expect(result!.surfaceOxygenPercent).toBeGreaterThanOrEqual(0);
    expect(result!.surfaceOxygenPercent).toBeLessThanOrEqual(19);
  });

  it("reports diffusion limitation and a finite onset time for high OCR", () => {
    const result = estimateSurfaceOxygen({ ...baseInput, cellCount: 1000000, ocrPmolPerMinPer100k: 305.9, timeHours: 24 });
    expect(result).not.toBeNull();
    expect(result!.diffusionLimited).toBe(true);
    expect(result!.hypoxiaOnsetHours).not.toBeNull();
  });

  it("never returns negative surface oxygen", () => {
    const result = estimateSurfaceOxygen({ ...baseInput, cellCount: 1000000, ocrPmolPerMinPer100k: 305.9, timeHours: 72 });
    expect(result).not.toBeNull();
    expect(result!.surfaceOxygenUm).toBe(0);
    expect(result!.surfaceOxygenPercent).toBe(0);
    expect(result!.status).toBe("depleted");
  });

  it("calculates required starting oxygen for a target surface percentage or concentration", () => {
    const percentResult = estimateRequiredInputOxygen({ ...baseInput, timeHours: 24 }, 5);
    const concentrationResult = estimateRequiredInputOxygenByConcentration({ ...baseInput, timeHours: 24 }, 5);
    expect(percentResult).not.toBeNull();
    expect(concentrationResult).not.toBeNull();
    expect(percentResult!.requiredInputOxygenPercent).toBeGreaterThan(5);
    expect(concentrationResult!.targetSurfaceOxygenUm).toBe(5);
  });

  it("calculates oxygen equivalent needed for a maintenance interval", () => {
    const result = calculateMaintenanceOxygen(baseInput, 24);
    expect(result).not.toBeNull();
    expect(result!.consumedOxygenUm).toBeGreaterThan(0);
    expect(result!.consumedOxygenUmol).toBeGreaterThan(0);
    expect(result!.equivalentInputOxygenPercent).toBeGreaterThan(0);
  });

  it("rejects invalid inputs and impossible targets", () => {
    expect(estimateSurfaceOxygen({ ...baseInput, areaCm2: 0 })).toBeNull();
    expect(estimateRequiredInputOxygen(baseInput, 0)).toBeNull();
    expect(estimateRequiredInputOxygen(baseInput, 101)).toBeNull();
    expect(estimateRequiredInputOxygenByConcentration(baseInput, 0)).toBeNull();
    expect(calculateMaintenanceOxygen(baseInput, 0)).toBeNull();
  });
});
