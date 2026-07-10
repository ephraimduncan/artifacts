---
name: publish-artifact
description: Publish a self-contained HTML file (report, PR canvas, generated page) to artifacts.duncan.land and get a shareable public URL. Use when the user says "publish this", "share this report", "host this HTML", or wants a link to a generated HTML file.
---

# Publish artifact

Host a single self-contained HTML file at a public URL on https://artifacts.duncan.land. No accounts — ownership of a slug is a `deployKey` returned on first publish.

## Publish

1. Derive a slug from the filename or topic: lowercase, `[a-z0-9._-]` only, must start alphanumeric, max 128 chars. Example: `pr-canvas-herdr-123`.
2. Publish:
   ```bash
   curl -sS -T <file.html> https://artifacts.duncan.land/<slug>
   ```
3. The JSON response contains `url` and, on first publish, a `deployKey`.
4. **Persist the deployKey** — merge it into `~/.config/artifacts/keys.json` as `{"<slug>": "<deployKey>"}` (create the file with mode 600 if missing; never overwrite other entries). Without it the artifact can never be updated or deleted.
5. Give the user the `url`.

## Update (slug already published by you)

Read the key for the slug from `~/.config/artifacts/keys.json`, then:

```bash
curl -sS -T <file.html> -H "Authorization: Bearer <deployKey>" https://artifacts.duncan.land/<slug>
```

## Delete

```bash
curl -sS -X DELETE -H "Authorization: Bearer <deployKey>" https://artifacts.duncan.land/<slug>
```

## Errors

- `403 slug taken` — someone else owns that slug and you have no key for it. Pick a different slug (append `-2` or a short random suffix) and retry. Do not retry the same slug.
- `413` — file exceeds 25 MB. Don't split it; tell the user.
- `400 invalid slug` — fix the slug to match `[a-z0-9._-]`, alphanumeric first char.

## Notes

- Everything published is public: the URL is listed on the homepage. Never publish secrets or private data; warn the user if the file looks sensitive.
- Re-publishing to the same slug with the right key overwrites in place — same link keeps working, good for iterating.
- The file must be self-contained (inline CSS/JS or CDN links); there is no way to upload sibling assets.
