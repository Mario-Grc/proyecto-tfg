import { useEffect, useRef, useState } from "react";

interface OptionsMenuProps {
    themeMode: "dark" | "light";
    onToggleTheme: () => void;
    onClearConversation: () => void;
}

export default function OptionsMenu({ themeMode, onToggleTheme, onClearConversation }: OptionsMenuProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;

        function handleDocumentClick(e: MouseEvent) {
            const target = e.target as Node;
            if (!menuRef.current?.contains(target)) {
                setOpen(false);
            }
        }

        function handleEscape(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleDocumentClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleDocumentClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open]);

    return (
        <div className="options-menu" ref={menuRef}>
            <button
                type="button"
                className="options-trigger"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls="app-options-menu"
            >
                Opciones
            </button>

            {open && (
                <div id="app-options-menu" className="options-dropdown" role="menu">
                    <button
                        type="button"
                        className="options-item"
                        role="menuitem"
                        onClick={() => {
                            onToggleTheme();
                            setOpen(false);
                        }}
                    >
                        {themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                    </button>

                    <button
                        type="button"
                        className="options-item danger"
                        role="menuitem"
                        onClick={() => {
                            onClearConversation();
                            setOpen(false);
                        }}
                    >
                        Borrar conversacion
                    </button>
                </div>
            )}
        </div>
    );
}
