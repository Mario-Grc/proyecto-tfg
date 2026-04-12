export interface Message {
    id: string | number;
    text: string;
    type: "user" | "llm";
}

export type DuckState = "normal" | "thinking" | "confused";