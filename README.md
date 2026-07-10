# artifacts

Push a self-contained HTML file, get a shareable link. Live at [artifacts.duncan.land](https://artifacts.duncan.land).

A Cloudflare Worker + R2 bucket. No accounts: publishing a new slug returns a `deployKey`, which is the only way to update or delete that slug. The admin token (Worker secret `ARTIFACTS_TOKEN`) overrides everything.

## API

| Route | Auth | Behavior |
|---|---|---|
| `PUT /:slug` | none (new slug) / deploy key or admin (existing) | store file, return JSON with `url` (+ `deployKey` on first anonymous publish) |
| `GET /:slug` | public | serve the file (`Last-Modified` conditional GETs supported) |
| `DELETE /:slug` | deploy key or admin | remove |
| `GET /` | public (JSON list: admin) | landing page; full JSON listing with `Accept: application/json` + admin token |
| `GET /skill` | public | installable agent skill for publishing here |

Slugs: `[a-z0-9._-]`, first char alphanumeric, max 128 chars. Files: 25 MB max, any content type (defaults to `text/html`).

Keys are sent as `Authorization: Bearer <key>` (or `x-deploy-key`). Only SHA-256 hashes of deploy keys are stored (R2 object `customMetadata.keyHash`); comparisons are timing-safe.

Artifacts are unlisted: nothing is browsable, everyone keeps their own link.

## Agent skill

Install the `publish-artifact` skill ([skills/publish-artifact/SKILL.md](skills/publish-artifact/SKILL.md)) so a coding agent can publish on request:

```bash
npx skills add ephraimduncan/artifacts
```

Works with Claude Code, Cursor, Codex, OpenCode, and the other agents [skills.sh](https://skills.sh) supports. The raw skill is also served at [artifacts.duncan.land/skill](https://artifacts.duncan.land/skill).

## CLI

```bash
bun i -g @ephraimduncan/artifacts   # or: npm i -g @ephraimduncan/artifacts
```

The CLI runs on [Bun](https://bun.sh) (`#!/usr/bin/env bun`), so Bun must be installed. In this repo it's `bin/artifacts`.

```
artifacts push <file> [--name <slug>]   publish/update; prints URL, copies to clipboard
artifacts list                          list all artifacts (admin token required)
artifacts rm <slug>                     delete
artifacts open <slug>                   open in browser
```

Auth resolution: `ARTIFACTS_TOKEN` env → `~/.config/artifacts/token` (admin) → per-slug deploy keys in `~/.config/artifacts/keys.json` (saved automatically on first publish).

## Develop / deploy

```bash
bun install
bun run check      # wrangler types + tsc
bun run deploy     # wrangler deploy
```

Secrets: `wrangler secret put ARTIFACTS_TOKEN`. Local dev uses `.dev.vars`.

