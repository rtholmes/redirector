import http from "node:http";
import type {AddressInfo} from "node:net";
import type {Express} from "express";

/*
 * Minimal stand-in for chai-http, built on Node's http server and fetch.
 */

export interface TestResponse {
	status: number;
	text: string;
	/** Response headers, lower-case names. */
	header: Record<string, string>;
}

/** Serve an Express app on a random local port for the duration of a test suite. */
export async function startTestServer(app: Express): Promise<{baseUrl: string; stop: () => Promise<void>}> {
	const server = http.createServer(app);
	await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
	const {port} = server.address() as AddressInfo;
	return {
		baseUrl: `http://127.0.0.1:${port}`,
		stop: () => new Promise<void>((resolve, reject) => {
			server.closeAllConnections();
			server.close(err => err ? reject(err) : resolve());
		}),
	};
}

/**
 * Keeps the cookies the server sets and follows redirects the way superagent did:
 * after a 301/302/303 the next hop is a GET without a body, for at most five hops.
 * A Cookie header given with set() is sent on every hop, with the agent's own
 * cookies taking precedence for the same name.
 */
export class TestAgent {
	private readonly jar = new Map<string, string>();

	constructor(private readonly baseUrl: string) {
	}

	get(path: string): TestRequest {
		return new TestRequest(this, "GET", path);
	}

	post(path: string): TestRequest {
		return new TestRequest(this, "POST", path);
	}

	async perform(method: string, path: string, body: unknown, cookie: string | undefined, maxRedirects: number): Promise<TestResponse> {
		let url = new URL(path, this.baseUrl);
		for (let hop = 0; ; hop++) {
			const headers: Record<string, string> = {};
			const cookies = new Map([...parseCookieHeader(cookie), ...this.jar]);
			if (cookies.size > 0) {
				headers.cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
			}
			let payload: string | undefined;
			if (method !== "GET" && body !== undefined) {
				headers["content-type"] = "application/json";
				payload = JSON.stringify(body);
			}

			const res = await fetch(url, {method, headers, body: payload, redirect: "manual"});
			this.store(res.headers.getSetCookie());

			const location = res.headers.get("location");
			if (res.status >= 300 && res.status < 400 && location !== null && hop < maxRedirects) {
				const next = new URL(location, url);
				if (next.origin !== url.origin) {
					throw new Error(`test agent will not follow an external redirect to ${next}`);
				}
				await res.arrayBuffer();
				url = next;
				if (res.status !== 307 && res.status !== 308) {
					method = "GET";
					body = undefined;
				}
				continue;
			}
			return {status: res.status, text: await res.text(), header: Object.fromEntries(res.headers)};
		}
	}

	private store(setCookies: string[]) {
		for (const line of setCookies) {
			const [pair, ...attributes] = line.split(";");
			const eq = pair.indexOf("=");
			const name = pair.slice(0, eq).trim();
			const expired = attributes.some(attribute => {
				const [key, value] = attribute.trim().split("=");
				return (key.toLowerCase() === "expires" && Date.parse(value) <= Date.now())
					|| (key.toLowerCase() === "max-age" && Number(value) <= 0);
			});
			if (expired) {
				this.jar.delete(name);
			} else {
				this.jar.set(name, pair.slice(eq + 1).trim());
			}
		}
	}
}

/** A request that runs when awaited, with superagent's chainable set/send/redirects. */
export class TestRequest implements PromiseLike<TestResponse> {
	private body: unknown;
	private cookie: string | undefined;
	private maxRedirects = 5;

	constructor(private readonly agent: TestAgent, private readonly method: string, private readonly path: string) {
	}

	set(name: string, value: string): this {
		if (name.toLowerCase() !== "cookie") {
			throw new Error(`test agent only supports setting the Cookie header, not ${name}`);
		}
		this.cookie = value;
		return this;
	}

	send(body?: unknown): this {
		this.body = body;
		return this;
	}

	redirects(max: number): this {
		this.maxRedirects = max;
		return this;
	}

	then<A = TestResponse, B = never>(
		onfulfilled?: ((value: TestResponse) => A | PromiseLike<A>) | null,
		onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
	): PromiseLike<A | B> {
		return this.agent.perform(this.method, this.path, this.body, this.cookie, this.maxRedirects).then(onfulfilled, onrejected);
	}
}

function parseCookieHeader(header: string | undefined): [string, string][] {
	if (header === undefined) {
		return [];
	}
	return header.split(";").map(part => part.trim()).filter(part => part.includes("=")).map(part => {
		const eq = part.indexOf("=");
		return [part.slice(0, eq), part.slice(eq + 1)];
	});
}
