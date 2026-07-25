import requests
from typing import Dict

from models.auth import AuthPayload
from models.user import (
    ListUsersPayload,
    CreateUserPayload,
    UpdateUserPayload,
    ToggleUserStatusPayload,
    DeleteUserPayload,
)

from utils.config import SERVER_URL
from utils.logger import logger
from api._http import headers as _headers


def whoami(auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        role = auth["role"]

        response = requests.get(f"{SERVER_URL}/api/{role}/auth/me", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[user.whoami] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("user", {})
    except Exception as e:
        logger.error(f"[user.whoami] exception: {e}")
        return {}


def _list(kind: str, payload: ListUsersPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        params = {k: v for k, v in payload.items() if v is not None}

        response = requests.get(f"{SERVER_URL}/api/admin/{kind}", headers=_headers(token), params=params)

        if response.status_code != 200:
            logger.error(f"[user._list:{kind}] failed ({response.status_code}) | {response.text}")
            return {kind: [], "pagination": {}}

        body = response.json()
        return {kind: body.get(kind, []), "pagination": body.get("pagination", {})}
    except Exception as e:
        logger.error(f"[user._list:{kind}] exception: {e}")
        return {kind: [], "pagination": {}}


def list_clients(payload: ListUsersPayload, auth: AuthPayload) -> Dict:
    return _list("clients", payload, auth)


def list_technicians(payload: ListUsersPayload, auth: AuthPayload) -> Dict:
    return _list("technicians", payload, auth)


def _create(kind: str, payload: CreateUserPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        response = requests.post(f"{SERVER_URL}/api/admin/{kind}", headers=_headers(token), json=payload)

        if response.status_code not in (200, 201):
            logger.error(f"[user._create:{kind}] failed ({response.status_code}) | {response.text}")
            return {}

        singular = kind[:-1] if kind.endswith("s") else kind
        return response.json().get(singular, {})
    except Exception as e:
        logger.error(f"[user._create:{kind}] exception: {e}")
        return {}


def create_client(payload: CreateUserPayload, auth: AuthPayload) -> Dict:
    return _create("clients", payload, auth)


def create_technician(payload: CreateUserPayload, auth: AuthPayload) -> Dict:
    return _create("technicians", payload, auth)


def _update(kind: str, payload: UpdateUserPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        user_id = payload.get("userId")

        if not user_id:
            return {}

        body = {k: v for k, v in payload.items() if k != "userId" and v is not None}

        response = requests.put(f"{SERVER_URL}/api/admin/{kind}/{user_id}", headers=_headers(token), json=body)

        if response.status_code != 200:
            logger.error(f"[user._update:{kind}] failed ({response.status_code}) | {response.text}")
            return {}

        singular = kind[:-1] if kind.endswith("s") else kind
        return response.json().get(singular, {})
    except Exception as e:
        logger.error(f"[user._update:{kind}] exception: {e}")
        return {}


def update_client(payload: UpdateUserPayload, auth: AuthPayload) -> Dict:
    return _update("clients", payload, auth)


def update_technician(payload: UpdateUserPayload, auth: AuthPayload) -> Dict:
    return _update("technicians", payload, auth)


def toggle_user_status(payload: ToggleUserStatusPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        user_id = payload.get("userId")

        response = requests.patch(
            f"{SERVER_URL}/api/admin/users/{user_id}/toggle-status",
            headers=_headers(token),
            json={"isActive": payload.get("isActive")},
        )

        if response.status_code != 200:
            logger.error(f"[user.toggle_user_status] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("user", {})
    except Exception as e:
        logger.error(f"[user.toggle_user_status] exception: {e}")
        return {}


def delete_user(payload: DeleteUserPayload, auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        user_id = payload.get("userId")

        response = requests.delete(f"{SERVER_URL}/api/admin/users/{user_id}", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[user.delete_user] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json()
    except Exception as e:
        logger.error(f"[user.delete_user] exception: {e}")
        return {}


def get_dashboard_stats(auth: AuthPayload) -> Dict:
    try:
        token = auth["token"]
        response = requests.get(f"{SERVER_URL}/api/admin/dashboard/stats", headers=_headers(token))

        if response.status_code != 200:
            logger.error(f"[user.get_dashboard_stats] failed ({response.status_code}) | {response.text}")
            return {}

        return response.json().get("stats", {})
    except Exception as e:
        logger.error(f"[user.get_dashboard_stats] exception: {e}")
        return {}
