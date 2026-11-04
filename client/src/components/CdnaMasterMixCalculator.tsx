import { CopyResultRegion } from "@/components/toolbox/CopyResultRegion";
import { NumericTableInput } from "@/components/toolbox/NumericTableInput";
import { ScientificField } from "@/components/toolbox/ScientificField";
import { useSessionState, useSessionDraftPresent } from "@/contexts/SessionDraftContext";
import { useEffect, useMemo } from "react";
import { FlaskConical, Info, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseLocaleNumber } from "@/lib/numberInput";
import { toast } from "sonner";
type SampleRow = {
    id: number;
    symbol: string;
    concentration: string;
    od260280: string;
    od260230: string;
};
const DEFAULT_SAMPLE_INFO = [
    ["N", "Tế bào CFSC nontreat"],
    ["C", "Tế bào CFSC treat sirna đối chứng"],
    ["E", "Tế bào CFSC treat sirna E2F1"],
    ["0", "TB HSC ngày 7 nontreat"],
    ["5", "TB HSC ngày 7 treat LPS 5 ng/ml"],
] as const;
const initialRows: SampleRow[] = [
    { id: 1, symbol: "N", concentration: "105", od260280: "", od260230: "" },
    { id: 2, symbol: "C", concentration: "202", od260280: "", od260230: "" },
    { id: 3, symbol: "E", concentration: "302", od260280: "", od260230: "" },
    { id: 4, symbol: "0", concentration: "1420", od260280: "", od260230: "" },
    { id: 5, symbol: "5", concentration: "1101", od260280: "", od260230: "" },
    { id: 6, symbol: "", concentration: "", od260280: "", od260230: "" },
    { id: 7, symbol: "", concentration: "", od260280: "", od260230: "" },
    { id: 8, symbol: "", concentration: "", od260280: "", od260230: "" },
    { id: 9, symbol: "", concentration: "", od260280: "", od260230: "" },
];
const number = (value: string) => {
    const parsed = parseLocaleNumber(value);
    return Number.isFinite(parsed) ? parsed : null;
};
const format = (value: number | null, digits = 2) => value === null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(value);
export function CdnaMasterMixCalculator({ userId }: {
    userId?: number;
}) {
    const [reactionVolume, setReactionVolume] = useSessionState("CdnaMasterMixCalculator:reactionVolume", "20");
    const [targetRna, setTargetRna] = useSessionState("CdnaMasterMixCalculator:targetRna", "1500");
    const [totalSamples, setTotalSamples] = useSessionState("CdnaMasterMixCalculator:totalSamples", "23");
    const [vMax, setVMax] = useSessionState("CdnaMasterMixCalculator:vMax", "100");
    const [minConcentration, setMinConcentration] = useSessionState("CdnaMasterMixCalculator:minConcentration", "5");
    const [rows, setRows] = useSessionState<SampleRow[]>("CdnaMasterMixCalculator:rows", initialRows);
    const [sampleInfo, setSampleInfo] = useSessionState<Record<string, string>>("CdnaMasterMixCalculator:sampleInfo", () => Object.fromEntries(DEFAULT_SAMPLE_INFO));
    const storageKey = `rebiomed-master-mix-cdna-v3-${userId ?? "guest"}`;
    const resumedSession = useSessionDraftPresent("CdnaMasterMixCalculator:reactionVolume");
    useEffect(() => { if (resumedSession) return; try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw)
            return;
        const saved = JSON.parse(raw) as {
            savedAt?: number;
            data?: {
                reactionVolume?: string;
                targetRna?: string;
                totalSamples?: string;
                vMax?: string;
                minConcentration?: string;
                rows?: SampleRow[];
                sampleInfo?: Record<string, string>;
            };
        };
        if (!saved.savedAt || Date.now() - saved.savedAt > 10 * 60 * 60 * 1000) {
            window.localStorage.removeItem(storageKey);
            return;
        }
        const data = saved.data;
        if (!data)
            return;
        if (typeof data.reactionVolume === "string")
            setReactionVolume(data.reactionVolume);
        if (typeof data.targetRna === "string")
            setTargetRna(data.targetRna);
        if (typeof data.totalSamples === "string")
            setTotalSamples(data.totalSamples);
        if (typeof data.vMax === "string")
            setVMax(data.vMax);
        if (typeof data.minConcentration === "string")
            setMinConcentration(data.minConcentration);
        if (Array.isArray(data.rows) && data.rows.every(row => row && typeof row.id === "number" && typeof row.symbol === "string" && typeof row.concentration === "string" && typeof row.od260280 === "string" && typeof row.od260230 === "string"))
            setRows(data.rows);
        if (data.sampleInfo && typeof data.sampleInfo === "object" && !Array.isArray(data.sampleInfo) && Object.values(data.sampleInfo).every(value => typeof value === "string"))
            setSampleInfo({ ...Object.fromEntries(DEFAULT_SAMPLE_INFO), ...data.sampleInfo });
    }
    catch { } }, [storageKey, resumedSession]);
    const saveTemporary = (section: "sample" | "reaction") => { try {
        window.localStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), data: { reactionVolume, targetRna, totalSamples, vMax, minConcentration, rows, sampleInfo } }));
        toast.success(section === "sample" ? "Đã lưu tạm thông tin mẫu trong 10 giờ." : "Đã lưu tạm thông tin phản ứng trong 10 giờ.");
    }
    catch {
        toast.error("Không thể lưu tạm trên thiết bị này.");
    } };
    const result = useMemo(() => {
        const reaction = number(reactionVolume);
        const target = number(targetRna);
        const samples = number(totalSamples);
        const maxVolume = number(vMax);
        const minConcentrationValue = number(minConcentration);
        if (reaction === null || target === null || samples === null || maxVolume === null || minConcentrationValue === null || reaction <= 0 || target <= 0 || samples < 0 || maxVolume <= 0 || minConcentrationValue < 0)
            return null;
        const mixPerReaction = 5;
        const mixTotal = samples * 1.1;
        const rowResults = rows.map(row => {
            const concentration = number(row.concentration);
            const rnaVolume = concentration !== null && concentration > 0 ? target / concentration : null;
            const water = rnaVolume === null ? null : reaction - mixPerReaction - rnaVolume;
            const belowMin = concentration !== null && concentration > 0 && concentration < minConcentrationValue;
            const invalidVolume = rnaVolume !== null && (rnaVolume > maxVolume || water === null || water < 0);
            return { ...row, concentrationValue: concentration, rnaVolume, water, belowMin, invalidVolume };
        });
        const invalidRows = rowResults.filter(row => row.rnaVolume !== null && (row.belowMin || row.invalidVolume));
        return { reaction, target, samples, maxVolume, minConcentration: minConcentrationValue, mixTotal, sensiFast: 4 * mixTotal, rtase: 1 * mixTotal, totalMix: 5 * mixTotal, rowResults, invalidRows };
    }, [reactionVolume, targetRna, totalSamples, vMax, minConcentration, rows]);
    const updateRow = (id: number, patch: Partial<SampleRow>) => setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
    const addSample = () => setRows(current => [...current, { id: Math.max(0, ...current.map(row => row.id)) + 1, symbol: "", concentration: "", od260280: "", od260230: "" }]);
    const reset = () => { setReactionVolume("20"); setTargetRna("1500"); setTotalSamples("23"); setVMax("100"); setMinConcentration("5"); setRows(initialRows.map(row => ({ ...row }))); setSampleInfo(Object.fromEntries(DEFAULT_SAMPLE_INFO)); };
    const clearTemporary = () => { if (!window.confirm("Xoá bản lưu tạm và đặt Master Mix cDNA về mặc định?"))
        return; try {
        window.localStorage.removeItem(storageKey);
    }
    catch { } reset(); toast.success("Đã xoá bản lưu tạm và khôi phục mặc định."); };
    const display = result ?? { reaction: 20, target: 1500, samples: 23, maxVolume: 100, minConcentration: number(minConcentration) ?? 5, mixTotal: 25.3, sensiFast: 101.2, rtase: 25.3, totalMix: 126.5, rowResults: [] as Array<SampleRow & {
            concentrationValue: number | null;
            rnaVolume: number | null;
            water: number | null;
            belowMin: boolean;
            invalidVolume: boolean;
        }>, invalidRows: [] as Array<SampleRow & {
            concentrationValue: number | null;
            rnaVolume: number | null;
            water: number | null;
            belowMin: boolean;
            invalidVolume: boolean;
        }> };
    return <section className="cdna-master-mix">
    <div className="content-panel cdna-hero"><div><span className="panel-index">CHEMISTRY WORKBENCH / MASTER MIX</span><h2>Master Mix cDNA</h2><p>Tính lượng RNA, DEPC và master mix cho phản ứng cDNA theo SensiFAST™ cDNA Synthesis Kit.</p></div><div className="cdna-kit-badge"><FlaskConical size={20}/><span><strong>SensiFAST™ cDNA Synthesis Kit</strong><small>BIO-65054</small></span></div></div>
    <div className="content-panel cdna-settings"><div className="panel-heading"><div><span className="panel-index">INPUT / MÀU XANH</span><h3>Thông số phản ứng</h3></div><Button variant="outline" onClick={reset}><RotateCcw size={14}/> Đặt lại</Button></div><div className="cdna-settings-grid">
      <ScientificField label="Thể tích phản ứng" value={reactionVolume} onChange={setReactionVolume} unit="µL / phản ứng" help="µL / phản ứng" exclusiveMinimum={0}/>
      <ScientificField label="RNA tiêu chuẩn" value={targetRna} onChange={setTargetRna} unit="ng / phản ứng" help="ng / phản ứng · khuyến nghị 1000–1500 ng" exclusiveMinimum={0}/>
      <ScientificField label="Tổng số mẫu" value={totalSamples} onChange={setTotalSamples} unit="mẫu" help="Phản ứng cần pha master mix" minimum={0}/>
      <ScientificField label="V max" value={vMax} onChange={setVMax} unit="µL" help="µL" exclusiveMinimum={0}/>
      <ScientificField label="Conc. Min" value={minConcentration} onChange={setMinConcentration} unit="ng/µL" help="ng/µL" minimum={0}/>
    </div>{result === null && <div className="chemical-warning"><Info size={15}/> Nhập các thông số phản ứng hợp lệ để xem kết quả.</div>}{display.invalidRows.length > 0 && <div className="chemical-warning"><Info size={15}/> Có {display.invalidRows.length} mẫu cần kiểm tra: nồng độ phải ≥ Conc. Min, thể tích RNA không được vượt V max và DEPC không được âm.</div>}</div>

    <div className="cdna-two-column">
      <section className="content-panel cdna-sample-panel"><div className="panel-heading"><div><span className="panel-index">SAMPLE INFORMATION</span><h3>Thông tin mẫu</h3></div><div className="master-mix-panel-actions"><span className="stock-summary">{display.rowResults.filter(row => row.rnaVolume !== null && !row.belowMin && !row.invalidVolume).length}/{rows.length} mẫu</span><Button variant="outline" onClick={() => saveTemporary("sample")}><Save size={14}/> Lưu tạm</Button><Button variant="outline" onClick={clearTemporary}><Trash2 size={14}/> Xoá bản lưu tạm</Button></div></div><div className="chemical-table-wrap"><table className="chemical-table cdna-table"><thead><tr><th>STT</th><th>Kí hiệu mẫu RNA</th><th>Nồng độ (ng/µL)</th><th>OD260/280</th><th>OD260/230</th><th>V cần hút (µL)</th></tr></thead><tbody>{rows.map((row, index) => { const calculated = display.rowResults[index]; return <tr key={row.id}><td>{index + 1}</td><td><Input aria-label={`Kí hiệu mẫu dòng ${row.id}`} className="cdna-cell-input" value={row.symbol} onChange={event => updateRow(row.id, { symbol: event.target.value })} placeholder="—"/></td><td><NumericTableInput label={`Nồng độ RNA ng/µL, mẫu ${row.symbol || row.id}`} className="cdna-cell-input" value={row.concentration} onChange={value => updateRow(row.id, { concentration: value })} optional exclusiveMinimum={0} placeholder="—" /></td><td><NumericTableInput label={`OD 260/280, mẫu ${row.symbol || row.id}`} className="cdna-cell-input" value={row.od260280} onChange={value => updateRow(row.id, { od260280: value })} optional placeholder="—" /></td><td><NumericTableInput label={`OD 260/230, mẫu ${row.symbol || row.id}`} className="cdna-cell-input" value={row.od260230} onChange={value => updateRow(row.id, { od260230: value })} optional placeholder="—" /></td><td className={`chemical-amount ${calculated?.belowMin || calculated?.invalidVolume ? "cdna-invalid" : ""}`}>{calculated?.belowMin || calculated?.invalidVolume ? "Kiểm tra" : format(calculated?.rnaVolume ?? null)}</td></tr>; })}</tbody></table></div></section>
      <section className="content-panel cdna-info-panel"><div className="panel-heading"><div><span className="panel-index">SAMPLE KEY</span><h3>Thông tin mẫu chi tiết</h3></div><div className="master-mix-panel-actions"><Button variant="outline" onClick={addSample}><Plus size={14}/> Thêm mẫu</Button><Button variant="outline" onClick={() => saveTemporary("sample")}><Save size={14}/> Lưu tạm</Button><Button variant="outline" onClick={clearTemporary}><Trash2 size={14}/> Xoá bản lưu tạm</Button></div></div><div className="cdna-key-columns"><span>Kí hiệu mẫu</span><span>Thông tin mẫu</span></div><div className="cdna-key-list">{rows.map(row => <div key={row.id}><Input aria-label={`Kí hiệu mẫu dòng ${row.id}`} className="cdna-cell-input" value={row.symbol} onChange={event => updateRow(row.id, { symbol: event.target.value })} placeholder="Kí hiệu" /><Input value={sampleInfo[row.symbol] ?? sampleInfo[initialRows.find(item => item.id === row.id)?.symbol ?? String(row.id)] ?? sampleInfo[String(row.id)] ?? ""} onChange={event => setSampleInfo(current => ({ ...current, [row.symbol || String(row.id)]: event.target.value }))} placeholder="Thông tin mẫu" aria-label={`Thông tin mẫu ${row.id}`}/></div>)}</div></section>
    </div>

    <CopyResultRegion label="Master Mix cDNA" available={result !== null} hideUnavailable><section className="content-panel cdna-reaction-panel"><div className="panel-heading"><div><span className="panel-index">REACTION / {display.reaction} µL</span><h3>Thành phần phản ứng</h3></div><span className="chemical-scale">RNA mục tiêu: {format(display.target)} ng</span></div><div className="chemical-table-wrap"><table className="chemical-table cdna-reaction-table"><thead><tr><th>Thành phần</th><th>Thể tích / phản ứng (µL)</th><th>Ghi chú</th></tr></thead><tbody><tr><td><strong>DEPC water</strong></td><td className="chemical-amount">đến {format(display.reaction)} µL</td><td>Bổ sung sau khi trừ các thành phần còn lại và RNA</td></tr><tr><td><strong>5x SensiFAST</strong></td><td className="chemical-amount">4</td><td>Buffer phản ứng</td></tr><tr><td><strong>RTase enzyme</strong></td><td className="chemical-amount">1</td><td>Reverse transcriptase</td></tr><tr><td><strong>RNA</strong></td><td className="chemical-amount">Theo từng mẫu</td><td>{format(display.target)} ng / phản ứng</td></tr><tr><td><strong>Tổng</strong></td><td className="chemical-amount">{format(display.reaction)}</td><td>Phản ứng cDNA tiêu chuẩn</td></tr></tbody></table></div></section></CopyResultRegion>

    <CopyResultRegion label="Master Mix cDNA" available={result !== null} hideUnavailable><section className="content-panel cdna-mix-panel"><div className="panel-heading"><div><span className="panel-index">MASTER MIX / {format(display.samples)} REACTIONS + 10%</span><h3>Pha mix khi từ 3 mẫu trở lên</h3></div><span className="stock-summary">Hệ số dự phòng × 1,1</span></div><div className="chemical-table-wrap"><table className="chemical-table cdna-mix-table"><thead><tr><th>Mix 1 (5X)</th><th>V (µL)</th><th>Mẫu</th><th>Mix 1 (µL)</th><th>DEPC (µL)</th><th>RNA (µL)</th></tr></thead><tbody><tr><td><strong>5x SensiFAST</strong></td><td className="chemical-amount">{format(display.sensiFast, 1)}</td><td rowSpan={3}>{display.rowResults.some(row => row.rnaVolume !== null && !row.belowMin && !row.invalidVolume) ? display.rowResults.filter(row => row.rnaVolume !== null && !row.belowMin && !row.invalidVolume).map(row => row.symbol || `Mẫu ${row.id}`).filter((symbol, index, all) => symbol && all.indexOf(symbol) === index).join(", ") : "N, C, E, 0, 5"}</td><td rowSpan={3}>5</td><td rowSpan={3}>Theo mẫu</td><td rowSpan={3}>Theo mẫu</td></tr><tr><td><strong>RTase enzyme</strong></td><td className="chemical-amount">{format(display.rtase, 1)}</td></tr><tr><td><strong>Tổng</strong></td><td className="chemical-amount">{format(display.totalMix, 1)}</td></tr></tbody></table></div><div className="chemical-table-wrap cdna-per-sample-wrap"><table className="chemical-table cdna-per-sample-table"><thead><tr><th>Mẫu</th><th>Mix 1 (µL)</th><th>DEPC (µL)</th><th>RNA (µL)</th><th>Tổng (µL)</th></tr></thead><tbody>{display.rowResults.filter(row => row.rnaVolume !== null && !row.belowMin && !row.invalidVolume).map(row => <tr key={`mix-${row.id}`}><td><strong>{row.symbol || `Mẫu ${row.id}`}</strong></td><td className="chemical-amount">5</td><td>{format(row.water)}</td><td>{format(row.rnaVolume)}</td><td>{format(display.reaction)}</td></tr>)}</tbody></table></div></section></CopyResultRegion>
  </section>;
}
