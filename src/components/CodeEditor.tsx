import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { insertTab } from "@codemirror/commands";
import type { CodeLanguage } from "../../shared/types";

const PLACEHOLDER_JS = `// Escribe tu código JavaScript aquí...
function saludar(nombre) {
    console.log("¡Hola, " + nombre + "!");
}

saludar("Usuario");
`;

const PLACEHOLDER_PY = `# Escribe tu código Python aquí...
def saludar(nombre):
    print(f"¡Hola, {nombre}!")

saludar("Usuario")
`;

interface CodeEditorProps {
    language?: CodeLanguage;
    initialCode?: string | null;
    onChange?: (code: string) => void;
    onEditorReady: (view: EditorView) => void;
}

export default function CodeEditor({ language = "javascript", onEditorReady, initialCode, onChange }: CodeEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const languageRef = useRef<CodeLanguage>(language);

    // Recrear el editor cuando cambia el lenguaje
    useEffect(() => {
        if (!containerRef.current) return;

        const prevDoc = viewRef.current?.state.doc.toString();

        viewRef.current?.destroy();
        viewRef.current = null;

        const langExtension = language === "python" ? python() : javascript();
        const placeholder = language === "python" ? PLACEHOLDER_PY : PLACEHOLDER_JS;

        // Si el lenguaje cambió (no primera carga), resetear el doc al placeholder
        const doc = languageRef.current !== language
            ? placeholder
            : (initialCode ?? prevDoc ?? placeholder);

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

    // Aplicar initialCode externo sin tocar el lenguaje
    useEffect(() => {
        if (!viewRef.current) return;

        const currentDoc = viewRef.current.state.doc.toString();
        const placeholder = language === "python" ? PLACEHOLDER_PY : PLACEHOLDER_JS;
        const newCode = initialCode ?? placeholder;

        if (currentDoc !== newCode) {
            viewRef.current.dispatch({
                changes: { from: 0, to: currentDoc.length, insert: newCode },
            });
        }
    }, [initialCode, language]);

    return <div className="code-editor" ref={containerRef}></div>;
}
