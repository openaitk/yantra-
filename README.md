# Nightly site automation

`.github/workflows/auto-site.yml` runs every night and on demand (Actions tab -> "Auto update site" -> Run workflow).

1. Downloads the live catalogue from https://api.aitklabs.in/app/models (and /v1/images/models).
2. Regenerates model pages (models/*.html), the guide pages and the sitemap.
3. Opens a GitHub Issue (GitHub emails you) when new models appear or a price moves by 10% or more.
4. Commits the changes and pings IndexNow so Bing/Yandex learn about them.

Safety: if the gateway is down or returns a small catalogue, the run stops and changes nothing. Pages are never deleted.
First run only saves a baseline (`scripts/known_models.json`) and opens no Issue.
