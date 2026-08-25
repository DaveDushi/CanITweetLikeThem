'use agent';
import { setProvider, useModel } from '@flue/runtime';
import { createAssistantMessageEventStream, createProvider, envApiKeyAuth } from '@earendil-works/pi-ai';
import type { AssistantMessageEventStream } from '@earendil-works/pi-ai';
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy';
import { OPENROUTER_MODELS } from '@earendil-works/pi-ai/providers/openrouter.models';

const MODEL_ID = 'stealth/ox-alpha';

// stealth/ox-alpha isn't in Pi's bundled OpenRouter catalog yet, so re-register
// the provider with it appended. Lives in this module so `flue run` sees it too.
setProvider(
	createProvider({
		id: 'openrouter',
		auth: { apiKey: envApiKeyAuth('OpenRouter API key', ['OPENROUTER_API_KEY']) },
		models: [
			...Object.values(OPENROUTER_MODELS),
			{
				id: MODEL_ID,
				name: 'ox-alpha (stealth)',
				api: 'openai-completions',
				baseUrl: 'https://openrouter.ai/api/v1',
				provider: 'openrouter',
				reasoning: false,
				input: ['text'],
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
				contextWindow: 128000,
				maxTokens: 8192,
			},
		],
		api: withRetryableErrors(openAICompletionsApi()),
	}),
);

// OpenRouter reports upstream pool failures as opaque mid-stream messages like
// "JSON error injected into SSE stream" with no status code attached. Flue's
// transient-model-retry classifier only fires on recognizable signals (status
// codes, "rate limit", "server error", …), so tag those messages before they
// reach the session — otherwise a recoverable blip terminally fails the turn.
const ALREADY_RETRYABLE = /overloaded|rate.?limit|too many requests|\b429\b|\b500\b|\b502\b|\b503\b|\b504\b|service.?unavailable|server.?error|network.?error|connection.?(?:reset|refused|lost)|socket hang up|fetch failed|timed? out|timeout|terminated/i;
const FATAL = /\b40[134]\b|unauthorized|forbidden|authentication|invalid api key|no api key|not configured/i;

function tagTransient(message: unknown): void {
	const assistant = message as { errorMessage?: string } | undefined;
	if (typeof assistant?.errorMessage !== 'string') return;
	if (ALREADY_RETRYABLE.test(assistant.errorMessage) || FATAL.test(assistant.errorMessage)) return;
	assistant.errorMessage += ' (server error)';
}

function withRetryableErrors(api: ReturnType<typeof openAICompletionsApi>): ReturnType<typeof openAICompletionsApi> {
	const retag = (inner: AssistantMessageEventStream): AssistantMessageEventStream => {
		const out = createAssistantMessageEventStream();
		void (async () => {
			// The consumer may abandon the stream on interrupt/abort; draining a dead
			// reader surfaces as a rejection nobody can handle, so swallow it here.
			try {
				for await (const event of inner) {
					if (event.type === 'error') tagTransient(event.error);
					out.push(event);
					if (event.type === 'error' || event.type === 'done') break;
				}
			} catch {
				/* aborted */
			}
		})();
		return out;
	};
	return {
		stream: (model, context, options) => retag(api.stream(model, context, options)),
		streamSimple: (model, context, options) => retag(api.streamSimple(model, context, options)),
	};
}

// One stateless ghostwriter agent. Each request carries the full voice brief
// in the user message body, so no conversation continuity is needed.
export function TweetWriter() {
	useModel(`openrouter/${MODEL_ID}`);
	return [
		'You are a ghostwriting engine for X (Twitter) posts.',
		'The user message contains VOICE RULES describing one creator and a REQUEST.',
		'Follow the voice rules exactly and write ONE finished X post that fulfills the request.',
		'Reply with ONLY the post text — no preamble, no quotes around it, no explanation.',
		'Use plain text and ordinary emoji only. Never output mojibake or garbled Unicode (like Ã© or ðŸ). If unsure how a character encodes, drop it.',
	].join('\n');
}
