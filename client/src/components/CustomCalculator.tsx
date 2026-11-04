import { useSessionState } from "@/contexts/SessionDraftContext";
import { ScientificField } from "@/components/toolbox/ScientificField";
import { CopyResultButton } from "@/components/toolbox/CopyResultButton";
import { useMemo, useState } from "react";
import "./special.css";
import { evaluateFormula, getFormulaVariables } from "@shared/formulaMath";
import { parseLocaleNumber } from "@/lib/numberInput";
export function CustomCalculator({ toolId, name, formula, description, config }: {
    toolId: string;
    name: string;
    formula: string;
    description: string;
    config?: unknown;
}) {
    const draftNamespace = `${toolId}:${name}:${formula}:${JSON.stringify(config ?? null)}`;
    const [values, setValues] = useSessionState<Record<string, string>>(`CustomCalculator:${draftNamespace}:values`, {});
    const [lastResult, setLastResult] = useSessionState<number | null>(`CustomCalculator:${draftNamespace}:lastResult`, null);
    const [error, setError] = useSessionState<string | null>(`CustomCalculator:${draftNamespace}:error`, null);
    const units = config && typeof config === "object" ? config as {
        inputUnits?: Record<string, string>;
        outputUnit?: string;
        variables?: {
            key: string;
            label: string;
            unit: string;
        }[];
    } : {};
    const variables = useMemo(() => {
        try {
            return getFormulaVariables(formula);
        }
        catch (cause) {
            return cause instanceof Error ? cause.message : "Công thức không hợp lệ.";
        }
    }, [formula]);
    const [attempted, setAttempted] = useState(false);
    const run = () => {
        setAttempted(true);
        if (typeof variables === "string")
            return setError(variables);
        try {
            const input = Object.fromEntries(variables.map(variable => [variable, values[variable]?.trim() ? parseLocaleNumber(values[variable]) : NaN]));
            const result = evaluateFormula(formula, input);
            setLastResult(result);
            setError(null);
        }
        catch (cause) {
            setLastResult(null);
            setError(cause instanceof Error ? cause.message : "Không thể tính công thức này.");
        }
    };
    return <section className="content-panel custom-calculator"><span className="panel-index">CUSTOM FORMULA / LIVE CALCULATOR</span><h2>{name}</h2><p>{description}</p><code>{formula}</code>{typeof variables === "string" ? <p className="custom-error">{variables}. Tạo tool mới với tên biến không dấu để tính trực tiếp.</p> : <><div className="custom-fields">{variables.map(variable => { const item = units.variables?.find(candidate => candidate.key === variable); return <ScientificField showErrors={attempted} key={variable} label={item?.label || variable} help="Giá trị đầu vào theo công thức" unit={item?.unit || units.inputUnits?.[variable] || ""} value={values[variable] ?? ""} onChange={value => { setValues(current => ({ ...current, [variable]: value })); setLastResult(null); setError(null); }} />; })}</div><button className="primary-cta custom-run" onClick={run}>Tính kết quả</button>{error && <p className="custom-error" role="alert">{error}</p>}{lastResult !== null && <div className="custom-answer" aria-live="polite">Kết quả: <strong>{new Intl.NumberFormat("vi-VN", { maximumSignificantDigits: 8 }).format(lastResult)} {units.outputUnit ?? ""}</strong><CopyResultButton text={`${name}: ${new Intl.NumberFormat("vi-VN", { maximumSignificantDigits: 8 }).format(lastResult)} ${units.outputUnit ?? ""}`} /></div>}<p className="custom-unit-note">Dấu “,” hoặc “.” đều được hiểu là dấu thập phân; không dùng dấu chấm để phân cách hàng nghìn.</p></>}</section>;
}
