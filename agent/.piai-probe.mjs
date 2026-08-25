import { readFileSync } from "node:fs";

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
	const m = line.match(/^([A-Z_]+)="?([^"\r\n]+)"?/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { createModels, createProvider, envApiKeyAuth } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { OPENROUTER_MODELS } from "@earendil-works/pi-ai/providers/openrouter.models";

const provider = createProvider({
	id: "openrouter",
	auth: { apiKey: envApiKeyAuth("OpenRouter API key", ["OPENROUTER_API_KEY"]) },
	models: [
		...Object.values(OPENROUTER_MODELS),
		{
			id: "stealth/ox-alpha",
			name: "ox-alpha (stealth)",
			api: "openai-completions",
			baseUrl: "https://openrouter.ai/api/v1",
			provider: "openrouter",
			reasoning: false,
			input: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 128000,
			maxTokens: 8192,
		},
	],
	api: openAICompletionsApi(),
});

const models = createModels();
models.setProvider(provider);

console.log("auth:", JSON.stringify(await models.getAuth("openrouter")));

const model = models.getModel("openrouter", "stealth/ox-alpha");

const events = models.streamSimple(model, {
	systemPrompt: "Reply with only the post text.",
	messages: [{ role: "user", content: "Say hi in 3 words", timestamp: Date.now() }],
});

let sawError = false;
for await (const event of events) {
	const t = event.type;
	if (t === "error") {
		sawError = true;
		console.log("ERROR EVENT:", JSON.stringify(event, null, 1));
	} else if (t !== "text_delta" && t !== "thinking_delta" && t !== "chunk_delta") {
		console.log("event:", t);
	}
}
console.log(sawError ? "RESULT: stream errored" : "STREAM OK");
