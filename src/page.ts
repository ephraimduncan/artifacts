export interface ArtifactEntry {
	slug: string;
	size: number;
	uploaded: string;
}

export function landingPage(origin: string): string {
	const host = origin.replace(/^https?:\/\//, "");

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>artifacts — push an HTML file, get a link</title>
	<meta name="description" content="A tiny host for self-contained HTML files. No accounts. curl it and share the link.">
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
		a { color: #d4d4d8; text-underline-offset: 3px; }
		pre {
			background: #131316; border: 1px solid #26262b; border-radius: 8px;
			padding: 12px 14px; overflow-x: auto; margin: 10px 0;
			font: 12.5px/1.7 ui-monospace, "SF Mono", Menlo, monospace; color: #d4d4d8;
		}
		pre .c { color: #52525b; }
		code { font: 12.5px ui-monospace, "SF Mono", Menlo, monospace; background: #131316; border: 1px solid #26262b; border-radius: 4px; padding: 1px 5px; }
		ul.rules { margin: 10px 0; padding-left: 18px; color: #a1a1aa; }
		ul.rules li { margin: 4px 0; }
		footer { margin-top: 64px; color: #52525b; font-size: 12.5px; }
		footer a { color: #71717a; }
	</style>
</head>
<body>
	<header>
		<h1>artifacts <span>— push an HTML file, get a link</span></h1>
		<p class="tag">A tiny host for self-contained HTML — agent-generated reports, PR canvases, one-off pages. No accounts.</p>
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
		<p>Install the <code>publish-artifact</code> skill so your coding agent can publish its own reports when you say "publish this":</p>
		<pre>npx skills add ephraimduncan/artifacts</pre>
		<p>Works with Claude Code, Cursor, Codex, OpenCode, and <a href="https://skills.sh">many more</a>. Or grab the raw skill: <code>curl https://${host}/skill</code></p>
	</section>

	<section>
		<h2>Rules</h2>
		<ul class="rules">
			<li>One self-contained HTML file per slug, 25 MB max.</li>
			<li>Artifacts are unlisted — nothing is browsable here. Anyone with a link can read it, so mind what you publish.</li>
			<li>Slugs are first-come-first-served: <code>[a-z0-9._-]</code>, up to 128 chars.</li>
			<li>Be decent. Abuse gets deleted.</li>
		</ul>
	</section>

	<footer>Made by <a href="https://duncan.land">duncan</a> · <a href="https://github.com/ephraimduncan/artifacts">source</a> · CLI: <code>npm i -g @ephraimduncan/artifacts</code></footer>
</body>
</html>
`;
}
