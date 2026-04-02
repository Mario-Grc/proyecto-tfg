import { useState, useRef, useCallback, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import {
    sendMessage,
    ConversationMessage,
    DEFAULT_API_ENDPOINT,
    DEFAULT_MODEL_NAME,
} from "./services/llmService";
import { runJavaScriptCode } from "./services/jsRunner.ts";
import { Message } from "./types";
import { PROBLEM_CATALOG, ProblemDefinition } from "./data/problems";
import LandingPage from "./pages/LandingPage";
import ProblemSelectorPage from "./pages/ProblemSelectorPage";
import WorkspacePage from "./pages/WorkspacePage";
import usePersistentState from "./hooks/usePersistentState";
import useWorkspacePanels from "./hooks/useWorkspacePanels";
import "./App.css";

type ThemeMode = "dark" | "light";
type AppView = "landing" | "selector" | "workspace";

const BASE_SYSTEM_PROMPT = [
    "Eres un asistente tutor para aprender programacion.",
    "Tu objetivo principal es ayudar al usuario a entender, no solo dar la respuesta final.",
    "Explica el razonamiento paso a paso cuando sea util, resuelve dudas concretas y propone ejemplos pequenos.",
    "Adapta el nivel de detalle a las preguntas del usuario y verifica que los conceptos queden claros.",
    "Si no tienes suficiente contexto de codigo para responder con precision, pide al usuario un fragmento concreto del editor.",
].join(" ");

function buildSystemPrompt(problemTitle?: string, problemStatement?: string): ConversationMessage {
    const statement = problemStatement?.trim();

    if (!problemTitle && !statement) {
        return { role: "system", content: BASE_SYSTEM_PROMPT };
    }

    const parts = [
        BASE_SYSTEM_PROMPT,
        "Contexto del problema activo:",
        `Titulo: ${problemTitle ?? "Sin titulo"}`,
        `Enunciado:\n${statement || "Sin enunciado."}`,
        "No inventes requisitos que no esten en el enunciado.",
    ];

    return { role: "system", content: parts.join("\n\n") };
}

function App() {
    const [messages, setMessages] = usePersistentState<Message[]>("chat_messages", []);
    const [status, setStatus] = useState("Listo para enviar.");
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState("");
    const [runningCode, setRunningCode] = useState(false);
    const [runOutput, setRunOutput] = useState("Aun no has ejecutado codigo.");
    const [themeMode, setThemeMode] = usePersistentState<ThemeMode>("theme_mode", "dark");
    const [apiEndpoint, setApiEndpoint] = usePersistentState<string>("llm_api_endpoint", DEFAULT_API_ENDPOINT);
    const [modelName, setModelName] = usePersistentState<string>("llm_model_name", DEFAULT_MODEL_NAME);
    const [problemText, setProblemText] = usePersistentState<string>("problem_text", "");
    const [selectedProblemId, setSelectedProblemId] = usePersistentState<string | null>("selected_problem_id", null);
    const [currentView, setCurrentView] = useState<AppView>("landing");
    const {
        chatVisible,
        setChatVisible,
        problemVisible,
        setProblemVisible,
        chatWidth,
        problemWidth,
        handleChatResizeMouseDown,
        handleProblemResizeMouseDown,
    } = useWorkspacePanels();

    const editorViewRef = useRef<EditorView | null>(null);
    const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const conversationRef = useRef<ConversationMessage[]>(
        (() => {
            try {
                const stored = localStorage.getItem("full_conversation");
                return stored ? (JSON.parse(stored) as ConversationMessage[]) : [buildSystemPrompt()];
            } catch {
                return [buildSystemPrompt()];
            }
        })()
    );
    
    // ids de los mensajes para identificarlos
    const nextIdRef = useRef<number>(
        (() => {
            try {
                const stored = localStorage.getItem("next_message_id");
                return stored ? (JSON.parse(stored) as number) : 1;
            } catch {
                return 1;
            }
        })()
    );

    const handleEditorReady = useCallback((view: EditorView) => {
        editorViewRef.current = view;
    }, []);

    useEffect(() => {
        localStorage.setItem("full_conversation", JSON.stringify(conversationRef.current));
        localStorage.setItem("next_message_id", JSON.stringify(nextIdRef.current));
    }, [messages]);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", themeMode);
    }, [themeMode]);

    const selectedProblem = selectedProblemId ? PROBLEM_CATALOG.find((problem) => problem.id === selectedProblemId) : undefined;

    function getSelectedCodeFromEditor() {
        const view = editorViewRef.current;

        if (!view) {
            return "";
        }

        const mainSelection = view.state.selection.main;

        if (mainSelection.empty) {
            return "";
        }

        return view.state.doc.sliceString(mainSelection.from, mainSelection.to).trim();
    }

    function getEditorCode() {
        return editorViewRef.current?.state.doc.toString() ?? "";
    }

    async function handleRunJavaScript() {
        if (runningCode) {
            return;
        }

        const code = getEditorCode();

        if (!code.trim()) {
            setRunOutput("No hay codigo en el editor.");
            return;
        }

        setRunningCode(true);
        setRunOutput("Ejecutando...");

        try {
            const result = await runJavaScriptCode(code, 4500);
            const blocks: string[] = [];

            if (result.logs.length > 0) {
                blocks.push(result.logs.join("\n"));
            }

            if (result.error) {
                blocks.push(`Error: ${result.error}`);
            } else if (result.result && result.result !== "undefined") {
                blocks.push(`=> ${result.result}`);
            }

            if (blocks.length === 0) {
                blocks.push("Sin salida.");
            }

            const nextOutput = blocks.join("\n\n");
            setRunOutput(nextOutput);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido al ejecutar JavaScript.";
            setRunOutput(`Error: ${message}`);
        } finally {
            setRunningCode(false);
        }
    }

    async function handleSend(text: string) {
        const trimmedText = text.trim();
        const selectedCode = getSelectedCodeFromEditor();
        const userContentForModel = selectedCode
            ? [
                trimmedText,
                "",
                "Contexto de codigo seleccionado automaticamente:",
                "```javascript",
                selectedCode,
                "```",
            ].join("\n")
            : trimmedText;

        const userContentForChat = selectedCode
            ? `${trimmedText}\n\n(Se adjunto automaticamente tu seleccion de codigo al modelo.)`
            : trimmedText;

        const userId = nextIdRef.current++;
        setMessages((prev) => [...prev, { id: userId, text: userContentForChat, type: "user" }]);

        // pasar el mensaje al llm
        conversationRef.current.push({ role: "user", content: userContentForModel });

        setLoading(true);
        setStatus(selectedCode ? "Consultando al modelo con tu seleccion de codigo..." : "Consultando al modelo...");

        try {
            // pasar mensaje a lm studio
            const response = await sendMessage(conversationRef.current, {
                endpoint: apiEndpoint,
                model: modelName,
            });

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
        const nextSystemPrompt = buildSystemPrompt(selectedProblem?.title, problemText);

        setMessages([]);
        nextIdRef.current = 1;
        conversationRef.current = [nextSystemPrompt];
        localStorage.removeItem("chat_messages"); 
        localStorage.setItem("full_conversation", JSON.stringify([nextSystemPrompt]));
        localStorage.removeItem("next_message_id");
        setStatus("Conversación borrada.");
    }

    function toggleTheme() {
        setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
    }

    function handleSaveLLMSettings(endpoint: string, model: string) {
        setApiEndpoint(endpoint);
        setModelName(model);
        setStatus("Configuracion LLM actualizada.");
    }

    function handleSelectProblem(problem: ProblemDefinition) {
        const nextSystemPrompt = buildSystemPrompt(problem.title, problem.statement);

        setSelectedProblemId(problem.id);
        setProblemText(problem.statement);
        setMessages([]);
        setInputText("");
        nextIdRef.current = 1;
        conversationRef.current = [nextSystemPrompt];
        localStorage.removeItem("chat_messages");
        localStorage.setItem("full_conversation", JSON.stringify([nextSystemPrompt]));
        localStorage.removeItem("next_message_id");
        setProblemVisible(true);
        setCurrentView("workspace");
        setStatus(`Problema cargado: ${problem.title}`);
    }

    const selectedProblemTitle = selectedProblem?.title ?? "Problema seleccionado";
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
            runningCode={runningCode}
            runOutput={runOutput}
            inputText={inputText}
            chatVisible={chatVisible}
            problemVisible={problemVisible}
            chatWidth={chatWidth}
            problemWidth={problemWidth}
            problemText={problemText}
            chatTextareaRef={chatTextareaRef}
            themeMode={themeMode}
            apiEndpoint={apiEndpoint}
            modelName={modelName}
            onEditorReady={handleEditorReady}
            onInputChange={setInputText}
            onPromptSend={handlePromptSend}
            onInsertCode={insertCodeIntoPrompt}
            onRunJavaScript={handleRunJavaScript}
            onToggleTheme={toggleTheme}
            onClearConversation={handleClearConversation}
            onSaveLLMSettings={handleSaveLLMSettings}
            onToggleChat={() => setChatVisible((prev) => !prev)}
            onToggleProblem={() => setProblemVisible((prev) => !prev)}
            onHideChat={() => setChatVisible(false)}
            onHideProblem={() => setProblemVisible(false)}
            onProblemTextChange={setProblemText}
            onChatResizeMouseDown={handleChatResizeMouseDown}
            onProblemResizeMouseDown={handleProblemResizeMouseDown}
            onGoSelector={() => setCurrentView("selector")}
            onGoHome={() => setCurrentView("landing")}
        />
    );
}

export default App;
