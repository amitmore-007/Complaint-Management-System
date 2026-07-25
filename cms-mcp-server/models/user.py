from typing import Optional, TypedDict


class ListUsersPayload(TypedDict, total=False):
    page: int
    limit: int
    search: Optional[str]


class CreateUserPayload(TypedDict):
    name: str
    phoneNumber: str


class UpdateUserPayload(TypedDict, total=False):
    userId: str
    name: Optional[str]
    phoneNumber: Optional[str]


class ToggleUserStatusPayload(TypedDict):
    userId: str
    isActive: bool


class DeleteUserPayload(TypedDict):
    userId: str
