import usePersistentState from "../hooks/usePersistentState";
import { useTranslation } from "../i18n/LanguageContext";

interface NotesPanelProps {
    problemId: string;
    onHide: () => void;
}

export default function NotesPanel({ problemId, onHide }: NotesPanelProps) {
    const { translate } = useTranslation();
    const [notes, setNotes] = usePersistentState<string>(`notes_${problemId}`, "");

    return (
        <section className="notes-panel" aria-label={translate("notes.ariaLabel")}>
            <header className="notes-panel-header">
                <span className="notes-panel-title">{translate("notes.title")}</span>
                <button type="button" className="panel-toggle-btn" onClick={onHide}>{translate("notes.hide")}</button>
            </header>
            <textarea
                className="notes-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={translate("notes.placeholder")}
                spellCheck={false}
            />
        </section>
    );
}
