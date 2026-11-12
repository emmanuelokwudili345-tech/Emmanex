# Emmanex client

React, TypeScript, and Vite frontend for Emmanex.

## Development

Run the backend on port `5000`, then start the client:

```sh
npm run dev
```

The client defaults to the same-origin `/api` base path. Vite proxies `/api`
requests to `http://localhost:5000`; set `VITE_DEV_API_TARGET` in the client
environment to use a different local backend URL.

For a deployed frontend, set `VITE_API_BASE_URL` to the backend API base URL,
including `/api` (for example, `https://api.example.com/api`). This value is
public client configuration and must not contain secrets.

Deploy the Vercel project with `client` as its root directory. The Vercel
rewrite in `vercel.json` serves the React app for client-side routes such as
`/login` and `/verify-email`, including direct visits and page refreshes.

Set `VITE_NEON_AUTH_URL` to your Neon Auth URL. The client also accepts
`VITE_NEON_AUTH_BASE_URL` for compatibility with deployments that already use
that variable name. This is a public URL, not a secret. The deployed client
bundle must be rebuilt after changing either variable; redeploy the Vercel
project after saving environment-variable changes.

For a separate backend deployment, `VITE_API_BASE_URL` must point to that
backend, including its `/api` prefix. Leaving it unset makes the client request
the frontend's own `/api` path. Check that
`https://<your-backend-host>/api/health` returns the API health response and
that `/api/health/ready` succeeds when the database is configured.

The backend requires `DATABASE_URL`, `NEON_AUTH_BASE_URL`,
`NEON_AUTH_JWKS_URL`, and `CORS_ORIGINS`. Set `CORS_ORIGINS` to the exact
frontend origin, such as `https://emmanex.vercel.app` (no trailing slash).
The Neon Auth base URL and JWKS URL must come from the same Neon Auth project.
The frontend obtains a Neon Auth JWT and sends it to the backend as a bearer
token; the backend verifies it using the configured JWKS URL. The shopping
guest-cart cookie is separate from authentication. When a verified Neon Auth
email exactly matches an active, unlinked Emmanex customer profile, the backend
links that profile to the Neon Auth identity. Profiles already linked to
another identity are not reassigned.

## Current feature boundary

Registration, sign-in, sign-out, session restoration, and the protected account
screen use Neon Auth, with customer profiles synchronized through the backend.
Apply the server database migrations before deploying; the Neon Auth identity
link migration is required for profile synchronization. The frontend does not
simulate authentication when the API or database is unavailable.
