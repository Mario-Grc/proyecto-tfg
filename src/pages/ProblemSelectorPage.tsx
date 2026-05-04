import type { ProblemRecord } from "../../shared/types";

interface ProblemSelectorPageProps {
    problems: ProblemRecord[];
    loading: boolean;
    errorMessage: string | null;
    onRetry: () => void;
    onBack: () => void;
    onUploadProblem: () => void;
    onSelect: (problem: ProblemRecord) => void;
}

export default function ProblemSelectorPage({
    problems,
    loading,
    errorMessage,
    onRetry,
    onBack,
    onUploadProblem,
    onSelect,
}: ProblemSelectorPageProps) {
    return (
        <div className="app-shell">
            <section className="selector-screen">
                <div className="selector-surface">
                    <header className="selector-header">
                        <div>
                            <p className="landing-kicker">Seleccion de problema</p>
                            <h2>Elige un reto para trabajar</h2>
                        </div>

                        <div className="selector-actions">
                            <button type="button" className="ghost-btn" onClick={onBack}>
                                Volver
                            </button>
                            <button type="button" className="ghost-btn" onClick={onUploadProblem}>
                                Subir problema
                            </button>
                        </div>
                    </header>

                    <div className="problem-grid">
                        {loading && <p>Cargando problemas...</p>}

                        {!loading && errorMessage && (
                            <article className="problem-card">
                                <div className="problem-main">
                                    <h3>No se pudo cargar el catalogo</h3>
                                    <p>{errorMessage}</p>
                                </div>
                                <button type="button" onClick={onRetry}>
                                    Reintentar
                                </button>
                            </article>
                        )}

                        {!loading && !errorMessage && problems.length === 0 && (
                            <p>No hay problemas disponibles en el backend.</p>
                        )}

                        {!loading && !errorMessage && problems.map((problem) => (
                            <article key={problem.id} className="problem-card">
                                <div className="problem-main">
                                    <h3>{problem.title}</h3>
                                    <div className="problem-meta">
                                        <span className={`problem-difficulty difficulty-${problem.difficulty.toLowerCase()}`}>
                                            {problem.difficulty}
                                        </span>
                                        {problem.source === "user" && <span className="problem-source-badge">Tu problema</span>}
                                        <span>{problem.topic}</span>
                                    </div>
                                </div>
                                <button type="button" onClick={() => onSelect(problem)}>
                                    Seleccionar
                                </button>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
