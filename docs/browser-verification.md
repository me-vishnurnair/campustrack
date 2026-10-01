# Browser edition verification

Verified 1 October 2026.

- Five persistent-storage boundary tests passed.
- Chromium checks passed against both the built source and the public static deployment.
- Create/edit/delete, reloading persistence, sample isolation, JSON backup/restore, invalid-backup rejection, CSV formula handling, search/filtering, safe text rendering and independent browser contexts were exercised.
- A 390 px mobile viewport passed the page-overflow check.
- Desktop and mobile screenshots are available in the workflow's `browser-edition-qa` artifact.
- No API requests were made by the browser edition during these flows.

[Browser checks and screenshots](https://github.com/me-vishnurnair/campustrack/actions/runs/36870651776)

[Live HTTP/API checks](https://github.com/me-vishnurnair/portfolio/actions/runs/36870538339) also passed for the portfolio, browser edition, original account edition, NoteLens and RepoCheck.

These are point-in-time release checks, not continuous uptime monitoring. All services use free plans; the original account database expires on 31 October 2026.
