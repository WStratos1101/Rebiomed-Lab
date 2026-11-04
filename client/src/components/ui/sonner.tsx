import { useTheme } from "@/contexts/ThemeContext";
import { Toaster as Sonner, type ToasterProps } from "sonner";
const Toaster = ({ ...props }: ToasterProps) => {
    const { theme } = useTheme();
    return (<Sonner theme={theme as ToasterProps["theme"]} className="toaster group" style={{
            "--normal-bg": "var(--white)",
            "--normal-text": "var(--ink)",
            "--normal-border": "var(--line)",
        } as React.CSSProperties} {...props}/>);
};
export { Toaster };
