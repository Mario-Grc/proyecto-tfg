// Textarea + botón de enviar

import { useEffect } from "react";

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: (text: string) => void;
    disabled: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function ChatInput({ value, onChange, onSend, disabled, textareaRef }: ChatInputProps) {

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
            e.preventDefault();
            submit();
        }
    }

    return (
        <form className="chat-form" onSubmit={handleSubmit} autoComplete="off">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                rows={1}
                disabled={disabled}
                required
            />
            <button type="submit" disabled={disabled}>
                Enviar
            </button>
        </form>
    );
}
