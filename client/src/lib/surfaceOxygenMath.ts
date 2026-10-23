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
  { id: "hepg2", label: "HepG2 — tham khảo", ocrPmolPerMinPer100k: 67, source: "Preset sàng lọc; OCR HepG2 thay đổi theo mật độ, hình học và điều kiện nuôi. Cần hiệu chuẩn theo mẫu thực tế." },
  { id: "hsc-quiescent", label: "HSC yên lặng — rat primary", ocrPmolPerMinPer100k: 63.1, source: "Smith-Cortinez et al. (2020), basal OCR 63.1 ± 4.3 pmol/min/10⁵ cells." },
  { id: "hsc-activated", label: "HSC hoạt hóa — rat primary", ocrPmolPerMinPer100k: 305.9, source: "Smith-Cortinez et al. (2020), basal OCR 305.9 ± 69.0 pmol/min/10⁵ cells." },
] as const;

export const SURFACE_OXYGEN_SOLUBILITY_PRESETS = [
  { id: "culture-medium", label: "Môi trường nuôi cấy / saline-like", factor: 0.9, source: "Hệ số sàng lọc; protein, muối và thành phần môi trường làm thay đổi độ hòa tan. Cần đo DO thực tế nếu cần định lượng." },
  { id: "water", label: "Nước / dung dịch loãng", factor: 1, source: "YSI: nước bão hòa không khí khoảng 6,73 mg/L ở 37°C và 760 mmHg; không đại diện mặc định cho môi trường có serum." },
] as const;

export type SurfaceOxygenInputs = {
  areaCm2: number;
  volumeMl: number;
  gasVolumeLiters: number;
  gasOxygenPercent: number;
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
  remainingGasOxygenPercent: number;
  consumptionPmolPerMin: number;
  diffusionCapacityPmolPerMin: number;
  diffusionLimited: boolean;
  hypoxiaOnsetHours: number | null;
  status: "adequate" | "low" | "depleted";
};

export type SurfaceOxygenTarget = {
  targetSurfaceOxygenPercent: number;
  targetSurfaceOxygenUm: number;
  requiredGasVolumeLiters: number;
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
  equivalentInputGasVolumeLiters: number;
  equivalentInputOxygenVolumeMl: number;
};

export type SurfaceOxygenTimelinePoint = { hour: number; oxygenUm: number; label?: string };

const OXYGEN_MOLAR_MASS_MG_PER_MMOL = 32;
const BASE_DISSOLVED_OXYGEN_UM_AT_37C_AIR = 105;
const AIR_OXYGEN_PERCENT = 20.95;
const OXYGEN_DIFFUSION_CM2_PER_S = 2.69e-5;
const GAS_CONSTANT_L_ATM_PER_MOL_K = 0.082057366080960;
const positive = (value: number) => Number.isFinite(value) && value > 0;

function getPhysicalTerms(input: SurfaceOxygenInputs) {
  const volumeL = input.volumeMl / 1000;
  const heightCm = input.volumeMl / input.areaCm2;
  const kelvin = input.temperatureC + 273.15;
  const temperatureFactor = Math.exp(1700 * (1 / 310.15 - 1 / kelvin));
  const dissolvedUmPerOxygenPercent = (BASE_DISSOLVED_OXYGEN_UM_AT_37C_AIR / AIR_OXYGEN_PERCENT)
    * input.pressureAtm * temperatureFactor * input.mediumSolubilityFactor;
  const initialEquilibriumUm = dissolvedUmPerOxygenPercent * input.gasOxygenPercent;
  const gasMolarDensityUmolPerMl = input.pressureAtm * 1000 / (GAS_CONSTANT_L_ATM_PER_MOL_K * kelvin);
  const gasOxygenUmol = input.gasVolumeLiters * 1000 * gasMolarDensityUmolPerMl * (input.gasOxygenPercent / 100);
  const gasReservoirUm = gasOxygenUmol / volumeL;
  const initialUm = Math.min(initialEquilibriumUm, gasReservoirUm);
  const consumptionPmolPerMin = input.ocrPmolPerMinPer100k * (input.cellCount / 100000);
  const consumptionUmPerHour = (consumptionPmolPerMin * 60) / (volumeL * 1_000_000);
  const fluxMolPerCm2PerS = (consumptionPmolPerMin * 1e-12 / 60) / input.areaCm2;
  const diffusionDropUm = (fluxMolPerCm2PerS * heightCm / OXYGEN_DIFFUSION_CM2_PER_S) * 1e9;
  const diffusionCapacityPmolPerMin = OXYGEN_DIFFUSION_CM2_PER_S * (initialUm * 1e-9) / heightCm * input.areaCm2 * 1e12 * 60;
  return { volumeL, heightCm, dissolvedUmPerOxygenPercent, initialEquilibriumUm, gasMolarDensityUmolPerMl, gasOxygenUmol, gasReservoirUm, initialUm, consumptionPmolPerMin, consumptionUmPerHour, diffusionDropUm, diffusionCapacityPmolPerMin };
}

