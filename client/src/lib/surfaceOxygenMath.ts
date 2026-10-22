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
  remainingFraction: number;
  status: "adequate" | "low" | "depleted";
};

const OXYGEN_MOLAR_MASS_MG_PER_MMOL = 32;
const BASE_SOLUBILITY_MMOL_PER_L_AT_37C_1ATM_AIR = 0.105;
const AIR_OXYGEN_FRACTION = 0.2095;
const OXYGEN_DIFFUSION_CM2_PER_S = 3e-5;

export function estimateSurfaceOxygen(input: SurfaceOxygenInputs): SurfaceOxygenEstimate | null {
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  if (![input.areaCm2, input.volumeMl, input.cellCount, input.ocrPmolPerMinPer100k, input.timeHours, input.temperatureC, input.pressureAtm, input.oxygenPercent, input.mediumSolubilityFactor].every(positive) || input.oxygenPercent > 100 || input.temperatureC <= -273.15) return null;

  const volumeL = input.volumeMl / 1000;
  const heightCm = input.volumeMl / input.areaCm2;
  const kelvin = input.temperatureC + 273.15;
  // Qualitative solubility correction: warmer medium holds less dissolved O2.
  const temperatureFactor = Math.exp(1700 * (1 / kelvin - 1 / 310.15));
  const oxygenPressureFactor = input.pressureAtm * (input.oxygenPercent / 100) / AIR_OXYGEN_FRACTION;
  const initialUm = BASE_SOLUBILITY_MMOL_PER_L_AT_37C_1ATM_AIR * oxygenPressureFactor * temperatureFactor * input.mediumSolubilityFactor * 1000;

  const consumedUm = (input.ocrPmolPerMinPer100k * (input.cellCount / 100000) * input.timeHours * 60) / (volumeL * 1000000);
  const consumptionPmolPerMin = input.ocrPmolPerMinPer100k * (input.cellCount / 100000);
  const fluxMolPerCm2PerS = (consumptionPmolPerMin * 1e-12 / 60) / input.areaCm2;
  // mol/cm³ → mol/L (×1000) → µM (×1e6) = ×1e9.
  const diffusionDropUm = (fluxMolPerCm2PerS * heightCm / OXYGEN_DIFFUSION_CM2_PER_S) * 1e9;
  const surfaceOxygenUm = Math.max(0, initialUm - consumedUm - diffusionDropUm / 2);
  const initialMgPerL = (initialUm / 1000) * OXYGEN_MOLAR_MASS_MG_PER_MMOL;
  const surfaceMgPerL = (surfaceOxygenUm / 1000) * OXYGEN_MOLAR_MASS_MG_PER_MMOL;
  const remainingFraction = initialUm > 0 ? surfaceOxygenUm / initialUm : 0;
  const status = surfaceOxygenUm <= 0 ? "depleted" : surfaceOxygenUm < 20 ? "low" : "adequate";

  return { liquidHeightMm: heightCm * 10, initialDissolvedOxygenMgPerL: initialMgPerL, initialDissolvedOxygenUm: initialUm, consumedOxygenUm: consumedUm, diffusionDropUm, surfaceOxygenUm, surfaceOxygenMgPerL: surfaceMgPerL, remainingFraction, status };
}

export function formatScientific(value: number) {
  return value.toExponential(2).replace("e+", " × 10^").replace("e-", " × 10^−");
}
