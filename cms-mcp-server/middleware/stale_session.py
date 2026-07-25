from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class StaleSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        if response.status_code == 400:
            session_id = request.headers.get("mcp-session-id")

            if session_id:
                return JSONResponse(
                    {"error": "session not found or expired. please refresh or start a new one."},
                    status_code=404
                )

        return response
