import { useMemo, useState } from "react";
import { calculateManualCellCount } from "@/lib/cellCalculations";
import { parseLocaleNumber } from "@/lib/numberInput";
type VesselSpec = {
    area?: number;
    minUl: number;
    maxUl: number | null;
    defaultUl: number;
    label: string;
};
const vessels: Record<string, VesselSpec> = {
    "giếng 6": { area: 9.5, minUl: 1000, maxUl: 3000, defaultUl: 2000, label: "Giếng 6-well" },
    "giếng 12": { area: 3.6, minUl: 750, maxUl: 1150, defaultUl: 1000, label: "Giếng 12-well" },
    "giếng 24": { area: 1.9, minUl: 300, maxUl: 600, defaultUl: 500, label: "Giếng 24-well" },
    "giếng 48": { area: 1.0, minUl: 200, maxUl: 500, defaultUl: 300, label: "Giếng 48-well" },
    "giếng 96": { area: 0.32, minUl: 100, maxUl: 200, defaultUl: 100, label: "Giếng 96-well" },
    "flask T25": { area: 25, minUl: 3000, maxUl: 7000, defaultUl: 5000, label: "Flask T25" },
    PDMS: { minUl: 1, maxUl: null, defaultUl: 1, label: "PDMS" },
};
type Vessel = keyof typeof vessels;
type ResultVolumeUnit = "mL" | "µL";
type DilutionMode = "factor" | "volumes";
export function SeedingCalculator() {
    const [targetPerUnit, setTargetPerUnit] = useState("100000");
    const [unitCount, setUnitCount] = useState("1");
    const [countedCells, setCountedCells] = useState("");
    const [countedSquares, setCountedSquares] = useState("4");
    const [solutionVolume, setSolutionVolume] = useState("1");
    const [mediumPerUnit, setMediumPerUnit] = useState("");
    const [dilutionFactor, setDilutionFactor] = useState("1.5");
    const [dilutionMode, setDilutionMode] = useState<DilutionMode>("factor");
    const [initialVolume, setInitialVolume] = useState("20");
    const [addedVolume, setAddedVolume] = useState("10");
    const [vessel, setVessel] = useState<Vessel>("giếng 96");
    const [resultVolumeUnit, setResultVolumeUnit] = useState<ResultVolumeUnit>("mL");
    const values = [targetPerUnit, unitCount, countedCells, countedSquares, solutionVolume, dilutionFactor, initialVolume, addedVolume].map(parseLocaleNumber);
    const result = useMemo(() => {
        const [target, count, counted, squares, volume, factor, initial, added] = values;
        const selectedVessel = vessels[vessel];
        const requestedMedium = parseLocaleNumber(mediumPerUnit);
        const mediumUl = Number.isFinite(requestedMedium) && requestedMedium > 0 ? requestedMedium : selectedVessel.defaultUl;
        const mediumMl = mediumUl / 1000;
        if (mediumUl < selectedVessel.minUl || (selectedVessel.maxUl !== null && mediumUl > selectedVessel.maxUl))
            return { invalidMedium: true as const, minUl: selectedVessel.minUl, maxUl: selectedVessel.maxUl };
        const effectiveFactor = dilutionMode === "factor" ? factor : (Number.isFinite(initial) && initial > 0 && Number.isFinite(added) && added >= 0 ? (initial + added) / initial : NaN);
        const totalCells = calculateManualCellCount(counted, squares, effectiveFactor, volume);
        if (!totalCells || !Number.isFinite(target) || target <= 0 || !Number.isFinite(count) || count <= 0)
            return null;
        const totalMediumMl = count * mediumMl;
        const cellsRequired = target * count;
        if (cellsRequired > totalCells)
            return { invalidMedium: false as const, insufficientCells: true as const };
        const cellSuspensionMl = cellsRequired / totalCells * volume;
        return { invalidMedium: false as const, insufficientCells: false as const, totalCells, cellsRequired, totalMediumMl, cellSuspensionMl, addedMediumMl: Math.max(0, totalMediumMl - cellSuspensionMl) };
    }, [targetPerUnit, unitCount, countedCells, countedSquares, solutionVolume, dilutionFactor, initialVolume, addedVolume, dilutionMode, vessel, mediumPerUnit]);
    const displayVolume = (valueMl: number) => valueMl * (resultVolumeUnit === "µL" ? 1000 : 1);
    const formatVolume = (valueMl: number) => displayVolume(valueMl).toLocaleString("vi-VN", { maximumFractionDigits: resultVolumeUnit === "µL" ? 2 : 4 });
    const field = (label: string, value: string, setValue: (value: string) => void, unit?: string, placeholder?: string) => <label className="field-label">{label}<span className="seeding-input"><input value={value} onChange={event => setValue(event.target.value)} inputMode="decimal" placeholder={placeholder}/>{unit && <b>{unit}</b>}</span></label>;
    const selectedVessel = vessels[vessel];
    const mediumRange = selectedVessel.maxUl === null ? `từ ${selectedVessel.minUl} µL` : `${selectedVessel.minUl}–${selectedVessel.maxUl} µL`;
    return <section className="content-panel seeding-calculator"><div className="panel-index">CELL GROUP / SEEDING</div><h2>Seeding</h2><p>Nhập số tế bào mục tiêu, số đơn vị nuôi và số tế bào đếm được để tính môi trường cần chuẩn bị.</p><div className="seeding-grid"><div className="result-toggle seeding-dilution-toggle"><span>Cách tính hệ số pha loãng</span><button type="button" className={dilutionMode === "factor" ? "active" : ""} onClick={() => setDilutionMode("factor")}>Dùng hệ số</button><button type="button" className={dilutionMode === "volumes" ? "active" : ""} onClick={() => setDilutionMode("volumes")}>Dùng thể tích</button></div>{field("Số tế bào mong muốn / giếng hoặc flask", targetPerUnit, setTargetPerUnit, "cell", "Ví dụ: 100000")}{field("Tổng số giếng / flask", unitCount, setUnitCount, "đơn vị", "Ví dụ: 6")}{field("Tổng số tế bào đếm được", countedCells, setCountedCells, "cell", "Nhập kết quả buồng đếm")}{field("Tổng số ô đã đếm", countedSquares, setCountedSquares, "ô", "Mặc định 4")}{field("Thể tích hiện có", solutionVolume, setSolutionVolume, "mL", "Mặc định 1")}<label className="field-label">Lượng môi trường / giếng hoặc flask<span className="seeding-input"><input value={mediumPerUnit} onChange={event => setMediumPerUnit(event.target.value)} inputMode="decimal" placeholder={`Mặc định ${selectedVessel.defaultUl} µL`}/><b>µL</b></span><small>Cho phép {mediumRange} · để trống dùng mặc định {selectedVessel.defaultUl} µL</small></label>{dilutionMode === "factor" ? field("Hệ số pha loãng", dilutionFactor, setDilutionFactor, "×", "Mặc định 1,5") : <>{field("Thể tích ban đầu", initialVolume, setInitialVolume, "µL", "Ví dụ: 20")}{field("Thể tích pha thêm", addedVolume, setAddedVolume, "µL", "Ví dụ: 10")}</>}<label className="field-label">Phân loại giếng / flask<select value={vessel} onChange={event => setVessel(event.target.value as Vessel)}>{Object.entries(vessels).map(([name, spec]) => <option key={name} value={name}>{spec.label}{spec.area ? ` · ${spec.area} cm²` : ""}</option>)}</select></label><div className="choice-field seeding-result-unit"><span>Đơn vị kết quả</span><div className="choice-options" role="group" aria-label="Đơn vị kết quả"><button type="button" className={resultVolumeUnit === "mL" ? "active" : ""} aria-pressed={resultVolumeUnit === "mL"} onClick={() => setResultVolumeUnit("mL")}>mL</button><button type="button" className={resultVolumeUnit === "µL" ? "active" : ""} aria-pressed={resultVolumeUnit === "µL"} onClick={() => setResultVolumeUnit("µL")}>µL (ul)</button></div><small>Áp dụng cho các kết quả thể tích bên dưới</small></div></div><div className="seeding-result">{result?.invalidMedium ? <p>Thể tích môi trường phải {result.maxUl === null ? `từ ${result.minUl} µL trở lên` : `nằm trong khoảng ${result.minUl}–${result.maxUl} µL`} cho loại giếng/flask đã chọn.</p> : result?.insufficientCells ? <p>Số tế bào mong muốn cao hơn số tế bào hiện có và không hợp lệ</p> : result ? <><div><small>TỔNG SỐ TẾ BÀO SAU KHI ĐẾM</small><strong>{result.totalCells.toLocaleString("vi-VN", { maximumSignificantDigits: 8 })} cell</strong></div><div><small>TỔNG MÔI TRƯỜNG</small><strong>{formatVolume(result.totalMediumMl)} {resultVolumeUnit}</strong></div><div><small>MÔI TRƯỜNG CÓ TẾ BÀO CẦN LẤY</small><strong>{formatVolume(result.cellSuspensionMl)} {resultVolumeUnit}</strong></div><div><small>MÔI TRƯỜNG NUÔI CẤY CẦN THÊM</small><strong>{formatVolume(result.addedMediumMl)} {resultVolumeUnit}</strong></div></> : <p>Nhập đủ các số liệu để xem kết quả.</p>}</div></section>;
}
