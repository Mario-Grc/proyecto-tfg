import { useState } from "react";
import type { CreateProblemInput, ProblemDifficulty, ProblemRecord } from "../../shared/types";
import LanguageToggle from "../components/LanguageToggle";
import { useTranslation } from "../i18n/LanguageContext";

interface CreateProblemPageProps {
    onBack: () => void;
    onSubmit: (input: CreateProblemInput) => Promise<void>;
    editingProblem?: ProblemRecord;
}

const DIFFICULTY_OPTIONS: ProblemDifficulty[] = ["Facil", "Media", "Dificil"];

const TEST_CASES_PLACEHOLDER =
    `[\n  { "input": [2, 7], "expected": 9 },\n  { "input": [1, 3], "expected": 4 }\n]`;

export default function CreateProblemPage({ onBack, onSubmit, editingProblem }: CreateProblemPageProps) {
    const { translate } = useTranslation();
    const isEditing = editingProblem !== undefined;

    function getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : translate("create.error.unknown");
    }

    const [title, setTitle] = useState(editingProblem?.title ?? "");
    const [difficulty, setDifficulty] = useState<ProblemDifficulty>(editingProblem?.difficulty ?? "Media");
    const [topic, setTopic] = useState(editingProblem?.topic ?? "");
    const [statement, setStatement] = useState(editingProblem?.statement ?? "");
    const [functionName, setFunctionName] = useState(editingProblem?.functionName ?? "");
    const [testCasesRaw, setTestCasesRaw] = useState(
        editingProblem?.testCases
            ? JSON.stringify(JSON.parse(editingProblem.testCases), null, 2)
            : "",
    );
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleSubmit(event: { preventDefault(): void }) {
        event.preventDefault();

        if (submitting) return;

        if (!title.trim() || !topic.trim() || !statement.trim()) {
            setErrorMessage(translate("create.error.requiredFields"));
            return;
        }

        let parsedTestCases: string | null = null;
        const rawTrimmed = testCasesRaw.trim();

        if (rawTrimmed) {
            if (!functionName.trim()) {
                setErrorMessage(translate("create.error.functionNeeded"));
                return;
            }

            try {
                const parsed = JSON.parse(rawTrimmed) as unknown;
                if (!Array.isArray(parsed) || parsed.length === 0) {
                    setErrorMessage(translate("create.error.testsNotArray"));
                    return;
                }
                for (const item of parsed) {
                    const c = item as { input?: unknown; expected?: unknown };
                    if (!Array.isArray(c.input) || !("expected" in c)) {
                        setErrorMessage(translate("create.error.caseShape"));
                        return;
                    }
                }
                parsedTestCases = JSON.stringify(parsed);
            } catch {
                setErrorMessage(translate("create.error.invalidJson"));
                return;
            }
        }

        const payload: CreateProblemInput = {
            title: title.trim(),
            difficulty,
            topic: topic.trim(),
            statement: statement.trim(),
            functionName: functionName.trim() || null,
            testCases: parsedTestCases,
        };

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

    const headerKicker = isEditing ? translate("create.edit.kicker") : translate("create.new.kicker");
    const headerTitle = isEditing ? translate("create.edit.title") : translate("create.new.title");
    const submitLabel = submitting
        ? (isEditing ? translate("create.submit.saving") : translate("create.submit.creating"))
        : (isEditing ? translate("create.submit.edit") : translate("create.submit.new"));

    return (
        <div className="app-shell">
            <div className="page-corner-actions">
                <LanguageToggle />
            </div>
            <section className="create-problem-screen">
                <div className="create-problem-surface">
                    <header className="selector-header">
                        <div>
                            <p className="landing-kicker">{headerKicker}</p>
                            <h2>{headerTitle}</h2>
                        </div>

                        <div className="selector-actions">
                            <button type="button" className="ghost-btn" onClick={onBack} disabled={submitting}>
                                {translate("create.back")}
                            </button>
                        </div>
                    </header>

                    <form className="create-problem-form" onSubmit={handleSubmit}>
                        <div className="create-problem-grid">
                            <label className="create-problem-field">
                                <span>{translate("create.field.title")}</span>
                                <input
                                    className="create-problem-input"
                                    type="text"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    placeholder={translate("create.field.titlePlaceholder")}
                                    disabled={submitting}
                                    maxLength={120}
                                />
                            </label>

                            <label className="create-problem-field">
                                <span>{translate("create.field.topic")}</span>
                                <input
                                    className="create-problem-input"
                                    type="text"
                                    value={topic}
                                    onChange={(event) => setTopic(event.target.value)}
                                    placeholder={translate("create.field.topicPlaceholder")}
                                    disabled={submitting}
                                    maxLength={80}
                                />
                            </label>

                            <label className="create-problem-field create-problem-field-full">
                                <span>{translate("create.field.difficulty")}</span>
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
                            <span>{translate("create.field.statement")}</span>
                            <textarea
                                className="create-problem-textarea"
                                value={statement}
                                onChange={(event) => setStatement(event.target.value)}
                                placeholder={translate("create.field.statementPlaceholder")}
                                disabled={submitting}
                                spellCheck={false}
                            />
                        </label>

                        <div className="create-problem-section-label">{translate("create.section.tests")}</div>

                        <label className="create-problem-field create-problem-field-full">
                            <span>{translate("create.field.functionName")}</span>
                            <input
                                className="create-problem-input"
                                type="text"
                                value={functionName}
                                onChange={(event) => setFunctionName(event.target.value)}
                                placeholder="twoSum"
                                disabled={submitting}
                                maxLength={80}
                            />
                        </label>

                        <label className="create-problem-field create-problem-field-full">
                            <span>{translate("create.field.testCases")}</span>
                            <textarea
                                className="create-problem-textarea create-problem-textarea--short"
                                value={testCasesRaw}
                                onChange={(event) => setTestCasesRaw(event.target.value)}
                                placeholder={TEST_CASES_PLACEHOLDER}
                                disabled={submitting}
                                spellCheck={false}
                            />
                        </label>

                        {errorMessage && <p className="create-problem-error">{errorMessage}</p>}

                        <div className="create-problem-actions">
                            <button type="submit" disabled={submitting}>
                                {submitLabel}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
