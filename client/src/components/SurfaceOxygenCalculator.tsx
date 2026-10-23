import { useMemo, useState } from "react";
import {
  buildOxygenTimeline,
  calculateMaintenanceOxygen,
  estimateRequiredInputOxygen,
  estimateRequiredInputOxygenByConcentration,
  estimateSurfaceOxygen,
  SURFACE_OXYGEN_PRESETS,
  SURFACE_OXYGEN_SOLUBILITY_PRESETS,
  SURFACE_OXYGEN_VESSELS,
} from "@/lib/surfaceOxygenMath";
import { parseLocaleNumber } from "@/lib/numberInput";
import "./hypoxia.css";

const field = (label: string, value: string, onChange: (value: string) => void, unit: string, hint?: string) => (
  <label className="hypoxia-field">
    <span>{label}</span>
    <div className="hypoxia-input"><input type="text" inputMode="decimal" value={value} onChange={event => onChange(event.target.value)} /><b>{unit}</b></div>
    {hint && <small>{hint}</small>}
  </label>
);

const format = (value: number, digits = 2) => value.toLocaleString("vi-VN", { maximumFractionDigits: digits });

function OxygenTimelineChart({ points, duration }: { points: ReturnType<typeof buildOxygenTimeline>; duration: number }) {
  if (points.length < 2 || !Number.isFinite(duration) || duration <= 0) return null;
  const width = 720;
  const height = 230;
  const padX = 42;
  const padY = 28;
  const maxOxygen = Math.max(...points.map(point => point.oxygenUm), 1);
  const x = (hour: number) => padX + (hour / duration) * (width - padX * 2);
  const y = (oxygen: number) => height - padY - (oxygen / maxOxygen) * (height - padY * 2);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(point.hour).toFixed(1)},${y(point.oxygenUm).toFixed(1)}`).join(" ");

  return <div className="hypoxia-chart-wrap">
    <svg className="hypoxia-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ O2 theo thời gian">
      <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} className="hypoxia-chart-axis" />
      <line x1={padX} y1={padY} x2={padX} y2={height - padY} className="hypoxia-chart-axis" />
      <path d={path} className="hypoxia-chart-line" />
      {points.map((point, index) => <g key={`${point.hour}-${index}`}><circle cx={x(point.hour)} cy={y(point.oxygenUm)} r="4" className="hypoxia-chart-dot" /><text x={x(point.hour)} y={y(point.oxygenUm) - 9} textAnchor="middle" className="hypoxia-chart-label">{format(point.hour, 1)}h</text></g>)}
      <text x={width / 2} y={height - 5} textAnchor="middle" className="hypoxia-chart-caption">Thời gian nuôi (giờ)</text>
      <text x="12" y={height / 2} transform={`rotate(-90 12 ${height / 2})`} textAnchor="middle" className="hypoxia-chart-caption">O₂ hòa tan (µM)</text>
    </svg>
    <div className="hypoxia-chart-events">{points.filter(point => point.label).map((point, index) => <span key={`${point.label}-${index}`}><b>{format(point.hour, 1)} giờ</b> · {point.label}</span>)}</div>
  </div>;
}

export function SurfaceOxygenCalculator() {
  const [mode, setMode] = useState<"estimate" | "target">("estimate");
  const [reverseDriver, setReverseDriver] = useState<"time" | "oxygen">("time");
  const [targetUnit, setTargetUnit] = useState<"percent" | "um">("percent");
  const [vesselId, setVesselId] = useState("96");
  const vessel = SURFACE_OXYGEN_VESSELS.find(item => item.id === vesselId) ?? SURFACE_OXYGEN_VESSELS[0];
  const [volumeUl, setVolumeUl] = useState(String(vessel.defaultMl * 1000));
  const [oxygenVolumeMl, setOxygenVolumeMl] = useState("1");
  const [cells, setCells] = useState("100000");
  const [preset, setPreset] = useState("hsc-quiescent");
  const [ocr, setOcr] = useState("63.1");
  const [time, setTime] = useState("24");
  const [reverseOxygen, setReverseOxygen] = useState("1");
  const [targetOxygen, setTargetOxygen] = useState("5");
  const [maintenanceTime, setMaintenanceTime] = useState("");
  const [temperature, setTemperature] = useState("37");
  const [pressure, setPressure] = useState("1");
  const [solubilityMode, setSolubilityMode] = useState<"preset" | "custom">("preset");
  const [solubilityPreset, setSolubilityPreset] = useState("culture-medium");
  const [solubilityFactor, setSolubilityFactor] = useState("0.9");

  const selectedSolubility = SURFACE_OXYGEN_SOLUBILITY_PRESETS.find(item => item.id === solubilityPreset) ?? SURFACE_OXYGEN_SOLUBILITY_PRESETS[0];
  const effectiveSolubilityFactor = solubilityMode === "preset" ? selectedSolubility.factor : parseLocaleNumber(solubilityFactor);
  const baseInputs = useMemo(() => ({
    areaCm2: vessel.areaCm2,
    volumeMl: parseLocaleNumber(volumeUl) / 1000,
    oxygenVolumeMl: parseLocaleNumber(oxygenVolumeMl),
    cellCount: parseLocaleNumber(cells),
    ocrPmolPerMinPer100k: parseLocaleNumber(ocr),
    timeHours: parseLocaleNumber(time),
    temperatureC: parseLocaleNumber(temperature),
    pressureAtm: parseLocaleNumber(pressure),
    mediumSolubilityFactor: effectiveSolubilityFactor,
  }), [vessel, volumeUl, oxygenVolumeMl, cells, ocr, time, temperature, pressure, effectiveSolubilityFactor]);
  const estimate = useMemo(() => estimateSurfaceOxygen(baseInputs), [baseInputs]);
  const reverseInputs = useMemo(() => ({ ...baseInputs, timeHours: reverseDriver === "time" ? parseLocaleNumber(time) : 1, oxygenVolumeMl: reverseDriver === "oxygen" ? parseLocaleNumber(reverseOxygen) : parseLocaleNumber(oxygenVolumeMl) }), [baseInputs, reverseDriver, time, reverseOxygen, oxygenVolumeMl]);
  const targetValue = parseLocaleNumber(targetOxygen);
  const reverseTarget = useMemo(() => targetUnit === "percent" ? estimateRequiredInputOxygen(reverseInputs, targetValue) : estimateRequiredInputOxygenByConcentration(reverseInputs, targetValue), [reverseInputs, targetUnit, targetValue]);
  const maintenance = useMemo(() => calculateMaintenanceOxygen(reverseInputs, parseLocaleNumber(maintenanceTime)), [reverseInputs, maintenanceTime]);
  const volumeUlNumber = parseLocaleNumber(volumeUl);
  const volumeWarning = Number.isFinite(volumeUlNumber) && (volumeUlNumber < vessel.minMl * 1000 || volumeUlNumber > vessel.maxMl * 1000);
  const chartDuration = parseLocaleNumber(time);
  const timeline = useMemo(() => buildOxygenTimeline(reverseInputs, reverseTarget, chartDuration), [reverseInputs, reverseTarget, chartDuration]);
  const changeVessel = (id: string) => { setVesselId(id); const next = SURFACE_OXYGEN_VESSELS.find(item => item.id === id); if (next) setVolumeUl(String(next.defaultMl * 1000)); };
  const applyPreset = (id: string) => { setPreset(id); const next = SURFACE_OXYGEN_PRESETS.find(item => item.id === id); if (next) setOcr(String(next.ocrPmolPerMinPer100k)); };
  const maintenanceTargetLabel = targetUnit === "percent" ? `${format(targetValue, 2)}% O₂` : `${format(targetValue, 2)} µM O₂`;

  return <section className="hypoxia-tool" aria-label="Tính O2 tại bề mặt tế bào">
    <div className="hypoxia-heading"><span className="panel-index">HYPOXIA / CELL-SURFACE MODEL</span><h2>Tính O₂ tại bề mặt tế bào</h2><p>Ước tính O₂ hòa tan ở bề mặt tế bào từ dung tích O₂ nạp ban đầu, chiều cao lớp môi trường, OCR và thời gian nuôi. Đây là mô hình sàng lọc, không thay thế phép đo DO/pO₂ thực tế.</p></div>
    <div className="choice-options" role="tablist" aria-label="Chế độ tính O2"><button type="button" className={mode === "estimate" ? "active" : ""} onClick={() => setMode("estimate")}><strong>Tính O₂ bề mặt và % O₂ còn lại</strong><small>Dự tính theo thời gian nuôi</small></button><button type="button" className={mode === "target" ? "active" : ""} onClick={() => setMode("target")}><strong>Tính đầu vào cần dựa trên O₂ mục tiêu</strong><small>Nhập thời gian hoặc O₂ đầu vào</small></button></div>

    <div className="hypoxia-grid"><section className="content-panel hypoxia-panel"><h3>01 · Format nuôi cấy</h3><div className="hypoxia-fields"><label className="hypoxia-field"><span>Loại giếng / flask</span><select value={vesselId} onChange={event => changeVessel(event.target.value)}>{SURFACE_OXYGEN_VESSELS.map(item => <option key={item.id} value={item.id}>{item.label} · {item.areaCm2} cm²</option>)}</select></label>{field("Lượng môi trường", volumeUl, setVolumeUl, "µL", `Khuyến cáo ${vessel.minMl * 1000}–${vessel.maxMl * 1000} µL.`)}{field("Dung tích O₂ nạp ban đầu", oxygenVolumeMl, setOxygenVolumeMl, "mL", "Thể tích O₂ quy đổi ở cùng áp suất/nhiệt độ hệ thống; mọi phép tính dùng giá trị này.")}{field("Số tế bào", cells, setCells, "cell")}</div>{volumeWarning && <div className="hypoxia-warning"><strong>Lượng môi trường ngoài khoảng tham khảo</strong>Hãy kiểm tra lại format và lượng môi trường trước khi diễn giải kết quả.</div>}</section><section className="content-panel hypoxia-panel"><h3>02 · OCR và thời gian</h3><div className="hypoxia-fields"><label className="hypoxia-field"><span>Preset OCR</span><select value={preset} onChange={event => applyPreset(event.target.value)}>{SURFACE_OXYGEN_PRESETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{field("OCR", ocr, setOcr, "pmol/min/10⁵ cell", "Có thể thay bằng OCR đo trên chính mẫu.")}{mode === "estimate" ? field("Thời gian dự kiến", time, setTime, "giờ") : <><div className="hypoxia-field"><span>Chọn một thông số để nhập</span><div className="choice-options choice-options-compact"><button type="button" className={reverseDriver === "time" ? "active" : ""} onClick={() => setReverseDriver("time")}>Thời gian</button><button type="button" className={reverseDriver === "oxygen" ? "active" : ""} onClick={() => setReverseDriver("oxygen")}>O₂ đầu vào</button></div></div>{reverseDriver === "time" ? field("Thời gian dự kiến", time, setTime, "giờ") : <>{field("O₂ dự định nạp vào", reverseOxygen, setReverseOxygen, "mL")}{field("Thời gian dự kiến / thời lượng biểu đồ", time, setTime, "giờ")}</>}</>}</div><p className="hypoxia-sources">{SURFACE_OXYGEN_PRESETS.find(item => item.id === preset)?.source}</p></section></div>

    <section className="content-panel hypoxia-panel"><h3>03 · Điều kiện khí và hòa tan</h3><div className="hypoxia-fields">{field("Nhiệt độ", temperature, setTemperature, "°C")}{field("Áp suất tuyệt đối", pressure, setPressure, "atm")}<label className="hypoxia-field"><span>Hệ số hòa tan trong chất lỏng</span><div className="choice-options choice-options-compact"><button type="button" className={solubilityMode === "preset" ? "active" : ""} onClick={() => setSolubilityMode("preset")}>Dùng preset có nguồn</button><button type="button" className={solubilityMode === "custom" ? "active" : ""} onClick={() => setSolubilityMode("custom")}>Tự nhập</button></div></label>{solubilityMode === "preset" ? <label className="hypoxia-field"><span>Loại môi trường / chất lỏng</span><select value={solubilityPreset} onChange={event => setSolubilityPreset(event.target.value)}>{SURFACE_OXYGEN_SOLUBILITY_PRESETS.map(item => <option key={item.id} value={item.id}>{item.label} · ×{item.factor}</option>)}</select><small>{selectedSolubility.source}</small></label> : field("Hệ số hòa tan tự nhập", solubilityFactor, setSolubilityFactor, "×", "Nhập hệ số đã hiệu chuẩn bằng DO hoặc tài liệu đúng với môi trường.")}</div></section>

    {mode === "estimate" ? <section className="content-panel hypoxia-panel hypoxia-result" aria-live="polite"><span className="panel-index">SURFACE ESTIMATE / SCREENING ONLY</span>{estimate ? <><div className="hypoxia-metrics"><div><span>Chiều cao lớp môi trường</span><strong>{format(estimate.liquidHeightMm)} mm</strong></div><div><span>DO ban đầu ước tính</span><strong>{format(estimate.initialDissolvedOxygenMgPerL)} mg/L</strong></div><div><span>O₂ đã tiêu thụ</span><strong>{format(estimate.consumedOxygenUm)} µM</strong></div><div><span>Giảm do gradient khuếch tán</span><strong>{format(estimate.diffusionDropUm)} µM</strong></div></div><div className="hypoxia-time"><small>O₂ ƯỚC TÍNH TẠI BỀ MẶT TẾ BÀO</small><strong>{format(estimate.surfaceOxygenUm)} µM <span>≈ {format(estimate.surfaceOxygenMgPerL)} mg/L</span></strong><p>Ước tính còn lại: <b>{format(estimate.surfaceOxygenPercent, 2)}% theo mức bão hòa</b> tại bề mặt, tương đương {format(estimate.remainingFraction * 100, 1)}% so với DO ban đầu.</p></div><div className="hypoxia-alert"><strong>{estimate.diffusionLimited ? "Cảnh báo nguy cơ stress hypoxia" : "Khả năng khuếch tán đang cao hơn mức tiêu thụ"}</strong><span>{estimate.diffusionLimited ? `Có thể chạm ngưỡng nguy cơ sau khoảng ${estimate.hypoxiaOnsetHours === null ? "không xác định" : format(estimate.hypoxiaOnsetHours)} giờ.` : "Mô hình chưa dự báo tiêu thụ vượt khả năng khuếch tán; vẫn cần đo DO thực tế."}</span></div></> : <p>Nhập các giá trị dương hợp lệ để xem kết quả.</p>}</section> : <><section className="content-panel hypoxia-panel hypoxia-result" aria-live="polite"><span className="panel-index">REVERSE TARGET / SCREENING ONLY</span><div className="hypoxia-fields"><label className="hypoxia-field"><span>Mục tiêu tại bề mặt</span><div className="choice-options choice-options-compact"><button type="button" className={targetUnit === "percent" ? "active" : ""} onClick={() => setTargetUnit("percent")}>% O₂ bão hòa</button><button type="button" className={targetUnit === "um" ? "active" : ""} onClick={() => setTargetUnit("um")}>µM O₂</button></div></label>{field(targetUnit === "percent" ? "Mức O₂ mục tiêu" : "Nồng độ O₂ mục tiêu", targetOxygen, setTargetOxygen, targetUnit === "percent" ? "%" : "µM")}</div><div className="hypoxia-metrics"><div><span>Mục tiêu quy đổi</span><strong>{reverseTarget ? `${format(reverseTarget.targetSurfaceOxygenPercent, 2)}% / ${format(reverseTarget.targetSurfaceOxygenUm, 2)} µM` : "—"}</strong></div><div><span>O₂ đầu vào cần nạp</span><strong>{reverseTarget ? `${format(reverseTarget.requiredInputOxygenVolumeMl, 3)} mL` : "—"}</strong></div><div><span>{reverseDriver === "time" ? "Thời gian dự kiến" : "O₂ đầu vào đã chọn"}</span><strong>{reverseDriver === "time" ? `${format(parseLocaleNumber(time))} giờ` : `${format(parseLocaleNumber(reverseOxygen), 3)} mL`}</strong></div><div><span>Mức đầu vào hiện tại có đủ</span><strong>{reverseTarget ? reverseTarget.targetReachableWithInput ? "Có thể đạt" : "Chưa đủ" : "—"}</strong></div></div>{reverseTarget && !reverseTarget.targetReachableWithInput && <div className="hypoxia-warning"><strong>Dung tích O₂ đầu vào cần kiểm tra lại</strong>Kiểm tra thể tích O₂, thể tích môi trường, áp suất và OCR trước khi diễn giải.</div>}</section><section className="content-panel hypoxia-panel maintenance-panel"><h3>04 · Lịch O₂ theo thời gian và duy trì mục tiêu</h3><p>Nhập khoảng thời gian duy trì <b>{maintenanceTargetLabel}</b>. Biểu đồ thể hiện O₂ ban đầu, thời điểm đạt mục tiêu, thời điểm bắt đầu duy trì và chu kỳ bơm duy trì ước tính.</p>{field("Khoảng thời gian duy trì", maintenanceTime, setMaintenanceTime, "giờ", "Nếu để trống, biểu đồ dùng thời gian dự kiến ở trên.")}{maintenance ? <div className="hypoxia-metrics"><div><span>O₂ cần bù theo OCR</span><strong>{format(maintenance.consumedOxygenUm)} µM</strong></div><div><span>Tương đương khối lượng</span><strong>{format(maintenance.consumedOxygenMgPerL)} mg/L</strong></div><div><span>Tổng lượng O₂ hòa tan cần bù</span><strong>{format(maintenance.consumedOxygenUmol)} µmol</strong></div><div><span>O₂ khí tương đương cần bù</span><strong>{format(maintenance.equivalentInputOxygenVolumeMl, 3)} mL</strong></div></div> : <p className="hypoxia-sources">Nhập thời gian duy trì dương để tính lượng O₂ cần bù.</p>}{timeline.length > 1 && <OxygenTimelineChart points={timeline} duration={chartDuration} />}<div className="hypoxia-warning"><strong>Giới hạn của lịch duy trì</strong>Chu kỳ bơm trên biểu đồ là ước tính theo OCR không đổi. Muốn đổi thành thể tích khí hoặc thời gian bơm thực tế cần thêm lưu lượng, thể tích headspace, hiệu suất truyền khối và cấu hình hệ kín.</div></section></>}

    <div className="hypoxia-warning"><strong>Giới hạn an toàn của mô hình</strong>Kết quả dùng xấp xỉ 1D cho khuếch tán và OCR không đổi; chưa mô phỏng đối lưu, màng đáy, hình học thực tế, tăng sinh, pH, CO₂, binding của môi trường hoặc sai số preset. Không dùng kết quả để đặt lịch thay khí, kết luận thiếu oxy hay thay thế phép đo pO₂/DO tại vị trí tế bào.</div>
    <div className="hypoxia-sources">Nguồn: <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5699948/" target="_blank" rel="noreferrer">Place et al., giới hạn vận chuyển O₂</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6191109/" target="_blank" rel="noreferrer">Al-Ani et al., oxygenation cell culture</a> · <a href="https://www.ysi.com/file%20library/documents/technical%20notes/do-oxygen-solubility-table.pdf" target="_blank" rel="noreferrer">YSI, bảng độ hòa tan O₂</a>. Giá trị là tham khảo, cần xác nhận bằng dữ liệu phòng thí nghiệm.</div>
  </section>;
}
