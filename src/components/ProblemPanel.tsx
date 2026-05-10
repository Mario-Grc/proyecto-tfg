import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface ProblemPanelProps {
    title: string;
    value: string;
    onHide: () => void;
}

export default function ProblemPanel({ title, value, onHide }: ProblemPanelProps) {
    return (
        <section className="problem-panel" aria-label="Enunciado del problema">
            <header className="problem-panel-header">
                <div className="problem-panel-header-top">
                    <h2 className="problem-panel-title">{title}</h2>
                    <button type="button" className="panel-toggle-btn" onClick={onHide}>Ocultar</button>
                </div>
            </header>

            <article className="problem-markdown" aria-label="Enunciado del problema">
                {value.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {value}
                    </ReactMarkdown>
                ) : (
                    <p className="problem-markdown-empty">No hay enunciado cargado.</p>
                )}
            </article>
        </section>
    );
}
