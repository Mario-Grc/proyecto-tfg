// comunicación con LM Studio
const MODEL_NAME = "local-model";
const API_ENDPOINT = "http://127.0.0.1:1234/v1/chat/completions";

/**
 * Envía el historial de conversación a LM Studio y devuelve la respuesta.
 *
 * @param {Array} conversation - Array de objetos {role, content}
 * @returns {Promise<{text: string, usage: object}>} - Texto limpio + info de tokens
 */
export async function sendMessage(conversation) {
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

    const data = await response.json();
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
