import { describe, expect, it } from "vitest";
import { buildOxygenTimeline, calculateMaintenanceOxygen, estimateRequiredInputOxygen, estimateRequiredInputOxygenByConcentration, estimateSurfaceOxygen } from "../client/src/lib/surfaceOxygenMath";

const baseInput = {
  areaCm2: 0.32,
  volumeMl: 0.1,
  gasVolumeLiters: 1,
  gasOxygenPercent: 19,
  cellCount: 100000,
  ocrPmolPerMinPer100k: 63.1,
  timeHours: 1,
  temperatureC: 37,
  pressureAtm: 1,
  mediumSolubilityFactor: 0.9,
};

describe("surface oxygen estimate", () => {
  it("derives liquid height and equivalent remaining surface percentage", () => {
    const result = estimateSurfaceOxygen(baseInput);
    expect(result).not.toBeNull();
    expect(result!.liquidHeightMm).toBeCloseTo(3.125, 3);
    expect(result!.initialDissolvedOxygenMgPerL).toBeGreaterThan(2);
    expect(result!.surfaceOxygenPercent).toBeGreaterThanOrEqual(0);
  });

  it("uses total gas volume to calculate actual oxygen inventory", () => {
    const smallSystem = estimateSurfaceOxygen({ ...baseInput, gasVolumeLiters: 0.001, timeHours: 24 });
    const largeSystem = estimateSurfaceOxygen({ ...baseInput, gasVolumeLiters: 1, timeHours: 24 });
    expect(smallSystem).not.toBeNull();
    expect(largeSystem).not.toBeNull();
    expect(largeSystem!.inputGasOxygenUmol).toBeGreaterThan(smallSystem!.inputGasOxygenUmol * 900);
    expect(largeSystem!.totalInitialOxygenUmol).toBeGreaterThan(smallSystem!.totalInitialOxygenUmol * 900);
  });

  it("uses incubation time to subtract oxygen consumed from the system", () => {
    const shortIncubation = estimateSurfaceOxygen({ ...baseInput, gasVolumeLiters: 0.001, timeHours: 0.1 });
    const longIncubation = estimateSurfaceOxygen({ ...baseInput, gasVolumeLiters: 0.001, timeHours: 24 });
    expect(shortIncubation).not.toBeNull();
    expect(longIncubation).not.toBeNull();
    expect(longIncubation!.consumedOxygenUmol).toBeGreaterThan(shortIncubation!.consumedOxygenUmol);
    expect(longIncubation!.remainingTotalOxygenUmol).toBeLessThan(shortIncubation!.remainingTotalOxygenUmol);
    expect(longIncubation!.surfaceOxygenUm).toBeLessThan(shortIncubation!.surfaceOxygenUm);
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

  it("calculates required starting oxygen volume for a target surface", () => {
    const percentResult = estimateRequiredInputOxygen({ ...baseInput, timeHours: 24 }, 5);
    const concentrationResult = estimateRequiredInputOxygenByConcentration({ ...baseInput, timeHours: 24 }, 5);
    expect(percentResult).not.toBeNull();
    expect(concentrationResult).not.toBeNull();
    expect(percentResult!.requiredGasVolumeLiters).toBeGreaterThan(0);
    expect(concentrationResult!.targetSurfaceOxygenUm).toBe(5);
  });

  it("calculates oxygen equivalent needed for a maintenance interval", () => {
    const result = calculateMaintenanceOxygen(baseInput, 24);
    expect(result).not.toBeNull();
    expect(result!.consumedOxygenUm).toBeGreaterThan(0);
    expect(result!.consumedOxygenUmol).toBeGreaterThan(0);
    expect(result!.equivalentInputGasVolumeLiters).toBeGreaterThan(0);
  });

  it("builds a timeline with target and maintenance events", () => {
    const target = estimateRequiredInputOxygen({ ...baseInput, timeHours: 12 }, 5);
    const timeline = buildOxygenTimeline({ ...baseInput, timeHours: 12 }, target, 24);
    expect(timeline.length).toBeGreaterThan(2);
    expect(timeline.some(point => point.label?.includes("bắt đầu duy trì"))).toBe(true);
  });

  it("rejects invalid inputs and impossible targets", () => {
    expect(estimateSurfaceOxygen({ ...baseInput, areaCm2: 0 })).toBeNull();
    expect(estimateRequiredInputOxygen(baseInput, 0)).toBeNull();
    expect(estimateRequiredInputOxygen(baseInput, 101)).toBeNull();
    expect(estimateRequiredInputOxygenByConcentration(baseInput, 0)).toBeNull();
    expect(calculateMaintenanceOxygen(baseInput, 0)).toBeNull();
  });
});
