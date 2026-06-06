import { useState } from "react";
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
import type { ProactiveBubble } from "../hooks/useProactiveAssistant";
import { useTranslation } from "../i18n/LanguageContext";

type ThemeMode = "dark" | "light";

interface WorkspacePageProps {
    selectedProblemTitle: string;
    selectedProblemFunctionName: string | null;
    selectedProblemId: string | null;
    messages: Message[];
    status: string;
    loading: boolean;
    isSavingCode?: boolean;
    duckState: DuckState;
    duckCompact: boolean;
    proactiveBubble: ProactiveBubble | null;
    onAskInChat: () => void;
    onDismissBubble: () => void;
    proactiveEnabled: boolean;
    onToggleProactive: () => void;
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
    selectedProblemFunctionName,
    selectedProblemId,
    messages,
    status,
    loading,
    isSavingCode,
    duckState,
    duckCompact,
    proactiveBubble,
    onAskInChat,
    onDismissBubble,
    proactiveEnabled,
    onToggleProactive,
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
    const { translate } = useTranslation();
    const [notesVisible, setNotesVisible] = useState(false);
    const [outputTab, setOutputTab] = useState<"run" | "check">("run");

    function handleLanguageClick(lang: CodeLanguage) {
        if (lang === language) return;
        onLanguageChange(lang);
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
                            {translate("workspace.changeProblem")}
                        </button>
                        <OptionsMenu
                            themeMode={themeMode}
                            onToggleTheme={onToggleTheme}
                            onClearConversation={onClearConversation}
                            proactiveEnabled={proactiveEnabled}
                            onToggleProactive={onToggleProactive}
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
                                            bubble={proactiveBubble}
                                            onAskInChat={onAskInChat}
                                            onDismissBubble={onDismissBubble}
                                        />
                                    </div>

                                    <button type="button" className="panel-toggle-btn" onClick={onHideChat}>
                                        {translate("workspace.hide")}
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
                                title={translate("workspace.resizeTitle")}
                            />
                        </>
                    ) : (
                        <aside className="collapsed-rail collapsed-rail-left">
                            <button type="button" className="collapsed-rail-btn" onClick={onToggleChat} title={translate("workspace.showChatTitle")}>
                                {translate("workspace.chatLabel")}
                            </button>
                        </aside>
                    )}

                    <section className="editor-panel">
                        <div className="editor-runner-toolbar">
                            <div className="language-toggle" role="group" aria-label={translate("workspace.language.ariaLabel")}>
                                <button
                                    type="button"
                                    className={`language-toggle-btn${language === "javascript" ? " language-toggle-btn--active" : ""}`}
                                    onClick={() => handleLanguageClick("javascript")}
                                    disabled={runningCode || checking}
                                >
                                    JS
                                </button>
                                <button
                                    type="button"
                                    className={`language-toggle-btn${language === "python" ? " language-toggle-btn--active" : ""}`}
                                    onClick={() => handleLanguageClick("python")}
                                    disabled={runningCode || checking}
                                >
                                    Python
                                </button>
                            </div>

                            <div className="run-test-group" role="group" aria-label={translate("workspace.runTestGroup.ariaLabel")}>
                                <button
                                    type="button"
                                    className="run-test-btn run-test-btn--run"
                                    onClick={onRunCode}
                                    disabled={runningCode || checking}
                                    title={translate("workspace.runCode.title")}
                                >
                                    {runningCode ? translate("workspace.runCode.running") : translate("workspace.runCode.label")}
                                </button>
                                <button
                                    type="button"
                                    className="run-test-btn run-test-btn--test"
                                    onClick={handleCheckClick}
                                    disabled={!canCheck || checking || runningCode}
                                    title={canCheck ? translate("workspace.check.titleEnabled") : translate("workspace.check.titleDisabled")}
                                >
                                    {checking ? translate("workspace.check.checking") : translate("workspace.check.label")}
                                </button>
                            </div>

                            <span className="save-status">
                                {isSavingCode ? translate("workspace.saving") : translate("workspace.saved")}
                            </span>
                        </div>

                        <CodeEditor
                            language={language}
                            initialCode={initialEditorCode}
                            onEditorReady={onEditorReady}
                            onChange={onEditorChange}
                        />

                        <section className="editor-output" aria-label={translate("workspace.output.ariaLabel")}>
                            <div className="editor-output-tabs">
                                <button
                                    type="button"
                                    className={`editor-output-tab${outputTab === "run" ? " editor-output-tab--active" : ""}`}
                                    onClick={() => setOutputTab("run")}
                                >
                                    {translate("workspace.output.run")}
                                </button>
                                <button
                                    type="button"
                                    className={`editor-output-tab${outputTab === "check" ? " editor-output-tab--active" : ""}`}
                                    onClick={() => setOutputTab("check")}
                                >
                                    {translate("workspace.output.check")}
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
                                title={translate("workspace.resizeTitle")}
                            />

                            <aside className="problem-side" style={{ width: problemWidth, flexShrink: 0 }}>
                                <div className="problem-split">
                                    <div className="problem-split-top">
                                        <ProblemPanel
                                            title={selectedProblemTitle}
                                            functionName={selectedProblemFunctionName}
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
                                            {translate("workspace.notes.show")}
                                        </button>
                                    )}
                                </div>
                            </aside>
                        </>
                    ) : (
                        <aside className="collapsed-rail collapsed-rail-right">
                            <button type="button" className="collapsed-rail-btn" onClick={onToggleProblem} title={translate("workspace.showProblemTitle")}>
                                {translate("workspace.problemLabel")}
                            </button>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
}
