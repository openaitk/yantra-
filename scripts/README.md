# Nightly site automation

`.github/workflows/auto-site.yml` runs every night and on demand (Actions tab -> "Auto update site" -> Run workflow).

1. Downloads the live catalogue from https://api.aitklabs.in/app/models (and /v1/images/models).
2. Regenerates model pages (models/*.html), the guide pages and the sitemap.
3. Opens a GitHub Issue (GitHub emails you) when new models appear or a price moves by 10% or more.
4. Commits the changes and pings IndexNow so Bing/Yandex learn about them.

Safety: if the gateway is down or returns a small catalogue, the run stops and changes nothing. Pages are never deleted.
First run only saves a baseline (`scripts/known_models.json`) and opens no Issue.

## Phase 2
- `.github/workflows/watchdog.yml`: every 15 min checks apikeys.in, api.aitklabs.in/health and /app/models. Opens one "Site or API is DOWN" Issue (label `outage`), comments while it lasts, closes it on recovery.
- `.github/workflows/weekly-audit.yml`: Mondays ~9 AM IST, runs `scripts/site_audit.js` over every sitemap page and the API, opens an Issue with problems.
- Server side (on EC2): `bash ~/yantra-backend/watchdog.sh --install` (in the backend zip).
