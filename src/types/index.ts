export interface Message {
    id: number;
    text: string;
    type: "user" | "llm";
}