import { ProblemDefinition } from "../data/problems";

interface ProblemSelectorPageProps {
    problems: ProblemDefinition[];
    onBack: () => void;
    onSelect: (problem: ProblemDefinition) => void;
}

export default function ProblemSelectorPage({ problems, onBack, onSelect }: ProblemSelectorPageProps) {
    return (
        <div className="app-shell">
            <section className="selector-screen">
                <header className="selector-header">
                    <div>
                        <p className="landing-kicker">Seleccion de problema</p>
                        <h2>Elige un reto para trabajar</h2>
                    </div>

                    <div className="selector-actions">
                        <button type="button" className="ghost-btn" onClick={onBack}>
                            Volver
                        </button>
                        <button type="button" className="ghost-btn" disabled title="Lo activaremos en un PR posterior">
                            Subir problema (Proximamente)
                        </button>
                    </div>
                </header>

                <div className="problem-grid">
                    {problems.map((problem) => (
                        <article key={problem.id} className="problem-card">
                            <div className="problem-meta">
                                <span className="problem-difficulty">{problem.difficulty}</span>
                                <span>{problem.topic}</span>
                            </div>
                            <h3>{problem.title}</h3>
                            <p>{problem.statement}</p>
                            <button type="button" onClick={() => onSelect(problem)}>
                                Seleccionar
                            </button>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}
