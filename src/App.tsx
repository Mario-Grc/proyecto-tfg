import { useState, useRef, useCallback, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import type { CodeLanguage, CreateProblemInput, ProblemRecord } from "../shared/types";
import {
    createProblem,
    updateProblem,
    deleteProblem,
    createSession,
    fetchLatestSessionForProblem,
    updateSessionCode,
    fetchProblems,
} from "./services/backendApi";
import LandingPage from "./pages/LandingPage";
import CreateProblemPage from "./pages/CreateProblemPage";
import ProblemSelectorPage from "./pages/ProblemSelectorPage";
import WorkspacePage from "./pages/WorkspacePage";
import useDuckState from "./hooks/useDuckState";
import useCodeRunner from "./hooks/useCodeRunner";
import usePersistentState from "./hooks/usePersistentState";
import useTutorChat from "./hooks/useTutorChat";
import useWorkspacePanels from "./hooks/useWorkspacePanels";
import "./App.css";

type ThemeMode = "dark" | "light";
type AppView = "landing" | "selector" | "create-problem" | "edit-problem" | "workspace";

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Error desconocido";
}

function App() {
    const [themeMode, setThemeMode] = usePersistentState<ThemeMode>("theme_mode", "dark");
    const [problemText, setProblemText] = usePersistentState<string>("problem_text", "");
    const [selectedProblemId, setSelectedProblemId] = usePersistentState<string | null>("selected_problem_id", null);
    const [activeSessionId, setActiveSessionId] = usePersistentState<string | null>("active_session_id", null);
    const [currentView, setCurrentView] = useState<AppView>("landing");
    const [problems, setProblems] = useState<ProblemRecord[]>([]);
    const [editingProblem, setEditingProblem] = useState<ProblemRecord | null>(null);
    const [problemsLoading, setProblemsLoading] = useState(false);
    const [problemsError, setProblemsError] = useState<string | null>(null);

    const {
        messages,
        status,
        setStatus,
        loading,
        inputText,
        setInputText,
        sendPrompt,
        clearConversation,
        resetConversation,
    } = useTutorChat({
        sessionId: activeSessionId,
    });

    const {
        duckState,
        duckCompact,
        toggleCompact,
        setNormal,
        setThinking,
        setConfused,
    } = useDuckState();
    const [language, setLanguage] = usePersistentState<CodeLanguage>("editor_language", "javascript");
    const { runningCode, runOutput, runCode } = useCodeRunner(language);
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
    const [initialEditorCode, setInitialEditorCode] = useState<string | null>(null);
    const [isSavingCode, setIsSavingCode] = useState(false);
    const saveCodeTimeoutRef = useRef<number | null>(null);

    const selectedProblem = selectedProblemId
        ? problems.find((problem) => problem.id === selectedProblemId)
        : undefined;

    const loadProblems = useCallback(async () => {
        setProblemsLoading(true);
        setProblemsError(null);

        try {
            const backendProblems = await fetchProblems();
            setProblems(backendProblems);

            if (!selectedProblemId) {
                return;
            }

            const restoredProblem = backendProblems.find((problem) => problem.id === selectedProblemId);

            if (!restoredProblem) {
                setSelectedProblemId(null);
                setActiveSessionId(null);
                setProblemText("");
                return;
            }

            setProblemText((previous) => (previous.trim() ? previous : restoredProblem.statement));
        } catch (error) {
            const message = getErrorMessage(error);
            setProblemsError(message);
        } finally {
            setProblemsLoading(false);
        }
    }, [selectedProblemId, setActiveSessionId, setProblemText, setSelectedProblemId]);

    useEffect(() => {
        void loadProblems();
    }, [loadProblems]);

    const handleEditorReady = useCallback((view: EditorView) => {
        editorViewRef.current = view;
    }, []);

    const handleEditorChange = useCallback((code: string) => {
        if (!activeSessionId) return;

        if (saveCodeTimeoutRef.current !== null) {
            clearTimeout(saveCodeTimeoutRef.current);
        }

        setIsSavingCode(true);

        saveCodeTimeoutRef.current = window.setTimeout(() => {
            updateSessionCode(activeSessionId, code)
                .then(() => setIsSavingCode(false))
                .catch((error) => {
                    console.error("Failed to save code:", error);
                    setIsSavingCode(false);
                });
        }, 2000);
    }, [activeSessionId]);

    useEffect(() => {
        return () => {
            if (saveCodeTimeoutRef.current !== null) {
                clearTimeout(saveCodeTimeoutRef.current);
                saveCodeTimeoutRef.current = null;
                setIsSavingCode(false);
            }
        };
    }, [activeSessionId]);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", themeMode);
    }, [themeMode]);

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

    async function handleRunCode() {
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
            editorCode: getEditorCode(),
            selectedCode: getSelectedCodeFromEditor(),
            language,
        });

        if (sendStatus === "error") {
            setConfused();
            return;
        }

        if (sendStatus === "success") {
            setNormal();
        }
    }

    function handlePromptSend(text: string) {
        void handleSend(text);
        setInputText("");
    }

    async function handleClearConversation() {
        if (!selectedProblem) {
            setStatus("Selecciona un problema antes de reiniciar la conversación.");
            return;
        }

        setThinking();
        setStatus("Reiniciando conversación...");

        try {
            const newSession = await createSession(selectedProblem.id);
            setActiveSessionId(newSession.id);
            clearConversation();
            setStatus("Conversación reiniciada.");
            setNormal();
        } catch (error) {
            const message = getErrorMessage(error);
            setStatus(`No se pudo reiniciar: ${message}`);
            setConfused();
        }
    }

    function toggleTheme() {
        setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
    }

    async function activateProblem(problem: ProblemRecord, options?: { allowResumeLatest?: boolean }) {
        let session = null;

        if (options?.allowResumeLatest) {
            session = await fetchLatestSessionForProblem(problem.id);
        }

        if (!session) {
            session = await createSession(problem.id);
        }

        setSelectedProblemId(problem.id);
        setActiveSessionId(session.id);
        setProblemText(problem.statement);
        setInitialEditorCode(session.editorCode ?? null);
        resetConversation();
        setProblemVisible(true);
        setCurrentView("workspace");
    }

    async function handleSelectProblem(problem: ProblemRecord) {
        if (selectedProblemId === problem.id && activeSessionId) {
            setThinking();
            setStatus(`Reanudando sesión para ${problem.title}...`);
            try {
                const session = await fetchLatestSessionForProblem(problem.id);
                if (session) {
                    setInitialEditorCode(session.editorCode ?? null);
                }
                setProblemVisible(true);
                setCurrentView("workspace");
                setStatus(`Sesión reanudada: ${problem.title}`);
                setNormal();
            } catch (error) {
                const message = getErrorMessage(error);
                setStatus(`Error al reanudar: ${message}`);
                setConfused();
            }
            return;
        }

        setThinking();
        setStatus(`Abriendo sesión para ${problem.title}...`);

        try {
            await activateProblem(problem, { allowResumeLatest: true });
            setStatus(`Problema cargado: ${problem.title}`);
            setNormal();
        } catch (error) {
            const message = getErrorMessage(error);
            setStatus(`No se pudo abrir la sesión: ${message}`);
            setConfused();
        }
    }

    async function handleSubmitProblem(input: CreateProblemInput) {
        if (editingProblem) {
            setStatus("Guardando cambios...");

            try {
                const updated = await updateProblem(editingProblem.id, input);
                setProblems((previous) =>
                    previous.map((p) => (p.id === updated.id ? updated : p)),
                );

                if (selectedProblemId === updated.id) {
                    setProblemText(updated.statement);
                }

                setEditingProblem(null);
                setCurrentView("selector");
                setStatus(`Problema actualizado: ${updated.title}`);
            } catch (error) {
                const message = getErrorMessage(error);
                setStatus(`No se pudo guardar: ${message}`);
                throw new Error(message);
            }
        } else {
            setStatus("Creando problema personalizado...");

            try {
                const createdProblem = await createProblem(input);
                setProblems((previous) => [
                    createdProblem,
                    ...previous.filter((problem) => problem.id !== createdProblem.id),
                ]);

                setStatus(`Problema creado: ${createdProblem.title}. Creando sesión...`);
                await activateProblem(createdProblem, { allowResumeLatest: false });
                setStatus(`Problema cargado: ${createdProblem.title}`);
            } catch (error) {
                const message = getErrorMessage(error);
                setStatus(`No se pudo crear el problema: ${message}`);
                throw new Error(message);
            }
        }
    }

    function handleEditProblem(problem: ProblemRecord) {
        setEditingProblem(problem);
        setCurrentView("edit-problem");
    }

    async function handleDeleteProblem(problem: ProblemRecord) {
        try {
            await deleteProblem(problem.id);
            setProblems((previous) => previous.filter((p) => p.id !== problem.id));
            localStorage.removeItem(`notes_${problem.id}`);

            if (selectedProblemId === problem.id) {
                setSelectedProblemId(null);
                setActiveSessionId(null);
                setProblemText("");
                setInitialEditorCode(null);
                resetConversation();
            }

            setStatus("Problema eliminado.");
        } catch (error) {
            const message = getErrorMessage(error);
            setStatus(`No se pudo eliminar: ${message}`);
        }
    }

    async function handleContinueSession() {
        if (!selectedProblemId || !activeSessionId) return;

        setThinking();
        setStatus("Reanudando sesión guardada...");
        
        try {
            const session = await fetchLatestSessionForProblem(selectedProblemId);
            if (session) {
                setInitialEditorCode(session.editorCode ?? null);
            }
            setProblemVisible(true);
            setCurrentView("workspace");
            setStatus(`Sesión reanudada: ${selectedProblem?.title ?? ""}`);
            setNormal();
        } catch (error) {
            const message = getErrorMessage(error);
            setStatus(`Error al reanudar: ${message}`);
            setConfused();
        }
    }

    const selectedProblemTitle = selectedProblem?.title ?? "Problema seleccionado";
    const canContinueSession = Boolean(selectedProblemId && activeSessionId);

    if (currentView === "landing") {
        return (
            <LandingPage
                onStart={() => setCurrentView("selector")}
                canContinue={canContinueSession}
                onContinue={handleContinueSession}
            />
        );
    }

    if (currentView === "selector") {
        return (
            <ProblemSelectorPage
                problems={problems}
                loading={problemsLoading}
                errorMessage={problemsError}
                onRetry={() => {
                    void loadProblems();
                }}
                onBack={() => setCurrentView("landing")}
                onUploadProblem={() => setCurrentView("create-problem")}
                onSelect={(problem) => {
                    void handleSelectProblem(problem);
                }}
                onEdit={handleEditProblem}
                onDelete={(problem) => {
                    void handleDeleteProblem(problem);
                }}
            />
        );
    }

    if (currentView === "create-problem") {
        return (
            <CreateProblemPage
                onBack={() => setCurrentView("selector")}
                onSubmit={handleSubmitProblem}
            />
        );
    }

    if (currentView === "edit-problem" && editingProblem) {
        return (
            <CreateProblemPage
                onBack={() => {
                    setEditingProblem(null);
                    setCurrentView("selector");
                }}
                onSubmit={handleSubmitProblem}
                editingProblem={editingProblem}
            />
        );
    }

    return (
        <WorkspacePage
            selectedProblemTitle={selectedProblemTitle}
            messages={messages}
            status={status}
            loading={loading}
            isSavingCode={isSavingCode}
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
            initialEditorCode={initialEditorCode}
            onEditorReady={handleEditorReady}
            onEditorChange={handleEditorChange}
            onInputChange={setInputText}
            onPromptSend={handlePromptSend}
            language={language}
            onLanguageChange={setLanguage}
            onToggleDuckCompact={toggleCompact}
            onRunCode={handleRunCode}
            onToggleTheme={toggleTheme}
            onClearConversation={handleClearConversation}
            onToggleChat={() => setChatVisible((prev) => !prev)}
            onToggleProblem={() => setProblemVisible((prev) => !prev)}
            onHideChat={() => setChatVisible(false)}
            onHideProblem={() => setProblemVisible(false)}
            selectedProblemId={selectedProblemId}
            onChatResizeMouseDown={handleChatResizeMouseDown}
            onProblemResizeMouseDown={handleProblemResizeMouseDown}
            onGoSelector={() => setCurrentView("selector")}
            onGoHome={() => setCurrentView("landing")}
        />
    );
}

export default App;
