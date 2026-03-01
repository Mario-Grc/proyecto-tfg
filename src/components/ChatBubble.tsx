// Un solo mensaje en el chat
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import remarkGfm from "remark-gfm";

interface ChatBubbleProps {
    text: string;
    type: "user" | "llm";
}

export default function ChatBubble({ text, type }: ChatBubbleProps) {
    const className = type === "user" ? "user-message" : "llm-message";

    return (
        <div className={className}>
            {type === "llm" ? (
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    >
                    {text}
                </ReactMarkdown>
            ) : (
                text
            )}
        </div>
    );
}
