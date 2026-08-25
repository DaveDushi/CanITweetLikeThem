/**
 * Minimal Flue agent HTTP client for the site worker.
 *
 * Replaces `@flue/sdk` (whose transitive CommonJS deps break Astro's
 * workerd-based dev runner with "require is not defined"). We only ever do
 * two things against the agent: admit a user message, then read the reply.
 */

interface Admission {
	streamUrl?: string;
	offset?: string;
	submissionId?: string;
	uid?: string;
}

interface HistoryPayload {
	messages?: Array<{
		role?: string;
		parts?: Array<{ type?: string; text?: string }>;
	}>;
	settlements?: Array<{
		submissionId?: string;
		outcome?: string;
		error?: { message?: string } | string;
	}>;
}

const FAILED_OUTCOMES = new Set(['failed', 'error', 'aborted', 'cancelled', 'canceled']);

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function lastAssistantText(history: HistoryPayload): string | null {
	const messages = history.messages ?? [];
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i];
		if (m.role !== 'assistant') continue;
		const text = (m.parts ?? [])
			.filter((p) => p.type === 'text' && typeof p.text === 'string')
			.map((p) => p.text ?? '')
			.join('\n')
			.trim();
		if (text) return text;
	}
	return null;
}

async function readError(res: Response, fallback: string): Promise<Error> {
	let detail = '';
	try {
		detail = (await res.text()).slice(0, 200);
	} catch {
		// ignore unreadable bodies
	}
	return new Error(detail ? `${fallback} (${res.status}): ${detail}` : `${fallback} (${res.status})`);
}

export async function generateWithAgent(opts: {
	fetchImpl: typeof fetch;
	baseUrl: string;
	conversationId: string;
	message: string;
	token?: string;
	timeoutMs?: number;
}): Promise<string> {
	const url = `${opts.baseUrl.replace(/\/+$/, '')}/${opts.conversationId}`;
	const headers: Record<string, string> = { 'content-type': 'application/json' };
	if (opts.token) headers.authorization = `Bearer ${opts.token}`;
	const timeoutMs = opts.timeoutMs ?? 120_000;

	const admitted = await opts.fetchImpl(url, {
		method: 'POST',
		headers,
		body: JSON.stringify({ kind: 'user', body: opts.message }),
		signal: AbortSignal.timeout(30_000),
	});
	if (!admitted.ok && admitted.status !== 202) {
		throw await readError(admitted, 'agent rejected the request');
	}
	const admission = (await admitted.json().catch(() => null)) as Admission | null;

	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		await sleep(700);
		let history: HistoryPayload;
		try {
			const res = await opts.fetchImpl(`${url}?view=history`, {
				headers,
				signal: AbortSignal.timeout(15_000),
			});
			if (!res.ok) continue;
			history = (await res.json()) as HistoryPayload;
		} catch {
			continue;
		}

		const settlement = admission?.submissionId
			? (history.settlements ?? []).find((s) => s.submissionId === admission.submissionId)
			: undefined;

		if (settlement && FAILED_OUTCOMES.has(settlement.outcome ?? '')) {
			const msg =
				typeof settlement.error === 'string'
					? settlement.error
					: settlement.error?.message ?? 'agent failed';
			throw new Error(msg.slice(0, 300));
		}

		const text = lastAssistantText(history);
		if (text) return text;
	}
	throw new Error('agent timed out — try again');
}
