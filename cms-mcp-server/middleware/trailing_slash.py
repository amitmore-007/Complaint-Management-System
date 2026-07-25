from starlette.types import ASGIApp, Receive, Scope, Send


# appends a trailing slash to /mcp so starlette mount can match it without redirecting
class TrailingSlashMiddleware:

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] in ("http", "websocket") and scope.get("path") == "/mcp":
            scope = {**scope, "path": "/mcp/", "raw_path": b"/mcp/"}

        await self.app(scope, receive, send)
