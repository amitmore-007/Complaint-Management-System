from typing import TypedDict


class AuthPayload(TypedDict):
    token: str
    userId: str
    role: str
