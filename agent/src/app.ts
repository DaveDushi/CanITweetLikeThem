import { createAgentRouter } from '@flue/runtime/routing';
import { Hono } from 'hono';
import { TweetWriter } from './agents/tweet-writer.ts';

const app = new Hono();

// Shared-secret auth before admission: the site sends `Bearer <AGENT_TOKEN>`.
// If AGENT_TOKEN is unset (local dev), requests pass through unauthenticated.
app.use('/agents/tweet-writer/*', async (c, next) => {
	const expected = (c.env as { AGENT_TOKEN?: string } | undefined)?.AGENT_TOKEN;
	if (!expected) return next();
	if (c.req.header('authorization') === `Bearer ${expected}`) return next();
	return c.text('unauthorized', 401);
});

app.route('/agents/tweet-writer', createAgentRouter(TweetWriter));

export default app;
