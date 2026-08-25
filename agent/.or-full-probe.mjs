import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const key = env.match(/OPENROUTER_API_KEY=["']?([^"'\r\n]+)["']?/)?.[1];

for (let attempt = 1; attempt <= 3; attempt++) {
	const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
			"HTTP-Referer": "http://localhost:5173",
			"X-Title": "canitweetlikethem",
		},
		body: JSON.stringify({
			model: "stealth/ox-alpha",
			stream: true,
			messages: [
				{ role: "system", content: "You are a ghostwriting engine for X posts. Reply with ONLY the post text." },
				{ role: "user", content: "Write a tweet about coffee" },
			],
		}),
	});
	const raw = await res.text();
	const hasErrData = /data:\s*\{"error"/.test(raw);
	const errMatch = raw.match(/\{"error":[^\n]*/);
	console.log(`attempt ${attempt}: status=${res.status} bytes=${raw.length} sse-error-payload=${hasErrData}`);
	if (errMatch) console.log("  err payload:", errMatch[0].slice(0, 400));
	const nonDataLines = raw.split("\n").filter((l) => l && !l.startsWith("data:") && !l.startsWith(": OPENROUTER"));
	if (nonDataLines.length) console.log("  unexpected lines:", JSON.stringify(nonDataLines.slice(0, 5)));
}
