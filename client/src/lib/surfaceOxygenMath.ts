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
  { id: "hepg2", label: "HepG2 — tham khảo", ocrPmolPerMinPer100k: 67, source: "Wagner et al. (2011), preset quy đổi sàng lọc; cần hiệu chuẩn theo protein/cell thực tế." },
  { id: "hsc-quiescent", label: "HSC yên lặng — rat primary", ocrPmolPerMinPer100k: 63.1, source: "Smith-Cortinez et al. (2020), basal OCR 63.1 ± 4.3 pmol/min/10⁵ cells." },
  { id: "hsc-activated", label: "HSC hoạt hóa — rat primary", ocrPmolPerMinPer100k: 305.9, source: "Smith-Cortinez et al. (2020), basal OCR 305.9 ± 69.0 pmol/min/10⁵ cells." },
] as const;

export const SURFACE_OXYGEN_SOLUBILITY_PRESETS = [
  {
    id: "culture-medium",
    label: "Môi trường nuôi cấy / saline-like",
    factor: 0.9,
    source: "Preset sàng lọc theo Place et al. (2017): môi trường có chất điện giải/protein làm thay đổi Henry constant; culture medium cần đo thực tế.",
  },
  {
    id: "water",
    label: "Nước / dung dịch loãng",
    factor: 1,
    source: "Mốc nước tinh khiết; YSI ghi nhận nước bão hòa không khí khoảng 6,73 mg/L ở 37°C. Không đại diện cho môi trường có serum.",
  },
] as const;

export type SurfaceOxygenInputs = {
  areaCm2: number;
  volumeMl: number;
  oxygenVolumeMl: number;
  cellCount: number;
  ocrPmolPerMinPer100k: number;
  timeHours: number;
  temperatureC: number;
  pressureAtm: number;
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
  surfaceOxygenPercent: number;
  remainingFraction: number;
  consumptionPmolPerMin: number;
  diffusionCapacityPmolPerMin: number;
  diffusionLimited: boolean;
  hypoxiaOnsetHours: number | null;
  status: "adequate" | "low" | "depleted";
};

export type SurfaceOxygenTarget = {
  targetSurfaceOxygenPercent: number;
  targetSurfaceOxygenUm: number;
  requiredInputOxygenVolumeMl: number;
  requiredInputOxygenVolumeMlCapped: number;
  targetReachableWithInput: boolean;
  timeToTargetHours: number | null;
};

export type SurfaceOxygenMaintenance = {
  maintenanceHours: number;
  consumedOxygenUm: number;
  consumedOxygenMgPerL: number;
  consumedOxygenUmol: number;
  equivalentInputOxygenVolumeMl: number;
};

export type SurfaceOxygenTimelinePoint = {
  hour: number;
  oxygenUm: number;
  label?: string;
};

const OXYGEN_MOLAR_MASS_MG_PER_MMOL = 32;
const BASE_SOLUBILITY_MMOL_PER_L_AT_37C_1ATM_AIR = 0.105;
const AIR_OXYGEN_FRACTION = 0.2095;
const OXYGEN_DIFFUSION_CM2_PER_S = 3e-5;
const GAS_CONSTANT_L_ATM_PER_MOL_K = 0.082057;
const positive = (value: number) => Number.isFinite(value) && value > 0;

