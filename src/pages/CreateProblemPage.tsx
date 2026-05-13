import { useState } from "react";
import type { CreateProblemInput, ProblemDifficulty, ProblemRecord } from "../../shared/types";

interface CreateProblemPageProps {
    onBack: () => void;
    onSubmit: (input: CreateProblemInput) => Promise<void>;
    editingProblem?: ProblemRecord;
}

const DIFFICULTY_OPTIONS: ProblemDifficulty[] = ["Facil", "Media", "Dificil"];

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Error desconocido";
}

export default function CreateProblemPage({ onBack, onSubmit, editingProblem }: CreateProblemPageProps) {
    const isEditing = editingProblem !== undefined;

    const [title, setTitle] = useState(editingProblem?.title ?? "");
    const [difficulty, setDifficulty] = useState<ProblemDifficulty>(editingProblem?.difficulty ?? "Media");
    const [topic, setTopic] = useState(editingProblem?.topic ?? "");
    const [statement, setStatement] = useState(editingProblem?.statement ?? "");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleSubmit(event: { preventDefault(): void }) {
        event.preventDefault();

        if (submitting) {
            return;
        }

        const payload: CreateProblemInput = {
            title: title.trim(),
            difficulty,
            topic: topic.trim(),
            statement: statement.trim(),
        };

        if (!payload.title || !payload.topic || !payload.statement) {
            setErrorMessage("Completa título, tema y enunciado antes de continuar.");
            return;
        }

        setErrorMessage(null);
        setSubmitting(true);

        try {
            await onSubmit(payload);
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="app-shell">
            <section className="create-problem-screen">
                <div className="create-problem-surface">
                    <header className="selector-header">
                        <div>
                            <p className="landing-kicker">{isEditing ? "Editar problema" : "Subir problema"}</p>
                            <h2>{isEditing ? "Modifica tu reto" : "Crea tu propio reto"}</h2>
                        </div>

                        <div className="selector-actions">
                            <button type="button" className="ghost-btn" onClick={onBack} disabled={submitting}>
                                Volver
                            </button>
                        </div>
                    </header>

                    <form className="create-problem-form" onSubmit={handleSubmit}>
                        <div className="create-problem-grid">
                            <label className="create-problem-field">
                                <span>Titulo</span>
                                <input
                                    className="create-problem-input"
                                    type="text"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    placeholder="Ejemplo: Reverse Linked List"
                                    disabled={submitting}
                                    maxLength={120}
                                />
                            </label>

                            <label className="create-problem-field">
                                <span>Tema</span>
                                <input
                                    className="create-problem-input"
                                    type="text"
                                    value={topic}
                                    onChange={(event) => setTopic(event.target.value)}
                                    placeholder="Ejemplo: Linked List"
                                    disabled={submitting}
                                    maxLength={80}
                                />
                            </label>

                            <label className="create-problem-field create-problem-field-full">
                                <span>Dificultad</span>
                                <select
                                    className="create-problem-select"
                                    value={difficulty}
                                    onChange={(event) => setDifficulty(event.target.value as ProblemDifficulty)}
                                    disabled={submitting}
                                >
                                    {DIFFICULTY_OPTIONS.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <label className="create-problem-field create-problem-field-full">
                            <span>Enunciado (Markdown)</span>
                            <textarea
                                className="create-problem-textarea"
                                value={statement}
                                onChange={(event) => setStatement(event.target.value)}
                                placeholder="Describe el problema, entradas/salidas, ejemplos y restricciones..."
                                disabled={submitting}
                                spellCheck={false}
                            />
                        </label>

                        {errorMessage && <p className="create-problem-error">{errorMessage}</p>}

                        <div className="create-problem-actions">
                            <button type="submit" disabled={submitting}>
                                {submitting
                                    ? isEditing ? "Guardando cambios..." : "Creando problema..."
                                    : isEditing ? "Guardar cambios" : "Crear problema"
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
