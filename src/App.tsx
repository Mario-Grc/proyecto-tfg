import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
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
    const [inputText, setInputText] = useState("");

    const [chatWidth, setChatWidth] = useState<number>(() => {
        const savedAndParsed = Number(localStorage.getItem("chat_panel_width"));

        const size = Number.isInteger(savedAndParsed) && savedAndParsed >= 260 && savedAndParsed <= window.innerWidth - 300 ? savedAndParsed : 380;

        return size;
    });

    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);

    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        dragStartX.current = e.clientX;
        dragStartWidth.current = chatWidth;
        e.preventDefault();
    }, [chatWidth]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const delta = dragStartX.current - e.clientX;
            const newWidth = Math.max(260, Math.min(dragStartWidth.current + delta, window.innerWidth - 300));
            setChatWidth(newWidth);
        };
        const onMouseUp = () => { isDragging.current = false; };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    useLayoutEffect(() => {
        localStorage.setItem("chat_panel_width", String(chatWidth));
    }, [chatWidth]);

    const editorViewRef = useRef<EditorView | null>(null);
    const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);
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

    function insertCodeIntoPrompt() {
        if (loading) {
            return;
        }

        const code = editorViewRef.current?.state.doc.toString().trim();

        if (!code){
            setStatus("El editor está vacío.");
            return;
        }

        const textarea = chatTextareaRef.current;
        const current = inputText;

        const selectionStart = textarea?.selectionStart ?? current.length;
        const selectionEnd = textarea?.selectionEnd ?? current.length;

        const before = current.slice(0, selectionStart);
        const after = current.slice(selectionEnd);

        const needsLeadingBreak = before.length > 0 && !before.endsWith("\n");
        const needsTrailingBreak = after.length > 0 && !after.startsWith("\n");
        const insertion = `${needsLeadingBreak ? "\n" : ""}${code}${needsTrailingBreak ? "\n" : ""}`;

        const nextText = `${before}${insertion}${after}`;
        const nextCursorPos = before.length + insertion.length;

        setInputText(nextText);
        setStatus("Código añadido al prompt.");

        if (textarea) {
            requestAnimationFrame(() => {
                textarea.focus();
                textarea.setSelectionRange(nextCursorPos, nextCursorPos);
            });
        }
    }

    function handlePromptSend(text: string) {
        handleSend(text);
        setInputText("");
    }

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.shiftKey && e.key.toLowerCase() === "l") {
                e.preventDefault();
                insertCodeIntoPrompt();
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [inputText, loading]);

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
                    <button type="button" onClick={insertCodeIntoPrompt} disabled={loading} title="Alt+Shift+L">Añadir código</button>
                </div>
            </header>

            <div className="app-layout">
                <section className="editor-panel">
                    <CodeEditor onEditorReady={handleEditorReady} />
                </section>

                <div
                    className="resize-handle"
                    onMouseDown={handleResizeMouseDown}
                    title="Arrastra para redimensionar"
                />

                <aside className="chat-panel" style={{ width: chatWidth, flexShrink: 0 }}>
                    <header className="chat-header">
                        <p className="chat-subtitle">Demo chat.</p>
                        <button type="button" className="clear-btn" onClick={handleClearConversation}>Borrar conversación</button>
                    </header>

                    <ChatWindow messages={messages} />

                    <ChatInput
                        value={inputText}
                        onChange={setInputText}
                        onSend={handlePromptSend}
                        disabled={loading}
                        textareaRef={chatTextareaRef}
                    />

                    <p className="status">{status}</p>
                </aside>
            </div>
        </div>
    );
}

export default App;
