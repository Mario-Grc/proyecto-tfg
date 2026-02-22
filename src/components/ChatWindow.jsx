// Lista de mensajes con scroll automático

import { useRef, useEffect } from "react";
import ChatBubble from "./ChatBubble";

export default function ChatWindow({ messages }) {
    const bottomRef = useRef(null);

 
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
