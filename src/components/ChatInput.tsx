// Textarea + botón de enviar

import { useEffect } from "react";

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: (text: string) => void;
    onInsertCode: () => void;
    disabled: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function ChatInput({ value, onChange, onSend, onInsertCode, disabled, textareaRef }: ChatInputProps) {

    // resize del textarea cuando cambia el contenido
    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
        }
    }, [value, textareaRef]);

    // Lógica de envío separada del evento, para poder llamarla desde el form y desde el teclado
    function submit() {
        const trimmed = value.trim();
        if (!trimmed || disabled) return;

        onSend(trimmed);
    }

    function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        submit();
    }

    // para poder hacer el salto de línea
    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            if (disabled) {
                return;
            }

            e.preventDefault();
            submit();
        }
    }

    return (
        <form className="chat-form" onSubmit={handleSubmit} autoComplete="off">
            <div className="chat-input-wrapper">
                <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe tu mensaje..."
                    rows={1}
                    required
                />

                <div className="chat-form-actions">
                    <div className="chat-form-actions-left">
                        <button
                            type="button"
                            className="insert-code-btn"
                            onClick={onInsertCode}
                            disabled={disabled}
                            title="Insertar codigo seleccionado en el chat (Alt+Shift+L)"
                        >
                            + Selección
                        </button>
                    </div>

                    <button type="submit" className="chat-btn-send" disabled={disabled || !value.trim()}>
                        Enviar
                    </button>
                </div>
            </div>
        </form>
    );
}
