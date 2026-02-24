// Un solo mensaje en el chat

import ReactMarkdown from "react-markdown";

interface ChatBubbleProps {
    text: string;
    type: "user" | "llm";
}

export default function ChatBubble({ text, type }: ChatBubbleProps) {
    const className = type === "user" ? "user-message" : "llm-message";

    return (
        <div className={className}>
            {type === "llm" ? (
                <ReactMarkdown>{text}</ReactMarkdown>
            ) : (
                text
            )}
        </div>
    );
}
