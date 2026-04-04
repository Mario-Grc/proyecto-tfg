export interface Message {
    id: number;
    text: string;
    type: "user" | "llm";
}

export type DuckState = "normal" | "thinking" | "confused";