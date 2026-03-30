// Un solo mensaje en el chat
import { useRef, useState, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import remarkGfm from "remark-gfm";
import { Message } from "../types";

interface ChatBubbleProps {
    text: string;
    type: Message["type"];
}

function MarkdownPre(props: ComponentPropsWithoutRef<"pre">) {
    const preRef = useRef<HTMLPreElement>(null);
    const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

    async function handleCopy() {
        const codeText = preRef.current?.innerText ?? "";

        if (!codeText.trim()) {
            return;
        }

        try {
            await navigator.clipboard.writeText(codeText);
            setCopyState("copied");
        } catch {
            setCopyState("error");
        }

        window.setTimeout(() => {
            setCopyState("idle");
        }, 1400);
    }

    const buttonLabel = copyState === "copied" ? "Copiado" : copyState === "error" ? "Error" : "Copiar";
    const buttonClassName = `copy-code-btn ${copyState === "copied" ? "is-copied" : ""} ${copyState === "error" ? "is-error" : ""}`.trim();

    return (
        <div className="code-block-shell">
            <button type="button" className={buttonClassName} onClick={handleCopy} aria-label="Copiar bloque de codigo">
                {buttonLabel}
            </button>
            <pre {...props} ref={preRef} />
        </div>
    );
}

export default function ChatBubble({ text, type }: ChatBubbleProps) {
    const className = type === "user" ? "user-message" : "llm-message";

    return (
        <div className={className}>
            {type === "llm" ? (
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                        pre: MarkdownPre,
                    }}
                    >
                    {text}
                </ReactMarkdown>
            ) : (
                text
            )}
        </div>
    );
}
