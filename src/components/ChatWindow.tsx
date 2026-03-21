// Lista de mensajes con scroll automático

import { useRef, useEffect } from "react";
import ChatBubble from "./ChatBubble";
import { Message } from "../types";

interface ChatWindowProps {
    messages: Message[];
}

export default function ChatWindow({ messages }: ChatWindowProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

 
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="chat-messages">
            {messages.map((msg) => (
                <ChatBubble key={msg.id} text={msg.text} type={msg.type} />
            ))}
            <div ref={bottomRef} />
        </div>
    );
}
