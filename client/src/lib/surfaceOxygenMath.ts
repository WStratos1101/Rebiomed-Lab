export type SurfaceOxygenVessel = {
  id: string;
  label: string;
  areaCm2: number;
  minMl: number;
  maxMl: number;
  defaultMl: number;
};

export const SURFACE_OXYGEN_VESSELS: SurfaceOxygenVessel[] = [
  { id: "96", label: "Đĩa 96 giếng", areaCm2: 0.32, minMl: 0.1, maxMl: 0.2, defaultMl: 0.1 },
  { id: "24", label: "Đĩa 24 giếng", areaCm2: 1.9, minMl: 0.5, maxMl: 1, defaultMl: 0.5 },
  { id: "12", label: "Đĩa 12 giếng", areaCm2: 3.8, minMl: 0.75, maxMl: 1.15, defaultMl: 1 },
  { id: "6", label: "Đĩa 6 giếng", areaCm2: 9.6, minMl: 1, maxMl: 3, defaultMl: 2 },
  { id: "t25", label: "Flask T25", areaCm2: 25, minMl: 4, maxMl: 8, defaultMl: 5 },
];

export const SURFACE_OXYGEN_PRESETS = [
  { id: "hepg2", label: "HepG2 — tham khảo", ocrPmolPerMinPer100k: 67, source: "Wagner et al. (2011), HepG2 6.7 nmol/min/mg protein; preset quy đổi sàng lọc, cần hiệu chuẩn theo protein/cell thực tế." },
  { id: "hsc-quiescent", label: "HSC yên lặng — rat primary", ocrPmolPerMinPer100k: 63.1, source: "Smith-Cortinez et al. (2020), basal OCR 63.1 ± 4.3 pmol/min/10⁵ cells." },
  { id: "hsc-activated", label: "HSC hoạt hóa — rat primary", ocrPmolPerMinPer100k: 305.9, source: "Smith-Cortinez et al. (2020), basal OCR 305.9 ± 69.0 pmol/min/10⁵ cells." },
] as const;

export type SurfaceOxygenInputs = {
  areaCm2: number;
  volumeMl: number;
  cellCount: number;
  ocrPmolPerMinPer100k: number;
  timeHours: number;
  temperatureC: number;
  pressureAtm: number;
  oxygenPercent: number;
  mediumSolubilityFactor: number;
};

export type SurfaceOxygenEstimate = {
  liquidHeightMm: number;
  initialDissolvedOxygenMgPerL: number;
  initialDissolvedOxygenUm: number;
  consumedOxygenUm: number;
  diffusionDropUm: number;
  surfaceOxygenUm: number;
  surfaceOxygenMgPerL: number;
  /** Equivalent gas-phase O2 percentage at the cell surface. */
  surfaceOxygenPercent: number;
  /** Percentage of the starting gas-phase O2 equivalent remaining at the surface. */
  remainingFraction: number;
  consumptionPmolPerMin: number;
  diffusionCapacityPmolPerMin: number;
  diffusionLimited: boolean;
  /** Null means the model predicts diffusion can keep up with consumption. */
  hypoxiaOnsetHours: number | null;
  status: "adequate" | "low" | "depleted";
};

export type SurfaceOxygenTarget = {
  targetSurfaceOxygenPercent: number;
  requiredInputOxygenPercent: number;
  requiredInputOxygenPercentCapped: number;
  targetReachableWithAirInput: boolean;
  timeToTargetHours: number | null;
};

const OXYGEN_MOLAR_MASS_MG_PER_MMOL = 32;
const BASE_SOLUBILITY_MMOL_PER_L_AT_37C_1ATM_AIR = 0.105;
const AIR_OXYGEN_FRACTION = 0.2095;
const OXYGEN_DIFFUSION_CM2_PER_S = 3e-5;

const positive = (value: number) => Number.isFinite(value) && value > 0;

function getPhysicalTerms(input: SurfaceOxygenInputs) {
  const volumeL = input.volumeMl / 1000;
  const heightCm = input.volumeMl / input.areaCm2;
  const kelvin = input.temperatureC + 273.15;
  const temperatureFactor = Math.exp(1700 * (1 / 310.15 - 1 / kelvin));
  const dissolvedUmPerInputPercent = BASE_SOLUBILITY_MMOL_PER_L_AT_37C_1ATM_AIR
    * input.pressureAtm * (0.01 / AIR_OXYGEN_FRACTION)
    * temperatureFactor * input.mediumSolubilityFactor * 1000;
  const consumptionPmolPerMin = input.ocrPmolPerMinPer100k * (input.cellCount / 100000);
  const consumptionUmPerHour = (consumptionPmolPerMin * 60) / (volumeL * 1_000_000);
  const fluxMolPerCm2PerS = (consumptionPmolPerMin * 1e-12 / 60) / input.areaCm2;
  const diffusionDropUm = (fluxMolPerCm2PerS * heightCm / OXYGEN_DIFFUSION_CM2_PER_S) * 1e9;
  const initialUm = dissolvedUmPerInputPercent * input.oxygenPercent;
  const initialConcentrationMolPerCm3 = initialUm * 1e-9;
  const diffusionCapacityPmolPerMin = (
    OXYGEN_DIFFUSION_CM2_PER_S * initialConcentrationMolPerCm3 / heightCm
    * input.areaCm2 * 1e12 * 60
  );
  return { volumeL, heightCm, dissolvedUmPerInputPercent, consumptionPmolPerMin, consumptionUmPerHour, diffusionDropUm, initialUm, diffusionCapacityPmolPerMin };
}

