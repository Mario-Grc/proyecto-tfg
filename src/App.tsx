import { useState, useRef, useCallback, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import { sendMessage, ConversationMessage } from "./services/llmService";
import { Message } from "./types";
import { PROBLEM_CATALOG, ProblemDefinition } from "./data/problems";
import LandingPage from "./pages/LandingPage";
import ProblemSelectorPage from "./pages/ProblemSelectorPage";
import WorkspacePage from "./pages/WorkspacePage";
import "./App.css";

type ThemeMode = "dark" | "light";
type AppView = "landing" | "selector" | "workspace";

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
    const MIN_SIDE_PANEL_WIDTH = 260;
    const MIN_EDITOR_WIDTH = 420;
    const RESIZE_HANDLE_WIDTH = 6;

    const [messages, setMessages] = useState<Message[]>(() => loadFromStorage<Message[]>("chat_messages", []));
    const [status, setStatus] = useState("Listo para enviar.");
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState("");
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadFromStorage<ThemeMode>("theme_mode", "dark"));
    const [problemText, setProblemText] = useState<string>(() => loadFromStorage<string>("problem_text", ""));
    const [selectedProblemId, setSelectedProblemId] = useState<string | null>(() => loadFromStorage<string | null>("selected_problem_id", null));
    const [currentView, setCurrentView] = useState<AppView>("landing");
    const [chatVisible, setChatVisible] = useState<boolean>(() => loadFromStorage<boolean>("chat_panel_visible", true));
    const [problemVisible, setProblemVisible] = useState<boolean>(() => loadFromStorage<boolean>("problem_panel_visible", true));
    const [problemWidth, setProblemWidth] = useState<number>(() => {
        const savedAndParsed = Number(localStorage.getItem("problem_panel_width"));
        return Number.isInteger(savedAndParsed) && savedAndParsed >= 260 && savedAndParsed <= 560 ? savedAndParsed : 360;
    });

    const [chatWidth, setChatWidth] = useState<number>(() => {
        const savedAndParsed = Number(localStorage.getItem("chat_panel_width"));

        const size = Number.isInteger(savedAndParsed) && savedAndParsed >= 260 && savedAndParsed <= window.innerWidth - 300 ? savedAndParsed : 380;

        return size;
    });

    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);
    const isProblemDragging = useRef(false);
    const problemDragStartX = useRef(0);
    const problemDragStartWidth = useRef(0);
    const chatWidthRef = useRef(chatWidth);
    const problemWidthRef = useRef(problemWidth);
    const chatVisibleRef = useRef(chatVisible);
    const problemVisibleRef = useRef(problemVisible);

    function getMaxChatWidth(currentProblemWidth: number, isProblemVisible: boolean) {
        const reservedProblem = isProblemVisible ? currentProblemWidth + RESIZE_HANDLE_WIDTH : 0;
        const reservedHandles = RESIZE_HANDLE_WIDTH;
        const max = window.innerWidth - MIN_EDITOR_WIDTH - reservedProblem - reservedHandles - 24;
        return Math.max(MIN_SIDE_PANEL_WIDTH, max);
    }

    function getMaxProblemWidth(currentChatWidth: number, isChatVisible: boolean) {
        const reservedChat = isChatVisible ? currentChatWidth + RESIZE_HANDLE_WIDTH : 0;
        const reservedHandles = RESIZE_HANDLE_WIDTH;
        const max = window.innerWidth - MIN_EDITOR_WIDTH - reservedChat - reservedHandles - 24;
        return Math.max(MIN_SIDE_PANEL_WIDTH, max);
    }

    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        dragStartX.current = e.clientX;
        dragStartWidth.current = chatWidth;
        e.preventDefault();
    }, [chatWidth]);

    const handleProblemResizeMouseDown = useCallback((e: React.MouseEvent) => {
        isProblemDragging.current = true;
        problemDragStartX.current = e.clientX;
        problemDragStartWidth.current = problemWidth;
        e.preventDefault();
    }, [problemWidth]);

    useEffect(() => {
        chatWidthRef.current = chatWidth;
    }, [chatWidth]);

    useEffect(() => {
        problemWidthRef.current = problemWidth;
    }, [problemWidth]);

    useEffect(() => {
        chatVisibleRef.current = chatVisible;
    }, [chatVisible]);

    useEffect(() => {
        problemVisibleRef.current = problemVisible;
    }, [problemVisible]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isDragging.current) {
                const delta = e.clientX - dragStartX.current;
                const proposed = dragStartWidth.current + delta;
                const maxWidth = getMaxChatWidth(problemWidthRef.current, problemVisibleRef.current);
                const newWidth = Math.max(MIN_SIDE_PANEL_WIDTH, Math.min(proposed, maxWidth));
                setChatWidth(newWidth);
            }

            if (isProblemDragging.current) {
                // El panel derecho debe crecer al arrastrar hacia la izquierda.
                const problemDelta = problemDragStartX.current - e.clientX;
                const proposed = problemDragStartWidth.current + problemDelta;
                const maxWidth = getMaxProblemWidth(chatWidthRef.current, chatVisibleRef.current);
                const newProblemWidth = Math.max(MIN_SIDE_PANEL_WIDTH, Math.min(proposed, maxWidth));
                setProblemWidth(newProblemWidth);
            }
        };
        const onMouseUp = () => {
            isDragging.current = false;
            isProblemDragging.current = false;
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    useEffect(() => {
        const onResize = () => {
            const chatMax = getMaxChatWidth(problemWidthRef.current, problemVisibleRef.current);
            const problemMax = getMaxProblemWidth(chatWidthRef.current, chatVisibleRef.current);

            if (chatWidthRef.current > chatMax) {
                setChatWidth(chatMax);
            }

            if (problemWidthRef.current > problemMax) {
                setProblemWidth(problemMax);
            }
        };

        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        localStorage.setItem("chat_panel_width", String(chatWidth));
    }, [chatWidth]);

    useEffect(() => {
        localStorage.setItem("problem_panel_width", String(problemWidth));
    }, [problemWidth]);

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

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", themeMode);
        localStorage.setItem("theme_mode", JSON.stringify(themeMode));
    }, [themeMode]);

    useEffect(() => {
        localStorage.setItem("problem_text", JSON.stringify(problemText));
    }, [problemText]);

    useEffect(() => {
        localStorage.setItem("selected_problem_id", JSON.stringify(selectedProblemId));
    }, [selectedProblemId]);

    useEffect(() => {
        localStorage.setItem("chat_panel_visible", JSON.stringify(chatVisible));
    }, [chatVisible]);

    useEffect(() => {
        localStorage.setItem("problem_panel_visible", JSON.stringify(problemVisible));
    }, [problemVisible]);

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

    function toggleTheme() {
        setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
    }

    function handleSelectProblem(problem: ProblemDefinition) {
        setSelectedProblemId(problem.id);
        setProblemText(problem.statement);
        setProblemVisible(true);
        setCurrentView("workspace");
        setStatus(`Problema cargado: ${problem.title}`);
    }

    const selectedProblemTitle = PROBLEM_CATALOG.find((problem) => problem.id === selectedProblemId)?.title ?? "Problema seleccionado";
    const canContinueSession = Boolean(selectedProblemId && problemText.trim().length > 0);

    if (currentView === "landing") {
        return (
            <LandingPage
                onStart={() => setCurrentView("selector")}
                canContinue={canContinueSession}
                onContinue={() => setCurrentView("workspace")}
            />
        );
    }

    if (currentView === "selector") {
        return (
            <ProblemSelectorPage
                problems={PROBLEM_CATALOG}
                onBack={() => setCurrentView("landing")}
                onSelect={handleSelectProblem}
            />
        );
    }

    return (
        <WorkspacePage
            selectedProblemTitle={selectedProblemTitle}
            messages={messages}
            status={status}
            loading={loading}
            inputText={inputText}
            chatVisible={chatVisible}
            problemVisible={problemVisible}
            chatWidth={chatWidth}
            problemWidth={problemWidth}
            problemText={problemText}
            chatTextareaRef={chatTextareaRef}
            themeMode={themeMode}
            onEditorReady={handleEditorReady}
            onInputChange={setInputText}
            onPromptSend={handlePromptSend}
            onInsertCode={insertCodeIntoPrompt}
            onToggleTheme={toggleTheme}
            onClearConversation={handleClearConversation}
            onToggleChat={() => setChatVisible((prev) => !prev)}
            onToggleProblem={() => setProblemVisible((prev) => !prev)}
            onHideChat={() => setChatVisible(false)}
            onHideProblem={() => setProblemVisible(false)}
            onProblemTextChange={setProblemText}
            onChatResizeMouseDown={handleResizeMouseDown}
            onProblemResizeMouseDown={handleProblemResizeMouseDown}
            onGoSelector={() => setCurrentView("selector")}
            onGoHome={() => setCurrentView("landing")}
        />
    );
}

export default App;
