import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { insertTab } from "@codemirror/commands";
import type { CodeLanguage } from "../../shared/types";
import { useTranslation } from "../i18n/LanguageContext";

interface CodeEditorProps {
    language?: CodeLanguage;
    initialCode?: string | null;
    onChange?: (code: string) => void;
    onEditorReady: (view: EditorView) => void;
}

export default function CodeEditor({ language = "javascript", onEditorReady, initialCode, onChange }: CodeEditorProps) {
    const { translate } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const languageRef = useRef<CodeLanguage>(language);

    // Recrear el editor cuando cambia el lenguaje
    useEffect(() => {
        if (!containerRef.current) return;

        const placeholderJs = translate("editor.placeholder.js");
        const placeholderPy = translate("editor.placeholder.python");

        const prevDoc = viewRef.current?.state.doc.toString();
        const prevLanguage = languageRef.current;
        const prevPlaceholder = prevLanguage === "python" ? placeholderPy : placeholderJs;

        viewRef.current?.destroy();
        viewRef.current = null;

        const langExtension = language === "python" ? python() : javascript();
        const placeholder = language === "python" ? placeholderPy : placeholderJs;

        let doc: string;
        if (prevDoc === undefined) {
            doc = initialCode ?? placeholder;
        } else if (prevLanguage !== language) {
            // Si estaba "limpio" (solo el placeholder anterior), mostrar el nuevo placeholder.
            // En cualquier otro caso (incluido vacío) conservar lo que el usuario tenía.
            doc = prevDoc === prevPlaceholder ? placeholder : prevDoc;
        } else {
            doc = initialCode ?? prevDoc ?? placeholder;
        }

        languageRef.current = language;

        const state = EditorState.create({
            doc,
            extensions: [
                basicSetup,
                langExtension,
                oneDark,
                keymap.of([{ key: "Tab", run: insertTab }]),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged && onChange) {
                        onChange(update.state.doc.toString());
                    }
                }),
            ],
        });

        const view = new EditorView({ state, parent: containerRef.current });
        viewRef.current = view;
        onEditorReady(view);

        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language, onEditorReady]);

    // Aplicar initialCode externo (carga de sesión) sin tocar el cambio de lenguaje
    useEffect(() => {
        if (!viewRef.current || initialCode == null) return;

        const currentDoc = viewRef.current.state.doc.toString();
        if (currentDoc !== initialCode) {
            viewRef.current.dispatch({
                changes: { from: 0, to: currentDoc.length, insert: initialCode },
            });
        }
    }, [initialCode]);

    return <div className="code-editor" ref={containerRef}></div>;
}
