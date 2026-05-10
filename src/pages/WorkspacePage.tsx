import { useState } from "react";
import { EditorView } from "@codemirror/view";
import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
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
    inputText: string;
    chatVisible: boolean;
    problemVisible: boolean;
    chatWidth: number;
    problemWidth: number;
    problemText: string;
    chatTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
    themeMode: ThemeMode;
    initialEditorCode?: string | null;
    onEditorReady: (view: EditorView) => void;
    onEditorChange: (code: string) => void;
    onInputChange: (value: string) => void;
    onPromptSend: (text: string) => void;
    onToggleDuckCompact: () => void;
    onRunJavaScript: () => void;
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
    inputText,
    chatVisible,
    problemVisible,
    chatWidth,
    problemWidth,
    problemText,
    chatTextareaRef,
    themeMode,
    initialEditorCode,
    onEditorReady,
    onEditorChange,
    onInputChange,
    onPromptSend,
    onToggleDuckCompact,
    onRunJavaScript,
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
                            <button type="button" className="run-js-btn" onClick={onRunJavaScript} disabled={runningCode}>
                                {runningCode ? "Ejecutando JS..." : "Ejecutar JS"}
                            </button>
                            <span className="save-status">
                                {isSavingCode ? "Guardando..." : "Guardado"}
                            </span>
                        </div>

                        <CodeEditor
                            initialCode={initialEditorCode}
                            onEditorReady={onEditorReady}
                            onChange={onEditorChange}
                        />

                        <section className="editor-output" aria-label="Salida de ejecucion JavaScript">
                            <div className="editor-output-head">
                                <p className="editor-output-title">Salida</p>
                            </div>
                            <pre className="editor-output-content">{runOutput}</pre>
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
