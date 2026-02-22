// Un solo mensaje en el chat

import ReactMarkdown from "react-markdown";

export default function ChatBubble({ text, type }) {
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
