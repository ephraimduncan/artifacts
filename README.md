# artifacts

Push a self-contained HTML file, get a shareable link. Live at [artifacts.duncan.land](https://artifacts.duncan.land).

A Cloudflare Worker + R2 bucket. No accounts: publishing a new slug returns a `deployKey`, which is the only way to update or delete that slug. The admin token (Worker secret `ARTIFACTS_TOKEN`) overrides everything.

## API

| Route | Auth | Behavior |
|---|---|---|
| `PUT /:slug` | none (new slug) / deploy key or admin (existing) | store file, return JSON with `url` (+ `deployKey` on first anonymous publish) |
| `GET /:slug` | public | serve the file (`Last-Modified` conditional GETs supported) |
| `DELETE /:slug` | deploy key or admin | remove |
| `GET /` | public | landing page + list of everything; JSON with `Accept: application/json` |
| `GET /skill` | public | installable agent skill for publishing here |

Slugs: `[a-z0-9._-]`, first char alphanumeric, max 128 chars. Files: 25 MB max, any content type (defaults to `text/html`).

Keys are sent as `Authorization: Bearer <key>` (or `x-deploy-key`). Only SHA-256 hashes of deploy keys are stored (R2 object `customMetadata.keyHash`); comparisons are timing-safe.

## CLI

```bash
bun i -g @ephraimduncan/artifacts   # or: npm i -g @ephraimduncan/artifacts
```

The CLI runs on [Bun](https://bun.sh) (`#!/usr/bin/env bun`), so Bun must be installed. In this repo it's `bin/artifacts`.

```
artifacts push <file> [--name <slug>]   publish/update; prints URL, copies to clipboard
artifacts list                          list everything published
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

Secrets: `wrangler secret put ARTIFACTS_TOKEN` (locally mirrored at `~/.config/artifacts/token`). Local dev uses `.dev.vars`.

## Notes

- The `artifacts.duncan.land` custom domain is provisioned by the `routes` entry in `wrangler.jsonc`.
- The duncan.land zone strips `ETag` on responses; conditional requests work via `Last-Modified` instead.
- Everything on this origin is public, user-supplied HTML. Never host anything credentialed (logged-in dashboards, cookies) on this origin.
- `robots.txt` disallows all crawling; flip it in `src/index.ts` if you want artifacts indexed.