function validInput(input: SurfaceOxygenInputs) {
  return [input.areaCm2, input.volumeMl, input.gasVolumeLiters, input.gasOxygenPercent, input.cellCount, input.ocrPmolPerMinPer100k, input.timeHours, input.temperatureC + 273.15, input.pressureAtm, input.mediumSolubilityFactor].every(positive)
    && input.gasOxygenPercent <= 100;
}

export function estimateSurfaceOxygen(input: SurfaceOxygenInputs): SurfaceOxygenEstimate | null {
  if (!validInput(input)) return null;
  const terms = getPhysicalTerms(input);
  const consumedUm = terms.consumptionUmPerHour * input.timeHours;
  const remainingGasOxygenUmol = Math.max(0, terms.gasOxygenUmol - (consumedUm * terms.volumeL));
  const remainingGasOxygenPercent = terms.gasOxygenUmol > 0 ? input.gasOxygenPercent * remainingGasOxygenUmol / terms.gasOxygenUmol : 0;
  const equilibriumAtTimeUm = terms.dissolvedUmPerOxygenPercent * remainingGasOxygenPercent;
  const remainingGasOxygenUm = remainingGasOxygenUmol / terms.volumeL;
  const surfaceOxygenUm = Math.max(0, Math.min(equilibriumAtTimeUm, remainingGasOxygenUm) - terms.diffusionDropUm / 2);
  const initialMgPerL = (terms.initialUm / 1000) * OXYGEN_MOLAR_MASS_MG_PER_MMOL;
  const surfaceMgPerL = (surfaceOxygenUm / 1000) * OXYGEN_MOLAR_MASS_MG_PER_MMOL;
  const remainingFraction = terms.initialUm > 0 ? surfaceOxygenUm / terms.initialUm : 0;
  const surfaceOxygenPercent = terms.dissolvedUmPerOxygenPercent > 0 ? surfaceOxygenUm / terms.dissolvedUmPerOxygenPercent : 0;
  const diffusionLimited = terms.consumptionPmolPerMin > terms.diffusionCapacityPmolPerMin;
  const netConsumptionPmolPerMin = terms.consumptionPmolPerMin - terms.diffusionCapacityPmolPerMin;
  const hypoxiaOnsetHours = diffusionLimited ? Math.max(0, terms.initialUm * terms.volumeL * 1_000_000 / (netConsumptionPmolPerMin * 60)) : null;
  const status = surfaceOxygenUm <= 0 ? "depleted" : surfaceOxygenPercent < 5 ? "low" : "adequate";
  return { liquidHeightMm: terms.heightCm * 10, initialDissolvedOxygenMgPerL: initialMgPerL, initialDissolvedOxygenUm: terms.initialUm, consumedOxygenUm: consumedUm, diffusionDropUm: terms.diffusionDropUm, surfaceOxygenUm, surfaceOxygenMgPerL: surfaceMgPerL, surfaceOxygenPercent, remainingFraction, remainingGasOxygenPercent, consumptionPmolPerMin: terms.consumptionPmolPerMin, diffusionCapacityPmolPerMin: terms.diffusionCapacityPmolPerMin, diffusionLimited, hypoxiaOnsetHours, status };
}

function estimateTargetByUm(input: SurfaceOxygenInputs, targetSurfaceOxygenUm: number): SurfaceOxygenTarget | null {
  if (!validInput(input) || !positive(targetSurfaceOxygenUm)) return null;
  const terms = getPhysicalTerms(input);
  const targetSurfaceOxygenPercent = targetSurfaceOxygenUm / terms.dissolvedUmPerOxygenPercent;
  const consumedUm = terms.consumptionUmPerHour * input.timeHours;
  const requiredInitialUm = targetSurfaceOxygenUm + consumedUm + terms.diffusionDropUm / 2;
  const requiredGasVolumeLiters = volumeForGas(input, terms, requiredInitialUm);
  const requiredInputOxygenVolumeMl = requiredGasVolumeLiters * (input.gasOxygenPercent / 100);
  const currentSurfaceReserveUm = terms.initialUm - terms.diffusionDropUm / 2;
  const timeToTargetHours = currentSurfaceReserveUm > targetSurfaceOxygenUm && terms.consumptionUmPerHour > 0 ? (currentSurfaceReserveUm - targetSurfaceOxygenUm) / terms.consumptionUmPerHour : null;
  return { targetSurfaceOxygenPercent, targetSurfaceOxygenUm, requiredGasVolumeLiters, requiredInputOxygenVolumeMl, requiredInputOxygenVolumeMlCapped: Math.max(0, requiredInputOxygenVolumeMl), targetReachableWithInput: input.gasVolumeLiters >= requiredGasVolumeLiters, timeToTargetHours };
}

