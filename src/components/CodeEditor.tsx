import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { keymap } from "@codemirror/view";
import { insertTab } from "@codemirror/commands";

const PLACEHOLDER = `// Escribe tu codigo JavaScript aqui...
function saludar(nombre) {
    console.log("¡Hola, " + nombre + "!");
}

saludar("Usuario");
`

interface CodeEditorProps {
    onEditorReady: (view: EditorView) => void;
}

export default function CodeEditor({ onEditorReady}: CodeEditorProps) {

    const containerRef = useRef<HTMLDivElement>(null);

    const viewRef = useRef<EditorView | null>(null);

    useEffect(() => {
        if (viewRef.current || !containerRef.current) return;
        
        const state = EditorState.create({
            doc: PLACEHOLDER,
            extensions: [
                basicSetup,
                javascript(),
                oneDark,
                keymap.of([{ key: "Tab", run: insertTab }]),
                // EditorView.lineWrapping
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

    return <div className="code-editor" ref={containerRef}></div>
}