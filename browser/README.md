# Free browser edition

**[Open the free live app ↗](https://vishnu-campustrack-browser.onrender.com)** · [Passing browser checks](https://github.com/me-vishnurnair/campustrack/actions/runs/36870651776)

This edition runs on static hosting and stores application records in the visitor's browser. It has no server database, password or account requirement. The Python/PostgreSQL account edition remains in `app/` and `static/`.

## Use

Add, edit and delete applications; search the board or filter by stage. Reloading preserves the board on the same browser and device. The fictional sample never replaces the saved board.

**Backup JSON** downloads a restorable board. **Restore backup** validates a JSON file and asks before replacing existing records. **Export CSV** provides a spreadsheet-friendly copy, including formula-prefix protection. Export records from the account edition before its database expires if they matter to you; CSV and JSON are different formats, and the JSON restore does not currently import CSV.

Browser data can be lost when you clear site data, use private browsing, change devices, or change the hosting domain. Keep a JSON backup somewhere safe. Other people using the same browser profile can access this board; it is not an account isolation feature. Records are not sent to an API or stored in GitHub.

## Deploy

Build:

```sh
mkdir -p public/static
cp browser/index.html public/
cp browser/*.js public/static/
cp static/style.css static/favicon.svg public/static/
```

Render static publish directory: `public`. Static delivery has no sleeping Python process or 30-day database expiry. Free provider bandwidth/build limits still apply. A hosting provider's continued free service is not guaranteed.

## Verify

Run the **Browser edition checks** GitHub Actions workflow. It exercises real Chromium flows and preserves desktop/mobile screenshots. Storage tests cover invalid backups, unsafe URLs, duplicates, date validation, record limits, unreadable storage and quota errors.

For a deployed site, the same browser check script can use `BROWSER_APP_URL=https://your-site`.

## Maintenance

Static updates from an unconnected public repository require **Manual Deploy → Deploy latest commit**. A connected Render Git provider can publish after passing CI. If a free usage quota is exhausted, check the Render dashboard; instance-hour limits reset next month and cannot be bypassed by manually restarting a service.