function validInput(input: SurfaceOxygenInputs) {
  return [input.areaCm2, input.volumeMl, input.cellCount, input.ocrPmolPerMinPer100k, input.timeHours, input.temperatureC + 273.15, input.pressureAtm, input.oxygenPercent, input.mediumSolubilityFactor].every(positive)
    && input.oxygenPercent <= 100;
}

export function estimateSurfaceOxygen(input: SurfaceOxygenInputs): SurfaceOxygenEstimate | null {
  if (!validInput(input)) return null;
  const terms = getPhysicalTerms(input);
  const consumedUm = terms.consumptionUmPerHour * input.timeHours;
  const surfaceOxygenUm = Math.max(0, terms.initialUm - consumedUm - terms.diffusionDropUm / 2);
  const initialMgPerL = (terms.initialUm / 1000) * OXYGEN_MOLAR_MASS_MG_PER_MMOL;
  const surfaceMgPerL = (surfaceOxygenUm / 1000) * OXYGEN_MOLAR_MASS_MG_PER_MMOL;
  const remainingFraction = terms.initialUm > 0 ? surfaceOxygenUm / terms.initialUm : 0;
  const surfaceOxygenPercent = input.oxygenPercent * remainingFraction;
  const diffusionLimited = terms.consumptionPmolPerMin > terms.diffusionCapacityPmolPerMin;
  const netConsumptionPmolPerMin = terms.consumptionPmolPerMin - terms.diffusionCapacityPmolPerMin;
  const hypoxiaOnsetHours = diffusionLimited
    ? Math.max(0, terms.initialUm * terms.volumeL * 1_000_000 / (netConsumptionPmolPerMin * 60))
    : null;
  const status = surfaceOxygenUm <= 0 ? "depleted" : surfaceOxygenUm < 20 ? "low" : "adequate";

  return {
    liquidHeightMm: terms.heightCm * 10,
    initialDissolvedOxygenMgPerL: initialMgPerL,
    initialDissolvedOxygenUm: terms.initialUm,
    consumedOxygenUm: consumedUm,
    diffusionDropUm: terms.diffusionDropUm,
    surfaceOxygenUm,
    surfaceOxygenMgPerL: surfaceMgPerL,
    surfaceOxygenPercent,
    remainingFraction,
    consumptionPmolPerMin: terms.consumptionPmolPerMin,
    diffusionCapacityPmolPerMin: terms.diffusionCapacityPmolPerMin,
    diffusionLimited,
    hypoxiaOnsetHours,
    status,
  };
}

/**
 * Calculates the starting gas-phase oxygen percentage needed to reach a target
 * equivalent percentage at the cell surface after the selected culture time.
 * This is a screening inverse model, not a gas-transfer control algorithm.
 */
export function estimateRequiredInputOxygen(input: SurfaceOxygenInputs, targetSurfaceOxygenPercent: number): SurfaceOxygenTarget | null {
  if (!validInput(input) || !positive(targetSurfaceOxygenPercent) || targetSurfaceOxygenPercent > 100) return null;
  const terms = getPhysicalTerms(input);
  const targetUm = terms.dissolvedUmPerInputPercent * targetSurfaceOxygenPercent;
  const consumedUm = terms.consumptionUmPerHour * input.timeHours;
  const requiredInputOxygenPercent = (targetUm + consumedUm + terms.diffusionDropUm / 2) / terms.dissolvedUmPerInputPercent;
  const currentSurfaceReserveUm = terms.initialUm - terms.diffusionDropUm / 2;
  const timeToTargetHours = currentSurfaceReserveUm > targetUm && terms.consumptionUmPerHour > 0
    ? (currentSurfaceReserveUm - targetUm) / terms.consumptionUmPerHour
    : null;
  return {
    targetSurfaceOxygenPercent,
    requiredInputOxygenPercent,
    requiredInputOxygenPercentCapped: Math.min(100, Math.max(0, requiredInputOxygenPercent)),
    targetReachableWithAirInput: requiredInputOxygenPercent <= 100,
    timeToTargetHours,
  };
}

export function formatScientific(value: number) {
  return value.toExponential(2).replace("e+", " × 10^").replace("e-", " × 10^−");
}
