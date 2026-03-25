interface ProblemPanelProps {
    title: string;
    value: string;
    onChange: (value: string) => void;
    onHide: () => void;
}

export default function ProblemPanel({ title, value, onChange, onHide }: ProblemPanelProps) {
    return (
        <section className="problem-panel" aria-label="Enunciado del problema">
            <header className="problem-panel-header">
                <div className="problem-panel-header-top">
                    <h2 className="problem-panel-title">{title}</h2>
                    <button type="button" className="panel-toggle-btn" onClick={onHide}>Ocultar</button>
                </div>
                <p>Enunciado editable guardado en tu navegador para esta sesion de trabajo.</p>
            </header>

            <textarea
                className="problem-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Escribe o pega aqui el enunciado, restricciones, ejemplos y pistas del problema..."
                spellCheck={false}
            />
        </section>
    );
}
