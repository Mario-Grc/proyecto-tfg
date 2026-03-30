import { useEffect, useState } from "react";

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
                        : "Enunciado bloqueado. Pulsa Editar para modificarlo."}
                </p>
            </header>

            <textarea
                className="problem-textarea"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                placeholder="Escribe o pega aqui el enunciado, restricciones, ejemplos y pistas del problema..."
                spellCheck={false}
                readOnly={!isEditing}
            />
        </section>
    );
}
