import { useState, useRef, useCallback, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import { ConversationMessage } from "./services/llmService";
import { PROBLEM_CATALOG, ProblemDefinition } from "./data/problems";
import LandingPage from "./pages/LandingPage";
import ProblemSelectorPage from "./pages/ProblemSelectorPage";
import WorkspacePage from "./pages/WorkspacePage";
import useDuckState from "./hooks/useDuckState";
import useJavaScriptRunner from "./hooks/useJavaScriptRunner";
import usePersistentState from "./hooks/usePersistentState";
import useTutorChat from "./hooks/useTutorChat";
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
    const [themeMode, setThemeMode] = usePersistentState<ThemeMode>("theme_mode", "dark");
    const [problemText, setProblemText] = usePersistentState<string>("problem_text", "");
    const [selectedProblemId, setSelectedProblemId] = usePersistentState<string | null>("selected_problem_id", null);
    const [currentView, setCurrentView] = useState<AppView>("landing");
    const initialSystemPromptRef = useRef<ConversationMessage>(buildSystemPrompt());
    const {
        messages,
        status,
        setStatus,
        loading,
        inputText,
        setInputText,
        apiEndpoint,
        modelName,
        sendPrompt,
        clearConversation,
        resetConversation,
        saveLLMSettings,
    } = useTutorChat({ initialSystemPrompt: initialSystemPromptRef.current });
    const {
        duckState,
        duckCompact,
        toggleCompact,
        setNormal,
        setThinking,
        setConfused,
    } = useDuckState();
    const { runningCode, runOutput, runCode } = useJavaScriptRunner();
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

    const handleEditorReady = useCallback((view: EditorView) => {
        editorViewRef.current = view;
    }, []);

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
        const runStatus = await runCode(getEditorCode());

        if (runStatus === "error") {
            setConfused();
            return;
        }

        if (runStatus === "success") {
            setNormal();
        }
    }

    async function handleSend(text: string) {
        setThinking();

        const sendStatus = await sendPrompt({
            text,
            selectedCode: getSelectedCodeFromEditor(),
        });

        if (sendStatus === "error") {
            setConfused();
            return;
        }

        if (sendStatus === "success") {
            setNormal();
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
        void handleSend(text);
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
        clearConversation(nextSystemPrompt);
        setNormal();
    }

    function toggleTheme() {
        setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
    }

    function handleSaveLLMSettings(endpoint: string, model: string) {
        saveLLMSettings(endpoint, model);
    }

    function handleSelectProblem(problem: ProblemDefinition) {
        const nextSystemPrompt = buildSystemPrompt(problem.title, problem.statement);

        setSelectedProblemId(problem.id);
        setProblemText(problem.statement);
        resetConversation(nextSystemPrompt);
        setProblemVisible(true);
        setCurrentView("workspace");
        setStatus(`Problema cargado: ${problem.title}`);
        setNormal();
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
            duckState={duckState}
            duckCompact={duckCompact}
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
            onToggleDuckCompact={toggleCompact}
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
