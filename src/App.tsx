import { useState, useRef } from "react";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import { sendMessage, ConversationMessage } from "./services/llmService";
import "./App.css";

interface Message {
    id: number;
    text: string;
    type: "user" | "llm";
}

// prompt inicial del sistema
const SYSTEM_PROMPT: ConversationMessage = { role: "system", content: "Eres un asistente útil y breve." };

function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState("Listo para enviar.");
    const [loading, setLoading] = useState(false);

    const conversationRef = useRef<ConversationMessage[]>([SYSTEM_PROMPT]);

    // ids de los mensajes para identificarlso
    const nextIdRef = useRef(1);

    async function handleSend(text: string) {
        const userId = nextIdRef.current++;
        setMessages((prev) => [...prev, { id: userId, text, type: "user" }]);

        // pasar el mensaje al llm
        conversationRef.current.push({ role: "user", content: text });

        setLoading(true);
        setStatus("Consultando al modelo...");

        try {
            // pasar mensaje a lm studio
            const response = await sendMessage(conversationRef.current);

            const llmId = nextIdRef.current++;
            setMessages((prev) => [...prev, { id: llmId, text: response.text, type: "llm" }]);

            // en el historial guardo el texto completo con los think, por si luego quiero mostrarlo o analizarlo
            conversationRef.current.push({ role: "assistant", content: response.rawText });

            // uso de tokens para saber el contexto
            if (response.usage) {
                setStatus(`Respuesta recibida — ${response.usage.total_tokens} tokens usados`);
            } else {
                setStatus("Respuesta recibida.");
            }
        } catch (error) {
            // muestro el error en el chat y en el status
            const message = error instanceof Error ? error.message : "Error desconocido";
            const errorId = nextIdRef.current++;
            setMessages((prev) => [...prev, { id: errorId, text: message, type: "llm" }]);
            setStatus(`Fallo: ${message}`);
        } finally {
            setLoading(false);
        }
    }

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
