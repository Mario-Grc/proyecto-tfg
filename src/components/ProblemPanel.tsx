interface ProblemPanelProps {
    value: string;
    onChange: (value: string) => void;
    onHide: () => void;
}

export default function ProblemPanel({ value, onChange, onHide }: ProblemPanelProps) {
    return (
        <section className="problem-panel" aria-label="Enunciado del problema">
            <header className="problem-panel-header">
                <div className="problem-panel-header-top">
                    <h3>Enunciado</h3>
                    <button type="button" className="panel-toggle-btn" onClick={onHide}>Ocultar</button>
                </div>
                <p>Este texto se guarda en tu navegador y sirve como referencia durante la sesion.</p>
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
