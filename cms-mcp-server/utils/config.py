import os
from dotenv import load_dotenv

load_dotenv()

SERVER_URL = os.getenv("SERVER_URL")
MCP_INTERNAL_SECRET = os.getenv("MCP_INTERNAL_SECRET")

REQUIRED = {
    "SERVER_URL": SERVER_URL,
    "MCP_INTERNAL_SECRET": MCP_INTERNAL_SECRET,
}

missing = [k for k, v in REQUIRED.items() if not v]
if missing:
    print(f"[config] missing required env vars: {', '.join(missing)}")