function volumeForGas(input: SurfaceOxygenInputs, terms: ReturnType<typeof getPhysicalTerms>, requiredInitialUm: number) {
  const requiredGasOxygenUmol = requiredInitialUm * terms.volumeL;
  const gasOxygenFraction = input.gasOxygenPercent / 100;
  const gasMolarDensityUmolPerL = terms.gasMolarDensityUmolPerMl * 1000;
  return requiredGasOxygenUmol / Math.max(gasOxygenFraction * gasMolarDensityUmolPerL, Number.EPSILON);
}

export function estimateRequiredInputOxygen(input: SurfaceOxygenInputs, targetSurfaceOxygenPercent: number): SurfaceOxygenTarget | null {
  if (!validInput(input) || !positive(targetSurfaceOxygenPercent) || targetSurfaceOxygenPercent > 100) return null;
  const terms = getPhysicalTerms(input);
  return estimateTargetByUm(input, terms.dissolvedUmPerOxygenPercent * targetSurfaceOxygenPercent);
}

export function estimateRequiredInputOxygenByConcentration(input: SurfaceOxygenInputs, targetSurfaceOxygenUm: number) {
  return estimateTargetByUm(input, targetSurfaceOxygenUm);
}

export function calculateMaintenanceOxygen(input: SurfaceOxygenInputs, maintenanceHours: number): SurfaceOxygenMaintenance | null {
  if (!validInput(input) || !positive(maintenanceHours)) return null;
  const terms = getPhysicalTerms(input);
  const consumedOxygenUm = terms.consumptionUmPerHour * maintenanceHours;
  const consumedOxygenUmol = consumedOxygenUm * terms.volumeL;
  const equivalentInputGasVolumeLiters = consumedOxygenUmol / Math.max((input.gasOxygenPercent / 100) * terms.gasMolarDensityUmolPerMl * 1000, Number.EPSILON);
  return { maintenanceHours, consumedOxygenUm, consumedOxygenMgPerL: (consumedOxygenUm / 1000) * OXYGEN_MOLAR_MASS_MG_PER_MMOL, consumedOxygenUmol, equivalentInputGasVolumeLiters, equivalentInputOxygenVolumeMl: equivalentInputGasVolumeLiters * 1000 };
}

export function buildOxygenTimeline(input: SurfaceOxygenInputs, target: SurfaceOxygenTarget | null, durationHours: number): SurfaceOxygenTimelinePoint[] {
  if (!target || !positive(durationHours)) return [];
  const terms = getPhysicalTerms(input);
  const targetHour = target.timeToTargetHours === null ? 0 : Math.max(0, Math.min(durationHours, target.timeToTargetHours));
  const maintenanceInterval = terms.consumptionUmPerHour > 0 ? Math.max(0.25, target.targetSurfaceOxygenUm / terms.consumptionUmPerHour) : durationHours;
  const points: SurfaceOxygenTimelinePoint[] = [
    { hour: 0, oxygenUm: Math.min(terms.dissolvedUmPerOxygenPercent * input.gasOxygenPercent, target.targetSurfaceOxygenUm + terms.consumptionUmPerHour * Math.max(0, durationHours - targetHour) + terms.diffusionDropUm / 2), label: "Nạp khí ban đầu" },
    { hour: targetHour, oxygenUm: target.targetSurfaceOxygenUm, label: "Đạt mục tiêu / bắt đầu duy trì" },
  ];
  for (let hour = targetHour + maintenanceInterval; hour < durationHours; hour += maintenanceInterval) points.push({ hour, oxygenUm: target.targetSurfaceOxygenUm, label: "Bổ sung khí duy trì" });
  points.push({ hour: durationHours, oxygenUm: target.targetSurfaceOxygenUm, label: "Kết thúc" });
  return points;
}

export function formatScientific(value: number) {
  return value.toExponential(2).replace("e+", " × 10^").replace("e-", " × 10^−");
}
