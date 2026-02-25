import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";

const PLACEHOLDER = `# Escribe tu código aquí...
def hola():
    print("Hola")

hola()
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
                python(), 
                oneDark,
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