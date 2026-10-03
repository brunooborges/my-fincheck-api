# Deploying the Fincheck API (Render + Neon)

The API runs as a free Render web service, with a free Neon Postgres database.

## Environment variables

Set these in the Render dashboard. None of them belongs in the code or in git.

| Variable | Required | Default | What it is |
|---|---|---|---|
| `DATABASE_URL` | yes | none | Postgres connection string. For Neon use the **pooled** one (the host contains `-pooler`) and add `?sslmode=require&connect_timeout=15`. |
| `JWT_SECRET` | yes | none | Secret that signs the login tokens. Use a long random value; the API refuses the old default. |
| `ALLOWED_ORIGINS` | no | `http://localhost:5173`, `http://localhost:3000`, `https://brunooborges.github.io` | Comma-separated origins allowed to call the API from a browser. A `*` is ignored, so the restriction cannot be undone by accident. |
| `PORT` | no | `3000` | Port to listen on. Render sets it for you. |
| `TRUST_PROXY` | no | `1` | Number of proxies in front of the API, so rate limits count the visitor's real address. |

## Database

Create the tables once, from your machine, with the **direct** (non-pooled) Neon connection string,
because migrations do not work through the pooler:

```bash
DATABASE_URL="<direct connection string>" npx prisma migrate deploy
```

The API itself uses the pooled string in Render. A free Neon database sleeps after a few minutes
without use and wakes on the next query (about a second).

If you rotate `JWT_SECRET`, every existing login stops working and people sign in again.

## Waking the service up

A free Render service sleeps after 15 minutes without traffic and takes about a minute to start again.
`GET /health` answers `{ "status": "ok" }` with no login, no database access and no rate limit, so a
front end can ping it to know when the API is awake.

## Protections

- **Rate limits**, per visitor address, kept in memory (enough for a single instance, reset on
  restart). Over a limit the API answers `429` with a `Retry-After` header, and the CORS headers are
  kept so the browser can read the answer:
  - 120 requests per minute for everything;
  - 20 writes (anything but GET) per minute;
  - 5 sign-ups per hour;
  - 10 sign-in attempts per 15 minutes.

  The limits run before the login check, so a flood is turned away before any token is verified.
  `/health` is never limited.
- **CORS** only allows the origins above and answers preflight requests itself.
- Request bodies are limited to 10 kb.

## Tests

`yarn test` runs everything without a database, including an integration test of the real application
wiring (the health route, the login check, and the order the guards run in).