function getPhysicalTerms(input: SurfaceOxygenInputs) {
  const volumeL = input.volumeMl / 1000;
  const heightCm = input.volumeMl / input.areaCm2;
  const kelvin = input.temperatureC + 273.15;
  const temperatureFactor = Math.exp(1700 * (1 / 310.15 - 1 / kelvin));
  const dissolvedUmPerO2Percent = BASE_SOLUBILITY_MMOL_PER_L_AT_37C_1ATM_AIR
    * input.pressureAtm * (0.01 / AIR_OXYGEN_FRACTION)
    * temperatureFactor * input.mediumSolubilityFactor * 1000;
  const saturationUm = dissolvedUmPerO2Percent * 100;
  const gasOxygenUmPerMl = input.pressureAtm * 1000 / (GAS_CONSTANT_L_ATM_PER_MOL_K * kelvin);
  const availableOxygenUm = input.oxygenVolumeMl * gasOxygenUmPerMl / volumeL;
  const initialUm = Math.min(saturationUm, availableOxygenUm);
  const consumptionPmolPerMin = input.ocrPmolPerMinPer100k * (input.cellCount / 100000);
  const consumptionUmPerHour = (consumptionPmolPerMin * 60) / (volumeL * 1_000_000);
  const fluxMolPerCm2PerS = (consumptionPmolPerMin * 1e-12 / 60) / input.areaCm2;
  const diffusionDropUm = (fluxMolPerCm2PerS * heightCm / OXYGEN_DIFFUSION_CM2_PER_S) * 1e9;
  const initialConcentrationMolPerCm3 = initialUm * 1e-9;
  const diffusionCapacityPmolPerMin = OXYGEN_DIFFUSION_CM2_PER_S * initialConcentrationMolPerCm3 / heightCm * input.areaCm2 * 1e12 * 60;
  return { volumeL, heightCm, dissolvedUmPerO2Percent, saturationUm, gasOxygenUmPerMl, consumptionPmolPerMin, consumptionUmPerHour, diffusionDropUm, initialUm, diffusionCapacityPmolPerMin };
}

function validInput(input: SurfaceOxygenInputs) {
  return [input.areaCm2, input.volumeMl, input.oxygenVolumeMl, input.cellCount, input.ocrPmolPerMinPer100k, input.timeHours, input.temperatureC + 273.15, input.pressureAtm, input.mediumSolubilityFactor].every(positive);
}

export function estimateSurfaceOxygen(input: SurfaceOxygenInputs): SurfaceOxygenEstimate | null {
  if (!validInput(input)) return null;
  const terms = getPhysicalTerms(input);
  const consumedUm = terms.consumptionUmPerHour * input.timeHours;
  const surfaceOxygenUm = Math.max(0, terms.initialUm - consumedUm - terms.diffusionDropUm / 2);
  const initialMgPerL = (terms.initialUm / 1000) * OXYGEN_MOLAR_MASS_MG_PER_MMOL;
  const surfaceMgPerL = (surfaceOxygenUm / 1000) * OXYGEN_MOLAR_MASS_MG_PER_MMOL;
  const remainingFraction = terms.initialUm > 0 ? surfaceOxygenUm / terms.initialUm : 0;
  const surfaceOxygenPercent = terms.saturationUm > 0 ? (surfaceOxygenUm / terms.saturationUm) * 100 : 0;
  const diffusionLimited = terms.consumptionPmolPerMin > terms.diffusionCapacityPmolPerMin;
  const netConsumptionPmolPerMin = terms.consumptionPmolPerMin - terms.diffusionCapacityPmolPerMin;
  const hypoxiaOnsetHours = diffusionLimited ? Math.max(0, terms.initialUm * terms.volumeL * 1_000_000 / (netConsumptionPmolPerMin * 60)) : null;
  const status = surfaceOxygenUm <= 0 ? "depleted" : surfaceOxygenUm < 20 ? "low" : "adequate";
  return { liquidHeightMm: terms.heightCm * 10, initialDissolvedOxygenMgPerL: initialMgPerL, initialDissolvedOxygenUm: terms.initialUm, consumedOxygenUm: consumedUm, diffusionDropUm: terms.diffusionDropUm, surfaceOxygenUm, surfaceOxygenMgPerL: surfaceMgPerL, surfaceOxygenPercent, remainingFraction, consumptionPmolPerMin: terms.consumptionPmolPerMin, diffusionCapacityPmolPerMin: terms.diffusionCapacityPmolPerMin, diffusionLimited, hypoxiaOnsetHours, status };
}

