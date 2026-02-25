// Textarea + botón de enviar

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
    onSend: (text: string) => void;
    disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
    // Estado local: solo el texto que el usuario está escribiendo
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // resize del textarea cuando cambia el contenido
    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
        }
    }, [input]);

    // Lógica de envío separada del evento, para poder llamarla desde el form y desde el teclado
    function submit() {
        const trimmed = input.trim();
        if (!trimmed || disabled) return;

        onSend(trimmed);
        setInput("");
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
                value={input}
                onChange={(e) => setInput(e.target.value)}  // Actualiza el estado
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
