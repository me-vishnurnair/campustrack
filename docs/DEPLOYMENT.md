# CampusTrack hosting and recovery

Both editions are deployed on free plans.

- **Primary browser edition:** https://vishnu-campustrack-browser.onrender.com
- **Original account edition:** https://vishnu-campustrack.onrender.com

## Long-term free demo

The browser edition uses static hosting and has no server database to expire. Records stay on the same browser/device; download **Backup JSON** before clearing site data or changing devices. **Restore backup** validates the data before asking to replace the current board. The fictional sample leaves your saved board untouched. [Full browser-edition guide](../browser/README.md).

Source: `browser/`. Static build copies the index and JavaScript modules along with the original CSS/favicon into `public/`. Its Render auto-deploy is off; use **Manual Deploy → Deploy latest commit** to publish a reviewed update. No recurring redeployment is needed merely to keep it hosted.

## Account edition

The prepared Blueprint has been deployed in **My Workspace**. It references **vishnu-campustrack-db**, sets the origin from Render's own HTTPS URL, keeps cookies secure, uses one Python worker and waits for passing CI before deploying source updates. Credentials stay in Render; do not copy them into source or chat.

The live account edition passed database health, registration/login/logout, CRUD, owner isolation, secure-cookie, CSRF and CSV-export checks on 1 October 2026. [Verification run](https://github.com/me-vishnurnair/portfolio/actions/runs/36870538339).

This free PostgreSQL database expires on **31 October 2026 at 05:41 UTC / 11:11 India time**. Export any useful records before expiry. Waking or restarting the web service does not extend the database trial. The browser edition remains independent of this database.

## Sleeping, quotas and recovery

A free Python service sleeps after 15 minutes without traffic and wakes automatically on the next visit, usually taking about a minute. Opening its URL is enough; avoid repeated refreshes. Static sites have no Python startup delay.

The free Python services share 750 monthly runtime hours; do not add keep-alive pings. If the runtime allowance is exhausted, service resumes after the monthly reset. A manual restart does not replenish the allowance. Bandwidth and build limits also apply.

All deployments use free plans. No paid plan has been enabled. Account-wide billing controls are unavailable through the connector; review the Render Billing page if a payment method is already attached.

For failed builds or errors, inspect CI and Render deployment logs and restore the previous successful release. Keep production HTTPS/cookie/PostgreSQL checks enabled for the account edition. `create_all` initializes tables and is not a migration system; review and back up data before schema changes.

[Render free limits](https://render.com/docs/free) · [Deployment behavior](https://render.com/docs/deploys)
