from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse

from middleware.auth import AuthMiddleware
from middleware.trailing_slash import TrailingSlashMiddleware
from middleware.stale_session import StaleSessionMiddleware

load_dotenv()

from utils.config import SERVER_URL

from tools import complaint
from tools import user
from tools import attendance
from tools import equipment
from tools import stats
from tools import store
from tools import billing
from tools import inventory

mcp = FastMCP(
    "cms-server",
    host="0.0.0.0",
)


# register oauth discovery as a public route before building the app — MCP clients
# fetch this from the MCP server's own origin; the actual authorize/token/register
# endpoints it points to live on the CMS backend (SERVER_URL), not here.
@mcp.custom_route("/.well-known/oauth-authorization-server", methods=["GET"])
async def oauth_discovery(request: Request) -> JSONResponse:
    return JSONResponse({
        "issuer": SERVER_URL,
        "authorization_endpoint": f"{SERVER_URL}/mcp-oauth/authorize",
        "token_endpoint": f"{SERVER_URL}/mcp-oauth/token",
        "registration_endpoint": f"{SERVER_URL}/mcp-oauth/register",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
    })


@mcp.custom_route("/health", methods=["GET"])
async def health(request: Request) -> JSONResponse:
    return JSONResponse({"status": "ok", "server_url": SERVER_URL})


http_app = mcp.streamable_http_app()
http_app.add_middleware(TrailingSlashMiddleware)
http_app.add_middleware(AuthMiddleware)
http_app.add_middleware(StaleSessionMiddleware)

app = http_app

complaint.register(mcp)
user.register(mcp)
attendance.register(mcp)
equipment.register(mcp)
stats.register(mcp)
store.register(mcp)
billing.register(mcp)
inventory.register(mcp)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
