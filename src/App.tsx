import { useState, useRef, useCallback, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import type { CheckResult, CodeLanguage, CreateProblemInput, ProblemRecord } from "../shared/types";
import {
    checkSolution,
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
import useProactiveAssistant from "./hooks/useProactiveAssistant";
import useWorkspacePanels from "./hooks/useWorkspacePanels";
import { useTranslation } from "./i18n/LanguageContext";
import "./App.css";

type ThemeMode = "dark" | "light";
type AppView = "landing" | "selector" | "create-problem" | "edit-problem" | "workspace";

function App() {
    const { translate, language: uiLanguage } = useTranslation();

    function getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : translate("create.error.unknown");
    }

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
        appendAssistantMessage,
        clearConversation,
        resetConversation,
    } = useTutorChat({
        sessionId: activeSessionId,
    });

    const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
    const [checking, setChecking] = useState(false);

    const {
        duckState,
        duckCompact,
        toggleCompact,
        setNormal,
        setThinking,
        setConfused,
        setVictory,
        setIdea,
    } = useDuckState();
    const [language, setLanguage] = usePersistentState<CodeLanguage>("editor_language", "javascript");
    const [proactiveEnabled, setProactiveEnabled] = usePersistentState<boolean>("proactive_enabled", true);
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

    const proactive = useProactiveAssistant({
        sessionId: activeSessionId,
        enabled: proactiveEnabled,
        language,
        uiLanguage,
        chatLoading: loading,
        getEditorCode,
        onIntervention: (message) => {
            appendAssistantMessage(message);
            setIdea();
        },
    });

    function handleAskInChat() {
        setChatVisible(true);
        proactive.dismissBubble();
        setNormal();
        window.setTimeout(() => chatTextareaRef.current?.focus(), 0);
    }

    function handleDismissBubble() {
        proactive.dismissBubble();
        setNormal();
    }

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

        proactive.notifyEdit(code);

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
    }, [activeSessionId, proactive.notifyEdit]);

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

    async function handleCheckSolution() {
        if (!selectedProblem?.functionName || !selectedProblem?.testCases) return;

        setChecking(true);
        setCheckResult(null);

        try {
            const result = await checkSolution(selectedProblem.id, getEditorCode(), language);
            setCheckResult(result);

            if (result.allPassed) {
                setVictory();
            } else {
                setConfused();
            }

            // el asistente evalua el resultado, pista si falla o reset si bien
            proactive.notifyTestResult(result);
        } catch (error) {
            const message = getErrorMessage(error);
            setCheckResult({ tests: [], harnessError: message, allPassed: false });
            setConfused();
        } finally {
            setChecking(false);
        }
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
            setStatus(translate("status.selectProblemBeforeReset"));
            return;
        }

        setThinking();
        setStatus(translate("status.resetting"));

        try {
            const newSession = await createSession(selectedProblem.id);
            setActiveSessionId(newSession.id);
            clearConversation();
            setStatus(translate("status.resetDone"));
            setNormal();
        } catch (error) {
            const message = getErrorMessage(error);
            setStatus(translate("status.resetError", { message }));
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
            setStatus(translate("status.resumingSession", { title: problem.title }));
            try {
                const session = await fetchLatestSessionForProblem(problem.id);
                if (session) {
                    setInitialEditorCode(session.editorCode ?? null);
                }
                setProblemVisible(true);
                setCurrentView("workspace");
                setStatus(translate("status.sessionResumed", { title: problem.title }));
                setNormal();
            } catch (error) {
                const message = getErrorMessage(error);
                setStatus(translate("status.resumeError", { message }));
                setConfused();
            }
            return;
        }

        setThinking();
        setStatus(translate("status.openingSession", { title: problem.title }));

        try {
            await activateProblem(problem, { allowResumeLatest: true });
            setStatus(translate("status.problemLoaded", { title: problem.title }));
            setNormal();
        } catch (error) {
            const message = getErrorMessage(error);
            setStatus(translate("status.openSessionError", { message }));
            setConfused();
        }
    }

    async function handleSubmitProblem(input: CreateProblemInput) {
        if (editingProblem) {
            setStatus(translate("status.savingChanges"));

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
                setStatus(translate("status.problemUpdated", { title: updated.title }));
            } catch (error) {
                const message = getErrorMessage(error);
                setStatus(translate("status.saveError", { message }));
                throw new Error(message);
            }
        } else {
            setStatus(translate("status.creatingProblem"));

            try {
                const createdProblem = await createProblem(input);
                setProblems((previous) => [
                    createdProblem,
                    ...previous.filter((problem) => problem.id !== createdProblem.id),
                ]);

                setStatus(translate("status.problemCreatedCreatingSession", { title: createdProblem.title }));
                await activateProblem(createdProblem, { allowResumeLatest: false });
                setStatus(translate("status.problemLoaded", { title: createdProblem.title }));
            } catch (error) {
                const message = getErrorMessage(error);
                setStatus(translate("status.createProblemError", { message }));
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

            setStatus(translate("status.problemDeleted"));
        } catch (error) {
            const message = getErrorMessage(error);
            setStatus(translate("status.deleteError", { message }));
        }
    }

    async function handleContinueSession() {
        if (!selectedProblemId || !activeSessionId) return;

        setThinking();
        setStatus(translate("status.resumingSaved"));

        try {
            const session = await fetchLatestSessionForProblem(selectedProblemId);
            if (session) {
                setInitialEditorCode(session.editorCode ?? null);
            }
            setProblemVisible(true);
            setCurrentView("workspace");
            setStatus(translate("status.sessionResumed", { title: selectedProblem?.title ?? "" }));
            setNormal();
        } catch (error) {
            const message = getErrorMessage(error);
            setStatus(translate("status.resumeError", { message }));
            setConfused();
        }
    }

    const selectedProblemTitle = selectedProblem?.title ?? translate("status.defaultProblemTitle");
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

    const canCheck = Boolean(selectedProblem?.functionName && selectedProblem?.testCases);

    return (
        <WorkspacePage
            selectedProblemTitle={selectedProblemTitle}
            messages={messages}
            status={status}
            loading={loading}
            isSavingCode={isSavingCode}
            duckState={duckState}
            duckCompact={duckCompact}
            proactiveBubble={proactive.bubble}
            onAskInChat={handleAskInChat}
            onDismissBubble={handleDismissBubble}
            runningCode={runningCode}
            runOutput={runOutput}
            checking={checking}
            checkResult={checkResult}
            canCheck={canCheck}
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
            onCheckSolution={() => { void handleCheckSolution(); }}
            onToggleTheme={toggleTheme}
            onClearConversation={handleClearConversation}
            proactiveEnabled={proactiveEnabled}
            onToggleProactive={() => setProactiveEnabled((prev) => !prev)}
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
