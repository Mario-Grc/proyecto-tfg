import { useCallback, useEffect, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import type { CheckResult, CodeLanguage } from "../../shared/types";
import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
import CheckResultPanel from "../components/CheckResultPanel";
import CodeEditor from "../components/CodeEditor";
import DuckAssistant from "../components/DuckAssistant";
import NotesPanel from "../components/NotesPanel";
import OptionsMenu from "../components/OptionsMenu";
import ProblemPanel from "../components/ProblemPanel";
import { DuckState, Message } from "../types";

type ThemeMode = "dark" | "light";

interface WorkspacePageProps {
    selectedProblemTitle: string;
    selectedProblemId: string | null;
    messages: Message[];
    status: string;
    loading: boolean;
    isSavingCode?: boolean;
    duckState: DuckState;
    duckCompact: boolean;
    runningCode: boolean;
    runOutput: string;
    checking: boolean;
    checkResult: CheckResult | null;
    canCheck: boolean;
    inputText: string;
    chatVisible: boolean;
    problemVisible: boolean;
    chatWidth: number;
    problemWidth: number;
    problemText: string;
    chatTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
    themeMode: ThemeMode;
    language: CodeLanguage;
    initialEditorCode?: string | null;
    onEditorReady: (view: EditorView) => void;
    onEditorChange: (code: string) => void;
    onInputChange: (value: string) => void;
    onPromptSend: (text: string) => void;
    onToggleDuckCompact: () => void;
    onRunCode: () => void;
    onCheckSolution: () => void;
    onLanguageChange: (lang: CodeLanguage) => void;
    onToggleTheme: () => void;
    onClearConversation: () => void;
    onToggleChat: () => void;
    onToggleProblem: () => void;
    onHideChat: () => void;
    onHideProblem: () => void;
    onChatResizeMouseDown: (e: React.MouseEvent) => void;
    onProblemResizeMouseDown: (e: React.MouseEvent) => void;
    onGoSelector: () => void;
    onGoHome: () => void;
}

export default function WorkspacePage({
    selectedProblemTitle,
    selectedProblemId,
    messages,
    status,
    loading,
    isSavingCode,
    duckState,
    duckCompact,
    runningCode,
    runOutput,
    checking,
    checkResult,
    canCheck,
    inputText,
    chatVisible,
    problemVisible,
    chatWidth,
    problemWidth,
    problemText,
    chatTextareaRef,
    themeMode,
    language,
    initialEditorCode,
    onEditorReady,
    onEditorChange,
    onInputChange,
    onPromptSend,
    onToggleDuckCompact,
    onRunCode,
    onCheckSolution,
    onLanguageChange,
    onToggleTheme,
    onClearConversation,
    onToggleChat,
    onToggleProblem,
    onHideChat,
    onHideProblem,
    onChatResizeMouseDown,
    onProblemResizeMouseDown,
    onGoSelector,
    onGoHome,
}: WorkspacePageProps) {
    const [notesVisible, setNotesVisible] = useState(false);
    const [pendingLanguage, setPendingLanguage] = useState<CodeLanguage | null>(null);
    const [outputTab, setOutputTab] = useState<"run" | "check">("run");
    const pendingTimeoutRef = useRef<number | null>(null);

    const clearPendingLanguage = useCallback(() => {
        if (pendingTimeoutRef.current !== null) {
            clearTimeout(pendingTimeoutRef.current);
            pendingTimeoutRef.current = null;
        }
        setPendingLanguage(null);
    }, []);

    useEffect(() => clearPendingLanguage, [clearPendingLanguage]);

    function handleLanguageClick(lang: CodeLanguage) {
        if (lang === language) return;

        if (lang === pendingLanguage) {
            clearPendingLanguage();
            onLanguageChange(lang);
            return;
        }

        clearPendingLanguage();
        setPendingLanguage(lang);
        pendingTimeoutRef.current = window.setTimeout(clearPendingLanguage, 3000);
    }

    function handleCheckClick() {
        setOutputTab("check");
        onCheckSolution();
    }

    return (
        <div className="app-shell">
            <div className="workspace-frame">
                <header className="topbar">
                    <button type="button" className="topbar-title-link" onClick={onGoHome}>
                        <span className="topbar-title">QuackCode</span>
                    </button>
                    <div className="topbar-actions">
                        <button type="button" className="panel-quick-btn" onClick={onGoSelector}>
                            Cambiar problema
                        </button>
                        <OptionsMenu
                            themeMode={themeMode}
                            onToggleTheme={onToggleTheme}
                            onClearConversation={onClearConversation}
                        />
                    </div>
                </header>

                <div className="app-layout">
                    {chatVisible ? (
                        <>
                            <aside className="chat-panel" style={{ width: chatWidth, flexShrink: 0 }}>
                                <header className="chat-header">
                                    <div className="chat-header-main">
                                        <DuckAssistant
                                            state={duckState}
                                            compact={duckCompact}
                                            onToggleCompact={onToggleDuckCompact}
                                        />
                                    </div>

                                    <button type="button" className="panel-toggle-btn" onClick={onHideChat}>
                                        Ocultar
                                    </button>
                                </header>

                                <ChatWindow messages={messages} />

                                <ChatInput
                                    value={inputText}
                                    onChange={onInputChange}
                                    onSend={onPromptSend}
                                    disabled={loading}
                                    textareaRef={chatTextareaRef}
                                />

                                <p className="status">{status}</p>
                            </aside>

                            <div
                                className="resize-handle"
                                onMouseDown={onChatResizeMouseDown}
                                title="Arrastra para redimensionar"
                            />
                        </>
                    ) : (
                        <aside className="collapsed-rail collapsed-rail-left">
                            <button type="button" className="collapsed-rail-btn" onClick={onToggleChat} title="Mostrar chat">
                                Chat
                            </button>
                        </aside>
                    )}

                    <section className="editor-panel">
                        <div className="editor-runner-toolbar">
                            <div className="language-toggle" role="group" aria-label="Lenguaje del editor">
                                <button
                                    type="button"
                                    className={`language-toggle-btn${language === "javascript" ? " language-toggle-btn--active" : ""}${pendingLanguage === "javascript" ? " language-toggle-btn--confirming" : ""}`}
                                    onClick={() => handleLanguageClick("javascript")}
                                    disabled={runningCode || checking}
                                >
                                    {pendingLanguage === "javascript" ? "¿Cambiar?" : "JS"}
                                </button>
                                <button
                                    type="button"
                                    className={`language-toggle-btn${language === "python" ? " language-toggle-btn--active" : ""}${pendingLanguage === "python" ? " language-toggle-btn--confirming" : ""}`}
                                    onClick={() => handleLanguageClick("python")}
                                    disabled={runningCode || checking}
                                >
                                    {pendingLanguage === "python" ? "¿Cambiar?" : "Python"}
                                </button>
                            </div>

                            <div className="run-test-group" role="group" aria-label="Ejecutar y comprobar">
                                <button
                                    type="button"
                                    className="run-test-btn run-test-btn--run"
                                    onClick={onRunCode}
                                    disabled={runningCode || checking}
                                    title="Ejecutar código"
                                >
                                    {runningCode ? "Ejecutando..." : "Ejecutar"}
                                </button>
                                <button
                                    type="button"
                                    className="run-test-btn run-test-btn--test"
                                    onClick={handleCheckClick}
                                    disabled={!canCheck || checking || runningCode}
                                    title={canCheck ? "Comprobar solución contra los tests" : "Este problema no tiene tests configurados"}
                                >
                                    {checking ? "Comprobando..." : "Test"}
                                </button>
                            </div>

                            <span className="save-status">
                                {isSavingCode ? "Guardando..." : "Guardado"}
                            </span>
                        </div>

                        <CodeEditor
                            language={language}
                            initialCode={initialEditorCode}
                            onEditorReady={onEditorReady}
                            onChange={onEditorChange}
                        />

                        <section className="editor-output" aria-label="Salida de ejecucion de codigo">
                            <div className="editor-output-tabs">
                                <button
                                    type="button"
                                    className={`editor-output-tab${outputTab === "run" ? " editor-output-tab--active" : ""}`}
                                    onClick={() => setOutputTab("run")}
                                >
                                    Salida
                                </button>
                                <button
                                    type="button"
                                    className={`editor-output-tab${outputTab === "check" ? " editor-output-tab--active" : ""}`}
                                    onClick={() => setOutputTab("check")}
                                >
                                    Comprobación
                                </button>
                            </div>

                            {outputTab === "run" ? (
                                <pre className="editor-output-content">{runOutput}</pre>
                            ) : (
                                <div className="editor-output-content editor-output-content--check">
                                    <CheckResultPanel checking={checking} result={checkResult} />
                                </div>
                            )}
                        </section>
                    </section>

                    {problemVisible ? (
                        <>
                            <div
                                className="resize-handle"
                                onMouseDown={onProblemResizeMouseDown}
                                title="Arrastra para redimensionar"
                            />

                            <aside className="problem-side" style={{ width: problemWidth, flexShrink: 0 }}>
                                <div className="problem-split">
                                    <div className="problem-split-top">
                                        <ProblemPanel
                                            title={selectedProblemTitle}
                                            value={problemText}
                                            onHide={onHideProblem}
                                        />
                                    </div>

                                    {notesVisible && selectedProblemId ? (
                                        <div className="problem-split-bottom">
                                            <NotesPanel
                                                key={selectedProblemId}
                                                problemId={selectedProblemId}
                                                onHide={() => setNotesVisible(false)}
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="notes-show-btn"
                                            onClick={() => setNotesVisible(true)}
                                        >
                                            + Mostrar notas
                                        </button>
                                    )}
                                </div>
                            </aside>
                        </>
                    ) : (
                        <aside className="collapsed-rail collapsed-rail-right">
                            <button type="button" className="collapsed-rail-btn" onClick={onToggleProblem} title="Mostrar enunciado">
                                Enunciado
                            </button>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
}
