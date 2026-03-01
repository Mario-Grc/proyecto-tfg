import { useState, useRef, useCallback, useEffect } from "react";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import CodeEditor from "./components/CodeEditor";
import { EditorView } from "@codemirror/view";
import { sendMessage, ConversationMessage } from "./services/llmService";
import "./App.css";

interface Message {
    id: number;
    text: string;
    type: "user" | "llm";
}

// prompt inicial del sistema
const SYSTEM_PROMPT: ConversationMessage = { role: "system", content: "Eres un asistente útil y breve." };

function loadFromStorage<T>(key:string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored): fallback;
    } catch {
        return fallback;
    }
}

function App() {
    const [messages, setMessages] = useState<Message[]>(() => loadFromStorage<Message[]>("chat_messages", []));
    const [status, setStatus] = useState("Listo para enviar.");
    const [loading, setLoading] = useState(false);

    const editorViewRef = useRef<EditorView | null>(null);
    const conversationRef = useRef<ConversationMessage[]>(
        loadFromStorage<ConversationMessage[]>("full_conversation", [SYSTEM_PROMPT])
    );
    
    // ids de los mensajes para identificarlos
    const nextIdRef = useRef<number>(
        loadFromStorage<number>("next_message_id", 1)
    );

    const handleEditorReady = useCallback((view: EditorView) => {
        editorViewRef.current = view;
    }, []);

    useEffect(() => {
        localStorage.setItem("chat_messages", JSON.stringify(messages));
        localStorage.setItem("full_conversation", JSON.stringify(conversationRef.current));
        localStorage.setItem("next_message_id", JSON.stringify(nextIdRef.current));
    }, [messages]);

    async function handleSend(text: string) {
        const userId = nextIdRef.current++;
        setMessages((prev) => [...prev, { id: userId, text, type: "user" }]);

        // pasar el mensaje al llm
        conversationRef.current.push({ role: "user", content: text.trim() });

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

    function handleSendCode() {
        if (loading) {
            return;
        }

        const code = editorViewRef.current?.state.doc.toString().trim();

        if (!code){
            setStatus("El editor está vacío.");
            return;
        }

        const prompt = [
            "Analiza este código Python.",
            "Se breve y práctico.",
            "Indica: 1) errores, 2) mejoras, 3) versión corregida.",
            "",
            "```python",
            code,
            "```",
        ].join("\n");

        handleSend(prompt);
    }

    function handleClearConversation() {
        setMessages([]);
        nextIdRef.current = 1;
        conversationRef.current = [SYSTEM_PROMPT];
        localStorage.removeItem("chat_messages"); 
        localStorage.removeItem("full_conversation"); 
        localStorage.removeItem("next_message_id");
        setStatus("Conversación borrada.");
    }

    return (
        <div className="app-shell">
            <header className="topbar">
                <div className="topbar-title">Asistente de aprendizaje</div>
                <div className="topbar-actions">
                    <button type="button" disabled>Opciones</button>
                    <button type="button" onClick={handleSendCode} disabled={loading}>Enviar código</button>
                </div>
            </header>

            <div className="app-layout">
                <section className="editor-panel">
                    <CodeEditor onEditorReady={handleEditorReady} />
                </section>

                <aside className="chat-panel">
                    <header className="chat-header">
                        <p className="chat-subtitle">Demo chat.</p>
                        <button type="button" className="clear-btn" onClick={handleClearConversation}>Borrar conversación</button>
                    </header>

                    <ChatWindow messages={messages} />

                    <ChatInput onSend={handleSend} disabled={loading} />

                    <p className="status">{status}</p>
                </aside>
            </div>
        </div>
    );
}

export default App;
