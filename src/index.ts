import skillMarkdown from "../skills/publish-artifact/SKILL.md";
import { landingPage, type ArtifactEntry } from "./page";

const MAX_BYTES = 25 * 1024 * 1024;
const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const RESERVED: Record<string, true> = { skill: true, "robots.txt": true, "favicon.ico": true, api: true };

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		try {
			return await route(request, env, url);
		} catch (error) {
			console.log(JSON.stringify({ level: "error", path: url.pathname, message: String(error) }));
			return json({ error: "internal error" }, 500);
		}
	},
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env, url: URL): Promise<Response> {
	const path = url.pathname;

	if (path === "/robots.txt" || path === "/skill") {
		if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed("GET, HEAD");
		if (path === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n");
		return new Response(skillMarkdown, {
			headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" },
		});
	}
	if (path === "/") {
		if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed("GET, HEAD");
		return listArtifacts(request, env, url);
	}

	const slug = decodeURIComponent(path.slice(1));
	switch (request.method) {
		case "GET":
			return serveArtifact(request, env, slug);
		case "HEAD":
			return headArtifact(env, slug);
		case "PUT":
			return putArtifact(request, env, slug, url);
		case "DELETE":
			return deleteArtifact(request, env, slug);
		default:
			return methodNotAllowed("GET, HEAD, PUT, DELETE");
	}
}

// --- publish / update ---

async function putArtifact(request: Request, env: Env, slug: string, url: URL): Promise<Response> {
	if (!SLUG_RE.test(slug) || RESERVED[slug]) {
		return json({ error: "invalid slug: lowercase [a-z0-9._-], must start alphanumeric, max 128 chars" }, 400);
	}
	const declared = Number(request.headers.get("content-length") ?? "0");
	if (declared > MAX_BYTES) return json({ error: "artifact too large (25 MB max)" }, 413);

	const existing = await env.BUCKET.head(slug);
	const admin = await isAdmin(request, env);

	let keyHash = existing?.customMetadata?.keyHash;
	let deployKey: string | undefined;
	if (existing) {
		if (!admin && !(await keyMatches(request, keyHash))) {
			return json({ error: "slug taken: pass its deploy key (Authorization: Bearer <key>) to update, or pick another slug" }, 403);
		}
	} else if (!admin) {
		deployKey = generateKey();
		keyHash = toHex(await sha256(deployKey));
	}

	const body = await request.arrayBuffer();
	if (body.byteLength === 0) return json({ error: "empty body" }, 400);
	if (body.byteLength > MAX_BYTES) return json({ error: "artifact too large (25 MB max)" }, 413);

	const contentType = request.headers.get("content-type") || "text/html; charset=utf-8";
	const object = await env.BUCKET.put(slug, body, {
		httpMetadata: { contentType },
		customMetadata: keyHash ? { keyHash } : undefined,
	});

	return json(
		{
			slug,
			url: `${url.origin}/${slug}`,
			size: object.size,
			uploaded: object.uploaded.toISOString(),
			...(deployKey ? { deployKey, note: "save the deployKey — it is the only way to update or delete this artifact" } : {}),
		},
		existing ? 200 : 201,
	);
}

async function deleteArtifact(request: Request, env: Env, slug: string): Promise<Response> {
	if (!SLUG_RE.test(slug)) return notFound();
	const existing = await env.BUCKET.head(slug);
	if (!existing) return notFound();
	const allowed = (await isAdmin(request, env)) || (await keyMatches(request, existing.customMetadata?.keyHash));
	if (!allowed) return json({ error: "unauthorized: pass the artifact's deploy key or the admin token" }, 403);
	await env.BUCKET.delete(slug);
	return new Response(null, { status: 204 });
}

// --- serve ---

async function serveArtifact(request: Request, env: Env, slug: string): Promise<Response> {
	if (!SLUG_RE.test(slug)) return notFound();
	let object: R2Object | R2ObjectBody | null;
	try {
		object = await env.BUCKET.get(slug, { onlyIf: request.headers });
	} catch {
		// malformed conditional headers (e.g. garbage If-None-Match) must not 500
		object = await env.BUCKET.get(slug);
	}
	if (!object) return notFound();
	const headers = artifactHeaders(object);
	if (!("body" in object)) return new Response(null, { status: 304, headers });
	return new Response(object.body, { headers });
}

async function headArtifact(env: Env, slug: string): Promise<Response> {
	if (!SLUG_RE.test(slug)) return notFound();
	const object = await env.BUCKET.head(slug);
	if (!object) return notFound();
	const headers = artifactHeaders(object);
	headers.set("content-length", String(object.size));
	return new Response(null, { headers });
}

function artifactHeaders(object: R2Object): Headers {
	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("etag", object.httpEtag);
	headers.set("last-modified", object.uploaded.toUTCString());
	headers.set("cache-control", "public, max-age=60");
	return headers;
}

// --- index ---

async function listArtifacts(request: Request, env: Env, url: URL): Promise<Response> {
	if (request.headers.get("accept")?.includes("application/json")) {
		if (!(await isAdmin(request, env))) {
			return json({ error: "listing requires the admin token" }, 401);
		}
		const entries: ArtifactEntry[] = [];
		let cursor: string | undefined;
		do {
			const page = await env.BUCKET.list({ cursor, limit: 1000 });
			for (const object of page.objects) {
				entries.push({ slug: object.key, size: object.size, uploaded: object.uploaded.toISOString() });
			}
			cursor = page.truncated ? page.cursor : undefined;
		} while (cursor);
		entries.sort((a, b) => b.uploaded.localeCompare(a.uploaded));
		return json(entries.map((entry) => ({ ...entry, url: `${url.origin}/${entry.slug}` })));
	}
	return new Response(landingPage(url.origin), {
		headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
	});
}

// --- auth ---

function bearerToken(request: Request): string {
	const header = request.headers.get("authorization") ?? "";
	return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function isAdmin(request: Request, env: Env): Promise<boolean> {
	const given = bearerToken(request);
	if (!given || !env.ARTIFACTS_TOKEN) return false;
	return timingSafeStringEqual(given, env.ARTIFACTS_TOKEN);
}

async function keyMatches(request: Request, keyHash: string | undefined): Promise<boolean> {
	if (!keyHash) return false;
	const given = request.headers.get("x-deploy-key") ?? bearerToken(request);
	if (!given) return false;
	return timingSafeStringEqual(toHex(await sha256(given)), keyHash);
}

/** Compare via SHA-256 digests so lengths always match and no length/content timing leaks. */
async function timingSafeStringEqual(a: string, b: string): Promise<boolean> {
	const [da, db] = await Promise.all([sha256(a), sha256(b)]);
	return crypto.subtle.timingSafeEqual(da, db);
}

async function sha256(text: string): Promise<Uint8Array> {
	return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generateKey(): string {
	return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

// --- responses ---

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data, null, "\t") + "\n", {
		status,
		headers: { "content-type": "application/json; charset=utf-8" },
	});
}

function notFound(): Response {
	return new Response("404 — no artifact here\n", {
		status: 404,
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
}

function methodNotAllowed(allow: string): Response {
	return new Response("405 — method not allowed\n", {
		status: 405,
		headers: { allow, "content-type": "text/plain; charset=utf-8" },
	});
}
