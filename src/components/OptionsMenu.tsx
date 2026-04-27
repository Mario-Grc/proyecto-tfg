import { useEffect, useState } from "react";

interface OptionsMenuProps {
    themeMode: "dark" | "light";
    onToggleTheme: () => void;
    onClearConversation: () => void;
}

export default function OptionsMenu({
    themeMode,
    onToggleTheme,
    onClearConversation,
}: OptionsMenuProps) {
    const [open, setOpen] = useState(false);

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

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open]);

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
                                <p className="options-modal-subtitle">Personaliza la interfaz y el estado de la sesión.</p>
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
                                <h3 className="options-section-title">Conversación</h3>
                                <button
                                    type="button"
                                    className="options-item danger"
                                    onClick={onClearConversation}
                                >
                                    Borrar conversación
                                </button>
                            </section>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
