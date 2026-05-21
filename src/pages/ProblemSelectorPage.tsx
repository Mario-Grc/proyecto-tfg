import type { ProblemRecord } from "../../shared/types";
import useConfirmAction from "../hooks/useConfirmAction";
import LanguageToggle from "../components/LanguageToggle";
import { useTranslation } from "../i18n/LanguageContext";

interface ProblemSelectorPageProps {
    problems: ProblemRecord[];
    loading: boolean;
    errorMessage: string | null;
    onRetry: () => void;
    onBack: () => void;
    onUploadProblem: () => void;
    onSelect: (problem: ProblemRecord) => void;
    onEdit: (problem: ProblemRecord) => void;
    onDelete: (problem: ProblemRecord) => void;
}

interface ProblemCardDeleteBtnProps {
    onDelete: () => void;
}

function ProblemCardDeleteBtn({ onDelete }: ProblemCardDeleteBtnProps) {
    const { translate } = useTranslation();
    const { pending, trigger } = useConfirmAction(onDelete);

    return (
        <button
            type="button"
            className={`problem-card-delete-btn${pending ? " confirming" : ""}`}
            onClick={trigger}
        >
            {pending ? translate("selector.card.deleteConfirm") : translate("selector.card.delete")}
        </button>
    );
}

export default function ProblemSelectorPage({
    problems,
    loading,
    errorMessage,
    onRetry,
    onBack,
    onUploadProblem,
    onSelect,
    onEdit,
    onDelete,
}: ProblemSelectorPageProps) {
    const { translate } = useTranslation();

    return (
        <div className="app-shell">
            <div className="page-corner-actions">
                <LanguageToggle />
            </div>
            <section className="selector-screen">
                <div className="selector-surface">
                    <header className="selector-header">
                        <div>
                            <p className="landing-kicker">{translate("selector.kicker")}</p>
                            <h2>{translate("selector.title")}</h2>
                        </div>

                        <div className="selector-actions">
                            <button type="button" className="ghost-btn" onClick={onBack}>
                                {translate("selector.back")}
                            </button>
                            <button type="button" className="ghost-btn" onClick={onUploadProblem}>
                                {translate("selector.upload")}
                            </button>
                        </div>
                    </header>

                    <div className="problem-grid">
                        {loading && <p>{translate("selector.loading")}</p>}

                        {!loading && errorMessage && (
                            <article className="problem-card">
                                <div className="problem-main">
                                    <h3>{translate("selector.errorTitle")}</h3>
                                    <p>{errorMessage}</p>
                                </div>
                                <button type="button" onClick={onRetry}>
                                    {translate("selector.retry")}
                                </button>
                            </article>
                        )}

                        {!loading && !errorMessage && problems.length === 0 && (
                            <p>{translate("selector.empty")}</p>
                        )}

                        {!loading && !errorMessage && problems.map((problem) => (
                            <article key={problem.id} className="problem-card">
                                <div className="problem-main">
                                    <h3>{problem.title}</h3>
                                    <div className="problem-meta">
                                        <span className={`problem-difficulty difficulty-${problem.difficulty.toLowerCase()}`}>
                                            {problem.difficulty}
                                        </span>
                                        {problem.source === "user" && <span className="problem-source-badge">{translate("selector.card.userBadge")}</span>}
                                        <span>{problem.topic}</span>
                                    </div>
                                </div>
                                <div className="problem-card-actions">
                                    {problem.source === "user" && (
                                        <>
                                            <button
                                                type="button"
                                                className="problem-card-edit-btn"
                                                onClick={() => onEdit(problem)}
                                            >
                                                {translate("selector.card.edit")}
                                            </button>
                                            <ProblemCardDeleteBtn onDelete={() => onDelete(problem)} />
                                        </>
                                    )}
                                    <button type="button" onClick={() => onSelect(problem)}>
                                        {translate("selector.card.select")}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
