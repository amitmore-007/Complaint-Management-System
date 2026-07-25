import time

import httpx
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from utils.config import MCP_INTERNAL_SECRET, SERVER_URL
from utils.context import current_token, current_user_id, current_role


CACHE_TTL = 30 * 60

# keyed by token: { "result": {...}, "expires_at": float }
_cache: dict = {}

# paths that bypass auth entirely — everything else (including "/mcp") requires a valid token.
# registration/authorize/token all live on the CMS backend, not this app.
_SKIP_PREFIXES = ("/.well-known", "/health")


async def _reject(scope: Scope, receive: Receive, send: Send, message: str) -> None:
    print(f"[auth] rejected — {message} | path={scope.get('path', '')}")
    await JSONResponse({"error": message}, status_code=401)(scope, receive, send)


class AuthMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self._client = httpx.AsyncClient()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        if any(path.startswith(prefix) for prefix in _SKIP_PREFIXES):
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        authorization = headers.get(b"authorization", b"").decode()
        if not authorization.startswith("Bearer "):
            await _reject(scope, receive, send, "missing token")
            return

        token = authorization[len("Bearer "):]

        entry = _cache.get(token)
        result = entry["result"] if entry and time.time() < entry["expires_at"] else None

        if result is None:
            print(f"[auth] cache miss — validating | path={path}")

            response = await self._client.post(
                f"{SERVER_URL}/mcp-oauth/internal/validate-access-token",
                headers={
                    "X-Internal-Secret": MCP_INTERNAL_SECRET,
                    "Content-Type": "application/json",
                },
                json={"token": token},
            )

            if response.status_code != 200:
                await _reject(scope, receive, send, "invalid token")
                return

            body = response.json()["body"]
            result = {"userId": body["userId"], "role": body["role"]}

            _cache[token] = {"result": result, "expires_at": time.time() + CACHE_TTL}
            print(f"[auth] validated and cached | user_id={result['userId']} role={result['role']} path={path}")
        else:
            print(f"[auth] cache hit | path={path}")

        token_token = current_token.set(token)
        user_id_token = current_user_id.set(result["userId"])
        role_token = current_role.set(result["role"])

        try:
            await self.app(scope, receive, send)
        finally:
            current_token.reset(token_token)
            current_user_id.reset(user_id_token)
            current_role.reset(role_token)
