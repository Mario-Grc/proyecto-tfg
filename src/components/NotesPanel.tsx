import usePersistentState from "../hooks/usePersistentState";

interface NotesPanelProps {
    problemId: string;
    onHide: () => void;
}

export default function NotesPanel({ problemId, onHide }: NotesPanelProps) {
    const [notes, setNotes] = usePersistentState<string>(`notes_${problemId}`, "");

    return (
        <section className="notes-panel" aria-label="Notas">
            <header className="notes-panel-header">
                <span className="notes-panel-title">Notas</span>
                <button type="button" className="panel-toggle-btn" onClick={onHide}>Ocultar</button>
            </header>
            <textarea
                className="notes-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribe aquí tus notas..."
                spellCheck={false}
            />
        </section>
    );
}
