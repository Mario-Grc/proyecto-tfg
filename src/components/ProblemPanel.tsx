import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface ProblemPanelProps {
    title: string;
    value: string;
    onChange: (value: string) => void;
    onHide: () => void;
}

export default function ProblemPanel({ title, value, onChange, onHide }: ProblemPanelProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draftValue, setDraftValue] = useState(value);

    useEffect(() => {
        if (!isEditing) {
            setDraftValue(value);
        }
    }, [value, isEditing]);

    function startEditing() {
        setDraftValue(value);
        setIsEditing(true);
    }

    function cancelEditing() {
        setDraftValue(value);
        setIsEditing(false);
    }

    function saveEditing() {
        onChange(draftValue);
        setIsEditing(false);
    }

    return (
        <section className="problem-panel" aria-label="Enunciado del problema">
            <header className="problem-panel-header">
                <div className="problem-panel-header-top">
                    <h2 className="problem-panel-title">{title}</h2>

                    <div className="problem-panel-actions">
                        {isEditing ? (
                            <>
                                <button type="button" className="panel-toggle-btn problem-save-btn" onClick={saveEditing}>Guardar</button>
                                <button type="button" className="panel-toggle-btn" onClick={cancelEditing}>Cancelar</button>
                            </>
                        ) : (
                            <button type="button" className="panel-toggle-btn" onClick={startEditing}>Editar</button>
                        )}
                        <button type="button" className="panel-toggle-btn" onClick={onHide}>Ocultar</button>
                    </div>
                </div>
                <p>
                    {isEditing
                        ? "Modo edicion activado. Los cambios se guardan al pulsar Guardar."
                        : "Vista previa Markdown activa. Pulsa Editar para modificar el enunciado."}
                </p>
            </header>

            {isEditing ? (
                <textarea
                    className="problem-textarea"
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    placeholder="Escribe o pega aquí el enunciado en Markdown (títulos, listas, ejemplos, tablas, código)..."
                    spellCheck={false}
                />
            ) : (
                <article className="problem-markdown" aria-label="Vista previa del enunciado en Markdown">
                    {value.trim() ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                            {value}
                        </ReactMarkdown>
                    ) : (
                        <p className="problem-markdown-empty">No hay enunciado cargado.</p>
                    )}
                </article>
            )}
        </section>
    );
}
