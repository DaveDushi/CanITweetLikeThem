import { cloudflare } from '@cloudflare/vite-plugin';
import { flue, flueWorkerConfig } from '@flue/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [flue(), cloudflare({ config: flueWorkerConfig() })],
	server: {
		// The site calls the agent over the AGENT service binding with the
		// placeholder origin https://agent.internal; Vite's dev host guard
		// would otherwise reject that Host header with a 403.
		allowedHosts: ['agent.internal'],
	},
});
