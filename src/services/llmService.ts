// comunicación con LM Studio
const MODEL_NAME = "local-model";
const API_ENDPOINT = "http://127.0.0.1:1234/v1/chat/completions";

// interfaz de cada mensaje
export interface ConversationMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

// interfaz de la respuesta de la api
export interface LLMAPIResponse {
    choices: { message: { content: string } }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// lo que devuelve sendMessage
export interface LLMResponse {
    text: string;     // texto limpio
    rawText: string;  // texto tal cual viene del modelo
    usage?: LLMAPIResponse["usage"];
}

// función para enviar un mensaje al modelo y obtener la respuesta
export async function sendMessage(conversation: ConversationMessage[]): Promise<LLMResponse> {
    const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: MODEL_NAME,
            messages: conversation,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json() as LLMAPIResponse;
    const rawText = data?.choices?.[0]?.message?.content?.trim();

    if (!rawText) {
        throw new Error("No llegó contenido del modelo.");
    }

    // de momento quito los bloques think
    const cleanText = rawText.replace(/<think>.*?<\/think>/gs, "").trim();

    return {
        text: cleanText,
        rawText,    // por si luego necesito el texto con los think
        usage: data?.usage,    // { prompt_tokens, completion_tokens, total_tokens }
    };
}
