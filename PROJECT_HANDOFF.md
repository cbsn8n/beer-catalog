# Beer Catalog — Handoff Notes (2026-04-15)

Краткий файл-продолжение для следующей сессии.

## Branch / latest commits
- Current branch: `main`
- Recent commits:
  - `ee962fc` docs(sync): clarify that /app/data must be persistent
  - `fc180f7` fix(sync): merge Noco data with local cards and preserve local images/edits
  - `312fcd8` fix(generate): send urls[] and handle delayed provider id without false failure
  - `ffb5924` feat(admin): image generation workflow + webhook + apply/regenerate
  - `a46d551` fix(image-search): parse Serper organic results for lens mode

## What is implemented
- User auth via Telegram (`/login`, callback, session cookie).
- Admin panel `/beeradm`:
  - sync control,
  - moderation queue,
  - audit/sync history,
  - image rotation tools (single + bulk),
  - image search (lens + name),
  - generated image flow (generate / regenerate / set as primary).
- Add beer and update existing beer via moderation flow.

## Critical deployment/runtime notes (Coolify)
### 1) Data persistence requirement
- App writes important runtime state to `/app/data`:
  - `/app/data/beers.json`
  - `/app/data/admin/*`
  - `/app/data/images/*`
  - `/app/data/thumbs/*`
- If `/app/data` is not persistent, data can be lost on redeploy.

### 2) Current workaround configured in Coolify (pre/post deploy)
Because of current platform behavior, pre/post deploy hooks were set to keep state across redeploy:

- **pre_deployment_command**
```sh
mkdir -p /app/data/images/.state/admin; \
if [ -f /app/data/beers.json ]; then cp -f /app/data/beers.json /app/data/images/.state/beers.json; fi; \
if [ -d /app/data/admin ]; then cp -a /app/data/admin/. /app/data/images/.state/admin/; fi
```

- **post_deployment_command**
```sh
mkdir -p /app/data/admin; \
if [ -f /app/data/images/.state/beers.json ]; then cp -f /app/data/images/.state/beers.json /app/data/beers.json; fi; \
if [ -d /app/data/images/.state/admin ]; then cp -a /app/data/images/.state/admin/. /app/data/admin/; fi; \
chown -R nextjs:nodejs /app/data || true; \
chmod -R u+rwX /app/data || true
```

## Sync behavior (expected)
Sync from NocoDB should:
- add new cards from NocoDB,
- preserve local-only cards,
- not overwrite local enriched fields,
- not overwrite local images if card already has image(s).

Implemented in:
- `app/api/sync/route.ts`
- `scripts/sync.ts`

## Next suggested tasks
- Hardening persistence (platform-level proper `/app/data` persistent volume, remove workaround when stable).
- Add watchdog timeout for image generation jobs stuck in `pending`.
- Improve duplicate detection (fuzzy name search).
