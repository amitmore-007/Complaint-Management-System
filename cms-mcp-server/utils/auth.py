from .context import current_token, current_user_id, current_role
from models.auth import AuthPayload


# returns the bearer token from the current request context
def get_token() -> str | None:
    return current_token.get()


# returns token, user id and role for the current request — always set by
# AuthMiddleware before a tool call runs, since there's no agency/tenant to select
def get_auth() -> AuthPayload:
    return {
        "token": current_token.get(),
        "userId": current_user_id.get(),
        "role": current_role.get(),
    }
