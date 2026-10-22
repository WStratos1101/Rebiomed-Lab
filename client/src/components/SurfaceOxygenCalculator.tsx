import { useMemo, useState } from "react";
import { calculateMaintenanceOxygen, estimateRequiredInputOxygen, estimateRequiredInputOxygenByConcentration, estimateSurfaceOxygen, SURFACE_OXYGEN_PRESETS, SURFACE_OXYGEN_VESSELS } from "@/lib/surfaceOxygenMath";
import { parseLocaleNumber } from "@/lib/numberInput";
import "./hypoxia.css";

const field = (label: string, value: string, onChange: (value: string) => void, unit: string, hint?: string, disabled = false) => (
  <label className="hypoxia-field"><span>{label}</span><div className="hypoxia-input"><input type="text" inputMode="decimal" value={value} onChange={event => onChange(event.target.value)} disabled={disabled} /><b>{unit}</b></div>{hint && <small>{hint}</small>}</label>
);
const format = (value: number, digits = 2) => value.toLocaleString("vi-VN", { maximumFractionDigits: digits });

export function SurfaceOxygenCalculator() {
  const [mode, setMode] = useState<"estimate" | "target">("estimate");
  const [reverseDriver, setReverseDriver] = useState<"time" | "oxygen">("time");
  const [targetUnit, setTargetUnit] = useState<"percent" | "um">("percent");
  const [vesselId, setVesselId] = useState("96");
  const vessel = SURFACE_OXYGEN_VESSELS.find(item => item.id === vesselId) ?? SURFACE_OXYGEN_VESSELS[0];
  const [volumeUl, setVolumeUl] = useState(String(vessel.defaultMl * 1000));
  const [cells, setCells] = useState("100000");
  const [preset, setPreset] = useState("hsc-quiescent");
  const [ocr, setOcr] = useState("63.1");
  const [time, setTime] = useState("24");
  const [reverseOxygen, setReverseOxygen] = useState("19");
  const [targetOxygen, setTargetOxygen] = useState("5");
  const [maintenanceTime, setMaintenanceTime] = useState("");
  const [temperature, setTemperature] = useState("37");
  const [pressure, setPressure] = useState("1");
  const [oxygen, setOxygen] = useState("19");
  const [solubilityFactor, setSolubilityFactor] = useState("0.9");

  const baseInputs = useMemo(() => ({
    areaCm2: vessel.areaCm2,
    volumeMl: parseLocaleNumber(volumeUl) / 1000,
    cellCount: parseLocaleNumber(cells),
    ocrPmolPerMinPer100k: parseLocaleNumber(ocr),
    timeHours: parseLocaleNumber(time),
    temperatureC: parseLocaleNumber(temperature),
    pressureAtm: parseLocaleNumber(pressure),
    oxygenPercent: parseLocaleNumber(oxygen),
    mediumSolubilityFactor: parseLocaleNumber(solubilityFactor),
  }), [vessel, volumeUl, cells, ocr, time, temperature, pressure, oxygen, solubilityFactor]);
  const estimate = useMemo(() => estimateSurfaceOxygen(baseInputs), [baseInputs]);
  const reverseInputs = useMemo(() => ({ ...baseInputs, timeHours: reverseDriver === "time" ? parseLocaleNumber(time) : 1, oxygenPercent: reverseDriver === "oxygen" ? parseLocaleNumber(reverseOxygen) : parseLocaleNumber(oxygen) }), [baseInputs, reverseDriver, time, reverseOxygen, oxygen]);
  const targetValue = parseLocaleNumber(targetOxygen);
  const reverseTarget = useMemo(() => targetUnit === "percent" ? estimateRequiredInputOxygen(reverseInputs, targetValue) : estimateRequiredInputOxygenByConcentration(reverseInputs, targetValue), [reverseInputs, targetUnit, targetValue]);
  const maintenance = useMemo(() => calculateMaintenanceOxygen(reverseInputs, parseLocaleNumber(maintenanceTime)), [reverseInputs, maintenanceTime]);
  const changeVessel = (id: string) => { setVesselId(id); const next = SURFACE_OXYGEN_VESSELS.find(item => item.id === id); if (next) setVolumeUl(String(next.defaultMl * 1000)); };
  const applyPreset = (id: string) => { setPreset(id); const next = SURFACE_OXYGEN_PRESETS.find(item => item.id === id); if (next) setOcr(String(next.ocrPmolPerMinPer100k)); };
  const volumeUlNumber = parseLocaleNumber(volumeUl);
  const volumeWarning = Number.isFinite(volumeUlNumber) && (volumeUlNumber < vessel.minMl * 1000 || volumeUlNumber > vessel.maxMl * 1000);
  const maintenanceTargetLabel = targetUnit === "percent" ? `${format(targetValue, 2)}% O₂` : `${format(targetValue, 2)} µM O₂`;

  return <section className="hypoxia-tool" aria-label="Tính O2 tại bề mặt tế bào">
    <div className="hypoxia-heading"><span className="panel-index">HYPOXIA / CELL-SURFACE MODEL</span><h2>Tính O₂ tại bề mặt tế bào</h2><p>Ước tính O₂ hòa tan ở bề mặt tế bào từ chiều cao lớp môi trường, OCR và thời gian nuôi. Đây là mô hình sàng lọc, không thay thế phép đo DO/pO₂ thực tế.</p></div>
    <div className="choice-options" role="tablist" aria-label="Chế độ tính O2"><button type="button" className={mode === "estimate" ? "active" : ""} onClick={() => setMode("estimate")}><strong>Ước tính theo thời gian</strong><small>Tính O₂ bề mặt và % O₂ còn lại</small></button><button type="button" className={mode === "target" ? "active" : ""} onClick={() => setMode("target")}><strong>Tính ngược theo mục tiêu</strong><small>Nhập thời gian hoặc O₂ đầu vào</small></button></div>

    <div className="hypoxia-grid"><section className="content-panel hypoxia-panel"><h3>01 · Format nuôi cấy</h3><div className="hypoxia-fields"><label className="hypoxia-field"><span>Loại giếng / flask</span><select value={vesselId} onChange={event => changeVessel(event.target.value)}>{SURFACE_OXYGEN_VESSELS.map(item => <option key={item.id} value={item.id}>{item.label} · {item.areaCm2} cm²</option>)}</select></label>{field("Lượng môi trường", volumeUl, setVolumeUl, "µL", `Khuyến cáo ${vessel.minMl * 1000}–${vessel.maxMl * 1000} µL; chiều cao được suy ra từ diện tích.`)}{field("Số tế bào", cells, setCells, "cell")}</div>{volumeWarning && <div className="hypoxia-warning"><strong>Lượng môi trường ngoài khoảng tham khảo</strong>Hãy kiểm tra lại format và lượng môi trường trước khi diễn giải kết quả.</div>}</section><section className="content-panel hypoxia-panel"><h3>02 · OCR và thời gian</h3><div className="hypoxia-fields"><label className="hypoxia-field"><span>Preset OCR</span><select value={preset} onChange={event => applyPreset(event.target.value)}>{SURFACE_OXYGEN_PRESETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{field("OCR", ocr, setOcr, "pmol/min/10⁵ cell", "Có thể thay bằng OCR đo trên chính mẫu.")}{mode === "estimate" ? field("Thời gian dự kiến", time, setTime, "giờ") : <><div className="hypoxia-field"><span>Chọn một thông số để nhập</span><div className="choice-options choice-options-compact"><button type="button" className={reverseDriver === "time" ? "active" : ""} onClick={() => setReverseDriver("time")}>Thời gian</button><button type="button" className={reverseDriver === "oxygen" ? "active" : ""} onClick={() => setReverseDriver("oxygen")}>O₂ bơm vào</button></div></div>{reverseDriver === "time" ? field("Thời gian dự kiến", time, setTime, "giờ", "Tool sẽ tính O₂ đầu vào cần bơm.") : field("O₂ dự định bơm vào", reverseOxygen, setReverseOxygen, "%", "Tool sẽ tính thời gian đến mức O₂ mục tiêu.")}</>}</div><p className="hypoxia-sources">{SURFACE_OXYGEN_PRESETS.find(item => item.id === preset)?.source}</p></section></div>

    <section className="content-panel hypoxia-panel"><h3>03 · Điều kiện khí và độ hòa tan</h3><div className="hypoxia-fields">{field("Nhiệt độ", temperature, setTemperature, "°C")}{field("Áp suất tuyệt đối", pressure, setPressure, "atm")}{field("O₂ ban đầu", oxygen, setOxygen, "%", "Tỉ lệ O₂ ở pha khí tiếp xúc môi trường.")}{field("Hệ số hòa tan môi trường", solubilityFactor, setSolubilityFactor, "×", "Mặc định 0,90; nên hiệu chuẩn bằng DO thực tế.")}</div></section>

    {mode === "estimate" ? <section className="content-panel hypoxia-panel hypoxia-result" aria-live="polite"><span className="panel-index">SURFACE ESTIMATE / SCREENING ONLY</span>{estimate ? <><div className="hypoxia-metrics"><div><span>Chiều cao lớp môi trường</span><strong>{format(estimate.liquidHeightMm)} mm</strong></div><div><span>DO ban đầu ước tính</span><strong>{format(estimate.initialDissolvedOxygenMgPerL)} mg/L</strong></div><div><span>O₂ đã tiêu thụ</span><strong>{format(estimate.consumedOxygenUm)} µM</strong></div><div><span>Giảm do gradient khuếch tán</span><strong>{format(estimate.diffusionDropUm)} µM</strong></div></div><div className="hypoxia-time"><small>O₂ ƯỚC TÍNH TẠI BỀ MẶT TẾ BÀO</small><strong>{format(estimate.surfaceOxygenUm)} µM <span>≈ {format(estimate.surfaceOxygenMgPerL)} mg/L</span></strong><p>Ước tính còn lại: <b>{format(estimate.surfaceOxygenPercent, 2)}% O₂</b> tại bề mặt, tương đương {format(estimate.remainingFraction * 100, 1)}% so với mức ban đầu.</p></div><div className="hypoxia-alert"><strong>{estimate.diffusionLimited ? "Cảnh báo nguy cơ stress hypoxia" : "Khả năng khuếch tán đang cao hơn mức tiêu thụ"}</strong><span>{estimate.diffusionLimited ? `Có thể chạm ngưỡng nguy cơ sau khoảng ${estimate.hypoxiaOnsetHours === null ? "không xác định" : format(estimate.hypoxiaOnsetHours)} giờ.` : "Mô hình chưa dự báo tiêu thụ vượt khả năng khuếch tán; vẫn cần đo DO thực tế."}</span></div></> : <p>Nhập các giá trị dương hợp lệ để xem kết quả.</p>}</section> : <><section className="content-panel hypoxia-panel hypoxia-result" aria-live="polite"><span className="panel-index">REVERSE TARGET / SCREENING ONLY</span><div className="hypoxia-fields"><label className="hypoxia-field"><span>Mục tiêu tại bề mặt</span><div className="choice-options choice-options-compact"><button type="button" className={targetUnit === "percent" ? "active" : ""} onClick={() => setTargetUnit("percent")}>% O₂</button><button type="button" className={targetUnit === "um" ? "active" : ""} onClick={() => setTargetUnit("um")}>µM O₂</button></div></label>{field(targetUnit === "percent" ? "Mức O₂ mục tiêu" : "Nồng độ O₂ mục tiêu", targetOxygen, setTargetOxygen, targetUnit === "percent" ? "%" : "µM")}</div><div className="hypoxia-metrics"><div><span>Mục tiêu quy đổi</span><strong>{reverseTarget ? `${format(reverseTarget.targetSurfaceOxygenPercent, 2)}% / ${format(reverseTarget.targetSurfaceOxygenUm, 2)} µM` : "—"}</strong></div><div><span>{reverseDriver === "time" ? "O₂ đầu vào cần bơm" : "Thời gian đến mục tiêu"}</span><strong>{reverseTarget ? (reverseDriver === "time" ? `${format(reverseTarget.requiredInputOxygenPercent, 2)}%` : reverseTarget.timeToTargetHours === null ? "—" : `${format(reverseTarget.timeToTargetHours)} giờ`) : "—"}</strong></div><div><span>{reverseDriver === "time" ? "Thời gian dự kiến" : "O₂ đầu vào đã chọn"}</span><strong>{reverseDriver === "time" ? `${format(parseLocaleNumber(time))} giờ` : `${format(parseLocaleNumber(reverseOxygen))}%`}</strong></div><div><span>Khả năng trong giới hạn 100%</span><strong>{reverseTarget ? reverseTarget.targetReachableWithAirInput ? "Có" : "Không" : "—"}</strong></div></div>{reverseTarget && !reverseTarget.targetReachableWithAirInput && <div className="hypoxia-warning"><strong>Mức O₂ đầu vào cần thiết vượt 100%</strong>Giảm mục tiêu, giảm thời gian, giảm mật độ tế bào hoặc kiểm tra lại OCR/format nuôi cấy.</div>}</section><section className="content-panel hypoxia-panel maintenance-panel"><h3>04 · Duy trì mức O₂ mục tiêu</h3><p>Nhập khoảng thời gian cần duy trì <b>{maintenanceTargetLabel}</b> tại bề mặt. Tool tính lượng O₂ tương đương bị tiêu thụ cần được bù trong khoảng thời gian đó.</p>{field("Khoảng thời gian duy trì", maintenanceTime, setMaintenanceTime, "giờ", "Chỉ nhập khoảng thời gian cần bù O₂.")}{maintenance ? <div className="hypoxia-metrics"><div><span>O₂ cần bù</span><strong>{format(maintenance.consumedOxygenUm)} µM</strong></div><div><span>Tương đương khối lượng</span><strong>{format(maintenance.consumedOxygenMgPerL)} mg/L</strong></div><div><span>Tổng lượng O₂ hòa tan cần bù</span><strong>{format(maintenance.consumedOxygenUmol)} µmol</strong></div><div><span>O₂ đầu vào tương đương</span><strong>{format(maintenance.equivalentInputOxygenPercent, 2)}%</strong></div></div> : <p className="hypoxia-sources">Nhập thời gian duy trì dương để tính lượng O₂ cần bù.</p>}<div className="hypoxia-warning"><strong>Giới hạn của phép tính duy trì</strong>Đây là lượng O₂ tương đương theo OCR. Muốn đổi thành thể tích khí hoặc thời gian bơm cần thêm lưu lượng, thể tích headspace, hiệu suất truyền khối và cấu hình hệ kín.</div></section></>}

    <div className="hypoxia-warning"><strong>Giới hạn an toàn của mô hình</strong>Kết quả dùng xấp xỉ 1D cho khuếch tán và OCR không đổi; chưa mô phỏng đối lưu, màng đáy, hình học thực tế, tăng sinh, pH, CO₂, binding của môi trường hoặc sai số preset. Không dùng kết quả để đặt lịch thay khí, kết luận thiếu oxy hay thay thế phép đo pO₂/DO tại vị trí tế bào.</div>
    <div className="hypoxia-sources">Nguồn: <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5699948/" target="_blank" rel="noreferrer">Place et al., giới hạn vận chuyển O₂</a> · <a href="https://www.mdpi.com/2073-4409/9/11/2456" target="_blank" rel="noreferrer">Smith-Cortinez et al., OCR HSC</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3147247/" target="_blank" rel="noreferrer">Wagner et al., OCR HepG2</a>. Giá trị là tham khảo, cần xác nhận bằng dữ liệu phòng thí nghiệm.</div>
  </section>;
}
