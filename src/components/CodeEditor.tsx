import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { keymap } from "@codemirror/view";
import { insertTab } from "@codemirror/commands";

const PLACEHOLDER = `// Escribe tu código JavaScript aquí...
function saludar(nombre) {
    console.log("¡Hola, " + nombre + "!");
}

saludar("Usuario");
`

interface CodeEditorProps {
    initialCode?: string | null;
    onChange?: (code: string) => void;
    onEditorReady: (view: EditorView) => void;
}

export default function CodeEditor({ onEditorReady, initialCode, onChange }: CodeEditorProps) {

    const containerRef = useRef<HTMLDivElement>(null);

    const viewRef = useRef<EditorView | null>(null);

    // initialCode se aplica después del montaje vía el segundo efecto; no va en las deps de este.
    useEffect(() => {
        if (viewRef.current || !containerRef.current) return;

        const state = EditorState.create({
            doc: initialCode ?? PLACEHOLDER,
            extensions: [
                basicSetup,
                javascript(),
                oneDark,
                keymap.of([{ key: "Tab", run: insertTab }]),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged && onChange) {
                        onChange(update.state.doc.toString());
                    }
                })
            ]
        });

        const view = new EditorView({
            state,
            parent: containerRef.current
        });

        viewRef.current = view;
        onEditorReady(view);

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, [onEditorReady]);

    useEffect(() => {
        if (!viewRef.current) return;
        
        const currentDoc = viewRef.current.state.doc.toString();
        const newCode = initialCode ?? PLACEHOLDER;
        
        if (currentDoc !== newCode) {
            viewRef.current.dispatch({
                changes: { from: 0, to: currentDoc.length, insert: newCode }
            });
        }
    }, [initialCode]);

    return <div className="code-editor" ref={containerRef}></div>
}