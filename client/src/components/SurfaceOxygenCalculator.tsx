import { useMemo, useState } from "react";
import { estimateSurfaceOxygen, SURFACE_OXYGEN_PRESETS, SURFACE_OXYGEN_VESSELS } from "@/lib/surfaceOxygenMath";
import { parseLocaleNumber } from "@/lib/numberInput";
import "./hypoxia.css";

const field = (label: string, value: string, onChange: (value: string) => void, unit: string, hint?: string) => (
  <label className="hypoxia-field"><span>{label}</span><div className="hypoxia-input"><input type="text" inputMode="decimal" value={value} onChange={event => onChange(event.target.value)} /><b>{unit}</b></div>{hint && <small>{hint}</small>}</label>
);

export function SurfaceOxygenCalculator() {
  const [vesselId, setVesselId] = useState("96");
  const vessel = SURFACE_OXYGEN_VESSELS.find(item => item.id === vesselId) ?? SURFACE_OXYGEN_VESSELS[0];
  const [volume, setVolume] = useState(String(vessel.defaultMl));
  const [cells, setCells] = useState("100000");
  const [preset, setPreset] = useState("hsc-quiescent");
  const [ocr, setOcr] = useState("63.1");
  const [time, setTime] = useState("24");
  const [temperature, setTemperature] = useState("37");
  const [pressure, setPressure] = useState("1");
  const [oxygen, setOxygen] = useState("19");
  const [solubilityFactor, setSolubilityFactor] = useState("0.9");
  const estimate = useMemo(() => estimateSurfaceOxygen({ areaCm2: vessel.areaCm2, volumeMl: parseLocaleNumber(volume), cellCount: parseLocaleNumber(cells), ocrPmolPerMinPer100k: parseLocaleNumber(ocr), timeHours: parseLocaleNumber(time), temperatureC: parseLocaleNumber(temperature), pressureAtm: parseLocaleNumber(pressure), oxygenPercent: parseLocaleNumber(oxygen), mediumSolubilityFactor: parseLocaleNumber(solubilityFactor) }), [vessel, volume, cells, ocr, time, temperature, pressure, oxygen, solubilityFactor]);
  const changeVessel = (id: string) => { setVesselId(id); const next = SURFACE_OXYGEN_VESSELS.find(item => item.id === id); if (next) setVolume(String(next.defaultMl)); };
  const applyPreset = (id: string) => { setPreset(id); const next = SURFACE_OXYGEN_PRESETS.find(item => item.id === id); if (next) setOcr(String(next.ocrPmolPerMinPer100k)); };
  const volumeWarning = Number.isFinite(parseLocaleNumber(volume)) && (parseLocaleNumber(volume) < vessel.minMl || parseLocaleNumber(volume) > vessel.maxMl);
  return <section className="hypoxia-tool" aria-label="Tính O2 tại bề mặt tế bào">
    <div className="hypoxia-heading"><span className="panel-index">HYPOXIA / CELL-SURFACE MODEL</span><h2>Tính O₂ tại bề mặt tế bào</h2><p>Ước tính O₂ hòa tan ở bề mặt tế bào từ chiều cao lớp môi trường, OCR và thời gian nuôi. Đây là mô hình sàng lọc, không thay thế phép đo DO/pO₂ thực tế.</p></div>
    <div className="hypoxia-grid">
      <section className="content-panel hypoxia-panel"><h3>01 · Format nuôi cấy</h3><div className="hypoxia-fields"><label className="hypoxia-field"><span>Loại giếng / flask</span><select value={vesselId} onChange={event => changeVessel(event.target.value)}>{SURFACE_OXYGEN_VESSELS.map(item => <option key={item.id} value={item.id}>{item.label} · {item.areaCm2} cm²</option>)}</select></label>{field("Lượng môi trường", volume, setVolume, "mL", `Khuyến cáo ${vessel.minMl}–${vessel.maxMl} mL; chiều cao được suy ra từ diện tích.`)}{field("Số tế bào", cells, setCells, "cell")}</div>{volumeWarning && <div className="hypoxia-warning"><strong>Lượng môi trường ngoài khoảng tham khảo</strong>Hãy kiểm tra lại format và lượng môi trường trước khi diễn giải kết quả.</div>}</section>
      <section className="content-panel hypoxia-panel"><h3>02 · OCR và thời gian</h3><div className="hypoxia-fields"><label className="hypoxia-field"><span>Preset OCR</span><select value={preset} onChange={event => applyPreset(event.target.value)}>{SURFACE_OXYGEN_PRESETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{field("OCR", ocr, setOcr, "pmol/min/10⁵ cell", "Có thể thay bằng OCR đo trên chính mẫu.")}{field("Thời gian dự kiến", time, setTime, "giờ")}</div><p className="hypoxia-sources">{SURFACE_OXYGEN_PRESETS.find(item => item.id === preset)?.source}</p></section>
    </div>
    <section className="content-panel hypoxia-panel"><h3>03 · Điều kiện khí và độ hòa tan</h3><div className="hypoxia-fields">{field("Nhiệt độ", temperature, setTemperature, "°C")}{field("Áp suất tuyệt đối", pressure, setPressure, "atm")}{field("O₂ ban đầu", oxygen, setOxygen, "%", "Tỉ lệ O₂ ở pha khí tiếp xúc môi trường.")}{field("Hệ số hòa tan môi trường", solubilityFactor, setSolubilityFactor, "×", "Mặc định 0,90 để phản ánh môi trường nuôi; nên hiệu chuẩn bằng DO thực tế.")}</div></section>
    <section className="content-panel hypoxia-panel hypoxia-result" aria-live="polite"><span className="panel-index">SURFACE ESTIMATE / SCREENING ONLY</span>{estimate ? <><div className="hypoxia-metrics"><div><span>Chiều cao lớp môi trường</span><strong>{estimate.liquidHeightMm.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} mm</strong></div><div><span>DO ban đầu ước tính</span><strong>{estimate.initialDissolvedOxygenMgPerL.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} mg/L</strong></div><div><span>O₂ đã tiêu thụ trong thời gian chọn</span><strong>{estimate.consumedOxygenUm.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} µM</strong></div><div><span>Giảm do gradient khuếch tán</span><strong>{estimate.diffusionDropUm.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} µM</strong></div></div><div className="hypoxia-time"><small>O₂ ƯỚC TÍNH TẠI BỀ MẶT TẾ BÀO</small><strong>{estimate.surfaceOxygenUm.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} µM <span>≈ {estimate.surfaceOxygenMgPerL.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} mg/L</span></strong><p>{estimate.status === "depleted" ? "Mô hình cho kết quả cạn O₂; không được suy ra rằng tế bào chắc chắn đã chết. Cần đo thực tế ngay." : estimate.status === "low" ? "Mức ước tính thấp; cần kiểm tra bằng đầu dò O₂/DO và đánh giá độc lập." : `Còn khoảng ${(estimate.remainingFraction * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% so với DO ban đầu theo mô hình.`}</p></div></> : <p>Nhập các giá trị dương hợp lệ để xem kết quả.</p>}</section>
    <div className="hypoxia-warning"><strong>Giới hạn an toàn của mô hình</strong>Kết quả dùng xấp xỉ 1D cho khuếch tán và OCR không đổi; chưa mô phỏng trao đổi khí, đối lưu, màng đáy, hình học thực tế, tăng sinh, pH, CO₂, binding của môi trường hoặc sai số preset. Không dùng kết quả để đặt lịch thay khí, kết luận thiếu oxy hay thay thế phép đo pO₂/DO tại vị trí tế bào.</div>
    <div className="hypoxia-sources">Nguồn: <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5699948/" target="_blank" rel="noreferrer">Place et al., giới hạn vận chuyển O₂</a> · <a href="https://www.mdpi.com/2073-4409/9/11/2456" target="_blank" rel="noreferrer">Smith-Cortinez et al., OCR HSC</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3147247/" target="_blank" rel="noreferrer">Wagner et al., OCR HepG2</a>. Giá trị là tham khảo, cần xác nhận bằng dữ liệu phòng thí nghiệm.</div>
  </section>;
}
