import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useTranslation } from "../i18n/LanguageContext";

interface ProblemPanelProps {
    title: string;
    functionName: string | null;
    value: string;
    onHide: () => void;
}

export default function ProblemPanel({ title, functionName, value, onHide }: ProblemPanelProps) {
    const { translate } = useTranslation();
    const ariaLabel = translate("problem.ariaLabel");

    return (
        <section className="problem-panel" aria-label={ariaLabel}>
            <header className="problem-panel-header">
                <div className="problem-panel-header-top">
                    <h2 className="problem-panel-title">{title}</h2>
                    <button type="button" className="panel-toggle-btn" onClick={onHide}>{translate("problem.hide")}</button>
                </div>
                {functionName ? (
                    <p className="problem-panel-function">
                        {translate("problem.functionName")} <code>{functionName}</code>
                    </p>
                ) : null}
            </header>

            <article className="problem-markdown" aria-label={ariaLabel}>
                {value.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {value}
                    </ReactMarkdown>
                ) : (
                    <p className="problem-markdown-empty">{translate("problem.empty")}</p>
                )}
            </article>
        </section>
    );
}
