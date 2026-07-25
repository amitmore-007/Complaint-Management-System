from contextvars import ContextVar

# per-request auth values set by the auth middleware
current_token: ContextVar[str | None] = ContextVar("current_token", default=None)
current_user_id: ContextVar[str | None] = ContextVar("current_user_id", default=None)
current_role: ContextVar[str | None] = ContextVar("current_role", default=None)
