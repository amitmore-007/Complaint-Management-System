# CMS MCP Server

Exposes the Complaint Management System (complaints, users, attendance, equipment/assets,
stats, stores, billing, inventory) as MCP tools over remote HTTP, authenticated via OAuth
2.0 against the CMS backend's own login (phone + OTP).

## How auth works

There is no separate login for this server — it's a thin pass-through:

1. An MCP client (Claude, etc.) dynamically registers itself against the CMS backend
   (`POST {SERVER_URL}/mcp-oauth/register`) and starts the standard OAuth authorization-code
   + PKCE flow, discovered via `GET /.well-known/oauth-authorization-server` on **this**
   server (not the backend).
2. The backend's `/mcp-oauth/authorize` redirects the user's browser to the CMS frontend's
   `/oauth/authorize` consent page, which reuses the existing phone/OTP login
   (`/api/{role}/auth/send-otp` + `/verify-otp`) — same as logging into the CMS app itself.
3. On success, the frontend exchanges that login for a one-time authorization code
   (`POST /mcp-oauth/authorize/complete`), and the MCP client exchanges the code for an
   access + refresh token (`POST /mcp-oauth/token`).
4. Every tool call carries that access token as `Authorization: Bearer <token>`. This
   server's `AuthMiddleware` (`middleware/auth.py`) validates it against
   `POST /mcp-oauth/internal/validate-access-token` on the backend (cached 30 min) and
   sets the caller's `userId`/`role` for the duration of the request.
5. Every tool call is then forwarded to the **same** CMS REST API
   (`/api/client/...`, `/api/technician/...`, `/api/admin/...`) the CMS frontend already
   uses, with that same token — so role scoping (a client only sees their own complaints,
   a technician only their assignments, etc.) is enforced by the backend exactly as it
   already is for the web app. Nothing new to trust here.

## Local setup

```bash
uv sync
cp .env.sample .env   # fill in SERVER_URL (your local backend, e.g. http://localhost:5000)
                       # and MCP_INTERNAL_SECRET (must match the backend's env var)
python main.py         # serves on :8000, MCP endpoint at /mcp/
```

## Project layout

Mirrors a standard FastMCP server layout:

- `main.py` — FastMCP app, OAuth discovery route, middleware wiring, tool registration.
- `middleware/` — `auth.py` (bearer token validation + caching), `trailing_slash.py`,
  `stale_session.py`.
- `utils/` — `config.py` (env vars), `context.py` (per-request contextvars),
  `auth.py` (`get_auth()` used by every tool), `logger.py`.
- `enums/` — mirrors the backend's Mongoose enums (complaint status/priority, roles, etc).
- `models/` — `TypedDict` payload shapes per entity.
- `api/` — thin `requests`-based clients calling the CMS backend's existing REST routes.
- `tools/` — FastMCP tool registration + docstrings, one module per entity group:
  `complaint`, `user`, `attendance`, `equipment` (equipment templates + asset records),
  `stats`, `store`, `billing`, `inventory`.

## Known limitation

File/photo/video uploads (complaint photos, resolution proof, bill photos) are **not**
supported through any tool — those endpoints are only ever called with JSON bodies here.
Binary uploads aren't a good fit for LLM tool-call arguments; if needed later, add a
URL-attachment pattern (upload elsewhere, pass a URL) rather than raw multipart.

## Verifying the OAuth flow end-to-end

1. Run the CMS backend locally with `SERVER_URL`, `MCP_INTERNAL_SECRET`, and `FRONTEND_URL`
   set, and the frontend dev server running.
2. Run this server locally (`python main.py`).
3. Point an MCP client at `http://localhost:8000/mcp/` — e.g. Claude Code's
   `/mcp add` with a remote HTTP transport, or `npx @modelcontextprotocol/inspector`.
4. Complete the OAuth flow: dynamic registration → redirect to
   `http://localhost:5173/oauth/authorize` → pick a role → real phone/OTP login → redirected
   back with a code → client exchanges it for tokens.
5. Call `whoami` and a role-appropriate read tool (e.g. `get_my_submitted_complaints` for a
   client) and confirm the data matches what that same user sees in the CMS web app.
6. To test the refresh flow, temporarily lower `MCP_ACCESS_TOKEN_TTL` on the backend to a
   few seconds and confirm the client transparently re-authenticates via `refresh_token`.