function estimateTargetByUm(input: SurfaceOxygenInputs, targetSurfaceOxygenUm: number): SurfaceOxygenTarget | null {
  if (!validInput(input) || !positive(targetSurfaceOxygenUm)) return null;
  const terms = getPhysicalTerms(input);
  const targetSurfaceOxygenPercent = (targetSurfaceOxygenUm / terms.saturationUm) * 100;
  const consumedUm = terms.consumptionUmPerHour * input.timeHours;
  const requiredInitialUm = targetSurfaceOxygenUm + consumedUm + terms.diffusionDropUm / 2;
  const requiredInputOxygenVolumeMl = requiredInitialUm * input.volumeMl / 1000 / terms.gasOxygenUmPerMl;
  const currentSurfaceReserveUm = terms.initialUm - terms.diffusionDropUm / 2;
  const timeToTargetHours = currentSurfaceReserveUm > targetSurfaceOxygenUm && terms.consumptionUmPerHour > 0 ? (currentSurfaceReserveUm - targetSurfaceOxygenUm) / terms.consumptionUmPerHour : null;
  return { targetSurfaceOxygenPercent, targetSurfaceOxygenUm, requiredInputOxygenVolumeMl, requiredInputOxygenVolumeMlCapped: Math.max(0, requiredInputOxygenVolumeMl), targetReachableWithInput: input.oxygenVolumeMl >= requiredInputOxygenVolumeMl, timeToTargetHours };
}

export function estimateRequiredInputOxygen(input: SurfaceOxygenInputs, targetSurfaceOxygenPercent: number): SurfaceOxygenTarget | null {
  if (!validInput(input) || !positive(targetSurfaceOxygenPercent) || targetSurfaceOxygenPercent > 100) return null;
  const terms = getPhysicalTerms(input);
  return estimateTargetByUm(input, terms.saturationUm * targetSurfaceOxygenPercent / 100);
}

export function estimateRequiredInputOxygenByConcentration(input: SurfaceOxygenInputs, targetSurfaceOxygenUm: number): SurfaceOxygenTarget | null {
  return estimateTargetByUm(input, targetSurfaceOxygenUm);
}

export function calculateMaintenanceOxygen(input: SurfaceOxygenInputs, maintenanceHours: number): SurfaceOxygenMaintenance | null {
  if (!validInput(input) || !positive(maintenanceHours)) return null;
  const terms = getPhysicalTerms(input);
  const consumedOxygenUm = terms.consumptionUmPerHour * maintenanceHours;
  return { maintenanceHours, consumedOxygenUm, consumedOxygenMgPerL: (consumedOxygenUm / 1000) * OXYGEN_MOLAR_MASS_MG_PER_MMOL, consumedOxygenUmol: consumedOxygenUm * terms.volumeL, equivalentInputOxygenVolumeMl: consumedOxygenUm * terms.volumeL / terms.gasOxygenUmPerMl };
}

export function buildOxygenTimeline(input: SurfaceOxygenInputs, target: SurfaceOxygenTarget | null, durationHours: number): SurfaceOxygenTimelinePoint[] {
  if (!target || !positive(durationHours)) return [];
  const terms = getPhysicalTerms(input);
  const targetHour = target.timeToTargetHours === null ? Math.min(durationHours, input.timeHours) : Math.max(0, Math.min(durationHours, target.timeToTargetHours));
  const maintenanceInterval = terms.consumptionUmPerHour > 0 ? target.targetSurfaceOxygenUm / terms.consumptionUmPerHour : durationHours;
  const points: SurfaceOxygenTimelinePoint[] = [
    { hour: 0, oxygenUm: Math.min(terms.saturationUm, target.targetSurfaceOxygenUm + terms.consumptionUmPerHour * Math.max(0, durationHours - targetHour) + terms.diffusionDropUm / 2), label: "Nạp O₂ ban đầu" },
    { hour: targetHour, oxygenUm: target.targetSurfaceOxygenUm, label: "Đạt mục tiêu / bắt đầu duy trì" },
  ];
  for (let hour = targetHour + maintenanceInterval; hour < durationHours; hour += maintenanceInterval) {
    points.push({ hour, oxygenUm: target.targetSurfaceOxygenUm, label: "Bơm duy trì" });
  }
  points.push({ hour: durationHours, oxygenUm: target.targetSurfaceOxygenUm, label: "Kết thúc" });
  return points;
}

export function formatScientific(value: number) {
  return value.toExponential(2).replace("e+", " × 10^").replace("e-", " × 10^−");
}
