# Complete the CampusTrack deployment

Status on 1 October 2026: source and CI are published. The PostgreSQL database is available in the owner's Render workspace; the CampusTrack web service is not deployed yet.

## One dashboard action

[Open the prepared Render deployment](https://render.com/deploy?repo=https://github.com/me-vishnurnair/campustrack).

1. Select **My Workspace**, which already contains **vishnu-campustrack-db**.
2. Review the Blueprint. It creates one free Python web service, **vishnu-campustrack**, in Singapore and references the existing database. It does not create a second database.
3. Click **Deploy Blueprint**.

Render supplies the database connection internally and sets the application origin from its assigned HTTPS URL. There is no password or connection URL to paste into chat or GitHub. The connected Render tool cannot create a Blueprint or retrieve database connection credentials; this dashboard action is required to finish that connection.

For another workspace, first create a PostgreSQL database and change the reference name in `render.yaml` to its name. Keep the service and database in the same region.

## Verify before publishing a demo link

After the deployment is Live, open `/healthz` and expect `{"status":"ok"}`. This endpoint executes a database query. Then verify registration, sign-out/sign-in, application create/edit/delete, CSV export, and account isolation with disposable test data. Publish the assigned URL only after these checks pass.

## Hosting lifecycle

The current free database expires on **31 October 2026 at 05:41 UTC (11:11 India time)**. It has no backups. Upgrade it before expiry or migrate and verify a durable replacement; export useful application records as CSV beforehand. Free web services also sleep after 15 minutes without traffic and share a monthly runtime allowance.

For continuous hosting, the current entry paid tiers are `0.5c-512mb` for each web service and `0.1c-256mb` for PostgreSQL. Do not change this Blueprint to a paid plan without the owner's explicit billing approval. Account for database storage, taxes and usage charges in addition to compute.

Provider references: [Blueprint specification](https://render.com/docs/blueprint-spec), [free-plan limits](https://render.com/docs/free), [pricing](https://render.com/pricing).

## Recovery

If startup fails, inspect Render's deployment logs. Keep the production checks enabled: an HTTPS origin, secure cookies and PostgreSQL are required. Never substitute SQLite on a temporary server filesystem. The `/healthz` readiness check will fail if the database is unavailable.

If a code change fails, keep or roll back to the previous successful deployment and inspect the failed CI run. The Blueprint waits for passing GitHub checks before auto-deploying source updates. `create_all` only initializes tables; review and back up data before schema changes.
