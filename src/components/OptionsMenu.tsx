import { FormEvent, useEffect, useRef, useState } from "react";

interface OptionsMenuProps {
    themeMode: "dark" | "light";
    apiEndpoint: string;
    modelName: string;
    onToggleTheme: () => void;
    onClearConversation: () => void;
    onSaveLLMSettings: (endpoint: string, model: string) => void;
}

function validateEndpoint(endpoint: string): string | null {
    if (!endpoint) {
        return "La URL de la API no puede estar vacia.";
    }

    try {
        const parsed = new URL(endpoint);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return "La URL debe empezar por http:// o https://";
        }
    } catch {
        return "Introduce una URL valida.";
    }

    return null;
}

export default function OptionsMenu({
    themeMode,
    apiEndpoint,
    modelName,
    onToggleTheme,
    onClearConversation,
    onSaveLLMSettings,
}: OptionsMenuProps) {
    const [open, setOpen] = useState(false);
    const [draftEndpoint, setDraftEndpoint] = useState(apiEndpoint);
    const [draftModel, setDraftModel] = useState(modelName);
    const [connectionFeedback, setConnectionFeedback] = useState<string | null>(null);
    const endpointInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handleEscape(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("keydown", handleEscape);
        endpointInputRef.current?.focus();

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setDraftEndpoint(apiEndpoint);
        setDraftModel(modelName);
        setConnectionFeedback(null);
    }, [apiEndpoint, modelName, open]);

    function handleSaveConnection(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const nextEndpoint = draftEndpoint.trim();
        const nextModel = draftModel.trim();
        const endpointError = validateEndpoint(nextEndpoint);

        if (endpointError) {
            setConnectionFeedback(endpointError);
            return;
        }

        if (!nextModel) {
            setConnectionFeedback("El nombre del modelo no puede estar vacio.");
            return;
        }

        onSaveLLMSettings(nextEndpoint, nextModel);
        setConnectionFeedback("Configuracion guardada y aplicada.");
    }

    return (
        <div className="options-menu">
            <button
                type="button"
                className="options-trigger"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls="app-settings-dialog"
            >
                Ajustes
            </button>

            {open && (
                <div className="options-overlay" onMouseDown={() => setOpen(false)}>
                    <section
                        id="app-settings-dialog"
                        className="options-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="options-modal-title"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <header className="options-modal-header">
                            <div>
                                <h2 id="options-modal-title" className="options-modal-title">Ajustes</h2>
                                <p className="options-modal-subtitle">Personaliza la interfaz y la conexion con el modelo.</p>
                            </div>
                            <button
                                type="button"
                                className="options-close-btn"
                                onClick={() => setOpen(false)}
                                aria-label="Cerrar ajustes"
                            >
                                Cerrar
                            </button>
                        </header>

                        <div className="options-modal-body">
                            <section className="options-section">
                                <h3 className="options-section-title">Apariencia</h3>
                                <button
                                    type="button"
                                    className="options-item"
                                    onClick={onToggleTheme}
                                >
                                    {themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                                </button>
                            </section>

                            <section className="options-section">
                                <h3 className="options-section-title">Conversacion</h3>
                                <button
                                    type="button"
                                    className="options-item danger"
                                    onClick={onClearConversation}
                                >
                                    Borrar conversacion
                                </button>
                            </section>

                            <section className="options-section">
                                <h3 className="options-section-title">Conexion LLM</h3>
                                <form className="options-connection-form" onSubmit={handleSaveConnection}>
                                    <label className="options-field-label" htmlFor="settings-api-endpoint">URL API</label>
                                    <input
                                        id="settings-api-endpoint"
                                        ref={endpointInputRef}
                                        className="options-input"
                                        type="text"
                                        value={draftEndpoint}
                                        onChange={(e) => {
                                            setDraftEndpoint(e.target.value);
                                            setConnectionFeedback(null);
                                        }}
                                        placeholder="http://127.0.0.1:1234/v1/chat/completions"
                                        autoComplete="off"
                                    />

                                    <label className="options-field-label" htmlFor="settings-model-name">Modelo</label>
                                    <input
                                        id="settings-model-name"
                                        className="options-input"
                                        type="text"
                                        value={draftModel}
                                        onChange={(e) => {
                                            setDraftModel(e.target.value);
                                            setConnectionFeedback(null);
                                        }}
                                        placeholder="local-model"
                                        autoComplete="off"
                                    />

                                    {connectionFeedback && (
                                        <p className="options-feedback" role="status">{connectionFeedback}</p>
                                    )}

                                    <div className="options-form-actions">
                                        <button type="submit" className="options-item options-save-btn">
                                            Guardar conexion
                                        </button>
                                    </div>
                                </form>
                            </section>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
