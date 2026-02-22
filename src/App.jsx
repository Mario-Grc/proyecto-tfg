// App.jsx — Componente raíz, el "cerebro" de la app
// -----------------------------------------------
// Aquí vive TODO el estado global:
//   - messages: los mensajes visibles en el chat
//   - conversation: el historial que se manda al LLM (incluye system prompt)
//   - status: texto informativo ("Consultando...", "Respuesta recibida", etc.)
//   - loading: si estamos esperando respuesta (para desactivar el input)
//
// IMPORTANTE: en React el estado es INMUTABLE.
// Nunca haces messages.push(...). Siempre creas un array nuevo:
//   setMessages(prev => [...prev, nuevoMensaje])
// React compara el array viejo con el nuevo y actualiza solo lo que cambió.

import { useState, useRef } from "react";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import { sendMessage } from "./services/llmService";
import "./App.css";

// Sistema prompt inicial — se envía con cada petición pero no se muestra
const SYSTEM_PROMPT = { role: "system", content: "Eres un asistente útil y breve." };

function App() {
    // useState devuelve [valorActual, funcionParaCambiarlo]
    const [messages, setMessages] = useState([]);          // Lo que se ve en pantalla
    const [status, setStatus] = useState("Listo para enviar.");
    const [loading, setLoading] = useState(false);

    // useRef para el historial de conversación — NO necesita re-render,
    // por eso usamos ref en vez de state. Es como una variable de instancia.
    const conversationRef = useRef([SYSTEM_PROMPT]);

    // Contador simple para dar IDs únicos a los mensajes
    const nextIdRef = useRef(1);

    async function handleSend(text) {
        // 1. Añadir mensaje del usuario a la pantalla
        const userId = nextIdRef.current++;
        setMessages((prev) => [...prev, { id: userId, text, type: "user" }]);

        // 2. Añadir al historial de conversación (para el LLM)
        conversationRef.current.push({ role: "user", content: text });

        // 3. Desactivar input y actualizar status
        setLoading(true);
        setStatus("Consultando al modelo...");

        try {
            // 4. Llamar a LM Studio
            const response = await sendMessage(conversationRef.current);

            // 5. Añadir respuesta del LLM a la pantalla
            const llmId = nextIdRef.current++;
            setMessages((prev) => [...prev, { id: llmId, text: response.text, type: "llm" }]);

            // 6. Guardar en el historial (la versión completa, con <think> y todo)
            conversationRef.current.push({ role: "assistant", content: response.rawText });

            // 7. Mostrar uso de tokens si está disponible
            if (response.usage) {
                setStatus(
                    `Respuesta recibida — ${response.usage.total_tokens} tokens usados`
                );
            } else {
                setStatus("Respuesta recibida.");
            }
        } catch (error) {
            // Si falla, mostramos el error como mensaje del LLM
            const errorId = nextIdRef.current++;
            setMessages((prev) => [...prev, { id: errorId, text: error.message, type: "llm" }]);
            setStatus(`Fallo: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    // El JSX es lo que se renderiza. Es como el template de Angular.
    // Nota: en React usamos className en vez de class (porque class es palabra reservada en JS)
    return (
        <main className="chat-container">
            <header className="chat-header">
                <h1 className="chat-title">Asistente local</h1>
                <p className="chat-subtitle">Demo simple.</p>
            </header>

            <ChatWindow messages={messages} />

            <ChatInput onSend={handleSend} disabled={loading} />

            <p className="status">{status}</p>
        </main>
    );
}

export default App;
