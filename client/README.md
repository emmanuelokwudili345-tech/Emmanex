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

## Cookie and CSRF configuration

Authentication uses the backend's HttpOnly session cookie and an in-memory
CSRF token obtained from the authenticated `/api/auth/csrf` response. The
frontend does not read the session cookie or persist either token in browser
storage. API requests include credentials.

Configure the backend `CORS_ORIGINS` with the exact frontend origin. For a
cross-site frontend/API deployment, use HTTPS and configure
`SESSION_COOKIE_SAME_SITE=none` and `SESSION_COOKIE_SECURE=true`. Same-site
deployments can use the backend's stricter `lax` default. Do not use wildcard
CORS origins with credentialed requests.

## Current feature boundary

Registration, sign-in, sign-out, session restoration, and the protected account
screen are wired to the backend. Product discovery, order history, and checkout
remain unavailable until their backend services are implemented. Authentication
also requires the backend sessions migration to be applied; the frontend does
not simulate authentication when the API or database is unavailable.
