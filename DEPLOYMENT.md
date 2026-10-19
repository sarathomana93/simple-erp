# Shared ERP deployment

The `shared-database` branch runs a Node server on Render Free and stores all ERP records, hashed passwords and sessions in Supabase Free PostgreSQL. The existing static site on `main` remains available for exporting old browser data.

## Production configuration

- Node 22 or later; build `npm ci --omit=dev`; start `npm start`.
- Set `NODE_ENV=production`, `ERP_GATEWAY_URL` to the deployed Supabase `erp-gateway` function URL and `ERP_GATEWAY_TOKEN` to its private bearer credential in Render environment settings.
- The gateway authenticates every request using a SHA-256 credential digest before accessing its fixed store methods. It uses the built-in Supabase database connection; no database or gateway secret is shipped to the browser.
- Private `erp_private` tables have RLS enabled and no anonymous/authenticated schema privileges. Gateway database access uses the server database role.
- To rotate the gateway credential, generate a fresh random 32-byte token, update the digest in the Edge Function and redeploy, then replace the Render token and redeploy. Never commit the token.
- Direct PostgreSQL deployment is also supported via `DATABASE_URL`, `DATABASE_SSL=true` and an initial scrypt `ERP_ADMIN_HASH` if not using the gateway.
- Health endpoint: `/healthz`. Backup: use Download backup in the signed-in app and keep a copy separately.

## First use and migration

Sign in with the initial password provided to the owner and use Change password immediately. Use the same URL and password on every authorized device. This lightweight app has one shared business account; it does not provide separate user roles.

On the original laptop, open the OLD website and select Download backup. Open the new shared app, sign in, and select Import backup. Import adds new records and rejects conflicting IDs or duplicate codes; it never silently replaces the shared database. Check items, customers and invoices before switching devices to the new URL. Existing browser records are not automatically uploaded from a different website origin.

Free Render instances can sleep while idle, so the first request may take longer. Supabase free projects can pause after inactivity; restore a paused project from its dashboard. Data storage is independent of Render restarts. Offline edits are unavailable: successful saves require the database. Background refresh runs every 15 seconds when no form is open; stale edits are rejected so they cannot overwrite newer saves from another device.

Run `npm ci && npm test` for local API and browser tests. Never put real business data or deployment credentials in test fixtures.
