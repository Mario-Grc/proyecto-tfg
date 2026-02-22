// Textarea + botón de enviar

import { useState, useRef, useEffect } from "react";

export default function ChatInput({ onSend, disabled }) {
    // Estado local: solo el texto que el usuario está escribiendo
    const [input, setInput] = useState("");
    const textareaRef = useRef(null);

    // Auto-resize del textarea cuando cambia el contenido
    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
        }
    }, [input]);

    function handleSubmit(e) {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || disabled) return;

        onSend(trimmed);
        setInput("");
    }

    // para poder hacer el salto de línea
    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
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
