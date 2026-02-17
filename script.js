// si hay mas de un modelo activo en LM Studio, hay que cambiar esto por el nombre del que quiera
const MODEL_NAME = "local-model";

const chatForm = document.getElementById("chat-form");
const promptInput = document.getElementById("prompt");
const messages = document.getElementById("chat-messages");
const statusEl = document.getElementById("status");
const endpointInput = document.getElementById("endpoint");
const sendBtn = document.getElementById("send-btn");

const conversation = [
	{ role: "system", content: "Eres un asistente útil y breve." }
];

function addMessage(text, type) {
	const bubble = document.createElement("div");
	bubble.className = type === "user" ? "user-message" : "llm-message";
	bubble.textContent = text;
	messages.appendChild(bubble);
	messages.scrollTop = messages.scrollHeight;
}

async function sendMessage(userText) {
	const endpoint = endpointInput.value.trim();

	if (!endpoint) {
		throw new Error("Define un endpoint válido.");
	}

	conversation.push({ role: "user", content: userText });

	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			model: MODEL_NAME,
			messages: conversation,
			temperature: 0.7
		})
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Error HTTP ${response.status}: ${text}`);
	}

	const data = await response.json();
	const llmText = data?.choices?.[0]?.message?.content?.trim();

	if (!llmText) {
		throw new Error("No llegó contenido del modelo.");
	}

    const sinPensamiento = llmText.replace(/<think>.*?<\/think>/gs, "").trim();

	conversation.push({ role: "assistant", content: llmText });
	return sinPensamiento;
}

chatForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	const userText = promptInput.value.trim();

	if (!userText) {
		return;
	}

	addMessage(userText, "user");
	promptInput.value = "";
	promptInput.focus();
	sendBtn.disabled = true;
	statusEl.textContent = "Consultando al modelo...";

	try {
		const llmText = await sendMessage(userText);
		addMessage(llmText, "llm");
		statusEl.textContent = "Respuesta recibida.";
	} catch (error) {
		statusEl.textContent = `Fallo: ${error.message}`;
		addMessage(`${error.message}`, "llm");
	} finally {
		sendBtn.disabled = false;
	}
});
