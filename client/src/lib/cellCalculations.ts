export type CellUnit = "cell" | "cell/mL" | "cell/giếng" | "cell/flask";
export type VolumeUnit = "L" | "mL" | "µL";
export const volumeToMl = (value: number, unit: VolumeUnit) => unit === "L" ? value * 1000 : unit === "µL" ? value / 1000 : value;
const positive = (value: number) => Number.isFinite(value) && value > 0;
export function calculateManualCellCount(averageCells: number, countedSquares: number, dilutionFactor: number, solutionVolumeMl = 1): number | null {
    if (![averageCells, countedSquares, dilutionFactor, solutionVolumeMl].every(positive))
        return null;
    return (averageCells / countedSquares) * dilutionFactor * 10000 * solutionVolumeMl;
}
export function calculateCellsNeeded(target: number, unit: CellUnit, count: number, volumePerUnit: number, volumeUnit: VolumeUnit): number | null {
    if (!positive(target))
        return null;
    if (unit === "cell")
        return target;
    if (!positive(count))
        return null;
    if (unit === "cell/mL") {
        if (!positive(volumePerUnit))
            return null;
        return target * count * volumeToMl(volumePerUnit, volumeUnit);
    }
    return target * count;
}
export function calculateVolumeToTake(desiredCells: number, availableAmount: number, availableUnit: CellUnit, totalVolume: number, volumeUnit: VolumeUnit, availableUnits: number): number | null {
    if (![desiredCells, availableAmount, totalVolume].every(positive))
        return null;
    let totalCells = availableAmount;
    if (availableUnit === "cell/mL")
        totalCells *= volumeToMl(totalVolume, volumeUnit);
    if (availableUnit === "cell/giếng" || availableUnit === "cell/flask") {
        if (!positive(availableUnits))
            return null;
        totalCells *= availableUnits;
    }
    if (desiredCells > totalCells)
        return null;
    return desiredCells / totalCells * totalVolume;
}
