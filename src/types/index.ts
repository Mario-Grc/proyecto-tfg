export interface Message {
    id: string | number;
    text: string;
    type: "user" | "llm" | "tool";
}

export type DuckState = "normal" | "thinking" | "confused";