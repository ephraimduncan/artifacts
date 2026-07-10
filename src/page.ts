export interface ArtifactEntry {
	slug: string;
	size: number;
	uploaded: string;
}

export function landingPage(entries: ArtifactEntry[], origin: string): string {
	const host = origin.replace(/^https?:\/\//, "");
	const rows = entries
		.map(
			(entry) => `\t\t\t<li>
\t\t\t\t<a href="/${escapeHtml(entry.slug)}">${escapeHtml(entry.slug)}</a>
\t\t\t\t<span class="meta">${humanSize(entry.size)} · ${humanDate(entry.uploaded)}</span>
\t\t\t</li>`,
		)
		.join("\n");

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>artifacts — push an HTML file, get a link</title>
	<meta name="description" content="A tiny public host for self-contained HTML files. No accounts. curl it and share the link.">
	<style>
		:root { color-scheme: dark; }
		* { box-sizing: border-box; }
		body {
			margin: 0 auto; max-width: 720px; padding: 56px 24px 96px;
			background: #0b0b0d; color: #e4e4e7;
			font: 15px/1.65 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
			font-feature-settings: "cv11", "ss01";
		}
		h1 { font-size: 22px; font-weight: 650; letter-spacing: -0.02em; margin: 0; }
		h1 span { color: #52525b; font-weight: 400; }
		p.tag { color: #a1a1aa; margin: 6px 0 0; }
		h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #71717a; margin: 48px 0 12px; }
		p { color: #a1a1aa; margin: 10px 0; }
		p strong { color: #d4d4d8; font-weight: 550; }
		pre {
			background: #131316; border: 1px solid #26262b; border-radius: 8px;
			padding: 12px 14px; overflow-x: auto; margin: 10px 0;
			font: 12.5px/1.7 ui-monospace, "SF Mono", Menlo, monospace; color: #d4d4d8;
		}
		pre .c { color: #52525b; }
		code { font: 12.5px ui-monospace, "SF Mono", Menlo, monospace; background: #131316; border: 1px solid #26262b; border-radius: 4px; padding: 1px 5px; }
		ul.artifacts { list-style: none; margin: 0; padding: 0; }
		ul.artifacts li { display: flex; align-items: baseline; gap: 12px; padding: 9px 0; border-bottom: 1px solid #1a1a1e; }
		ul.artifacts a { color: #e4e4e7; text-decoration: none; font-weight: 500; overflow-wrap: anywhere; }
		ul.artifacts a:hover { text-decoration: underline; text-underline-offset: 3px; }
		.meta { color: #63636b; font-size: 12.5px; font-variant-numeric: tabular-nums; margin-left: auto; white-space: nowrap; }
		.empty { color: #63636b; padding: 24px 0; }
		ul.rules { margin: 10px 0; padding-left: 18px; color: #a1a1aa; }
		ul.rules li { margin: 4px 0; }
		footer { margin-top: 64px; color: #52525b; font-size: 12.5px; }
		footer a { color: #71717a; }
	</style>
</head>
<body>
	<header>
		<h1>artifacts <span>— push an HTML file, get a link</span></h1>
		<p class="tag">A tiny public host for self-contained HTML — agent-generated reports, PR canvases, one-off pages. No accounts.</p>
	</header>

	<section>
		<h2>Publish</h2>
		<pre>curl -T report.html https://${host}/my-report</pre>
		<p>The response is JSON with your public <code>url</code> and a <code>deployKey</code>. <strong>Save the deployKey</strong> — it's the only way to update or delete what you published.</p>
		<h2>Update or delete</h2>
		<pre><span class="c"># overwrite with a new version</span>
curl -T report.html -H "Authorization: Bearer &lt;deployKey&gt;" https://${host}/my-report
<span class="c"># remove it</span>
curl -X DELETE -H "Authorization: Bearer &lt;deployKey&gt;" https://${host}/my-report</pre>
	</section>

	<section>
		<h2>Teach your agent</h2>
		<p>There's an installable skill so your coding agent can publish its own reports when you say "publish this":</p>
		<pre>curl --create-dirs -o ~/.claude/skills/publish-artifact/SKILL.md https://${host}/skill</pre>
		<p>(Adjust the path to wherever your agent discovers skills.)</p>
	</section>

	<section>
		<h2>Rules</h2>
		<ul class="rules">
			<li>One self-contained HTML file per slug, 25 MB max.</li>
			<li>Everything here is public — anyone with the link (or this page) can read it.</li>
			<li>Slugs are first-come-first-served: <code>[a-z0-9._-]</code>, up to 128 chars.</li>
			<li>Be decent. Abuse gets deleted.</li>
		</ul>
	</section>

	<section>
		<h2>Published (${entries.length})</h2>
		${entries.length === 0 ? '<p class="empty">Nothing yet. Be the first.</p>' : `<ul class="artifacts">\n${rows}\n\t\t</ul>`}
	</section>

	<footer>Made by <a href="https://duncan.land">duncan</a>. This page as JSON: <code>curl -H "Accept: application/json" https://${host}/</code></footer>
</body>
</html>
`;
}

function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function humanSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function humanDate(iso: string): string {
	const date = new Date(iso);
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
