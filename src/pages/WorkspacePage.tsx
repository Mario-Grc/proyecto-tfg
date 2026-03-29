import { EditorView } from "@codemirror/view";
import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
import CodeEditor from "../components/CodeEditor";
import OptionsMenu from "../components/OptionsMenu";
import ProblemPanel from "../components/ProblemPanel";
import { Message } from "../types";

type ThemeMode = "dark" | "light";

interface WorkspacePageProps {
    selectedProblemTitle: string;
    messages: Message[];
    status: string;
    loading: boolean;
    inputText: string;
    chatVisible: boolean;
    problemVisible: boolean;
    chatWidth: number;
    problemWidth: number;
    problemText: string;
    chatTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
    themeMode: ThemeMode;
    onEditorReady: (view: EditorView) => void;
    onInputChange: (value: string) => void;
    onPromptSend: (text: string) => void;
    onInsertCode: () => void;
    onToggleTheme: () => void;
    onClearConversation: () => void;
    onToggleChat: () => void;
    onToggleProblem: () => void;
    onHideChat: () => void;
    onHideProblem: () => void;
    onProblemTextChange: (value: string) => void;
    onChatResizeMouseDown: (e: React.MouseEvent) => void;
    onProblemResizeMouseDown: (e: React.MouseEvent) => void;
    onGoSelector: () => void;
    onGoHome: () => void;
}

export default function WorkspacePage({
    selectedProblemTitle,
    messages,
    status,
    loading,
    inputText,
    chatVisible,
    problemVisible,
    chatWidth,
    problemWidth,
    problemText,
    chatTextareaRef,
    themeMode,
    onEditorReady,
    onInputChange,
    onPromptSend,
    onInsertCode,
    onToggleTheme,
    onClearConversation,
    onToggleChat,
    onToggleProblem,
    onHideChat,
    onHideProblem,
    onProblemTextChange,
    onChatResizeMouseDown,
    onProblemResizeMouseDown,
    onGoSelector,
    onGoHome,
}: WorkspacePageProps) {
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
                                        <p className="chat-subtitle">Chat de apoyo.</p>
                                        <span className="duck-indicator" aria-label="Mascota pato">Pato</span>
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
                                    onInsertCode={onInsertCode}
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
                        <CodeEditor onEditorReady={onEditorReady} />
                    </section>

                    {problemVisible ? (
                        <>
                            <div
                                className="resize-handle"
                                onMouseDown={onProblemResizeMouseDown}
                                title="Arrastra para redimensionar"
                            />

                            <aside className="problem-side" style={{ width: problemWidth, flexShrink: 0 }}>
                                <ProblemPanel
                                    title={selectedProblemTitle}
                                    value={problemText}
                                    onChange={onProblemTextChange}
                                    onHide={onHideProblem}
                                />
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
